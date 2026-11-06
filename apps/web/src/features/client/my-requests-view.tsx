'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';
import { LimitRequestDetail } from '@proorga/shared-types';
import { PlusCircle, FileText, ArrowRight, Download } from 'lucide-react';
import { exportToCsv } from '@/lib/export-csv';

interface MyRequestsViewProps {
  requests: LimitRequestDetail[];
  onNewRequest: () => void;
  onViewRequest: (reference: string) => void;
}

export const MyRequestsView: React.FC<MyRequestsViewProps> = ({
  requests,
  onNewRequest,
  onViewRequest,
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();

  const handleExportCsv = () => {
    exportToCsv(
      `mes_demandes_${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'reference', label: 'Référence' },
        { key: 'requestedLimit', label: 'Plafond Demandé (DH)', transform: (val) => Number(val) },
        { key: 'durationDays', label: 'Durée (Jours)' },
        { key: 'createdAt', label: 'Date de Création', transform: (val) => formatDate(val) },
        { key: 'status', label: 'Statut' },
        { key: 'account.rib', label: 'RIB Compte' },
        { key: 'reason', label: 'Motif' },
        { key: 'decisionReason', label: 'Motif Décision' },
      ],
      requests
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('nav.myRequests')}</h1>
          <p className="text-xs text-slate-500">
            Suivi en temps réel de vos demandes d’augmentation temporaire de plafond.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={requests.length === 0}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 me-1.5 text-brand-600" />
            Exporter CSV
          </Button>
          <Button size="sm" variant="primary" onClick={onNewRequest}>
            <PlusCircle className="w-4 h-4 me-1.5" />
            {t('nav.newRequest')}
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">Référence</th>
                <th className="py-3 px-4 text-start">Montant</th>
                <th className="py-3 px-4 text-start">Durée</th>
                <th className="py-3 px-4 text-start">Date soumission</th>
                <th className="py-3 px-4 text-start">Statut</th>
                <th className="py-3 px-4 text-end">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    Aucune demande enregistrée.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <button
                        onClick={() => onViewRequest(r.reference)}
                        className="hover:underline text-brand-900 font-bold cursor-pointer"
                        title="Consulter les détails du dossier"
                      >
                        {r.reference}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-brand-900">
                      {formatCurrency(Number(r.requestedLimit))}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.durationDays} {t('common.days')}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-4 text-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewRequest(r.reference)}
                      >
                        {t('common.details')}
                        <ArrowRight className="w-3.5 h-3.5 ms-1" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
