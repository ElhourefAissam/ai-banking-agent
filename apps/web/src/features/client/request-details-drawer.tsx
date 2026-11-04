'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import {
  LimitRequestDetail,
  LimitRequestStatus,
  Role,
  BANKING_RULES,
} from '@proorga/shared-types';
import {
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  History,
  MessageSquare,
  Paperclip,
  Upload,
  Layers,
  Cpu,
  User,
  ShieldCheck,
  Share2,
  Copy,
  AlertCircle,
} from 'lucide-react';

interface RequestDetailsDrawerProps {
  requestId?: string | null;
  initialData?: LimitRequestDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const RequestDetailsDrawer: React.FC<RequestDetailsDrawerProps> = ({
  requestId,
  initialData,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();
  const { user } = useAuth();

  const [request, setRequest] = useState<LimitRequestDetail | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [complementText, setComplementText] = useState('');
  const [complementFile, setComplementFile] = useState<File | null>(null);
  const [isSubmittingComplement, setIsSubmittingComplement] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Decision Modal State (if Advisor or Supervisor acts directly from the drawer)
  const [decisionModalMode, setDecisionModalMode] = useState<
    'APPROVE' | 'RECOMMEND' | 'COMPLEMENT' | 'REJECT' | null
  >(null);
  const [motive, setMotive] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  useEffect(() => {
    if (initialData) {
      setRequest(initialData);
      setFetchError(null);
    }
  }, [initialData]);

  useEffect(() => {
    if (
      isOpen &&
      requestId &&
      (!request || (request.id !== requestId && request.reference !== requestId))
    ) {
      loadRequest(requestId);
    }
  }, [isOpen, requestId]);

  const loadRequest = async (id: string) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await api.getRequestById(id);
      setRequest(data);
    } catch (err: any) {
      setFetchError(
        err.message || 'Impossible de charger ce dossier. Vérifiez vos autorisations bancaires.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && request) {
      const url = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(request.reference)}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCancel = async () => {
    if (!request) return;
    if (!window.confirm(t('client.cancelConfirm'))) return;

    setIsCancelling(true);
    setActionError(null);
    try {
      await api.cancelRequest(request.id, { targetVersion: request.version });
      if (onRefresh) onRefresh();
      await loadRequest(request.reference || request.id);
    } catch (err: any) {
      setActionError(err.message || 'Échec de l’annulation.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSendComplement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setIsSubmittingComplement(true);
    setActionError(null);

    try {
      if (complementFile) {
        await api.uploadDocument(request.id, complementFile);
      }

      await api.resubmitComplement(request.id, {
        additionalExplanation: complementText.trim(),
        targetVersion: request.version,
      });

      setComplementText('');
      setComplementFile(null);
      if (onRefresh) onRefresh();
      await loadRequest(request.id);
    } catch (err: any) {
      setActionError(err.message || 'Échec de la réponse au complément.');
    } finally {
      setIsSubmittingComplement(false);
    }
  };

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !decisionModalMode) return;

    if (motive.trim().length < 5) {
      setActionError('Le motif obligatoire doit comporter au moins 5 caractères.');
      return;
    }

    setIsSubmittingDecision(true);
    setActionError(null);

    try {
      if (decisionModalMode === 'APPROVE') {
        await api.approveRequest(request.id, {
          motive: motive.trim(),
          targetVersion: request.version,
        });
      } else if (decisionModalMode === 'RECOMMEND') {
        await api.recommendApproval(request.id, {
          motive: motive.trim(),
          targetVersion: request.version,
        });
      } else if (decisionModalMode === 'COMPLEMENT') {
        await api.requestComplement(request.id, {
          motive: motive.trim(),
          targetVersion: request.version,
        });
      } else if (decisionModalMode === 'REJECT') {
        await api.rejectRequest(request.id, {
          motive: motive.trim(),
          targetVersion: request.version,
        });
      }

      setDecisionModalMode(null);
      if (onRefresh) onRefresh();
      await loadRequest(request.reference || request.id);
    } catch (err: any) {
      setActionError(err.message || 'Échec de la décision.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const isCancelable =
    request &&
    (user?.role === Role.CLIENT || user?.role === Role.ADMIN) &&
    (request.status === LimitRequestStatus.DRAFT ||
      request.status === LimitRequestStatus.SUBMITTED ||
      request.status === LimitRequestStatus.UNDER_REVIEW ||
      request.status === LimitRequestStatus.COMPLEMENT_REQUESTED);

  const isAdvisor = user?.role === Role.CONSEILLER || user?.role === Role.ADMIN;
  const isSupervisor = user?.role === Role.SUPERVISEUR || user?.role === Role.ADMIN;

  const amt = request ? Number(request.requestedLimit) : 0;
  const isEligibleForDirectApproval =
    isAdvisor &&
    amt <= BANKING_RULES.ADVISOR_MAX_THRESHOLD &&
    request &&
    (request.status === 'SUBMITTED' || request.status === 'UNDER_REVIEW');
  const requiresSupervisorRecommendation =
    isAdvisor &&
    amt > BANKING_RULES.ADVISOR_MAX_THRESHOLD &&
    request &&
    (request.status === 'SUBMITTED' || request.status === 'UNDER_REVIEW');
  const isPendingSupervisorAction =
    isSupervisor && request && request.status === 'PENDING_SUPERVISOR';

  const totalHistoryCount =
    (request?.decisions?.length || 0) +
    (request?.versions?.length || 0) +
    (request?.activations?.length || 0);

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
        title={
          request ? (
            <div className="flex items-center gap-2">
              <span>Dossier {request.reference}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-700 border border-slate-200">
                v{request.version}
              </span>
            </div>
          ) : (
            'Consultation du Dossier'
          )
        }
        badge={request ? <StatusBadge status={request.status} /> : undefined}
        subtitle={
          request ? (
            <span>
              Créé le {formatDate(request.createdAt)} • Compte {request.account?.accountNumber}
            </span>
          ) : undefined
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between w-full gap-2.5">
            <div className="flex items-center gap-2">
              {isCancelable && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancel}
                  isLoading={isCancelling}
                >
                  {t('client.cancelButton')}
                </Button>
              )}
              {request && (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Copier le lien direct vers ce dossier"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Lien copié !</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Partager le lien</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        }
      >
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
            <div className="w-8 h-8 border-3 border-brand-900 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Chargement du dossier bancaire...</span>
          </div>
        )}

        {fetchError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Accès Refusé ou Dossier Non Trouvé</span>
            </div>
            <p className="leading-relaxed">{fetchError}</p>
            <p className="text-[11px] text-rose-700 pt-1">
              La réglementation bancaire et le contrôle d'accès (IDOR Defense) interdisent la consultation de dossiers hors de votre portefeuille ou de vos comptes.
            </p>
          </div>
        )}

        {!isLoading && !fetchError && request && (
          <div className="space-y-6">
            {/* Top Stats Banner */}
            <div className="p-4 bg-gradient-to-r from-brand-900 to-slate-900 text-white rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-brand-200 font-bold block">
                  Plafond Temporaire Sollicité
                </span>
                <span className="text-2xl font-bold font-mono">
                  {formatCurrency(Number(request.requestedLimit))}
                </span>
                <span className="text-xs text-brand-200 block mt-0.5">
                  pour une durée de {request.durationDays} jours
                </span>
              </div>

              <div className="text-start sm:text-end bg-white/10 p-3 rounded-xl backdrop-blur-xs">
                <span className="text-[10px] uppercase text-brand-200 block">
                  Plafond Initial Standard
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  {formatCurrency(Number(request.initialLimit || 10000))}
                </span>
              </div>
            </div>

            {/* Quick Tab Switcher: Overview vs History */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-brand-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Vue Générale & Décisions
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-brand-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Historique & Traçabilité</span>
                {totalHistoryCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === 'history'
                        ? 'bg-white text-brand-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {totalHistoryCount}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-5 animate-in fade-in-0 duration-150">
                {/* Customer Information (Visible for Advisor/Supervisor) */}
                {request.customerProfile && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                      Titulaire du Compte & Agence
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {request.customerProfile.user?.firstName}{' '}
                        {request.customerProfile.user?.lastName}
                      </span>
                      <span className="font-mono text-slate-600">
                        CIN : {request.customerProfile.cin}
                      </span>
                    </div>
                  </div>
                )}

                {/* Motive Declared by Customer */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">
                    Motif déclaré par le client
                  </h4>
                  <p className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed italic">
                    « {request.reason} »
                  </p>
                </div>

                {/* COMPLEMENT FORM (If status == COMPLEMENT_REQUESTED) */}
                {request.status === LimitRequestStatus.COMPLEMENT_REQUESTED && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-amber-900">
                          {t('client.complementTitle')}
                        </h4>
                        {request.decisions && request.decisions.length > 0 && (
                          <p className="text-xs text-amber-800 mt-1 italic">
                            « {request.decisions[0].motive} »
                          </p>
                        )}
                      </div>
                    </div>

                    <form onSubmit={handleSendComplement} className="space-y-3 pt-1">
                      <textarea
                        rows={2}
                        value={complementText}
                        onChange={(e) => setComplementText(e.target.value)}
                        placeholder="Votre réponse ou explication complémentaire..."
                        className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        required
                      />

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-medium text-slate-700 hover:bg-amber-100 transition-colors">
                          <Upload className="w-3.5 h-3.5 text-amber-700" />
                          <span>
                            {complementFile ? complementFile.name : 'Joindre un justificatif'}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setComplementFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>

                        <Button
                          type="submit"
                          size="sm"
                          variant="primary"
                          isLoading={isSubmittingComplement}
                        >
                          {t('client.complementSubmit')}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* WORKFLOW ACTIONS FOR ADVISOR OR SUPERVISOR */}
                {(isEligibleForDirectApproval ||
                  requiresSupervisorRecommendation ||
                  isPendingSupervisorAction ||
                  (isAdvisor &&
                    (request.status === 'SUBMITTED' || request.status === 'UNDER_REVIEW'))) && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">
                      Décision Bancaire Immédiate
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {isEligibleForDirectApproval && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => {
                            setDecisionModalMode('APPROVE');
                            setMotive('');
                          }}
                        >
                          <CheckCircle className="w-4 h-4 me-1" />
                          Approuver directement
                        </Button>
                      )}

                      {requiresSupervisorRecommendation && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setDecisionModalMode('RECOMMEND');
                            setMotive('');
                          }}
                        >
                          Recommander au superviseur
                        </Button>
                      )}

                      {isPendingSupervisorAction && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => {
                              setDecisionModalMode('APPROVE');
                              setMotive('');
                            }}
                          >
                            <CheckCircle className="w-4 h-4 me-1" />
                            Valider et activer plafond
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setDecisionModalMode('REJECT');
                              setMotive('');
                            }}
                          >
                            <XCircle className="w-4 h-4 me-1" />
                            Refuser
                          </Button>
                        </>
                      )}

                      {isAdvisor &&
                        (request.status === 'SUBMITTED' ||
                          request.status === 'UNDER_REVIEW') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDecisionModalMode('COMPLEMENT');
                                setMotive('');
                              }}
                            >
                              Demander complément
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setDecisionModalMode('REJECT');
                                setMotive('');
                              }}
                            >
                              Rejeter
                            </Button>
                          </>
                        )}
                    </div>
                  </div>
                )}

                {/* Attached Documents */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-slate-500" />
                    Pièces justificatives jointes ({request.documents?.length || 0})
                  </h4>
                  {request.documents && request.documents.length > 0 ? (
                    <div className="space-y-1.5">
                      {request.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-brand-700 shrink-0" />
                            <span className="font-medium text-slate-800 truncate">
                              {doc.fileName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {(doc.fileSize / 1024).toFixed(0)} Ko
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                      Aucun document joint à cette demande.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FULL HISTORY & AUDIT TRAIL */}
            {activeTab === 'history' && (
              <div className="space-y-6 animate-in fade-in-0 duration-150">
                {/* 1. BANKING DECISIONS HISTORY */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-brand-600" />
                    Décisions Bancaires Prises ({request.decisions?.length || 0})
                  </h4>
                  {request.decisions && request.decisions.length > 0 ? (
                    <div className="space-y-2.5">
                      {request.decisions.map((d: any) => (
                        <div
                          key={d.id}
                          className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  d.decisionType === 'APPROVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : d.decisionType === 'RECOMMEND_APPROVAL'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : d.decisionType === 'REQUEST_COMPLEMENT'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {d.decisionType}
                              </span>
                              <span className="font-bold text-slate-800">
                                {d.actor
                                  ? `${d.actor.firstName} ${d.actor.lastName} (${d.actor.role})`
                                  : d.actorRole}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatDate(d.createdAt)}
                            </span>
                          </div>
                          <div className="p-2.5 bg-white rounded border border-slate-200/60 text-slate-700 italic">
                            « {d.motive} »
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                      Aucune décision bancaire formelle enregistrée pour l'instant.
                    </p>
                  )}
                </div>

                {/* 2. REQUEST VERSIONS HISTORY */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Historique des Versions & Modifications ({request.versions?.length || 0})
                  </h4>
                  {request.versions && request.versions.length > 0 ? (
                    <div className="space-y-2">
                      {request.versions.map((v) => (
                        <div
                          key={v.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-brand-900 bg-brand-50 px-2 py-0.5 rounded border border-brand-200/60 text-[11px]">
                                Version {v.versionNumber}
                              </span>
                              {v.changeReason && (
                                <span className="text-slate-600 text-xs font-medium truncate max-w-xs">
                                  {v.changeReason}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatDate(v.createdAt)}
                            </span>
                          </div>
                          {v.snapshot && (
                            <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-3">
                              <span>
                                Plafond :{' '}
                                <strong>
                                  {formatCurrency(Number(v.snapshot.requestedLimit || 0))}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Durée : <strong>{v.snapshot.durationDays} j</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Statut : <strong>{v.snapshot.status}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                      Version initiale (v1) sans modification ultérieure.
                    </p>
                  )}
                </div>

                {/* 3. CORE BANKING SWITCH & SIMULATOR ACTIVATIONS */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    Traçabilité Core Banking Switch & Simulateur ({request.activations?.length || 0})
                  </h4>
                  {request.activations && request.activations.length > 0 ? (
                    <div className="space-y-2">
                      {request.activations.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 font-mono"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                act.status === 'SUCCESS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              STATUT SWITCH : {act.status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(act.createdAt)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-sans pt-1">
                            Clé d'idempotence :{' '}
                            <span className="font-mono text-slate-800">
                              {act.idempotencyKey}
                            </span>
                          </div>
                          {act.restoredAt && (
                            <div className="text-[11px] text-emerald-700 font-sans pt-0.5 font-medium">
                              ✓ Plafond initial rétabli le {formatDate(act.restoredAt)} suite à
                              expiration.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                      Aucun ordre d’activation switch bancaire exécuté (dossier en cours
                      d’instruction ou refusé).
                    </p>
                  )}
                </div>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                {actionError}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* DECISION ACTION MODAL (IF TRIGGERED FROM DRAWER) */}
      <Modal
        isOpen={Boolean(decisionModalMode && request)}
        onClose={() => setDecisionModalMode(null)}
        title={
          decisionModalMode === 'APPROVE'
            ? `Approbation directe du dossier ${request?.reference}`
            : decisionModalMode === 'RECOMMEND'
            ? `Recommandation au superviseur — Dossier ${request?.reference}`
            : decisionModalMode === 'COMPLEMENT'
            ? `Demande de complément — Dossier ${request?.reference}`
            : `Rejet du dossier ${request?.reference}`
        }
        maxWidth="md"
      >
        <form onSubmit={handleExecuteDecision} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Montant demandé :</span>
              <span className="font-bold text-brand-900 text-sm">
                {formatCurrency(Number(request?.requestedLimit || 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Durée demandée :</span>
              <span className="font-semibold text-slate-800">
                {request?.durationDays} {t('common.days')}
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
              placeholder="Motif explicite vérifiable pour la piste d'audit..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
              required
            />
          </div>

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
              isLoading={isSubmittingDecision}
            >
              Confirmer la décision
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
