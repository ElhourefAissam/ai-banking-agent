'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from '@/i18n';
import { Role } from '@proorga/shared-types';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Users,
  ShieldCheck,
  Bot,
  Activity,
  User,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const pathname = usePathname();

  if (!user) return null;

  const isClientDashboardActive = pathname === '/dashboard';
  const isNewRequestActive = pathname === '/requests/new';
  const isMyRequestsActive =
    pathname === '/requests' ||
    (pathname.startsWith('/requests/') && pathname !== '/requests/new');
  const isAiActive = pathname === '/ai';
  const isAdvisorActive = pathname.startsWith('/advisor');
  const isSupervisorActive = pathname.startsWith('/supervisor');
  const isAuditActive = pathname === '/audit';
  const isProfileActive = pathname === '/profile';

  const navContent = (
    <>
      <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
        {/* CLIENT TABS */}
        {user.role === Role.CLIENT && (
          <>
            <Link
              href="/dashboard"
              onClick={() => onClose?.()}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-start active:scale-[0.98] ${
                isClientDashboardActive
                  ? 'bg-brand-600 text-white font-semibold shadow-xs ring-1 ring-brand-400/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>{t('nav.dashboard')}</span>
            </Link>

            <Link
              href="/requests/new"
              onClick={() => onClose?.()}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-start active:scale-[0.98] ${
                isNewRequestActive
                  ? 'bg-brand-600 text-white font-semibold shadow-xs ring-1 ring-brand-400/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{t('nav.newRequest')}</span>
            </Link>

            <Link
              href="/requests"
              onClick={() => onClose?.()}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-start active:scale-[0.98] ${
                isMyRequestsActive
                  ? 'bg-brand-600 text-white font-semibold shadow-xs ring-1 ring-brand-400/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>{t('nav.myRequests')}</span>
            </Link>

            <Link
              href="/ai"
              onClick={() => onClose?.()}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-start active:scale-[0.98] ${
                isAiActive
                  ? 'bg-brand-600 text-white font-semibold shadow-xs ring-1 ring-brand-400/30'
                  : 'text-teal-400 hover:bg-slate-800/80 hover:text-teal-300'
              }`}
            >
              <Bot className="w-4 h-4 shrink-0" />
              <span>{t('nav.aiAssistant')}</span>
            </Link>
          </>
        )}

        {/* ADVISOR TABS */}
        {(user.role === Role.CONSEILLER || user.role === Role.ADMIN) && (
          <>
            <Link
              href="/advisor"
              onClick={() => onClose?.()}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-start active:scale-[0.98] ${
                isAdvisorActive
                  ? 'bg-brand-600 text-white font-semibold shadow-xs ring-1 ring-brand-400/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>{t('nav.portfolioQueue')}</span>
            </Link>
          </>
        )}

        {/* SUPERVISOR TABS */}
        {(user.role === Role.SUPERVISEUR || user.role === Role.ADMIN) && (
          <>
            <Link
              href="/supervisor"
              onClick={() => onClose?.()}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-start active:scale-[0.98] ${
                isSupervisorActive
                  ? 'bg-brand-600 text-white font-semibold shadow-xs ring-1 ring-brand-400/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400" />
              <span>{t('nav.supervisorQueue')}</span>
            </Link>
          </>
        )}

        <Link
          href="/profile"
          onClick={() => onClose?.()}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-start active:scale-[0.98] ${
            isProfileActive
              ? 'bg-brand-600 text-white font-semibold shadow-xs ring-1 ring-brand-400/30'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <User className="w-4 h-4 shrink-0 text-slate-400" />
          <span>{t('nav.profile')}</span>
        </Link>

        {(user.role === Role.CONSEILLER ||
          user.role === Role.SUPERVISEUR ||
          user.role === Role.ADMIN) && (
          <div className="pt-4 border-t border-slate-800/80 my-2 space-y-1.5">
            <Link
              href="/audit"
              onClick={() => onClose?.()}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-start active:scale-[0.98] ${
                isAuditActive
                  ? 'bg-brand-600 text-white font-semibold shadow-xs ring-1 ring-brand-400/30'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>{t('nav.auditTrail')}</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="font-medium">PROORGA v1.0</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-mono">EN LIGNE</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 border-e border-slate-800 select-none">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t(`roles.${user.role}`)} — Espace Dédié
          </span>
        </div>
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Sliding Content */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col shadow-2xl border-e border-slate-800 animate-in slide-in-from-start duration-200 select-none">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  PO
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  {t(`roles.${user.role}`)}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
