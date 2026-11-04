'use client';

import React, { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import {
  LimitRequestDetail,
  LimitRequestStatus,
  BANKING_RULES,
} from '@proorga/shared-types';
import {
  Users,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  AlertCircle,
  FileText,
  Search,
  Filter,
  ShieldAlert,
  Paperclip,
  Eye,
  History,
  Clock,
} from 'lucide-react';

interface AdvisorWorkspaceProps {
  requests: LimitRequestDetail[];
  onRefresh: () => void;
  onViewRequest: (reference: string) => void;
}

export const AdvisorWorkspace: React.FC<AdvisorWorkspaceProps> = ({
  requests,
  onRefresh,
  onViewRequest,
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();

  const [selectedRequest, setSelectedRequest] = useState<LimitRequestDetail | null>(null);
  const [decisionModalMode, setDecisionModalMode] = useState<
    'APPROVE' | 'RECOMMEND' | 'COMPLEMENT' | 'REJECT' | null
  >(null);
  const [motive, setMotive] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ACTIONABLE' | 'ACTIVE' | 'SUPERVISOR' | 'PAST'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter requests based on search and category/status
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerProfile?.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerProfile?.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerProfile?.cin?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter dropdown override
    if (statusFilter !== 'ALL') {
      return r.status === statusFilter;
    }

    // Category tabs
    if (categoryFilter === 'ACTIONABLE') {
      return (
        r.status === 'SUBMITTED' ||
        r.status === 'UNDER_REVIEW' ||
        r.status === 'COMPLEMENT_REQUESTED'
      );
    }
    if (categoryFilter === 'SUPERVISOR') {
      return r.status === 'PENDING_SUPERVISOR';
    }
    if (categoryFilter === 'ACTIVE') {
      return r.status === 'ACTIVE' || r.status === 'APPROVED_PENDING_ACTIVATION';
    }
    if (categoryFilter === 'PAST') {
      return (
        r.status === 'REJECTED' ||
        r.status === 'EXPIRED' ||
        r.status === 'CANCELLED'
      );
    }

    return true;
  });

  const actionableCount = requests.filter(
    (r) =>
      r.status === 'SUBMITTED' ||
      r.status === 'UNDER_REVIEW' ||
      r.status === 'COMPLEMENT_REQUESTED'
  ).length;

  const supervisorCount = requests.filter(
    (r) => r.status === 'PENDING_SUPERVISOR'
  ).length;

  const pastCount = requests.filter(
    (r) =>
      r.status === 'REJECTED' ||
      r.status === 'EXPIRED' ||
      r.status === 'CANCELLED'
  ).length;

  const activeCount = requests.filter(
    (r) => r.status === 'ACTIVE' || r.status === 'APPROVED_PENDING_ACTIVATION'
  ).length;

  const handleOpenDecision = (
    req: LimitRequestDetail,
    mode: 'APPROVE' | 'RECOMMEND' | 'COMPLEMENT' | 'REJECT'
  ) => {
    setSelectedRequest(req);
    setDecisionModalMode(mode);
    setMotive('');
    setErrorMessage(null);
  };

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !decisionModalMode) return;

    if (motive.trim().length < 5) {
      setErrorMessage('Le motif obligatoire doit comporter au moins 5 caractères.');
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
      } else if (decisionModalMode === 'RECOMMEND') {
        await api.recommendApproval(selectedRequest.id, {
          motive: motive.trim(),
          targetVersion: selectedRequest.version,
        });
      } else if (decisionModalMode === 'COMPLEMENT') {
        await api.requestComplement(selectedRequest.id, {
          motive: motive.trim(),
          targetVersion: selectedRequest.version,
        });
      } else if (decisionModalMode === 'REJECT') {
        await api.rejectRequest(selectedRequest.id, {
          motive: motive.trim(),
          targetVersion: selectedRequest.version,
        });
      }

      setDecisionModalMode(null);
      setSelectedRequest(null);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec de l’opération.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-600 font-bold">
            {t('advisor.dashboardTitle')}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Dossiers Clients en Portefeuille
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('advisor.delegationNotice')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-xs">
            {requests.length} Dossier(s) Total
          </span>
          {actionableCount > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs">
              {actionableCount} À instruire
            </span>
          )}
        </div>
      </div>

      {/* Quick Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setCategoryFilter('ALL');
            setStatusFilter('ALL');
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
            categoryFilter === 'ALL' && statusFilter === 'ALL'
              ? 'bg-brand-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Tous les dossiers ({requests.length})
        </button>

        <button
          onClick={() => {
            setCategoryFilter('ACTIONABLE');
            setStatusFilter('ALL');
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            categoryFilter === 'ACTIONABLE' && statusFilter === 'ALL'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>À instruire en priorité</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
            {actionableCount}
          </span>
        </button>

        <button
          onClick={() => {
            setCategoryFilter('ACTIVE');
            setStatusFilter('ALL');
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
            categoryFilter === 'ACTIVE' && statusFilter === 'ALL'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Plafonds actifs ({activeCount})
        </button>

        <button
          onClick={() => {
            setCategoryFilter('SUPERVISOR');
            setStatusFilter('ALL');
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
            categoryFilter === 'SUPERVISOR' && statusFilter === 'ALL'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          En attente superviseur ({supervisorCount})
        </button>

        <button
          onClick={() => {
            setCategoryFilter('PAST');
            setStatusFilter('ALL');
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            categoryFilter === 'PAST' && statusFilter === 'ALL'
              ? 'bg-slate-800 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Historique passé</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
            {pastCount}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, nom client, CIN..."
            className="w-full ps-9 pe-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCategoryFilter('ALL');
          }}
          className="w-full sm:w-auto px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
        >
          <option value="ALL">Tous les statuts ({requests.length})</option>
          <option value="SUBMITTED">Soumises (À traiter)</option>
          <option value="COMPLEMENT_REQUESTED">Complément requis</option>
          <option value="PENDING_SUPERVISOR">En attente superviseur</option>
          <option value="ACTIVE">Actives</option>
          <option value="APPROVED_PENDING_ACTIVATION">Approuvées en attente d'activation</option>
          <option value="ACTIVATION_FAILED">Échec activation switch</option>
          <option value="REJECTED">Historique : Rejetées</option>
          <option value="EXPIRED">Historique : Expirées & Rétablies</option>
          <option value="CANCELLED">Historique : Annulées par client</option>
        </select>
      </div>

      {/* Requests Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">Référence</th>
                <th className="py-3 px-4 text-start">Client</th>
                <th className="py-3 px-4 text-start">Montant sollicité</th>
                <th className="py-3 px-4 text-start">Durée</th>
                <th className="py-3 px-4 text-start">Justificatif</th>
                <th className="py-3 px-4 text-start">Statut</th>
                <th className="py-3 px-4 text-start">Version</th>
                <th className="py-3 px-4 text-end">Actions & Traçabilité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                    Aucun dossier ne correspond aux critères de recherche ou de filtre.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const amt = Number(req.requestedLimit);
                  const isEligibleForDirectApproval =
                    amt <= BANKING_RULES.ADVISOR_MAX_THRESHOLD &&
                    (req.status === 'SUBMITTED' || req.status === 'UNDER_REVIEW');
                  const requiresSupervisorRecommendation =
                    amt > BANKING_RULES.ADVISOR_MAX_THRESHOLD &&
                    (req.status === 'SUBMITTED' || req.status === 'UNDER_REVIEW');

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => onViewRequest(req.reference)}
                          className="hover:underline text-brand-900 font-bold cursor-pointer"
                          title="Cliquer pour afficher les détails et l'historique"
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
                        {formatCurrency(amt)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {req.durationDays} {t('common.days')}
                      </td>
                      <td className="py-3.5 px-4">
                        {req.documents && req.documents.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium text-[10px] border border-emerald-200">
                            <Paperclip className="w-3 h-3" /> {req.documents.length} doc
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        v{req.version}
                      </td>
                      <td className="py-3.5 px-4 text-end">
                        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                          {/* Details & Historique Button for EVERY request */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewRequest(req.reference)}
                            title="Consulter l'historique complet, les versions et les décisions"
                          >
                            <Eye className="w-3.5 h-3.5 me-1 text-slate-500" />
                            Détails & Historique
                          </Button>

                          {isEligibleForDirectApproval && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleOpenDecision(req, 'APPROVE')}
                            >
                              Approuver
                            </Button>
                          )}

                          {requiresSupervisorRecommendation && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenDecision(req, 'RECOMMEND')}
                            >
                              Recommander
                            </Button>
                          )}

                          {(req.status === 'SUBMITTED' || req.status === 'UNDER_REVIEW') && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDecision(req, 'COMPLEMENT')}
                              >
                                Complément
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleOpenDecision(req, 'REJECT')}
                              >
                                Rejeter
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DECISION ACTION MODAL */}
      <Modal
        isOpen={Boolean(decisionModalMode && selectedRequest)}
        onClose={() => setDecisionModalMode(null)}
        title={
          decisionModalMode === 'APPROVE'
            ? `Approbation directe du dossier ${selectedRequest?.reference}`
            : decisionModalMode === 'RECOMMEND'
            ? `Recommandation au superviseur — Dossier ${selectedRequest?.reference}`
            : decisionModalMode === 'COMPLEMENT'
            ? `Demande de complément — Dossier ${selectedRequest?.reference}`
            : `Rejet du dossier ${selectedRequest?.reference}`
        }
        maxWidth="md"
      >
        <form onSubmit={handleExecuteDecision} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Client :</span>
              <span className="font-semibold text-slate-800">
                {selectedRequest?.customerProfile?.user?.firstName}{' '}
                {selectedRequest?.customerProfile?.user?.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Montant demandé :</span>
              <span className="font-bold text-brand-900 text-sm">
                {formatCurrency(Number(selectedRequest?.requestedLimit || 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Durée :</span>
              <span className="font-semibold text-slate-800">
                {selectedRequest?.durationDays} {t('common.days')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Version du dossier :</span>
              <span className="font-mono text-slate-700">
                v{selectedRequest?.version}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Motif obligatoire de la décision <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={motive}
              onChange={(e) => setMotive(e.target.value)}
              placeholder="Ex. Situation financière vérifiée, rentrées régulières, accord favorable..."
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
              variant={
                decisionModalMode === 'APPROVE'
                  ? 'success'
                  : decisionModalMode === 'REJECT'
                  ? 'danger'
                  : 'primary'
              }
              isLoading={isSubmitting}
            >
              Enregistrer la décision
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
