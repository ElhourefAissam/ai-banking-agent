'use client';

import React from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from '@/i18n';
import { Role } from '@proorga/shared-types';
import {
  LayoutDashboard,
  CreditCard,
  PlusCircle,
  FileText,
  Users,
  ShieldCheck,
  Bot,
  Activity,
} from 'lucide-react';

export type NavigationTab =
  | 'client-dashboard'
  | 'client-new-request'
  | 'client-my-requests'
  | 'advisor-dashboard'
  | 'supervisor-dashboard'
  | 'audit-trail'
  | 'ai-chat';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-e border-slate-800 select-none">
      <div className="p-4 border-b border-slate-800/80">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {t(`roles.${user.role}`)} — Espace Dédié
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {/* CLIENT TABS */}
        {user.role === Role.CLIENT && (
          <>
            <button
              onClick={() => onSelectTab('client-dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-start ${
                currentTab === 'client-dashboard'
                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>{t('nav.dashboard')}</span>
            </button>

            <button
              onClick={() => onSelectTab('client-new-request')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-start ${
                currentTab === 'client-new-request'
                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{t('nav.newRequest')}</span>
            </button>

            <button
              onClick={() => onSelectTab('client-my-requests')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-start ${
                currentTab === 'client-my-requests'
                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>{t('nav.myRequests')}</span>
            </button>

            <button
              onClick={() => onSelectTab('ai-chat')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-start ${
                currentTab === 'ai-chat'
                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                  : 'text-teal-400 hover:bg-slate-800 hover:text-teal-300'
              }`}
            >
              <Bot className="w-4 h-4 shrink-0" />
              <span>{t('nav.aiAssistant')}</span>
            </button>
          </>
        )}

        {/* ADVISOR TABS */}
        {(user.role === Role.CONSEILLER || user.role === Role.ADMIN) && (
          <>
            <button
              onClick={() => onSelectTab('advisor-dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-start ${
                currentTab === 'advisor-dashboard'
                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>{t('nav.portfolioQueue')}</span>
            </button>
          </>
        )}

        {/* SUPERVISOR TABS */}
        {(user.role === Role.SUPERVISEUR || user.role === Role.ADMIN) && (
          <>
            <button
              onClick={() => onSelectTab('supervisor-dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-start ${
                currentTab === 'supervisor-dashboard'
                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400" />
              <span>{t('nav.supervisorQueue')}</span>
            </button>
          </>
        )}

        <div className="pt-4 border-t border-slate-800/80 my-2">
          <button
            onClick={() => onSelectTab('audit-trail')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-start ${
              currentTab === 'audit-trail'
                ? 'bg-brand-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>{t('nav.auditTrail')}</span>
          </button>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>PROORGA v1.0</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </aside>
  );
};
