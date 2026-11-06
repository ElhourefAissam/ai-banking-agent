'use client';

import React, { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { RegulatorySimulator } from '@/components/ui/regulatory-simulator';
import { useTranslation } from '@/i18n';
import { BankAccountSummary, LimitRequestDetail, CustomerFileStatus } from '@proorga/shared-types';
import {
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileWarning,
  Sparkles,
} from 'lucide-react';

interface ClientDashboardProps {
  accounts: BankAccountSummary[];
  requests: LimitRequestDetail[];
  customerProfile: any;
  onNewRequest: () => void;
  onViewRequest: (reference: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  accounts,
  requests,
  customerProfile,
  onNewRequest,
  onViewRequest,
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();
  const [simAmount, setSimAmount] = useState<number>(35000);
  const [simDuration, setSimDuration] = useState<number>(3);

  const isFileIncomplete = customerProfile?.fileStatus === CustomerFileStatus.INCOMPLETE;
  const activeRequest = requests.find(
    (r) =>
      r.status === 'ACTIVE' ||
      r.status === 'SUBMITTED' ||
      r.status === 'UNDER_REVIEW' ||
      r.status === 'COMPLEMENT_REQUESTED' ||
      r.status === 'PENDING_SUPERVISOR' ||
      r.status === 'APPROVED_PENDING_ACTIVATION'
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-900 to-brand-800 rounded-2xl p-6 text-white shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider text-brand-200 font-semibold">
            {t('client.welcome')}
          </span>
          <h1 className="text-2xl font-bold mt-1 text-white">
            {customerProfile?.user?.firstName || 'Karim'} {customerProfile?.user?.lastName || 'Alami'}
          </h1>
          <p className="text-xs text-brand-200 mt-1">
            CIN : <span className="font-mono text-white">{customerProfile?.cin || 'BE849201'}</span> — Agence Casablanca Centre
          </p>
        </div>

        <Button
          onClick={onNewRequest}
          variant="success"
          size="lg"
          disabled={isFileIncomplete || Boolean(activeRequest && activeRequest.status === 'ACTIVE')}
          className="shadow-md shrink-0"
        >
          <ArrowUpRight className="w-5 h-5 me-1" />
          {t('client.requestLimitIncrease')}
        </Button>
      </div>

      {/* Warning: Incomplete Customer File */}
      {isFileIncomplete && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 animate-in fade-in-0">
          <FileWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold block mb-1">
              Dossier client incomplet — Soumission bloquée
            </span>
            <p className="text-amber-800 leading-relaxed">
              {customerProfile?.incompleteReason || t('client.fileIncompleteAlert')}
            </p>
            <p className="text-amber-700 mt-1 italic">
              Conformément à la réglementation bancaire, aucune demande de relèvement ne peut être soumise tant que votre dossier n’est pas régularisé.
            </p>
          </div>
        </div>
      )}

      {/* Active / In-progress Request Banner */}
      {activeRequest && (
        <Card className="border-brand-200 bg-brand-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {activeRequest.reference}
                  </span>
                  <StatusBadge status={activeRequest.status} />
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Demande de relèvement à {formatCurrency(Number(activeRequest.requestedLimit))} pendant {activeRequest.durationDays} jours.
                  {activeRequest.activeUntil && (
                    <span className="ms-1 font-semibold text-emerald-700">
                      (Actif jusqu'au {formatDate(activeRequest.activeUntil)})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewRequest(activeRequest.reference)}
            >
              {t('common.details')}
            </Button>
          </div>
        </Card>
      )}

      {/* Account Cards Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">{t('nav.accounts')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => {
            const hasTemporaryLimit = Number(acc.currentTransferLimit) > Number(acc.initialTransferLimit);

            return (
              <Card key={acc.id} className="relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">
                        Compte Courant Particulier
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {acc.accountNumber}
                      </span>
                    </div>
                  </div>

                  {hasTemporaryLimit && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Plafond Temporaire Actif
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      {t('client.availableBalance')}
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(Number(acc.balance))}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      {t('client.currentLimitCard')}
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        hasTemporaryLimit ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(Number(acc.currentTransferLimit))}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {t('client.baseLimit')}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature 4: Interactive Eligibility & Regulatory Timeline Simulator */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              Simulateur d'Éligibilité & Réglementation Prudentielle
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ajustez vos paramètres pour simuler en temps réel le palier de risque et le circuit d'approbation.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={onNewRequest}
            disabled={isFileIncomplete || Boolean(activeRequest && activeRequest.status === 'ACTIVE')}
          >
            <ArrowUpRight className="w-4 h-4 me-1.5" />
            Déposer une demande
          </Button>
        </div>

        <RegulatorySimulator
          amount={simAmount}
          durationDays={simDuration}
          onAmountChange={setSimAmount}
          onDurationChange={setSimDuration}
          isInteractive={true}
        />
      </div>
    </div>
  );
};
