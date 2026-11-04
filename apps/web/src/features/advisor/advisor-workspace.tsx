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
} from 'lucide-react';

interface AdvisorWorkspaceProps {
  requests: LimitRequestDetail[];
  onRefresh: () => void;
}

export const AdvisorWorkspace: React.FC<AdvisorWorkspaceProps> = ({
  requests,
  onRefresh,
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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerProfile?.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerProfile?.cin?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-xs">
            {requests.length} Dossier(s) Total
          </span>
        </div>
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
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="SUBMITTED">Soumises (À traiter)</option>
          <option value="COMPLEMENT_REQUESTED">Complément requis</option>
          <option value="PENDING_SUPERVISOR">En attente superviseur</option>
          <option value="ACTIVE">Actives</option>
          <option value="ACTIVATION_FAILED">Échec activation</option>
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
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    Aucun dossier ne correspond aux filtres.
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
                        {req.reference}
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
              <span className="font-bold text-brand-900">
                {formatCurrency(Number(selectedRequest?.requestedLimit || 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Motif client :</span>
              <span className="italic text-slate-700">« {selectedRequest?.reason} »</span>
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
