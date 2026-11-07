'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import {
  Activity,
  Shield,
  RefreshCw,
  Search,
  Code,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Zap,
  XCircle,
  Filter,
} from 'lucide-react';
import { exportToCsv } from '@/lib/export-csv';

type PeriodFilter = 'ALL' | 'TODAY' | '7_DAYS';
type CategoryFilter = 'ALL' | 'DECISION' | 'CREATION' | 'ACTIVATION' | 'ANNULATION';

export const AuditView: React.FC = () => {
  const { t, formatDate } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  const getActionLabel = (action: string): string => {
    const key = `auditActions.${action}`;
    const translated = t(key);
    return translated !== key ? translated : action;
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getAuditTrail();
      setLogs(data);
    } catch (e: any) {
      console.warn('Failed to load audit trail:', e);
      setErrorMessage(
        e.message || "Erreur d'habilitation lors de la récupération des logs d'audit."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionCategory = (
    action: string
  ): 'DECISION' | 'CREATION' | 'ACTIVATION' | 'ANNULATION' | 'OTHER' => {
    const act = (action || '').toUpperCase();
    if (
      act.includes('APPROV') ||
      act.includes('REJECT') ||
      act.includes('RECOMMEND') ||
      act.includes('COMPLEMENT') ||
      act.includes('DECISION')
    ) {
      return 'DECISION';
    }
    if (act.includes('DRAFT') || act.includes('SUBMIT') || act.includes('CREATE')) {
      return 'CREATION';
    }
    if (
      act.includes('ACTIVAT') ||
      act.includes('RESTORE') ||
      act.includes('EXPIRE')
    ) {
      return 'ACTIVATION';
    }
    if (act.includes('CANCEL') || act.includes('ANNUL')) {
      return 'ANNULATION';
    }
    return 'OTHER';
  };

  const matchesPeriod = (createdAt: string, period: PeriodFilter): boolean => {
    if (period === 'ALL') return true;
    const itemDate = new Date(createdAt);
    const now = new Date();
    if (period === 'TODAY') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return itemDate >= startOfToday;
    }
    if (period === '7_DAYS') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= sevenDaysAgo;
    }
    return true;
  };

  const matchesCategory = (action: string, category: CategoryFilter): boolean => {
    if (category === 'ALL') return true;
    return getActionCategory(action) === category;
  };

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      (log.actorEmail && log.actorEmail.toLowerCase().includes(q)) ||
      log.entityType.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q);

    return (
      matchesSearch &&
      matchesPeriod(log.createdAt, periodFilter) &&
      matchesCategory(log.action, categoryFilter)
    );
  });

  // Calculate dynamic counts based on selected period
  const logsInPeriod = logs.filter((l) => matchesPeriod(l.createdAt, periodFilter));
  const counts = {
    all: logsInPeriod.length,
    decision: logsInPeriod.filter((l) => getActionCategory(l.action) === 'DECISION').length,
    creation: logsInPeriod.filter((l) => getActionCategory(l.action) === 'CREATION').length,
    activation: logsInPeriod.filter((l) => getActionCategory(l.action) === 'ACTIVATION').length,
    annulation: logsInPeriod.filter((l) => getActionCategory(l.action) === 'ANNULATION').length,
  };

  const handleExportCsv = () => {
    exportToCsv(
      `piste_audit_${new Date().toISOString().split('T')[0]}`,
      [
        {
          key: 'createdAt',
          label: t('auditActions.columns.dateTime') || 'Date & Heure',
          transform: (val) => formatDate(val),
        },
        {
          key: 'action',
          label: t('auditActions.columns.action') || 'Action',
          transform: (val) => `${getActionLabel(val)} [${val}]`,
        },
        {
          key: 'actorEmail',
          label: t('auditActions.columns.actor') || 'Acteur',
          transform: (val) => val || t('auditActions.systemActor') || 'Système / Automatique',
        },
        { key: 'actorRole', label: t('auditActions.columns.role') || 'Rôle' },
        { key: 'entityType', label: t('auditActions.columns.targetEntity') || 'Entité Ciblée' },
        { key: 'entityId', label: 'ID Entité' },
        { key: 'targetVersion', label: t('auditActions.columns.version') || 'Version' },
        { key: 'ipAddress', label: 'Adresse IP' },
        {
          key: 'metadata',
          label: 'Métadonnées',
          transform: (val) => (val ? JSON.stringify(val) : ''),
        },
      ],
      filteredLogs
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            Conformité & Contrôle Interne
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Piste d’Audit Immuable
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Traçabilité intégrale de l'ensemble des interventions humaines, décisions et activations bancaires en direct de PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 me-1.5 text-brand-600" />
            {t('auditActions.csvExport') || 'Exporter CSV'}
          </Button>
          <Button size="sm" variant="outline" onClick={fetchLogs} isLoading={isLoading}>
            <RefreshCw className="w-3.5 h-3.5 me-1.5" />
            {t('auditActions.refresh') || 'Actualiser'}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
          <strong>Accès Refusé :</strong> {errorMessage}
        </div>
      )}

      {/* Filter Toolbar: Period Selector & Action Category Pills */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Row 1: Period Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-brand-700" />
            <span>{t('auditActions.observationPeriod') || "Période d'observation :"}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setPeriodFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                periodFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('auditActions.periods.all') || 'Tout'} ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('TODAY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                periodFilter === 'TODAY'
                  ? 'bg-brand-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('auditActions.periods.today') || "Aujourd'hui"}</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('7_DAYS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                periodFilter === '7_DAYS'
                  ? 'bg-brand-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('auditActions.periods.last7Days') || '7 derniers jours'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Action Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-brand-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
            }`}
          >
            {t('auditActions.categories.ALL') || 'Toutes'} ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('DECISION')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'DECISION'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-white text-purple-900 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span>{t('auditActions.categories.DECISION') || 'DÉCISION'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-purple-100 text-purple-900">
              {counts.decision}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('CREATION')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'CREATION'
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'bg-white text-blue-900 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('auditActions.categories.CREATION') || 'CRÉATION'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-blue-100 text-blue-900">
              {counts.creation}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('ACTIVATION')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'ACTIVATION'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('auditActions.categories.ACTIVATION') || 'ACTIVATION'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-900">
              {counts.activation}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('ANNULATION')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'ANNULATION'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'bg-white text-rose-900 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{t('auditActions.categories.ANNULATION') || 'ANNULATION'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-100 text-rose-900">
              {counts.annulation}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('auditActions.searchPlaceholder') || "Rechercher par action, email de l'acteur, type d'entité..."}
            className="w-full ps-9 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t('auditActions.columns.dateTime') || 'Date & Heure (UTC)'}</th>
                <th className="py-3 px-4 text-start">{t('auditActions.columns.action') || 'Action'}</th>
                <th className="py-3 px-4 text-start">{t('auditActions.columns.actor') || 'Acteur'}</th>
                <th className="py-3 px-4 text-start">{t('auditActions.columns.role') || 'Rôle'}</th>
                <th className="py-3 px-4 text-start">{t('auditActions.columns.targetEntity') || 'Entité ciblée'}</th>
                <th className="py-3 px-4 text-start">{t('auditActions.columns.version') || 'Version'}</th>
                <th className="py-3 px-4 text-end">{t('auditActions.columns.details') || 'Détails'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    {isLoading
                      ? t('auditActions.loading') || 'Chargement des événements d’audit...'
                      : t('auditActions.empty') || 'Aucun événement trouvé.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const cat = getActionCategory(log.action);
                        const badgeStyle =
                          cat === 'DECISION'
                            ? 'bg-purple-50 text-purple-900 border-purple-200'
                            : cat === 'CREATION'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : cat === 'ACTIVATION'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : cat === 'ANNULATION'
                            ? 'bg-rose-50 text-rose-900 border-rose-200'
                            : 'bg-slate-50 text-slate-800 border-slate-200';

                        return (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`font-semibold text-xs px-2.5 py-0.5 rounded-lg border w-fit ${badgeStyle}`}
                              title={log.action}
                            >
                              {getActionLabel(log.action)}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {log.action}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.actorEmail || t('auditActions.systemActor') || 'Système / Automatique'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold text-slate-600">
                        {log.actorRole || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {log.entityType} ({log.entityId.substring(0, 8)}...)
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.entityVersion !== null ? `v${log.entityVersion}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-end">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <button
                          onClick={() => setSelectedDetails(log.details)}
                          className="inline-flex items-center gap-1 text-[11px] text-brand-700 hover:text-brand-900 font-semibold"
                        >
                          <Code className="w-3.5 h-3.5" /> Voir
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* JSON Details Inspector Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              {t('auditActions.modalTitle') || "Métadonnées de l’événement d'audit"}
            </h3>
            <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-80">
              {JSON.stringify(selectedDetails, null, 2)}
            </pre>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedDetails(null)}>
                {t('auditActions.modalClose') || 'Fermer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
