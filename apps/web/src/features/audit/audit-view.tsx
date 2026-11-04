'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Activity, Shield, RefreshCw, Search, Code } from 'lucide-react';

export const AuditView: React.FC = () => {
  const { t, formatDate } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);

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

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.actorEmail && log.actorEmail.toLowerCase().includes(q)) ||
      log.entityType.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q)
    );
  });

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
        <Button size="sm" variant="outline" onClick={fetchLogs} isLoading={isLoading}>
          <RefreshCw className="w-3.5 h-3.5 me-1.5" />
          Actualiser
        </Button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
          <strong>Accès Refusé :</strong> {errorMessage}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par action, email de l'acteur, type d'entité..."
          className="w-full ps-9 pe-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">Date & Heure (UTC)</th>
                <th className="py-3 px-4 text-start">Action</th>
                <th className="py-3 px-4 text-start">Acteur</th>
                <th className="py-3 px-4 text-start">Rôle</th>
                <th className="py-3 px-4 text-start">Entité ciblée</th>
                <th className="py-3 px-4 text-start">Version</th>
                <th className="py-3 px-4 text-end">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    {isLoading ? 'Chargement des événements d’audit...' : 'Aucun événement trouvé.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-brand-900 text-[11px] px-2 py-0.5 rounded bg-brand-50 border border-brand-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.actorEmail || 'Système / Automatique'}
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
            <h3 className="font-bold text-slate-900 text-sm">Métadonnées de l’événement d'audit</h3>
            <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-80">
              {JSON.stringify(selectedDetails, null, 2)}
            </pre>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedDetails(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
