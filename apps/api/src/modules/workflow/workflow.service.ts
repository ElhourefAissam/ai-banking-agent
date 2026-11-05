import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BankingSimulatorService } from '../banking-simulator/banking-simulator.service';
import {
  BANKING_RULES,
  Role,
  LimitRequestStatus,
  DecisionType,
  CustomerFileStatus,
  UserSummary,
  CreateDraftInput,
  RespondComplementInput,
} from '@proorga/shared-types';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private bankingSimulator: BankingSimulatorService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Generates sequential human-readable reference, e.g., REQ-2026-0043
   */
  private async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;

    const latest = await this.prisma.limitRequest.findFirst({
      where: { reference: { startsWith: prefix } },
      orderBy: { reference: 'desc' },
      select: { reference: true },
    });

    let nextNumber = 1;
    if (latest?.reference) {
      const parts = latest.reference.split('-');
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    let ref = `${prefix}${String(nextNumber).padStart(4, '0')}`;
    let exists = await this.prisma.limitRequest.findUnique({ where: { reference: ref } });
    while (exists) {
      nextNumber++;
      ref = `${prefix}${String(nextNumber).padStart(4, '0')}`;
      exists = await this.prisma.limitRequest.findUnique({ where: { reference: ref } });
    }

    return ref;
  }

  /**
   * Helper to verify optimistic locking
   */
  private checkVersion(currentVersion: number, targetVersion: number, requestId: string) {
    if (currentVersion !== targetVersion) {
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: `Version conflict on request ${requestId}: requested version ${targetVersion}, but current version is ${currentVersion}. Please reload the latest request details.`,
        currentVersion,
        targetVersion,
      });
    }
  }

  /**
   * 1. CREATE DRAFT
   */
  async createDraft(currentUser: UserSummary, dto: CreateDraftInput) {
    let targetAccountId = dto.accountId?.trim();

    // If client submits without explicit accountId (or empty string), automatically resolve their primary account
    if (!targetAccountId) {
      if (currentUser.role === Role.CLIENT) {
        const clientAccount = await this.prisma.account.findFirst({
          where: { customerProfile: { userId: currentUser.id } },
          orderBy: { createdAt: 'asc' },
        });
        if (!clientAccount) {
          throw new NotFoundException('No bank account found for this customer');
        }
        targetAccountId = clientAccount.id;
      } else {
        throw new BadRequestException('A valid accountId is required');
      }
    }

    const account = await this.prisma.account.findUnique({
      where: { id: targetAccountId },
      include: { customerProfile: true },
    });

    if (!account) {
      throw new NotFoundException(`Account ${targetAccountId} not found`);
    }

    if (currentUser.role === Role.CLIENT && account.customerProfile.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to create requests on this account');
    }

    // Check if account already has an in-flight or active limit request
    const existingActiveOrPending = await this.prisma.limitRequest.findFirst({
      where: {
        accountId: targetAccountId,
        status: {
          in: [
            LimitRequestStatus.SUBMITTED,
            LimitRequestStatus.UNDER_REVIEW,
            LimitRequestStatus.COMPLEMENT_REQUESTED,
            LimitRequestStatus.PENDING_SUPERVISOR,
            LimitRequestStatus.APPROVED_PENDING_ACTIVATION,
            LimitRequestStatus.ACTIVE,
          ],
        },
      },
    });

    if (existingActiveOrPending) {
      throw new ConflictException({
        code: 'ACCOUNT_HAS_ACTIVE_REQUEST',
        message: `An active or pending request (${existingActiveOrPending.reference}, status: ${existingActiveOrPending.status}) is already in progress on this account. Only one request is permitted at a time.`,
      });
    }

    const reference = await this.generateReference();

    const request = await this.prisma.limitRequest.create({
      data: {
        reference,
        accountId: targetAccountId,
        customerProfileId: account.customerProfileId,
        initialLimit: account.initialTransferLimit,
        requestedLimit: dto.requestedLimit,
        durationDays: dto.durationDays,
        reason: dto.reason.trim(),
        status: LimitRequestStatus.DRAFT,
        version: 1,
      },
    });

    // Record initial snapshot
    await this.prisma.requestVersion.create({
      data: {
        requestId: request.id,
        versionNumber: 1,
        snapshot: {
          requestedLimit: dto.requestedLimit,
          durationDays: dto.durationDays,
          reason: dto.reason,
          status: LimitRequestStatus.DRAFT,
        },
        changeReason: 'Draft creation',
        createdById: currentUser.id,
      },
    });

    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'DRAFT_CREATED',
      entityType: 'LimitRequest',
      entityId: request.id,
      entityVersion: 1,
      details: { reference, requestedLimit: dto.requestedLimit, durationDays: dto.durationDays },
    });

    return request;
  }

  /**
   * 2. SUBMIT REQUEST
   */
  async submitRequest(currentUser: UserSummary, requestId: string, targetVersion: number) {
    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { customerProfile: true, account: true, documents: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (currentUser.role === Role.CLIENT && request.customerProfile.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to submit this request');
    }

    if (
      request.status !== LimitRequestStatus.DRAFT &&
      request.status !== LimitRequestStatus.COMPLEMENT_REQUESTED
    ) {
      throw new BadRequestException(
        `Cannot submit request in status ${request.status}. Must be in DRAFT or COMPLEMENT_REQUESTED.`
      );
    }

    this.checkVersion(request.version, targetVersion, requestId);

    // Rule 1: Customer file completeness
    if (request.customerProfile.fileStatus !== CustomerFileStatus.COMPLETE) {
      const hasAttachedDocs =
        (request.documents && request.documents.length > 0) ||
        request.requiredDocumentsProvided;

      if (hasAttachedDocs) {
        // Customer provided a supporting/justifying document; regularize the profile automatically
        await this.prisma.customerProfile.update({
          where: { id: request.customerProfileId },
          data: {
            fileStatus: CustomerFileStatus.COMPLETE,
            incompleteReason: null,
          },
        });
        this.logger.log(
          `Customer profile ${request.customerProfileId} regularized during submission with attached document.`
        );
      } else {
        throw new BadRequestException({
          code: 'INCOMPLETE_CUSTOMER_FILE',
          message: `Your customer file is marked as incomplete: ${
            request.customerProfile.incompleteReason || 'KYC or identity documentation missing.'
          }. Please attach your supporting document (e.g. justificatif de domicile) to proceed.`,
        });
      }
    }

    // Rule 2: Amount bounds
    const amt = Number(request.requestedLimit);
    if (amt <= BANKING_RULES.INITIAL_TRANSFER_LIMIT || amt > BANKING_RULES.MAX_REQUESTED_LIMIT) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: `Requested limit must be strictly between ${BANKING_RULES.INITIAL_TRANSFER_LIMIT} DH and ${BANKING_RULES.MAX_REQUESTED_LIMIT} DH.`,
      });
    }

    // Rule 3: Duration bounds
    if (request.durationDays < BANKING_RULES.MIN_DURATION_DAYS || request.durationDays > BANKING_RULES.MAX_DURATION_DAYS) {
      throw new BadRequestException({
        code: 'INVALID_DURATION',
        message: `Duration must be between ${BANKING_RULES.MIN_DURATION_DAYS} and ${BANKING_RULES.MAX_DURATION_DAYS} days.`,
      });
    }

    // Rule 4: Mandatory document if > 50,000 DH
    const hasDocument = request.documents.length > 0 || request.requiredDocumentsProvided;
    if (amt > BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD && !hasDocument) {
      throw new BadRequestException({
        code: 'MANDATORY_DOCUMENT_MISSING',
        message: `For transfer limits exceeding ${BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD} DH, a supporting document (e.g., invoice, order form) is strictly required prior to submission.`,
      });
    }

    // Rule 5: Concurrency check for active requests
    const concurrentActive = await this.prisma.limitRequest.findFirst({
      where: {
        accountId: request.accountId,
        id: { not: request.id },
        status: {
          in: [
            LimitRequestStatus.SUBMITTED,
            LimitRequestStatus.UNDER_REVIEW,
            LimitRequestStatus.COMPLEMENT_REQUESTED,
            LimitRequestStatus.PENDING_SUPERVISOR,
            LimitRequestStatus.APPROVED_PENDING_ACTIVATION,
            LimitRequestStatus.ACTIVE,
          ],
        },
      },
    });

    if (concurrentActive) {
      throw new ConflictException({
        code: 'ACCOUNT_HAS_ACTIVE_REQUEST',
        message: `Another request (${concurrentActive.reference}) is already in progress on this account.`,
      });
    }

    const nextVersion = request.version + 1;

    const updated = await this.prisma.limitRequest.update({
      where: { id: requestId },
      data: {
        status: LimitRequestStatus.SUBMITTED,
        version: nextVersion,
        requiredDocumentsProvided: hasDocument,
      },
    });

    await this.prisma.requestVersion.create({
      data: {
        requestId: request.id,
        versionNumber: nextVersion,
        snapshot: {
          requestedLimit: Number(request.requestedLimit),
          durationDays: request.durationDays,
          reason: request.reason,
          status: LimitRequestStatus.SUBMITTED,
        },
        changeReason: 'Client formal submission with explicit confirmation',
        createdById: currentUser.id,
      },
    });

    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'REQUEST_SUBMITTED',
      entityType: 'LimitRequest',
      entityId: request.id,
      entityVersion: nextVersion,
      details: { reference: request.reference, requestedLimit: amt, durationDays: request.durationDays },
    });

    await this.notificationsService.notifyRequestSubmitted({
      clientUserId: request.customerProfile.userId,
      reference: request.reference,
      requestId: request.id,
      requestedLimit: amt,
      durationDays: request.durationDays,
      clientName: `${currentUser.firstName} ${currentUser.lastName}`,
      assignedAdvisorId: request.assignedAdvisorId,
    });

    return updated;
  }

  /**
   * 3. REQUEST COMPLEMENT (Advisor only)
   */
  async requestComplement(
    currentUser: UserSummary,
    requestId: string,
    motive: string,
    targetVersion: number,
  ) {
    if (currentUser.role !== Role.CONSEILLER && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only bank advisors can request additional information');
    }

    if (!motive || motive.trim().length < 5) {
      throw new BadRequestException('A motivated explanation of at least 5 characters is mandatory');
    }

    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { customerProfile: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (
      request.status !== LimitRequestStatus.SUBMITTED &&
      request.status !== LimitRequestStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Cannot request complement for request in status ${request.status}. Must be in SUBMITTED or UNDER_REVIEW.`
      );
    }

    this.checkVersion(request.version, targetVersion, requestId);

    const nextVersion = request.version + 1;

    const [updated] = await this.prisma.$transaction([
      this.prisma.limitRequest.update({
        where: { id: requestId },
        data: {
          status: LimitRequestStatus.COMPLEMENT_REQUESTED,
          assignedAdvisorId: currentUser.id,
          version: nextVersion,
        },
      }),
      this.prisma.decision.create({
        data: {
          requestId: request.id,
          decisionType: DecisionType.REQUEST_COMPLEMENT,
          motive: motive.trim(),
          targetVersion,
          actorId: currentUser.id,
          actorRole: currentUser.role as Role,
        },
      }),
      this.prisma.requestVersion.create({
        data: {
          requestId: request.id,
          versionNumber: nextVersion,
          snapshot: {
            status: LimitRequestStatus.COMPLEMENT_REQUESTED,
            motive: motive.trim(),
          },
          changeReason: `Complement requested by advisor: ${motive.trim()}`,
          createdById: currentUser.id,
        },
      }),
    ]);

    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'COMPLEMENT_REQUESTED',
      entityType: 'LimitRequest',
      entityId: request.id,
      entityVersion: nextVersion,
      details: { motive },
    });

    await this.notificationsService.notifyDocumentsRequired({
      clientUserId: request.customerProfile.userId,
      reference: request.reference,
      requestId: request.id,
      motive: motive.trim(),
    });

    return updated;
  }

  /**
   * 4. RESPOND TO COMPLEMENT / RESUBMIT
   */
  async resubmitComplement(
    currentUser: UserSummary,
    requestId: string,
    dto: RespondComplementInput,
  ) {
    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { customerProfile: true, documents: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (currentUser.role === Role.CLIENT && request.customerProfile.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to respond to this request');
    }

    if (request.status !== LimitRequestStatus.COMPLEMENT_REQUESTED) {
      throw new BadRequestException('Request is not in COMPLEMENT_REQUESTED status');
    }

    this.checkVersion(request.version, dto.targetVersion, requestId);

    const newAmt = dto.requestedLimit !== undefined ? dto.requestedLimit : Number(request.requestedLimit);
    const newDur = dto.durationDays !== undefined ? dto.durationDays : request.durationDays;
    const newReason = dto.additionalExplanation
      ? `${request.reason}\n[Complement Response]: ${dto.additionalExplanation.trim()}`
      : request.reason;

    const hasDocument = request.documents.length > 0 || request.requiredDocumentsProvided;
    if (newAmt > BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD && !hasDocument) {
      throw new BadRequestException({
        code: 'MANDATORY_DOCUMENT_MISSING',
        message: `Limit > ${BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD} DH requires a supporting document.`,
      });
    }

    const nextVersion = request.version + 1;

    const updated = await this.prisma.limitRequest.update({
      where: { id: requestId },
      data: {
        status: LimitRequestStatus.SUBMITTED,
        requestedLimit: newAmt,
        durationDays: newDur,
        reason: newReason,
        version: nextVersion,
      },
    });

    await this.prisma.requestVersion.create({
      data: {
        requestId: request.id,
        versionNumber: nextVersion,
        snapshot: {
          requestedLimit: newAmt,
          durationDays: newDur,
          reason: newReason,
          status: LimitRequestStatus.SUBMITTED,
        },
        changeReason: 'Client responded to complement request',
        createdById: currentUser.id,
      },
    });

    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'COMPLEMENT_RESUBMITTED',
      entityType: 'LimitRequest',
      entityId: request.id,
      entityVersion: nextVersion,
      details: { explanation: dto.additionalExplanation, requestedLimit: newAmt },
    });

    await this.notificationsService.notifyRequestSubmitted({
      clientUserId: request.customerProfile.userId,
      reference: request.reference,
      requestId: request.id,
      requestedLimit: newAmt,
      durationDays: newDur,
      clientName: `${currentUser.firstName} ${currentUser.lastName}`,
      assignedAdvisorId: request.assignedAdvisorId,
    });

    return updated;
  }

  /**
   * 5. RECOMMEND APPROVAL TO SUPERVISOR (Advisor only for requests > 30,000 DH)
   */
  async recommendApproval(
    currentUser: UserSummary,
    requestId: string,
    motive: string,
    targetVersion: number,
  ) {
    if (currentUser.role !== Role.CONSEILLER && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only bank advisors can formulate an escalation recommendation');
    }

    if (!motive || motive.trim().length < 5) {
      throw new BadRequestException('A motivated recommendation of at least 5 characters is mandatory');
    }

    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { customerProfile: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (
      request.status !== LimitRequestStatus.SUBMITTED &&
      request.status !== LimitRequestStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Cannot recommend request in status ${request.status}. Must be in SUBMITTED or UNDER_REVIEW.`
      );
    }

    this.checkVersion(request.version, targetVersion, requestId);

    const nextVersion = request.version + 1;

    const [updated] = await this.prisma.$transaction([
      this.prisma.limitRequest.update({
        where: { id: requestId },
        data: {
          status: LimitRequestStatus.PENDING_SUPERVISOR,
          assignedAdvisorId: currentUser.id,
          version: nextVersion,
        },
      }),
      this.prisma.decision.create({
        data: {
          requestId: request.id,
          decisionType: DecisionType.RECOMMEND_APPROVAL,
          motive: motive.trim(),
          targetVersion,
          actorId: currentUser.id,
          actorRole: currentUser.role as Role,
        },
      }),
      this.prisma.requestVersion.create({
        data: {
          requestId: request.id,
          versionNumber: nextVersion,
          snapshot: {
            status: LimitRequestStatus.PENDING_SUPERVISOR,
            recommendationMotive: motive.trim(),
          },
          changeReason: `Advisor recommendation to supervisor: ${motive.trim()}`,
          createdById: currentUser.id,
        },
      }),
    ]);

    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'APPROVAL_RECOMMENDED',
      entityType: 'LimitRequest',
      entityId: request.id,
      entityVersion: nextVersion,
      details: { motive, recommendedBy: currentUser.email },
    });

    await this.notificationsService.notifySupervisorPending({
      clientUserId: request.customerProfile.userId,
      reference: request.reference,
      requestId: request.id,
      requestedLimit: Number(request.requestedLimit),
      advisorName: `${currentUser.firstName} ${currentUser.lastName}`,
    });

    return updated;
  }

  /**
   * 6. APPROVE REQUEST
   * - If amount <= 30,000 DH: Advisor can directly approve.
   * - If amount > 30,000 DH: Supervisor only, with strict SEPARATION OF DUTIES!
   */
  async approveRequest(
    currentUser: UserSummary,
    requestId: string,
    motive: string,
    targetVersion: number,
  ) {
    if (!motive || motive.trim().length < 5) {
      throw new BadRequestException('A motivated approval reason of at least 5 characters is mandatory');
    }

    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { decisions: true, customerProfile: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    const amt = Number(request.requestedLimit);

    // Rule: Approval Thresholds
    if (amt > BANKING_RULES.ADVISOR_MAX_THRESHOLD) {
      // Must be SUPERVISOR
      if (currentUser.role !== Role.SUPERVISEUR && currentUser.role !== Role.ADMIN) {
        throw new ForbiddenException({
          code: 'THRESHOLD_EXCEEDED_FOR_ADVISOR',
          message: `This request of ${amt} DH exceeds your advisor delegation ceiling (${BANKING_RULES.ADVISOR_MAX_THRESHOLD} DH). You must recommend it to a supervisor.`,
        });
      }

      if (request.status !== LimitRequestStatus.PENDING_SUPERVISOR) {
        throw new BadRequestException(
          `Request > 30,000 DH must be in PENDING_SUPERVISOR status before supervisor approval.`
        );
      }

      // Rule: SEPARATION OF DUTIES
      // The person who formulated the recommendation cannot approve as supervisor!
      const recommendationDecision = request.decisions.find(
        (d) => d.decisionType === DecisionType.RECOMMEND_APPROVAL
      );

      if (recommendationDecision && recommendationDecision.actorId === currentUser.id) {
        throw new ForbiddenException({
          code: 'SEPARATION_OF_DUTIES_VIOLATION',
          message:
            'Separation of duties violation: You formulated the recommendation for this request. A different supervisor must validate it.',
        });
      }
    } else {
      // Amount <= 30,000 DH: Advisor or Supervisor
      if (
        currentUser.role !== Role.CONSEILLER &&
        currentUser.role !== Role.SUPERVISEUR &&
        currentUser.role !== Role.ADMIN
      ) {
        throw new ForbiddenException('You are not authorized to approve limit increase requests');
      }

      if (
        request.status !== LimitRequestStatus.SUBMITTED &&
        request.status !== LimitRequestStatus.UNDER_REVIEW
      ) {
        throw new BadRequestException(
          `Cannot approve request in status ${request.status}. Must be in SUBMITTED or UNDER_REVIEW.`
        );
      }
    }

    this.checkVersion(request.version, targetVersion, requestId);

    const nextVersion = request.version + 1;

    // Transition to APPROVED_PENDING_ACTIVATION
    const [updated] = await this.prisma.$transaction([
      this.prisma.limitRequest.update({
        where: { id: requestId },
        data: {
          status: LimitRequestStatus.APPROVED_PENDING_ACTIVATION,
          version: nextVersion,
        },
      }),
      this.prisma.decision.create({
        data: {
          requestId: request.id,
          decisionType: DecisionType.APPROVE,
          motive: motive.trim(),
          targetVersion,
          actorId: currentUser.id,
          actorRole: currentUser.role as Role,
        },
      }),
      this.prisma.requestVersion.create({
        data: {
          requestId: request.id,
          versionNumber: nextVersion,
          snapshot: {
            status: LimitRequestStatus.APPROVED_PENDING_ACTIVATION,
            approvalMotive: motive.trim(),
          },
          changeReason: `Approved by ${currentUser.role}: ${motive.trim()}`,
          createdById: currentUser.id,
        },
      }),
    ]);

    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'REQUEST_APPROVED',
      entityType: 'LimitRequest',
      entityId: request.id,
      entityVersion: nextVersion,
      details: { motive, approvedBy: currentUser.email, role: currentUser.role },
    });

    await this.notificationsService.notifyRequestApproved({
      clientUserId: request.customerProfile.userId,
      reference: request.reference,
      requestId: request.id,
      requestedLimit: Number(request.requestedLimit),
      approverName: `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`,
      assignedAdvisorId: request.assignedAdvisorId,
    });

    // Automatically trigger banking simulator activation asynchronously
    try {
      await this.bankingSimulator.activateLimit(requestId);
    } catch (err) {
      this.logger.warn(
        `Simulator activation deferred or failed: ${err.message}. Request remains in APPROVED_PENDING_ACTIVATION or ACTIVATION_FAILED.`
      );
    }

    return this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { account: true, decisions: true, activations: true },
    });
  }

  /**
   * 7. REJECT REQUEST (Advisor or Supervisor)
   */
  async rejectRequest(
    currentUser: UserSummary,
    requestId: string,
    motive: string,
    targetVersion: number,
  ) {
    if (
      currentUser.role !== Role.CONSEILLER &&
      currentUser.role !== Role.SUPERVISEUR &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('Only bank advisors and supervisors can reject requests');
    }

    if (!motive || motive.trim().length < 5) {
      throw new BadRequestException('A motivated rejection reason of at least 5 characters is mandatory');
    }

    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { customerProfile: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (
      request.status !== LimitRequestStatus.SUBMITTED &&
      request.status !== LimitRequestStatus.UNDER_REVIEW &&
      request.status !== LimitRequestStatus.PENDING_SUPERVISOR
    ) {
      throw new BadRequestException(
        `Cannot reject request in status ${request.status}. Must be in SUBMITTED, UNDER_REVIEW, or PENDING_SUPERVISOR.`
      );
    }

    this.checkVersion(request.version, targetVersion, requestId);

    const nextVersion = request.version + 1;

    const [updated] = await this.prisma.$transaction([
      this.prisma.limitRequest.update({
        where: { id: requestId },
        data: {
          status: LimitRequestStatus.REJECTED,
          version: nextVersion,
        },
      }),
      this.prisma.decision.create({
        data: {
          requestId: request.id,
          decisionType: DecisionType.REJECT,
          motive: motive.trim(),
          targetVersion,
          actorId: currentUser.id,
          actorRole: currentUser.role as Role,
        },
      }),
      this.prisma.requestVersion.create({
        data: {
          requestId: request.id,
          versionNumber: nextVersion,
          snapshot: {
            status: LimitRequestStatus.REJECTED,
            rejectionMotive: motive.trim(),
          },
          changeReason: `Rejected by ${currentUser.role}: ${motive.trim()}`,
          createdById: currentUser.id,
        },
      }),
    ]);

    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'REQUEST_REJECTED',
      entityType: 'LimitRequest',
      entityId: request.id,
      entityVersion: nextVersion,
      details: { motive, rejectedBy: currentUser.email },
    });

    await this.notificationsService.notifyRequestRejected({
      clientUserId: request.customerProfile.userId,
      reference: request.reference,
      requestId: request.id,
      motive: motive.trim(),
      rejecterName: `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`,
      assignedAdvisorId: request.assignedAdvisorId,
    });

    return updated;
  }

  /**
   * 8. CANCEL REQUEST (Client only, before first decision)
   */
  async cancelRequest(currentUser: UserSummary, requestId: string, targetVersion: number) {
    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { customerProfile: true, decisions: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (currentUser.role === Role.CLIENT && request.customerProfile.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to cancel this request');
    }

    // Check that no approval or rejection decision has occurred
    const hasFinalDecision = request.decisions.some(
      (d) => d.decisionType === DecisionType.APPROVE || d.decisionType === DecisionType.REJECT
    );

    if (hasFinalDecision) {
      throw new BadRequestException('Cannot cancel request after a decision has been issued.');
    }

    if (
      request.status !== LimitRequestStatus.DRAFT &&
      request.status !== LimitRequestStatus.SUBMITTED &&
      request.status !== LimitRequestStatus.UNDER_REVIEW &&
      request.status !== LimitRequestStatus.COMPLEMENT_REQUESTED
    ) {
      throw new BadRequestException(
        `Cannot cancel request in status ${request.status}. Cancellation is permitted only prior to decision.`
      );
    }

    this.checkVersion(request.version, targetVersion, requestId);

    const nextVersion = request.version + 1;

    const updated = await this.prisma.limitRequest.update({
      where: { id: requestId },
      data: {
        status: LimitRequestStatus.CANCELLED,
        version: nextVersion,
      },
    });

    await this.prisma.requestVersion.create({
      data: {
        requestId: request.id,
        versionNumber: nextVersion,
        snapshot: {
          status: LimitRequestStatus.CANCELLED,
        },
        changeReason: 'Client self-service cancellation',
        createdById: currentUser.id,
      },
    });

    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'REQUEST_CANCELLED',
      entityType: 'LimitRequest',
      entityId: request.id,
      entityVersion: nextVersion,
    });

    await this.notificationsService.notifyRequestCancelled({
      clientUserId: request.customerProfile.userId,
      reference: request.reference,
      requestId: request.id,
      clientName: `${currentUser.firstName} ${currentUser.lastName}`,
      assignedAdvisorId: request.assignedAdvisorId,
    });

    return updated;
  }
}
