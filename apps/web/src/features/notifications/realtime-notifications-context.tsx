'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { NotificationItem, NotificationType } from '@proorga/shared-types';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  RotateCcw,
  XCircle,
  X,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export interface ActiveToast {
  id: string;
  notification: NotificationItem;
  createdAt: number;
}

interface RealtimeNotificationsContextType {
  unreadCount: number;
  notifications: NotificationItem[];
  isConnected: boolean;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissToast: (id: string) => void;
}

const RealtimeNotificationsContext = createContext<
  RealtimeNotificationsContextType | undefined
>(undefined);

export const RealtimeNotificationsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Play subtle, non-intrusive Web Audio API banking chime
  const playNotificationChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Soft dual-tone chord (D5 to A5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // Audio autoplay policy may suppress audio until user interaction
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const list = await api.getNotifications(40);
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch (err) {
      console.warn('Failed to load notifications list:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  // Connect to SSE (Server-Sent Events) Stream with Zero-Polling
  useEffect(() => {
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    // Initial load of past notifications
    refreshNotifications();

    const streamUrl = api.getNotificationStreamUrl();
    const es = new EventSource(streamUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        switch (payload.type) {
          case 'INITIAL_STATE':
            if (typeof payload.unreadCount === 'number') {
              setUnreadCount(payload.unreadCount);
            }
            break;

          case 'UNREAD_COUNT':
            if (typeof payload.unreadCount === 'number') {
              setUnreadCount(payload.unreadCount);
            }
            break;

          case 'NOTIFICATION':
            if (payload.notification) {
              const newNotif = payload.notification as NotificationItem;

              // Prepend to notifications list
              setNotifications((prev) => {
                if (prev.some((n) => n.id === newNotif.id)) return prev;
                return [newNotif, ...prev];
              });

              // Update unread count
              if (typeof payload.unreadCount === 'number') {
                setUnreadCount(payload.unreadCount);
              } else {
                setUnreadCount((prev) => prev + 1);
              }

              // Play gentle chime
              playNotificationChime();

              // Trigger Live Toast Notification Banner
              const toastItem: ActiveToast = {
                id: `${newNotif.id}-${Date.now()}`,
                notification: newNotif,
                createdAt: Date.now(),
              };

              setToasts((prev) => [toastItem, ...prev.slice(0, 3)]); // Keep at most 4 toasts

              // Auto dismiss toast after 6 seconds
              setTimeout(() => {
                dismissToast(toastItem.id);
              }, 6000);
            }
            break;

          case 'HEARTBEAT':
            // Keepalive ping, stream is healthy
            setIsConnected(true);
            break;

          default:
            break;
        }
      } catch (err) {
        console.warn('Error parsing SSE event data:', err);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      // Browser EventSource automatically retries connection
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [user?.id, refreshNotifications, playNotificationChime, dismissToast]);

  return (
    <RealtimeNotificationsContext.Provider
      value={{
        unreadCount,
        notifications,
        isConnected,
        isLoading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        dismissToast,
      }}
    >
      {children}

      {/* Floating Real-Time Toast Notifications Container */}
      <div
        className="fixed top-4 end-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const n = toast.notification;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xl flex items-start gap-3.5 transition-all animate-in slide-in-from-top-4 fade-in duration-200 hover:shadow-2xl hover:border-brand-300"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0 text-brand-700">
                {getNotificationIcon(n.type)}
              </div>

              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  markAsRead(n.id);
                  dismissToast(toast.id);
                  if (n.link) router.push(n.link);
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 px-1.5 py-0.2 bg-emerald-50 rounded border border-emerald-200">
                    En direct
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate block">
                    {n.title}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {n.message}
                </p>
                {n.link && (
                  <span className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1 mt-1.5">
                    <span>Consulter le dossier</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Fermer la notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </RealtimeNotificationsContext.Provider>
  );
};

export const useRealtimeNotifications = () => {
  const ctx = useContext(RealtimeNotificationsContext);
  if (!ctx) {
    throw new Error(
      'useRealtimeNotifications must be used within RealtimeNotificationsProvider'
    );
  }
  return ctx;
};

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.REQUEST_APPROVED:
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case NotificationType.REQUEST_REJECTED:
      return <XCircle className="w-4 h-4 text-red-600" />;
    case NotificationType.LIMIT_ACTIVATED:
      return <Zap className="w-4 h-4 text-emerald-600" />;
    case NotificationType.LIMIT_RESTORED:
      return <RotateCcw className="w-4 h-4 text-slate-600" />;
    case NotificationType.DOCUMENTS_REQUIRED:
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    case NotificationType.SUPERVISOR_PENDING:
      return <Clock className="w-4 h-4 text-indigo-600" />;
    case NotificationType.ADVISOR_REVIEWING:
      return <Clock className="w-4 h-4 text-blue-600" />;
    default:
      return <Bell className="w-4 h-4 text-brand-600" />;
  }
}
