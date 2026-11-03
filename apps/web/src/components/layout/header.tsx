'use client';

import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '@/features/auth/auth-context';
import { useTranslation, Locale } from '@/i18n';
import {
  Globe,
  UserCheck,
  ChevronDown,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  onOpenAiChat?: () => void;
  onOpenSimulator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAiChat, onOpenSimulator }) => {
  const { user, quickSwitch } = useAuth();
  const { locale, setLocale, t } = useTranslation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-900 flex items-center justify-center text-white font-bold text-lg shadow-sm tracking-wider">
          PO
        </div>
        <div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">PROORGA</span>
          <span className="hidden sm:inline-block ms-2 text-xs font-medium px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200/60">
            Banking Core
          </span>
        </div>
      </div>

      {/* Right Actions: AI Chat button, Simulator button, Language Selector, Demo Account Switcher */}
      <div className="flex items-center gap-3">
        {/* Open AI Assistant Button */}
        {onOpenAiChat && (
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden md:inline">{t('nav.aiAssistant')}</span>
          </button>
        )}

        {/* Simulator Modal Trigger */}
        {onOpenSimulator && (
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">{t('nav.simulator')}</span>
          </button>
        )}

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="uppercase font-semibold">{locale}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ms-0.5" />
          </button>

          {isLangMenuOpen && (
            <div className="absolute end-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-40 text-xs">
              <button
                onClick={() => {
                  setLocale('fr');
                  setIsLangMenuOpen(false);
                }}
                className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
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
                className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
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
                className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-slate-50 font-arabic ${
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
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 pe-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
              {user ? user.firstName[0] : 'U'}
            </div>
            <div className="text-start hidden lg:block leading-tight">
              <div className="text-xs font-semibold text-slate-900">
                {user ? `${user.firstName} ${user.lastName}` : 'Invite'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {user ? t(`roles.${user.role}`) : 'Déconnecté'}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute end-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in-0">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {t('common.switchUser')}
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
                      }}
                      className={`w-full text-start p-2.5 rounded-lg flex items-start gap-2.5 transition-colors ${
                        isCurrent
                          ? 'bg-brand-50/80 border border-brand-200/80'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck
                        className={`w-4 h-4 mt-0.5 ${
                          isCurrent ? 'text-brand-700' : 'text-slate-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {acc.name}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                              acc.role === 'CLIENT'
                                ? 'bg-blue-100 text-blue-700'
                                : acc.role === 'CONSEILLER'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-purple-100 text-purple-700'
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
