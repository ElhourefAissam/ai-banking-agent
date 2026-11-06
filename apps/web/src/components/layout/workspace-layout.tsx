'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from '@/i18n';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { SimulatorModal } from './simulator-modal';
import { CommandPalette } from './command-palette';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { isRtl, t } = useTranslation();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global keyboard shortcut for Command Palette: Cmd + K / Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-900 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden ${isRtl ? 'font-arabic' : 'font-sans'}`}>
      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Core Simulator Modal */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      {/* Universal Command Palette (Cmd + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />
    </div>
  );
};
