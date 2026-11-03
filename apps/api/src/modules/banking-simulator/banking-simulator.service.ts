import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ActivationStatus,
  LimitRequestStatus,
  SimulationFailureMode,
} from '@proorga/shared-types';
import { createHash } from 'crypto';

@Injectable()
export class BankingSimulatorService {
  private readonly logger = new Logger(BankingSimulatorService.name);
  private currentFailureMode: SimulationFailureMode = SimulationFailureMode.NONE;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {
    const envMode = process.env.SIMULATE_FAILURE as SimulationFailureMode;
    if (envMode && Object.values(SimulationFailureMode).includes(envMode)) {
      this.currentFailureMode = envMode;
    }
  }

  setFailureMode(mode: SimulationFailureMode) {
    this.logger.warn(`Simulator failure mode changed to: ${mode}`);
    this.currentFailureMode = mode;
  }

  getFailureMode(): SimulationFailureMode {
    return this.currentFailureMode;
  }

  generateIdempotencyKey(requestId: string, version: number): string {
    return createHash('sha256')
      .update(`PROORGA_LIMIT_ACTIVATION:${requestId}:${version}`)
      .digest('hex');
  }

  async activateLimit(requestId: string, overrideIdempotencyKey?: string) {
    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { account: true },
    });

    if (!request) {
      throw new BadRequestException(`Request ${requestId} not found`);
    }

    if (
      request.status !== LimitRequestStatus.APPROVED_PENDING_ACTIVATION &&
      request.status !== LimitRequestStatus.ACTIVATION_FAILED
    ) {
      throw new BadRequestException(
        `Cannot activate limit for request in status ${request.status}. Must be in APPROVED_PENDING_ACTIVATION or ACTIVATION_FAILED.`
      );
    }

    const idempotencyKey =
      overrideIdempotencyKey || this.generateIdempotencyKey(request.id, request.version);

    // 1. Check existing activation for idempotency
    const existingActivation = await this.prisma.bankingActivation.findUnique({
      where: { idempotencyKey },
    });

    if (existingActivation && existingActivation.status === ActivationStatus.SUCCESS) {
      this.logger.log(
        `[IDEMPOTENT HIT] Limit already activated for request ${requestId} with key ${idempotencyKey}`
      );

      // Make sure request is marked ACTIVE if somehow it was stale
      if ((request.status as string) !== LimitRequestStatus.ACTIVE) {
        await this.prisma.limitRequest.update({
          where: { id: requestId },
          data: { status: LimitRequestStatus.ACTIVE },
        });
      }

      return {
        success: true,
        alreadyApplied: true,
        status: LimitRequestStatus.ACTIVE,
        idempotencyKey,
        currentLimit: Number(request.requestedLimit),
      };
    }

    // Record or update activation attempt
    let activation = existingActivation;
    if (!activation) {
      activation = await this.prisma.bankingActivation.create({
        data: {
          requestId: request.id,
          idempotencyKey,
          status: ActivationStatus.PENDING,
          limitApplied: request.requestedLimit,
          attemptNumber: 1,
        },
      });
    } else {
      activation = await this.prisma.bankingActivation.update({
        where: { id: activation.id },
        data: {
          attemptNumber: { increment: 1 },
          status: ActivationStatus.PENDING,
        },
      });
    }

    // 2. Evaluate Simulated Failure Scenarios
    if (this.currentFailureMode === SimulationFailureMode.NETWORK_TIMEOUT) {
      this.logger.warn(`Simulating NETWORK_TIMEOUT during activation of request ${requestId}`);
      await this.prisma.$transaction([
        this.prisma.bankingActivation.update({
          where: { id: activation.id },
          data: {
            status: ActivationStatus.FAILED,
            failureReason: 'SIMULATED: Network socket timeout contacting Core Banking Switch (ISO-8583)',
          },
        }),
        this.prisma.limitRequest.update({
          where: { id: requestId },
          data: { status: LimitRequestStatus.ACTIVATION_FAILED },
        }),
      ]);

      await this.auditService.logEvent({
        action: 'ACTIVATION_FAILED_TIMEOUT',
        entityType: 'LimitRequest',
        entityId: requestId,
        entityVersion: request.version,
        details: { failureMode: this.currentFailureMode, idempotencyKey },
      });

      throw new InternalServerErrorException(
        'Core banking switch timeout (SIMULATED: NETWORK_TIMEOUT). Status set to ACTIVATION_FAILED.'
      );
    }

    if (this.currentFailureMode === SimulationFailureMode.BANK_500) {
      this.logger.warn(`Simulating BANK_500 during activation of request ${requestId}`);
      await this.prisma.$transaction([
        this.prisma.bankingActivation.update({
          where: { id: activation.id },
          data: {
            status: ActivationStatus.FAILED,
            failureReason: 'SIMULATED: Core Banking Host Internal Error 500',
          },
        }),
        this.prisma.limitRequest.update({
          where: { id: requestId },
          data: { status: LimitRequestStatus.ACTIVATION_FAILED },
        }),
      ]);

      throw new InternalServerErrorException('Core banking host returned HTTP 500 error.');
    }

    if (this.currentFailureMode === SimulationFailureMode.LOST_ACK) {
      this.logger.warn(`Simulating LOST_ACK: limit applied internally, but response was lost in transit.`);
      
      const now = new Date();
      const expiry = new Date(now.getTime() + request.durationDays * 24 * 60 * 60 * 1000);

      // Core actually applies limit
      await this.prisma.$transaction([
        this.prisma.account.update({
          where: { id: request.accountId },
          data: {
            currentTransferLimit: request.requestedLimit,
            activeLimitExpiry: expiry,
          },
        }),
        this.prisma.bankingActivation.update({
          where: { id: activation.id },
          data: {
            status: ActivationStatus.SUCCESS,
            activatedAt: now,
          },
        }),
        this.prisma.limitRequest.update({
          where: { id: requestId },
          data: {
            status: LimitRequestStatus.ACTIVATION_FAILED, // UI perceives it as failed/lost
            activeFrom: now,
            activeUntil: expiry,
          },
        }),
      ]);

      // Turn off LOST_ACK mode after firing once so subsequent retry will successfully fetch existing activation!
      this.currentFailureMode = SimulationFailureMode.NONE;

      throw new InternalServerErrorException(
        'Host connection dropped before receiving ACK (SIMULATED: LOST_ACK). Retry will safely verify status.'
      );
    }

    // 3. Normal Successful Activation
    const now = new Date();
    const expiry = new Date(now.getTime() + request.durationDays * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: request.accountId },
        data: {
          currentTransferLimit: request.requestedLimit,
          activeLimitExpiry: expiry,
        },
      }),
      this.prisma.bankingActivation.update({
        where: { id: activation.id },
        data: {
          status: ActivationStatus.SUCCESS,
          activatedAt: now,
        },
      }),
      this.prisma.limitRequest.update({
        where: { id: requestId },
        data: {
          status: LimitRequestStatus.ACTIVE,
          activeFrom: now,
          activeUntil: expiry,
        },
      }),
    ]);

    await this.auditService.logEvent({
      action: 'LIMIT_ACTIVATED',
      entityType: 'LimitRequest',
      entityId: requestId,
      entityVersion: request.version,
      details: {
        limitApplied: Number(request.requestedLimit),
        durationDays: request.durationDays,
        activeUntil: expiry.toISOString(),
        idempotencyKey,
      },
    });

    this.logger.log(`Successfully activated limit ${request.requestedLimit} DH for request ${requestId}`);

    return {
      success: true,
      alreadyApplied: false,
      status: LimitRequestStatus.ACTIVE,
      limitApplied: Number(request.requestedLimit),
      activeUntil: expiry.toISOString(),
      idempotencyKey,
    };
  }

  async restoreLimit(requestId: string) {
    const request = await this.prisma.limitRequest.findUnique({
      where: { id: requestId },
      include: { account: true, activations: true },
    });

    if (!request) {
      throw new BadRequestException(`Request ${requestId} not found`);
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: request.accountId },
        data: {
          currentTransferLimit: request.account.initialTransferLimit,
          activeLimitExpiry: null,
        },
      }),
      this.prisma.limitRequest.update({
        where: { id: requestId },
        data: {
          status: LimitRequestStatus.EXPIRED,
        },
      }),
      this.prisma.bankingActivation.updateMany({
        where: { requestId: request.id },
        data: {
          restoredAt: now,
        },
      }),
    ]);

    await this.auditService.logEvent({
      action: 'LIMIT_EXPIRED_AND_RESTORED',
      entityType: 'LimitRequest',
      entityId: requestId,
      entityVersion: request.version,
      details: {
        restoredLimit: Number(request.account.initialTransferLimit),
        restoredAt: now.toISOString(),
      },
    });

    this.logger.log(
      `Restored initial transfer limit (${request.account.initialTransferLimit} DH) for request ${requestId}`
    );

    return {
      success: true,
      status: LimitRequestStatus.EXPIRED,
      currentTransferLimit: Number(request.account.initialTransferLimit),
    };
  }

  async checkAndExpireLimits() {
    const now = new Date();
    const expiredRequests = await this.prisma.limitRequest.findMany({
      where: {
        status: LimitRequestStatus.ACTIVE,
        activeUntil: {
          lte: now,
        },
      },
    });

    this.logger.log(`Checking expirations: found ${expiredRequests.length} active requests ready to expire.`);

    const results = [];
    for (const req of expiredRequests) {
      const result = await this.restoreLimit(req.id);
      results.push({ requestId: req.id, reference: req.reference, ...result });
    }

    return {
      checkedAt: now.toISOString(),
      expiredCount: results.length,
      expiredRequests: results,
    };
  }
}
