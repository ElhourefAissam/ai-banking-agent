'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, DEMO_ACCOUNTS } from '@/features/auth/auth-context';
import { useTranslation, Locale } from '@/i18n';
import {
  Globe,
  UserCheck,
  ChevronDown,
  Cpu,
  Sparkles,
  Menu,
  User,
} from 'lucide-react';
import { NotificationCenter } from '@/features/notifications/notification-center';

interface HeaderProps {
  onOpenAiChat?: () => void;
  onOpenSimulator?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAiChat,
  onOpenSimulator,
  onToggleMobileMenu,
}) => {
  const router = useRouter();
  const { user, quickSwitch } = useAuth();
  const { locale, setLocale, t } = useTranslation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Hamburger & Brand */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-900 flex items-center justify-center text-white font-bold text-base shadow-sm tracking-wider shrink-0">
            PO
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                PROORGA
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200/60 uppercase">
                Core
              </span>
            </div>
            <span className="text-[10px] text-slate-400 hidden lg:block">
              AI Banking Workflow Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Right Actions: AI Chat button, Simulator button, Language Selector, Demo Account Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Open AI Assistant Button */}
        {onOpenAiChat ? (
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
            title="Assistant IA Bancaire"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="hidden md:inline">{t('nav.aiAssistant')}</span>
          </button>
        ) : (
          <Link
            href="/ai"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
            title="Assistant IA Bancaire"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="hidden md:inline">{t('nav.aiAssistant')}</span>
          </Link>
        )}

        {/* Simulator Modal Trigger */}
        {onOpenSimulator && (
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 active:scale-[0.98] transition-all cursor-pointer"
            title="Simulateur de Switch & Pannes"
          >
            <Cpu className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="hidden lg:inline">{t('nav.simulator')}</span>
          </button>
        )}

        {/* Smart Notification Center */}
        <NotificationCenter />

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setIsLangMenuOpen(!isLangMenuOpen);
              setIsUserMenuOpen(false);
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
            aria-label="Changer de langue"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="uppercase text-[11px] font-bold">{locale}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ms-0.5" />
          </button>

          {isLangMenuOpen && (
            <div className="absolute end-0 mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-xs animate-in fade-in-0 zoom-in-95">
              <button
                onClick={() => {
                  setLocale('fr');
                  setIsLangMenuOpen(false);
                }}
                className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  locale === 'fr' ? 'font-bold text-brand-900 bg-brand-50' : 'text-slate-700'
                }`}
              >
                <span>Français</span>
                <span className="text-[10px] text-slate-400 font-mono">FR</span>
              </button>
              <button
                onClick={() => {
                  setLocale('en');
                  setIsLangMenuOpen(false);
                }}
                className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  locale === 'en' ? 'font-bold text-brand-900 bg-brand-50' : 'text-slate-700'
                }`}
              >
                <span>English</span>
                <span className="text-[10px] text-slate-400 font-mono">EN</span>
              </button>
              <button
                onClick={() => {
                  setLocale('ar');
                  setIsLangMenuOpen(false);
                }}
                className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors font-arabic ${
                  locale === 'ar' ? 'font-bold text-brand-900 bg-brand-50' : 'text-slate-700'
                }`}
              >
                <span>العربية (RTL)</span>
                <span className="text-[10px] text-slate-400 font-mono">AR</span>
              </button>
            </div>
          )}
        </div>

        {/* Demo User Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsLangMenuOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 pe-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
            aria-label="Menu utilisateur"
          >
            <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-800 border border-brand-200/60 flex items-center justify-center font-bold text-xs shrink-0">
              {user ? user.firstName[0] : 'U'}
            </div>
            <div className="text-start hidden sm:block leading-tight">
              <div className="text-xs font-semibold text-slate-900 max-w-[110px] truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Invité'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {user ? t(`roles.${user.role}`) : 'Déconnecté'}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute end-0 mt-1.5 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="p-1 border-b border-slate-100 mb-1">
                <Link
                  href="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-brand-50 hover:text-brand-900 transition-colors"
                >
                  <User className="w-4 h-4 text-brand-700" />
                  <span>{t('nav.profile')}</span>
                </Link>
              </div>

              <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {t('common.switchUser')}
                </span>
                <span className="text-[10px] text-brand-600 font-mono font-medium">
                  Démo PROORGA
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isCurrent = user?.email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      onClick={async () => {
                        await quickSwitch(acc.email);
                        setIsUserMenuOpen(false);
                        if (acc.role === 'CLIENT') router.push('/dashboard');
                        else if (acc.role === 'CONSEILLER') router.push('/advisor');
                        else if (acc.role === 'SUPERVISEUR') router.push('/supervisor');
                        else if (acc.role === 'ADMIN') router.push('/audit');
                        else router.push('/dashboard');
                      }}
                      className={`w-full text-start p-2.5 rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-brand-50/90 border border-brand-200/90 font-medium'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isCurrent ? 'text-brand-700' : 'text-slate-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {acc.name}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                              acc.role === 'CLIENT'
                                ? 'bg-blue-100 text-blue-700'
                                : acc.role === 'CONSEILLER'
                                ? 'bg-indigo-100 text-indigo-700'
                                : acc.role === 'SUPERVISEUR'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {acc.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {acc.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
