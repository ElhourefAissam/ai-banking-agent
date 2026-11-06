'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, DEMO_ACCOUNTS } from '@/features/auth/auth-context';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { LimitRequestDetail, Role } from '@proorga/shared-types';
import {
  Search,
  LayoutDashboard,
  FileText,
  PlusCircle,
  Briefcase,
  ShieldCheck,
  Bot,
  Activity,
  Cpu,
  UserCheck,
  ArrowRight,
  Command,
  X,
  Clock,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSimulator?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'NAVIGATION' | 'REQUESTS' | 'ACCOUNTS' | 'TOOLS';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenSimulator,
}) => {
  const router = useRouter();
  const { user, quickSwitch } = useAuth();
  const { t, formatCurrency } = useTranslation();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentRequests, setRecentRequests] = useState<LimitRequestDetail[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open & fetch requests
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Fetch user requests for instant search
      const loadRequests = async () => {
        setIsLoadingRequests(true);
        try {
          if (user?.role === Role.CONSEILLER) {
            const data = await api.getAdvisorQueue();
            setRecentRequests(data.slice(0, 8));
          } else if (user?.role === Role.SUPERVISEUR) {
            const data = await api.getSupervisorQueue();
            setRecentRequests(data.slice(0, 8));
          } else {
            const data = await api.getMyRequests();
            setRecentRequests(data.slice(0, 8));
          }
        } catch (err) {
          console.warn('CommandPalette: failed to load requests', err);
        } finally {
          setIsLoadingRequests(false);
        }
      };
      loadRequests();
    }
  }, [isOpen, user?.role]);

  // Build searchable items list
  const navigationItems: PaletteItem[] = [
    {
      id: 'nav-dashboard',
      category: 'NAVIGATION',
      title: 'Tableau de bord',
      subtitle: 'Comptes, soldes et état du plafond',
      icon: <LayoutDashboard className="w-4 h-4 text-brand-700" />,
      action: () => {
        router.push('/dashboard');
        onClose();
      },
    },
    {
      id: 'nav-requests',
      category: 'NAVIGATION',
      title: 'Mes Demandes',
      subtitle: 'Historique des augmentations de plafond',
      icon: <FileText className="w-4 h-4 text-brand-700" />,
      action: () => {
        router.push('/requests');
        onClose();
      },
    },
    {
      id: 'nav-new-request',
      category: 'NAVIGATION',
      title: 'Nouvelle Demande',
      subtitle: 'Formulaire de relèvement temporaire',
      icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,
      badge: 'Client',
      action: () => {
        router.push('/requests/new');
        onClose();
      },
    },
    {
      id: 'nav-advisor',
      category: 'NAVIGATION',
      title: 'Espace Conseiller Clientèle',
      subtitle: 'Instruction des dossiers et recommandations',
      icon: <Briefcase className="w-4 h-4 text-indigo-600" />,
      badge: 'Conseiller',
      action: () => {
        router.push('/advisor');
        onClose();
      },
    },
    {
      id: 'nav-supervisor',
      category: 'NAVIGATION',
      title: 'Arbitrage Superviseur',
      subtitle: 'Validation hiérarchique des montants > 30k DH',
      icon: <ShieldCheck className="w-4 h-4 text-purple-600" />,
      badge: 'Superviseur',
      action: () => {
        router.push('/supervisor');
        onClose();
      },
    },
    {
      id: 'nav-ai',
      category: 'NAVIGATION',
      title: 'Assistant Virtuel IA',
      subtitle: 'Renseignements et préparation autonome de dossiers',
      icon: <Bot className="w-4 h-4 text-teal-600" />,
      action: () => {
        router.push('/ai');
        onClose();
      },
    },
    {
      id: 'nav-audit',
      category: 'NAVIGATION',
      title: 'Piste d’Audit Immuable',
      subtitle: 'Journal PostgreSQL des décisions et des traces',
      icon: <Activity className="w-4 h-4 text-rose-600" />,
      badge: 'Conformité',
      action: () => {
        router.push('/audit');
        onClose();
      },
    },
  ];

  if (onOpenSimulator) {
    navigationItems.push({
      id: 'tool-simulator',
      category: 'TOOLS',
      title: 'Simulateur de Switch & Pannes Bancaires',
      subtitle: 'Simuler pannes réseau, expiration et timeout',
      icon: <Cpu className="w-4 h-4 text-amber-600" />,
      action: () => {
        onClose();
        onOpenSimulator();
      },
    });
  }

  // Account switch items
  const accountItems: PaletteItem[] = DEMO_ACCOUNTS.map((acc) => ({
    id: `acc-${acc.role}-${acc.email}`,
    category: 'ACCOUNTS',
    title: `Passer à : ${acc.name}`,
    subtitle: `${acc.email} (${acc.role})`,
    icon: <UserCheck className="w-4 h-4 text-brand-600" />,
    badge: acc.role,
    action: async () => {
      await quickSwitch(acc.email);
      onClose();
      if (acc.role === Role.CLIENT) router.push('/dashboard');
      else if (acc.role === Role.CONSEILLER) router.push('/advisor');
      else if (acc.role === Role.SUPERVISEUR) router.push('/supervisor');
      else if (acc.role === Role.ADMIN) router.push('/audit');
    },
  }));

  // Request items
  const requestItems: PaletteItem[] = recentRequests.map((r) => ({
    id: `req-${r.id}`,
    category: 'REQUESTS',
    title: `Dossier ${r.reference}`,
    subtitle: `${formatCurrency(Number(r.requestedLimit))} • ${r.durationDays} jours • Statut : ${r.status}`,
    icon: <Clock className="w-4 h-4 text-brand-700" />,
    badge: r.status,
    action: () => {
      router.push(`/requests/${r.reference}`);
      onClose();
    },
  }));

  const allItems: PaletteItem[] = [
    ...requestItems,
    ...navigationItems,
    ...accountItems,
  ];

  const filteredItems = allItems.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.badge && item.badge.toLowerCase().includes(q))
    );
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Rechercher un dossier (REQ-...), naviguer, changer de rôle..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded-md shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              Aucun résultat pour « {query} ».
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-start flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-50/80 text-brand-950 ring-1 ring-brand-300'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-brand-900 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-opacity ${
                      isSelected ? 'opacity-100 text-brand-700' : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">↑</kbd>{' '}
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">↓</kbd>{' '}
              Naviguer
            </span>
            <span>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">↵</kbd>{' '}
              Sélectionner
            </span>
          </div>
          <span className="text-slate-400">PROORGA Command Palette</span>
        </div>
      </div>
    </div>
  );
};
