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
  Eye,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface SupervisorWorkspaceProps {
  requests: LimitRequestDetail[];
  onRefresh: () => void;
  onViewRequest: (requestId: string) => void;
}

export const SupervisorWorkspace: React.FC<SupervisorWorkspaceProps> = ({
  requests,
  onRefresh,
  onViewRequest,
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<LimitRequestDetail | null>(null);
  const [decisionModalMode, setDecisionModalMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [motive, setMotive] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter requests
  const escalatedRequests = requests.filter(
    (r) => r.status === 'PENDING_SUPERVISOR'
  );

  const pastRequests = requests.filter(
    (r) => r.status !== 'PENDING_SUPERVISOR'
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-bold text-xs">
            {escalatedRequests.length} Dossier(s) en attente
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs">
            {pastRequests.length} Dossier(s) dans l'historique
          </span>
        </div>
      </div>

      {/* View Switcher Tabs: Escalated Queue vs Past Requests History */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-purple-700 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Dossiers en attente d'arbitrage</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white text-purple-800">
            {escalatedRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-purple-700 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historique des dossiers passés</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 text-slate-700">
            {pastRequests.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ESCALATED PENDING QUEUE */}
      {activeTab === 'pending' && (
        <div className="space-y-4 animate-in fade-in-0 duration-150">
          {escalatedRequests.length === 0 ? (
            <Card className="text-center py-12 text-slate-400">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium">
                Aucun dossier escaladé en attente de validation superviseur.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tous les dossiers nécessitant un arbitrage hiérarchique ont été traités. Consultez l'onglet "Historique" pour revoir les décisions passées.
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
                        <button
                          onClick={() => onViewRequest(req.id)}
                          className="text-base font-bold text-slate-900 font-mono hover:underline cursor-pointer"
                          title="Cliquer pour voir l'historique complet"
                        >
                          {req.reference}
                        </button>
                        <StatusBadge status={req.status} />
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                          Montant &gt; 30 000 DH
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          v{req.version}
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
                  <div className="mt-4 pt-3 flex flex-wrap items-center justify-end gap-2.5">
                    {/* View Details & History button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewRequest(req.id)}
                      title="Consulter l'historique complet, les versions et les documents joints"
                    >
                      <Eye className="w-4 h-4 me-1 text-slate-500" />
                      Détails & Historique
                    </Button>

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
      )}

      {/* TAB 2: PAST REQUESTS HISTORY */}
      {activeTab === 'history' && (
        <Card className="p-0 overflow-hidden animate-in fade-in-0 duration-150">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">Référence</th>
                  <th className="py-3 px-4 text-start">Client</th>
                  <th className="py-3 px-4 text-start">Montant sollicité</th>
                  <th className="py-3 px-4 text-start">Durée</th>
                  <th className="py-3 px-4 text-start">Statut Actuel</th>
                  <th className="py-3 px-4 text-start">Dernière Décision</th>
                  <th className="py-3 px-4 text-end">Traçabilité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 italic">
                      Aucun dossier passé dans l'historique superviseur.
                    </td>
                  </tr>
                ) : (
                  pastRequests.map((req) => {
                    const latestDecision = req.decisions && req.decisions.length > 0 ? req.decisions[0] : null;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <button
                            onClick={() => onViewRequest(req.id)}
                            className="hover:underline text-brand-900 font-bold cursor-pointer"
                          >
                            {req.reference}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {req.customerProfile?.user?.firstName}{' '}
                            {req.customerProfile?.user?.lastName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            CIN : {req.customerProfile?.cin}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-900">
                          {formatCurrency(Number(req.requestedLimit))}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {req.durationDays} {t('common.days')}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={req.status} />
                        </td>
                        <td className="py-3.5 px-4">
                          {latestDecision ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 block text-[11px]">
                                {latestDecision.decisionType} ({latestDecision.actorRole})
                              </span>
                              <span className="text-[10px] text-slate-500 italic block truncate max-w-xs">
                                « {latestDecision.motive} »
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewRequest(req.id)}
                          >
                            <Eye className="w-3.5 h-3.5 me-1 text-slate-500" />
                            Détails & Historique
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
            <div className="flex justify-between">
              <span className="text-slate-500">Durée demandée :</span>
              <span className="font-semibold text-slate-800">
                {selectedRequest?.durationDays} {t('common.days')}
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
