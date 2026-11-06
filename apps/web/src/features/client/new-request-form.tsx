'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { OtpModal } from '@/components/ui/otp-modal';
import { RegulatorySimulator } from '@/components/ui/regulatory-simulator';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { BankAccountSummary, BANKING_RULES } from '@proorga/shared-types';
import {
  ShieldAlert,
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  DollarSign,
  FileCheck,
} from 'lucide-react';

interface NewRequestFormProps {
  accounts: BankAccountSummary[];
  onSuccess: (ref: string) => void;
  onCancel: () => void;
}

export const NewRequestForm: React.FC<NewRequestFormProps> = ({
  accounts,
  onSuccess,
  onCancel,
}) => {
  const { t, formatCurrency } = useTranslation();

  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts[0]?.id || ''
  );
  const [requestedLimit, setRequestedLimit] = useState<number>(25000);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [reason, setReason] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);

  // Synchronize selectedAccountId when accounts load asynchronously
  useEffect(() => {
    if ((!selectedAccountId || !accounts.some((a) => a.id === selectedAccountId)) && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Validation rules
  const activeAccountId = selectedAccountId || accounts[0]?.id;
  const isAmountValid =
    requestedLimit > BANKING_RULES.INITIAL_TRANSFER_LIMIT &&
    requestedLimit <= BANKING_RULES.MAX_REQUESTED_LIMIT;
  const isDurationValid =
    durationDays >= BANKING_RULES.MIN_DURATION_DAYS &&
    durationDays <= BANKING_RULES.MAX_DURATION_DAYS;
  const isReasonValid = reason.trim().length >= 5;
  const isDocumentRequired = requestedLimit > BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD;
  const hasDocument = Boolean(uploadedFile);

  const canProceedToConfirm =
    Boolean(activeAccountId) &&
    isAmountValid &&
    isDurationValid &&
    isReasonValid &&
    (!isDocumentRequired || hasDocument);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetAccountId = selectedAccountId || accounts[0]?.id;
    if (!targetAccountId) {
      setErrorMessage('Aucun compte bancaire éligible sélectionné.');
      return;
    }

    if (!isAmountValid) {
      setErrorMessage(
        `Le montant demandé doit être strictement supérieur à ${BANKING_RULES.INITIAL_TRANSFER_LIMIT} DH et inférieur ou égal à ${BANKING_RULES.MAX_REQUESTED_LIMIT} DH.`
      );
      return;
    }

    if (!isDurationValid) {
      setErrorMessage('La durée doit être comprise entre 1 et 7 jours.');
      return;
    }

    if (!isReasonValid) {
      setErrorMessage('Un motif explicite d’au moins 5 caractères est obligatoire.');
      return;
    }

    if (isDocumentRequired && !hasDocument) {
      setErrorMessage(
        `Pour tout montant supérieur à ${BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD} DH, le téléversement d’un justificatif est strictement obligatoire.`
      );
      return;
    }

    setIsConfirmationOpen(true);
  };

  const handleFinalSubmit = async () => {
    const targetAccountId = selectedAccountId || accounts[0]?.id;
    if (!targetAccountId) {
      setErrorMessage('Veuillez sélectionner un compte bancaire actif.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create Draft
      const draft = await api.createDraft({
        accountId: targetAccountId,
        requestedLimit,
        durationDays,
        reason: reason.trim(),
      });

      // 2. Upload Document if attached
      if (uploadedFile) {
        await api.uploadDocument(draft.id, uploadedFile);
      }

      // 3. Formally Submit with optimistic lock version
      await api.submitRequest(draft.id, {
        targetVersion: draft.version,
      });

      setIsConfirmationOpen(false);
      onSuccess(draft.reference || draft.id);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'Une erreur est survenue lors de la soumission.');
      setIsConfirmationOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader
          title={t('client.requestTitle')}
          subtitle={t('client.requestSubtitle')}
        />

        <form onSubmit={handleOpenConfirm} className="space-y-6 mt-6">
          {/* Target Account Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Compte bancaire concerné
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} — Solde : {formatCurrency(Number(acc.balance))} (Plafond actuel : {formatCurrency(Number(acc.currentTransferLimit))})
                </option>
              ))}
            </select>
          </div>

          {/* Requested Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                {t('client.requestedAmountLabel')}
              </label>
              <span className="text-base font-bold text-brand-900 font-mono">
                {formatCurrency(requestedLimit)}
              </span>
            </div>

            <input
              type="range"
              min={11000}
              max={100000}
              step={1000}
              value={requestedLimit}
              onChange={(e) => setRequestedLimit(Number(e.target.value))}
              className="w-full accent-brand-900 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />

            {/* Quick Amount Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[15000, 25000, 35000, 60000, 90000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRequestedLimit(preset)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all cursor-pointer ${
                    requestedLimit === preset
                      ? 'bg-brand-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                  }`}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Min : 10 001 DH</span>
              <span>Seuil conseiller : 30 000 DH</span>
              <span>Justificatif requis : &gt; 50 000 DH</span>
              <span>Max : 100 000 DH</span>
            </div>

            {/* Threshold Notice Badge */}
            {requestedLimit <= BANKING_RULES.ADVISOR_MAX_THRESHOLD ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  <strong>Délégation conseiller :</strong> Cette demande relève du pouvoir de décision directe de votre conseiller d’agence (≤ 30 000 DH).
                </span>
              </div>
            ) : (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-purple-600" />
                <span>
                  <strong>Circuit superviseur (&gt; 30 000 DH) :</strong> Cette demande sera instruite avec recommandation par votre conseiller puis validée par un superviseur des risques.
                </span>
              </div>
            )}
          </div>

          {/* Duration Days */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                {t('client.durationLabel')}
              </label>
              <span className="text-sm font-bold text-brand-900">
                {durationDays} {durationDays > 1 ? t('common.days') : t('common.day')}
              </span>
            </div>

            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full accent-brand-900 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />

            {/* Quick Duration Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[1, 2, 3, 5, 7].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all cursor-pointer ${
                    durationDays === days
                      ? 'bg-brand-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                  }`}
                >
                  {days} {days > 1 ? t('common.days') : t('common.day')}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>1 jour</span>
              <span>7 jours maximum</span>
            </div>
          </div>

          {/* Interactive Regulatory Simulator & Timeline */}
          <RegulatorySimulator
            amount={requestedLimit}
            durationDays={durationDays}
          />

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {t('client.reasonLabel')} <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('client.reasonPlaceholder')}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          {/* Supporting Document Upload (Mandatory if > 50,000 DH) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700">
                Pièce justificative
                {isDocumentRequired && (
                  <span className="ms-1 text-rose-600 font-bold">
                    (Obligatoire au-delà de 50 000 DH)
                  </span>
                )}
              </label>
              {uploadedFile && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Fichier prêt
                </span>
              )}
            </div>

            {isDocumentRequired && !uploadedFile && (
              <p className="text-xs text-amber-700 mb-3 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                {t('client.documentNotice')}
              </p>
            )}

            <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-xl p-5 text-center transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-xs font-semibold text-brand-700 hover:underline">
                  {uploadedFile ? uploadedFile.name : t('client.documentUpload')}
                </span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadedFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-1">
                Formats acceptés : PDF, PNG, JPG (maximum 5 Mo).
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canProceedToConfirm}
            >
              Vérifier et continuer
            </Button>
          </div>
        </form>
      </Card>

      {/* EXPLICIT CONFIRMATION MODAL */}
      <Modal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        title={t('client.confirmSubmissionTitle')}
        maxWidth="md"
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('client.confirmSubmissionDesc')}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Compte débité :</span>
              <span className="font-mono font-semibold text-slate-800">
                {selectedAccount?.accountNumber}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Plafond actuel standard :</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(Number(selectedAccount?.currentTransferLimit || 10000))}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Nouveau plafond sollicité :</span>
              <span className="font-bold text-brand-900 text-sm">
                {formatCurrency(requestedLimit)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Durée demandée :</span>
              <span className="font-semibold text-slate-800">
                {durationDays} {t('common.days')}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Justificatif attaché :</span>
              <span className="font-semibold text-slate-800">
                {uploadedFile ? uploadedFile.name : 'Aucun (non requis)'}
              </span>
            </div>
            <div className="py-1">
              <span className="text-slate-500 block mb-1">Motif déclaré :</span>
              <span className="italic text-slate-800 bg-white p-2 rounded border border-slate-200 block">
                « {reason} »
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmationOpen(false)}
              disabled={isSubmitting}
            >
              Modifier
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => {
                if (requestedLimit > BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD) {
                  setIsConfirmationOpen(false);
                  setIsOtpOpen(true);
                } else {
                  handleFinalSubmit();
                }
              }}
              isLoading={isSubmitting}
            >
              <CheckCircle className="w-4 h-4 me-1.5" />
              {t('client.confirmButton')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Strong Customer Authentication (SCA) OTP Modal for High-Value Requests (> 50,000 DH) */}
      <OtpModal
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        onConfirm={async () => {
          await handleFinalSubmit();
        }}
        amount={requestedLimit}
        title="Validation par Authentification Forte (SCA)"
        description="Conformément aux exigences de sécurité bancaire pour les opérations à fort montant (> 50 000 DH), veuillez saisir le code de sécurité temporaire reçu par SMS."
      />
    </div>
  );
};
