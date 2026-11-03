'use client';

import React, { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { LimitRequestDetail, DecisionType } from '@proorga/shared-types';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  History,
  FileText,
  UserCheck,
  Paperclip,
} from 'lucide-react';

interface SupervisorWorkspaceProps {
  requests: LimitRequestDetail[];
  onRefresh: () => void;
}

export const SupervisorWorkspace: React.FC<SupervisorWorkspaceProps> = ({
  requests,
  onRefresh,
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();
  const { user } = useAuth();

  const [selectedRequest, setSelectedRequest] = useState<LimitRequestDetail | null>(null);
  const [decisionModalMode, setDecisionModalMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [motive, setMotive] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const escalatedRequests = requests.filter(
    (r) => r.status === 'PENDING_SUPERVISOR'
  );

  const handleOpenDecision = (req: LimitRequestDetail, mode: 'APPROVE' | 'REJECT') => {
    setSelectedRequest(req);
    setDecisionModalMode(mode);
    setMotive('');
    setErrorMessage(null);
  };

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !decisionModalMode) return;

    if (motive.trim().length < 5) {
      setErrorMessage('Le motif de décision doit comporter au moins 5 caractères.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (decisionModalMode === 'APPROVE') {
        await api.approveRequest(selectedRequest.id, {
          motive: motive.trim(),
          targetVersion: selectedRequest.version,
        });
      } else {
        await api.rejectRequest(selectedRequest.id, {
          motive: motive.trim(),
          targetVersion: selectedRequest.version,
        });
      }

      setDecisionModalMode(null);
      setSelectedRequest(null);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec de la validation superviseur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-purple-600 font-bold">
            {t('supervisor.dashboardTitle')}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Dossiers Escaladés pour Décision Hiérarchique
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('supervisor.separationNotice')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-bold text-xs">
            {escalatedRequests.length} Dossier(s) en attente
          </span>
        </div>
      </div>

      {/* Escalated Queue */}
      <div className="space-y-4">
        {escalatedRequests.length === 0 ? (
          <Card className="text-center py-12 text-slate-400">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium">
              Aucun dossier escaladé en attente de validation superviseur.
            </p>
          </Card>
        ) : (
          escalatedRequests.map((req) => {
            const recommendation = req.decisions?.find(
              (d) => d.decisionType === DecisionType.RECOMMEND_APPROVAL
            );
            const isRecommenderSameAsCurrentUser = recommendation?.actorId === user?.id;

            return (
              <Card key={req.id} className="border-purple-200 bg-white">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-bold text-slate-900 font-mono">
                        {req.reference}
                      </span>
                      <StatusBadge status={req.status} />
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                        Montant &gt; 30 000 DH
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Client : <strong>{req.customerProfile?.user?.firstName} {req.customerProfile?.user?.lastName}</strong> (CIN : {req.customerProfile?.cin})
                    </div>
                  </div>

                  <div className="text-start lg:text-end">
                    <span className="text-xs text-slate-400 block">Plafond demandé</span>
                    <span className="text-xl font-bold text-brand-900 font-mono">
                      {formatCurrency(Number(req.requestedLimit))}
                    </span>
                    <span className="text-xs text-slate-500 block">
                      pour {req.durationDays} jours
                    </span>
                  </div>
                </div>

                {/* Recommendation Banner */}
                {recommendation && (
                  <div className="mt-4 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-indigo-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-indigo-700" />
                        Recommandation du conseiller ({recommendation.actorRole})
                      </span>
                      <span className="text-[10px] text-indigo-500 font-normal">
                        {formatDate(recommendation.createdAt)}
                      </span>
                    </div>
                    <p className="text-indigo-950 italic">
                      « {recommendation.motive} »
                    </p>
                  </div>
                )}

                {/* Separation of Duties Warning */}
                {isRecommenderSameAsCurrentUser && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Séparation des tâches : Vous êtes le conseiller qui a émis cette recommandation. Vous ne pouvez pas valider ce dossier en qualité de superviseur.
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-3 flex items-center justify-end gap-2.5">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleOpenDecision(req, 'REJECT')}
                  >
                    <XCircle className="w-4 h-4 me-1" />
                    Refuser
                  </Button>

                  <Button
                    size="sm"
                    variant="success"
                    disabled={isRecommenderSameAsCurrentUser}
                    onClick={() => handleOpenDecision(req, 'APPROVE')}
                  >
                    <CheckCircle className="w-4 h-4 me-1" />
                    Approuver et autoriser activation
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* SUPERVISOR DECISION MODAL */}
      <Modal
        isOpen={Boolean(decisionModalMode && selectedRequest)}
        onClose={() => setDecisionModalMode(null)}
        title={
          decisionModalMode === 'APPROVE'
            ? `Validation Superviseur — Dossier ${selectedRequest?.reference}`
            : `Refus Superviseur — Dossier ${selectedRequest?.reference}`
        }
        maxWidth="md"
      >
        <form onSubmit={handleExecuteDecision} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Dossier :</span>
              <span className="font-mono font-bold text-slate-800">
                {selectedRequest?.reference}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Montant total à activer :</span>
              <span className="font-bold text-brand-900 text-sm">
                {formatCurrency(Number(selectedRequest?.requestedLimit || 0))}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Motif obligatoire de la décision hiérarchique <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={motive}
              onChange={(e) => setMotive(e.target.value)}
              placeholder="Ex. Avis de risque favorable, justificatifs vérifiés, plafond approuvé."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
              required
            />
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDecisionModalMode(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={decisionModalMode === 'APPROVE' ? 'success' : 'danger'}
              isLoading={isSubmitting}
            >
              Confirmer la décision
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
