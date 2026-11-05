'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from '@/i18n';
import { useRealtimeNotifications } from './realtime-notifications-context';
import { NotificationItem, NotificationType } from '@proorga/shared-types';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Zap,
  RotateCcw,
  XCircle,
  ShieldAlert,
  ChevronRight,
  Radio,
} from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { t, formatDate } = useTranslation();

  const {
    unreadCount,
    notifications,
    isConnected,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useRealtimeNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
    }
  }, [isOpen, refreshNotifications]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    if (notif.link) {
      setIsOpen(false);
      router.push(notif.link);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.REQUEST_SUBMITTED:
        return (
          <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200/80 flex items-center justify-center text-brand-700 shrink-0">
            <Send className="w-4 h-4" />
          </div>
        );
      case NotificationType.ADVISOR_REVIEWING:
        return (
          <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-700 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case NotificationType.DOCUMENTS_REQUIRED:
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case NotificationType.SUPERVISOR_PENDING:
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-700 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      case NotificationType.REQUEST_APPROVED:
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case NotificationType.REQUEST_REJECTED:
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-700 shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      case NotificationType.LIMIT_ACTIVATED:
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300/80 flex items-center justify-center text-emerald-800 shrink-0 shadow-2xs">
            <Zap className="w-4 h-4" />
          </div>
        );
      case NotificationType.LIMIT_RESTORED:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200/80 flex items-center justify-center text-brand-700 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  const filteredNotifications =
    filter === 'UNREAD'
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
        aria-label="Centre de notifications bancaires"
        title={isConnected ? 'Centre de notifications (Live SSE connecté)' : 'Centre de notifications'}
      >
        <Bell className="w-4 h-4" />
        
        {/* Live SSE Zero-Polling Status Dot */}
        {isConnected ? (
          <span
            className="absolute bottom-1 end-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"
            title="Temps Réel Actif (SSE Zero-Polling)"
          >
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </span>
        ) : (
          <span
            className="absolute bottom-1 end-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white"
            title="Connexion en cours..."
          />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold text-white bg-rose-600 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute end-0 mt-2 w-[340px] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-900 flex items-center justify-center text-white">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {t('notifications.title')}
                    </h3>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live SSE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Connexion...
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {unreadCount > 0
                      ? `${unreadCount} ${t('notifications.unreadBadge')}`
                      : 'À jour (Zero-Polling)'}
                  </span>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-brand-700 hover:text-brand-900 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{t('notifications.markAllAsRead')}</span>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'ALL'
                    ? 'bg-brand-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {t('notifications.all')} ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('UNREAD')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'UNREAD'
                    ? 'bg-brand-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {t('notifications.unread')} ({unreadCount})
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-6 h-6 border-2 border-brand-900 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">{t('common.loading')}</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-xs font-medium text-slate-600">
                  {filter === 'UNREAD'
                    ? t('notifications.emptyUnread')
                    : t('notifications.empty')}
                </p>
                <p className="text-[11px] text-slate-400">
                  Les alertes d'avancement de vos demandes s'afficheront ici.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isUnread = !n.read;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                      isUnread
                        ? 'bg-brand-50/40 hover:bg-brand-50/70'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Event Icon */}
                    {getNotificationIcon(n.type)}

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-xs block leading-tight ${
                            isUnread
                              ? 'font-bold text-slate-900 group-hover:text-brand-900'
                              : 'font-semibold text-slate-800'
                          }`}
                        >
                          {n.title}
                        </span>
                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-1"
                            title="Non lu"
                          />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                        <span className="font-mono">
                          {formatDate(n.createdAt)}
                        </span>
                        {n.link && (
                          <span className="inline-flex items-center gap-1 font-medium text-brand-700 group-hover:underline">
                            <span>Consulter</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
