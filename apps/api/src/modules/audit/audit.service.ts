import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogParams {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  entityVersion?: number | null;
  ipAddress?: string | null;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async logEvent(params: CreateAuditLogParams) {
    try {
      const event = await this.prisma.auditEvent.create({
        data: {
          actorId: params.actorId || null,
          actorEmail: params.actorEmail || null,
          actorRole: params.actorRole || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityVersion: params.entityVersion || null,
          ipAddress: params.ipAddress || null,
          details: params.details || {},
        },
      });

      this.logger.log(
        `AUDIT [${params.action}] entity=${params.entityType}:${params.entityId} actor=${params.actorEmail || 'system'} role=${params.actorRole}`
      );

      return event;
    } catch (err) {
      this.logger.error(`Failed to record audit event: ${err.message}`, err.stack);
    }
  }

  async getAuditTrailForEntity(entityType: string, entityId: string) {
    return this.prisma.auditEvent.findMany({
      where: { entityType, entityId },
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
    });
  }

  async getAllAuditEvents(limit = 50, actionFilter?: string) {
    return this.prisma.auditEvent.findMany({
      where: actionFilter ? { action: actionFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
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
    });
  }
}
