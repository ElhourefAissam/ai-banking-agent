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
} from 'lucide-react';

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

  const [complementText, setComplementText] = useState('');
  const [complementFile, setComplementFile] = useState<File | null>(null);
  const [isSubmittingComplement, setIsSubmittingComplement] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dossier ${request.reference}`}
      maxWidth="xl"
    >
      <div className="space-y-6 text-sm">
        {/* Header Summary */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-slate-900 font-mono">
                {request.reference}
              </span>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-xs text-slate-500">
              Créé le {formatDate(request.createdAt)} — Version {request.version}
            </p>
          </div>

          <div className="text-end">
            <span className="text-xs text-slate-400 block">Plafond sollicité</span>
            <span className="text-xl font-bold text-brand-900 font-mono">
              {formatCurrency(Number(request.requestedLimit))}
            </span>
            <span className="text-xs text-slate-500 block">
              pendant {request.durationDays} {t('common.days')}
            </span>
          </div>
        </div>

        {/* Motive & Details */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 mb-1">Motif de la demande</h4>
          <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
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

        {/* Decisions History */}
        {request.decisions && request.decisions.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              Historique des décisions bancaires
            </h4>
            <div className="space-y-2">
              {request.decisions.map((d) => (
                <div
                  key={d.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-start gap-2.5"
                >
                  <MessageSquare className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {d.decisionType} — {d.actorRole}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(d.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 italic">« {d.motive} »</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attached Documents */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Paperclip className="w-4 h-4 text-slate-500" />
            Documents joints ({request.documents?.length || 0})
          </h4>
          {request.documents && request.documents.length > 0 ? (
            <div className="space-y-1.5">
              {request.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-700" />
                    <span className="font-medium text-slate-800">{doc.fileName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {(doc.fileSize / 1024).toFixed(0)} Ko
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Aucun document joint.</p>
          )}
        </div>

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
    </Modal>
  );
};
