'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';
import { LimitRequestDetail } from '@proorga/shared-types';
import { PlusCircle, FileText, ArrowRight } from 'lucide-react';

interface MyRequestsViewProps {
  requests: LimitRequestDetail[];
  onNewRequest: () => void;
  onViewRequest: (requestId: string) => void;
}

export const MyRequestsView: React.FC<MyRequestsViewProps> = ({
  requests,
  onNewRequest,
  onViewRequest,
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('nav.myRequests')}</h1>
          <p className="text-xs text-slate-500">
            Suivi en temps réel de vos demandes d’augmentation temporaire de plafond.
          </p>
        </div>

        <Button size="sm" variant="primary" onClick={onNewRequest}>
          <PlusCircle className="w-4 h-4 me-1.5" />
          {t('nav.newRequest')}
        </Button>
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
                      {r.reference}
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
                        onClick={() => onViewRequest(r.id)}
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
