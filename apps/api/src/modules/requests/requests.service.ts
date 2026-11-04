import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import {
  Role,
  LimitRequestStatus,
  UserSummary,
  CreateDraftInput,
  UpdateDraftInput,
  SubmitRequestInput,
  MotivatedDecisionInput,
  RespondComplementInput,
} from '@proorga/shared-types';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private workflowService: WorkflowService,
    private notificationsService: NotificationsService,
  ) {}

  async getMyRequests(currentUser: UserSummary) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: currentUser.id },
    });

    if (!profile) {
      return [];
    }

    return this.prisma.limitRequest.findMany({
      where: { customerProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        account: true,
        decisions: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        documents: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        activations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getAdvisorQueue(currentUser: UserSummary, statusFilter?: LimitRequestStatus) {
    if (currentUser.role !== Role.CONSEILLER && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only advisors can access the portfolio queue');
    }

    return this.prisma.limitRequest.findMany({
      where: statusFilter ? { status: statusFilter } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        account: true,
        customerProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        decisions: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        documents: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        activations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getSupervisorQueue(currentUser: UserSummary, statusFilter?: LimitRequestStatus) {
    if (currentUser.role !== Role.SUPERVISEUR && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only supervisors can access the escalated requests queue');
    }

    return this.prisma.limitRequest.findMany({
      where: statusFilter
        ? { status: statusFilter }
        : {
            OR: [
              { status: LimitRequestStatus.PENDING_SUPERVISOR },
              { requestedLimit: { gt: 30000 } },
              {
                decisions: {
                  some: {
                    actorRole: Role.SUPERVISEUR,
                  },
                },
              },
            ],
          },
      orderBy: { createdAt: 'desc' },
      include: {
        account: true,
        customerProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        decisions: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        documents: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        activations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getRequestById(requestIdOrRef: string, currentUser: UserSummary) {
    const request = await this.prisma.limitRequest.findFirst({
      where: {
        OR: [{ id: requestIdOrRef }, { reference: requestIdOrRef }],
      },
      include: {
        account: true,
        customerProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        decisions: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        activations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestIdOrRef} not found`);
    }

    // Role-based authorization & IDOR defense
    if (
      currentUser.role === Role.CLIENT &&
      request.customerProfile.userId !== currentUser.id
    ) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED_IDOR',
        message: 'You are not authorized to view this request.',
      });
    }

    // If an advisor opens a SUBMITTED request for examination, transition to UNDER_REVIEW and notify the client
    if (
      currentUser.role === Role.CONSEILLER &&
      request.status === LimitRequestStatus.SUBMITTED
    ) {
      await this.prisma.limitRequest.update({
        where: { id: request.id },
        data: {
          status: LimitRequestStatus.UNDER_REVIEW,
          assignedAdvisorId: currentUser.id,
        },
      });
      request.status = LimitRequestStatus.UNDER_REVIEW;
      request.assignedAdvisorId = currentUser.id;

      await this.notificationsService.notifyAdvisorReviewing({
        clientUserId: request.customerProfile.userId,
        reference: request.reference,
        advisorName: `${currentUser.firstName} ${currentUser.lastName}`,
      });
    }

    return request;
  }

  async createDraft(currentUser: UserSummary, dto: CreateDraftInput) {
    return this.workflowService.createDraft(currentUser, dto);
  }

  async updateDraft(currentUser: UserSummary, requestId: string, dto: UpdateDraftInput) {
    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { customerProfile: true },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (currentUser.role === Role.CLIENT && request.customerProfile.userId !== currentUser.id) {
      throw new ForbiddenException('Not authorized to update this draft');
    }

    if (request.status !== LimitRequestStatus.DRAFT) {
      throw new BadRequestException('Only requests in DRAFT status can be modified directly');
    }

    if (request.version !== dto.targetVersion) {
      throw new BadRequestException('Target version mismatch. Please reload.');
    }

    const nextVersion = request.version + 1;

    return this.prisma.limitRequest.update({
      where: { id: requestId },
      data: {
        requestedLimit: dto.requestedLimit !== undefined ? dto.requestedLimit : request.requestedLimit,
        durationDays: dto.durationDays !== undefined ? dto.durationDays : request.durationDays,
        reason: dto.reason ? dto.reason.trim() : request.reason,
        version: nextVersion,
      },
    });
  }

  async submitRequest(currentUser: UserSummary, requestId: string, dto: SubmitRequestInput) {
    return this.workflowService.submitRequest(currentUser, requestId, dto.targetVersion);
  }

  async requestComplement(
    currentUser: UserSummary,
    requestId: string,
    dto: MotivatedDecisionInput,
  ) {
    return this.workflowService.requestComplement(
      currentUser,
      requestId,
      dto.motive,
      dto.targetVersion,
    );
  }

  async resubmitComplement(
    currentUser: UserSummary,
    requestId: string,
    dto: RespondComplementInput,
  ) {
    return this.workflowService.resubmitComplement(currentUser, requestId, dto);
  }

  async recommendApproval(
    currentUser: UserSummary,
    requestId: string,
    dto: MotivatedDecisionInput,
  ) {
    return this.workflowService.recommendApproval(
      currentUser,
      requestId,
      dto.motive,
      dto.targetVersion,
    );
  }

  async approveRequest(
    currentUser: UserSummary,
    requestId: string,
    dto: MotivatedDecisionInput,
  ) {
    return this.workflowService.approveRequest(
      currentUser,
      requestId,
      dto.motive,
      dto.targetVersion,
    );
  }

  async rejectRequest(
    currentUser: UserSummary,
    requestId: string,
    dto: MotivatedDecisionInput,
  ) {
    return this.workflowService.rejectRequest(
      currentUser,
      requestId,
      dto.motive,
      dto.targetVersion,
    );
  }

  async cancelRequest(
    currentUser: UserSummary,
    requestId: string,
    dto: SubmitRequestInput,
  ) {
    return this.workflowService.cancelRequest(currentUser, requestId, dto.targetVersion);
  }
}
