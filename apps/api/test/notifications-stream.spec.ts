import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { NotificationType } from '@proorga/shared-types';
import { firstValueFrom, take, toArray } from 'rxjs';

describe('Notifications Real-Time Stream (SSE Zero-Polling) Unit Tests', () => {
  let service: NotificationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };
    service = new NotificationsService(mockPrisma as any);
  });

  it('should emit INITIAL_STATE immediately upon user stream subscription with unreadCount', async () => {
    mockPrisma.notification.count.mockResolvedValue(4);

    const stream$ = service.getUserStream('user-1');
    const firstEvent = await firstValueFrom(stream$);

    expect(firstEvent).toBeDefined();
    expect(firstEvent.data.type).toBe('INITIAL_STATE');
    expect(firstEvent.data.unreadCount).toBe(4);
  });

  it('should push real-time NOTIFICATION event to subscriber when a notification is created', async () => {
    mockPrisma.notification.count.mockResolvedValue(1);
    mockPrisma.notification.create.mockResolvedValue({
      id: 'notif-123',
      userId: 'user-client-1',
      type: NotificationType.LIMIT_ACTIVATED,
      title: 'Plafond activé',
      message: 'Votre plafond est actif',
      link: '/requests?ref=REQ-2026-0001',
      read: false,
      metadata: {},
      createdAt: new Date('2026-11-05T01:00:00Z'),
      readAt: null,
    });

    const stream$ = service.getUserStream('user-client-1');

    // Subscribe and collect 2 events: INITIAL_STATE + NOTIFICATION
    const eventsPromise = firstValueFrom(stream$.pipe(take(2), toArray()));

    // Create notification asynchronously
    setTimeout(async () => {
      await service.createNotification({
        userId: 'user-client-1',
        type: NotificationType.LIMIT_ACTIVATED,
        title: 'Plafond activé',
        message: 'Votre plafond est actif',
        link: '/requests?ref=REQ-2026-0001',
      });
    }, 20);

    const events = await eventsPromise;
    expect(events.length).toBe(2);
    expect(events[0].data.type).toBe('INITIAL_STATE');
    expect(events[1].data.type).toBe('NOTIFICATION');
    expect(events[1].data.notification.id).toBe('notif-123');
    expect(events[1].data.unreadCount).toBe(1);
  });

  it('should isolate notification streams so user A does not receive user B events', async () => {
    mockPrisma.notification.count.mockResolvedValue(0);
    mockPrisma.notification.create.mockResolvedValue({
      id: 'notif-user-b',
      userId: 'user-B',
      type: NotificationType.REQUEST_APPROVED,
      title: 'Approuvé',
      message: 'Demande approuvée',
      read: false,
      metadata: {},
      createdAt: new Date(),
    });

    const streamA$ = service.getUserStream('user-A');

    let receivedByA: any = null;
    const sub = streamA$.subscribe((evt) => {
      if (evt.data.type === 'NOTIFICATION') {
        receivedByA = evt;
      }
    });

    // Create notification for user B
    await service.createNotification({
      userId: 'user-B',
      type: NotificationType.REQUEST_APPROVED,
      title: 'Approuvé',
      message: 'Demande approuvée',
    });

    // Wait a brief tick
    await new Promise((r) => setTimeout(r, 50));
    sub.unsubscribe();

    expect(receivedByA).toBeNull();
  });
});
