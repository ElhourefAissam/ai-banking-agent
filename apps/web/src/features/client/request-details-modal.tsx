'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { LimitRequestDetail, LimitRequestStatus } from '@proorga/shared-types';
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
  Shield,
  ArrowRight,
  Eye,
  Download,
} from 'lucide-react';
import { DocumentViewerModal } from '@/features/documents/document-viewer-modal';

interface RequestDetailsModalProps {
  request: LimitRequestDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  request,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();

  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [complementText, setComplementText] = useState('');
  const [complementFile, setComplementFile] = useState<File | null>(null);
  const [isSubmittingComplement, setIsSubmittingComplement] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<any | null>(null);

  if (!request) return null;

  const isCancelable =
    request.status === LimitRequestStatus.DRAFT ||
    request.status === LimitRequestStatus.SUBMITTED ||
    request.status === LimitRequestStatus.UNDER_REVIEW ||
    request.status === LimitRequestStatus.COMPLEMENT_REQUESTED;

  const handleCancel = async () => {
    if (!window.confirm(t('client.cancelConfirm'))) return;

    setIsCancelling(true);
    setErrorMessage(null);
    try {
      await api.cancelRequest(request.id, { targetVersion: request.version });
      onRefresh();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec de l’annulation.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSendComplement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingComplement(true);
    setErrorMessage(null);

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
      onRefresh();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec de la réponse au complément.');
    } finally {
      setIsSubmittingComplement(false);
    }
  };

  const totalHistoryItems =
    (request.decisions?.length || 0) +
    (request.versions?.length || 0) +
    (request.activations?.length || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Dossier {request.reference}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-700 border border-slate-200">
            v{request.version}
          </span>
        </div>
      }
      maxWidth="xl"
    >
      <div className="space-y-5 text-sm">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-slate-900 font-mono">
                {request.reference}
              </span>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-xs text-slate-500">
              Créé le {formatDate(request.createdAt)} — Compte :{' '}
              <span className="font-mono text-slate-700">
                {request.account?.accountNumber || 'Compte courant'}
              </span>
            </p>
          </div>

          <div className="text-start sm:text-end">
            <span className="text-xs text-slate-400 block">Plafond sollicité</span>
            <span className="text-xl font-bold text-brand-900 font-mono">
              {formatCurrency(Number(request.requestedLimit))}
            </span>
            <span className="text-xs text-slate-500 block">
              pendant {request.durationDays} {t('common.days')}
            </span>
          </div>
        </div>

        {/* Tab Switcher: Overview vs Full History */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-brand-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Vue Générale & Justificatifs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-brand-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historique & Traçabilité</span>
            {totalHistoryItems > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'history'
                    ? 'bg-white text-brand-900'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {totalHistoryItems}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5 animate-in fade-in-0 duration-150">
            {/* Customer Info (if viewed by advisor or supervisor) */}
            {request.customerProfile && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Titulaire du compte
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    {request.customerProfile.user?.firstName}{' '}
                    {request.customerProfile.user?.lastName}
                  </span>
                  <span className="font-mono text-slate-500">
                    CIN : {request.customerProfile.cin}
                  </span>
                </div>
              </div>
            )}

            {/* Motive & Details */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-1">Motif de la demande</h4>
              <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                {request.reason}
              </p>
            </div>

            {/* COMPLEMENT REQUIRED PANEL (If status == COMPLEMENT_REQUESTED) */}
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

                <form onSubmit={handleSendComplement} className="space-y-3 pt-2">
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

            {/* Attached Documents */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-brand-700" />
                  <span>Documents joints ({request.documents?.length || 0})</span>
                </h4>
                {request.documents && request.documents.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    Cliquer pour ouvrir
                  </span>
                )}
              </div>

              {request.documents && request.documents.length > 0 ? (
                <div className="space-y-2">
                  {request.documents.map((doc) => {
                    const isPdf =
                      doc.fileType === 'application/pdf' ||
                      doc.fileName.toLowerCase().endsWith('.pdf');
                    return (
                      <div
                        key={doc.id}
                        className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand-300 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer group"
                        onClick={() => setViewingDocument(doc)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                          <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200/60 flex items-center justify-center shrink-0 text-brand-700">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="font-semibold text-slate-900 group-hover:text-brand-800 truncate block">
                              {doc.fileName}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                              <span>{(doc.fileSize / 1024).toFixed(0)} Ko</span>
                              <span>•</span>
                              <span className="uppercase text-[9px] font-sans font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                                {isPdf ? 'PDF' : 'IMAGE'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ms-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setViewingDocument(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200/80 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-brand-700" />
                            <span>Visualiser</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => api.downloadDocument(doc.id, doc.fileName)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Télécharger"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {t('client.noDocs')}
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
                        <div className="flex items-center gap-2">
                          <StatusBadge status={d.decisionType} size="sm" />
                          <span className="font-bold text-slate-800 text-xs">
                            {d.actor
                              ? `${d.actor.firstName} ${d.actor.lastName} (${t(`roles.${d.actor.role}`) || d.actor.role})`
                              : t(`roles.${d.actorRole}`) || d.actorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(d.createdAt)}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200/60 text-slate-700 italic">
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
                        Clé d'idempotence : <span className="font-mono text-slate-800">{act.idempotencyKey}</span>
                      </div>
                      {act.restoredAt && (
                        <div className="text-[11px] text-emerald-700 font-sans pt-0.5 font-medium">
                          ✓ Plafond initial rétabli le {formatDate(act.restoredAt)} suite à expiration.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                  Aucun ordre d’activation switch bancaire exécuté (dossier en cours d’instruction ou refusé).
                </p>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
          <div>
            {isCancelable && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                isLoading={isCancelling}
                className="w-full sm:w-auto"
              >
                {t('client.cancelButton')}
              </Button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            {t('common.close')}
          </Button>
        </div>
      </div>

      <DocumentViewerModal
        isOpen={Boolean(viewingDocument)}
        document={viewingDocument}
        onClose={() => setViewingDocument(null)}
      />
    </Modal>
  );
};
