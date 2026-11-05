import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Role, NotificationItem } from '@proorga/shared-types';
import { Subject, Observable, merge, interval, defer } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface NotificationStreamEvent {
  userId: string;
  type: 'NOTIFICATION' | 'UNREAD_COUNT';
  notification?: NotificationItem;
  unreadCount: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly notificationStream$ = new Subject<NotificationStreamEvent>();

  constructor(private prisma: PrismaService) {}

  /**
   * Return a real-time reactive SSE stream for a specific authenticated user.
   */
  getUserStream(userId: string): Observable<{ data: any }> {
    // 1. Send current unread count immediately upon connection
    const initial$ = defer(async () => {
      const unreadCount = await this.getUnreadCount(userId);
      return {
        data: {
          type: 'INITIAL_STATE',
          unreadCount,
          timestamp: new Date().toISOString(),
        },
      };
    });

    // 2. Stream domain events tailored to this user
    const userEvents$ = this.notificationStream$.pipe(
      filter((evt) => evt.userId === userId),
      map((evt) => ({
        data: {
          type: evt.type,
          notification: evt.notification,
          unreadCount: evt.unreadCount,
          timestamp: new Date().toISOString(),
        },
      }))
    );

    // 3. Keep-alive heartbeat every 20s to ensure zero connection drops
    const heartbeat$ = interval(20000).pipe(
      map(() => ({
        data: {
          type: 'HEARTBEAT',
          timestamp: new Date().toISOString(),
        },
      }))
    );

    return merge(initial$, userEvents$, heartbeat$);
  }

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }): Promise<NotificationItem> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: data.metadata || {},
      },
    });

    const mapped: NotificationItem = {
      id: notification.id,
      userId: notification.userId,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      read: notification.read,
      metadata: notification.metadata as Record<string, any>,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() || null,
    };

    // Calculate updated unread count and push real-time SSE event (Zero Polling)
    try {
      const unreadCount = await this.getUnreadCount(data.userId);
      this.notificationStream$.next({
        userId: data.userId,
        type: 'NOTIFICATION',
        notification: mapped,
        unreadCount,
      });
    } catch (err) {
      this.logger.warn(`Failed to dispatch real-time notification to stream: ${err}`);
    }

    return mapped;
  }

  async getNotificationsForUser(userId: string, limit = 50): Promise<NotificationItem[]> {
    const list = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return list.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      metadata: n.metadata as Record<string, any>,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() || null,
    }));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationItem> {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    const mappedResult: NotificationItem = {
      id: updated.id,
      userId: updated.userId,
      type: updated.type as NotificationType,
      title: updated.title,
      message: updated.message,
      link: updated.link,
      read: updated.read,
      metadata: updated.metadata as Record<string, any>,
      createdAt: updated.createdAt.toISOString(),
      readAt: updated.readAt?.toISOString() || null,
    };

    try {
      const unreadCount = await this.getUnreadCount(userId);
      this.notificationStream$.next({
        userId,
        type: 'UNREAD_COUNT',
        unreadCount,
      });
    } catch (err) {
      this.logger.warn(`Failed to push unread count update: ${err}`);
    }

    return mappedResult;
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    try {
      this.notificationStream$.next({
        userId,
        type: 'UNREAD_COUNT',
        unreadCount: 0,
      });
    } catch (err) {
      this.logger.warn(`Failed to push unread count update: ${err}`);
    }

    return { count: res.count };
  }

  // =========================================================================
  // Smart Domain Event Handlers
  // =========================================================================

  /**
   * 1. Request Submitted
   */
  async notifyRequestSubmitted(params: {
    clientUserId: string;
    reference: string;
    requestedLimit: number;
    durationDays: number;
    clientName: string;
    assignedAdvisorId?: string | null;
  }) {
    // 1a. Notify Client
    await this.createNotification({
      userId: params.clientUserId,
      type: NotificationType.REQUEST_SUBMITTED,
      title: `Demande ${params.reference} soumise`,
      message: `Votre demande de relèvement à ${params.requestedLimit.toLocaleString('fr-FR')} DH pour ${params.durationDays} jours a été enregistrée avec succès.`,
      link: `/requests?ref=${params.reference}`,
      metadata: { reference: params.reference, requestedLimit: params.requestedLimit },
    });

    // 1b. Notify Advisor(s)
    let advisorIds: string[] = [];
    if (params.assignedAdvisorId) {
      advisorIds = [params.assignedAdvisorId];
    } else {
      const advisors = await this.prisma.user.findMany({
        where: { role: Role.CONSEILLER },
        select: { id: true },
        take: 5,
      });
      advisorIds = advisors.map((a) => a.id);
    }

    for (const advId of advisorIds) {
      await this.createNotification({
        userId: advId,
        type: NotificationType.REQUEST_SUBMITTED,
        title: `Nouveau dossier ${params.reference}`,
        message: `Dossier de ${params.requestedLimit.toLocaleString('fr-FR')} DH soumis par ${params.clientName}.`,
        link: `/advisor?ref=${params.reference}`,
        metadata: { reference: params.reference, requestedLimit: params.requestedLimit },
      });
    }
  }

  /**
   * 2. Advisor Reviewing Request
   */
  async notifyAdvisorReviewing(params: {
    clientUserId: string;
    reference: string;
    advisorName: string;
  }) {
    await this.createNotification({
      userId: params.clientUserId,
      type: NotificationType.ADVISOR_REVIEWING,
      title: `Dossier en cours d'examen — ${params.reference}`,
      message: `Votre conseiller (${params.advisorName}) étudie actuellement les éléments de votre dossier.`,
      link: `/requests?ref=${params.reference}`,
      metadata: { reference: params.reference },
    });
  }

  /**
   * 3. Additional Documents Required
   */
  async notifyDocumentsRequired(params: {
    clientUserId: string;
    reference: string;
    motive: string;
  }) {
    await this.createNotification({
      userId: params.clientUserId,
      type: NotificationType.DOCUMENTS_REQUIRED,
      title: `Justificatif ou complément requis — ${params.reference}`,
      message: `Votre conseiller sollicite des informations complémentaires : "${params.motive}".`,
      link: `/requests?ref=${params.reference}`,
      metadata: { reference: params.reference, motive: params.motive },
    });
  }

  /**
   * 4. Supervisor Approval Pending
   */
  async notifySupervisorPending(params: {
    clientUserId: string;
    reference: string;
    requestedLimit: number;
    advisorName: string;
  }) {
    // 4a. Notify Client
    await this.createNotification({
      userId: params.clientUserId,
      type: NotificationType.SUPERVISOR_PENDING,
      title: `Arbitrage hiérarchique — ${params.reference}`,
      message: `Votre demande de ${params.requestedLimit.toLocaleString('fr-FR')} DH a été recommandée favorablement et transmise au superviseur.`,
      link: `/requests?ref=${params.reference}`,
      metadata: { reference: params.reference, requestedLimit: params.requestedLimit },
    });

    // 4b. Notify Supervisors
    const supervisors = await this.prisma.user.findMany({
      where: { role: Role.SUPERVISEUR },
      select: { id: true },
    });

    for (const sup of supervisors) {
      await this.createNotification({
        userId: sup.id,
        type: NotificationType.SUPERVISOR_PENDING,
        title: `Validation superviseur requise — ${params.reference}`,
        message: `Dossier de ${params.requestedLimit.toLocaleString('fr-FR')} DH recommandé par ${params.advisorName}. En attente de votre arbitrage.`,
        link: `/supervisor?ref=${params.reference}`,
        metadata: { reference: params.reference, requestedLimit: params.requestedLimit },
      });
    }
  }

  /**
   * 5. Request Approved or Rejected
   */
  async notifyRequestApproved(params: {
    clientUserId: string;
    reference: string;
    requestedLimit: number;
    approverName: string;
  }) {
    await this.createNotification({
      userId: params.clientUserId,
      type: NotificationType.REQUEST_APPROVED,
      title: `Demande approuvée — ${params.reference}`,
      message: `Excellente nouvelle ! Votre demande de relèvement à ${params.requestedLimit.toLocaleString('fr-FR')} DH a été formellement validée par ${params.approverName}.`,
      link: `/requests?ref=${params.reference}`,
      metadata: { reference: params.reference, requestedLimit: params.requestedLimit },
    });
  }

  async notifyRequestRejected(params: {
    clientUserId: string;
    reference: string;
    motive: string;
    rejecterName: string;
  }) {
    await this.createNotification({
      userId: params.clientUserId,
      type: NotificationType.REQUEST_REJECTED,
      title: `Demande non accordée — ${params.reference}`,
      message: `Votre demande ${params.reference} n'a pas été retenue. Motif : "${params.motive}".`,
      link: `/requests?ref=${params.reference}`,
      metadata: { reference: params.reference, motive: params.motive },
    });
  }

  /**
   * 6. Temporary Limit Activated
   */
  async notifyLimitActivated(params: {
    clientUserId: string;
    reference: string;
    limitApplied: number;
    activeUntil: Date | string;
  }) {
    const dateFormatted = new Date(params.activeUntil).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    await this.createNotification({
      userId: params.clientUserId,
      type: NotificationType.LIMIT_ACTIVATED,
      title: `Plafond temporaire activé — ${params.reference}`,
      message: `Votre plafond de virement de ${params.limitApplied.toLocaleString('fr-FR')} DH est maintenant actif jusqu'au ${dateFormatted}.`,
      link: `/requests?ref=${params.reference}`,
      metadata: { reference: params.reference, limitApplied: params.limitApplied, activeUntil: params.activeUntil },
    });
  }

  /**
   * 7. Temporary Limit Restored
   */
  async notifyLimitRestored(params: {
    clientUserId: string;
    reference: string;
    restoredLimit: number;
  }) {
    await this.createNotification({
      userId: params.clientUserId,
      type: NotificationType.LIMIT_RESTORED,
      title: `Plafond standard rétabli — ${params.reference}`,
      message: `La période temporaire du dossier ${params.reference} est expirée. Votre plafond initial de ${params.restoredLimit.toLocaleString('fr-FR')} DH a été rétabli.`,
      link: `/requests?ref=${params.reference}`,
      metadata: { reference: params.reference, restoredLimit: params.restoredLimit },
    });
  }
}
