'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { ChatMessage, AIMessageRole } from '@proorga/shared-types';
import { OtpModal } from '@/components/ui/otp-modal';
import {
  Bot,
  User,
  Send,
  Trash2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Upload,
  Paperclip,
  FileText,
  X,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

interface AiChatDrawerProps {
  onSuccessSubmission?: (reference: string) => void;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ onSuccessSubmission }) => {
  const { t, formatCurrency } = useTranslation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingFromAi, setIsSubmittingFromAi] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<Record<string, File>>({});
  const [pendingDraftToRetry, setPendingDraftToRetry] = useState<{
    requestId: string;
    targetVersion: number;
    requestedLimit: number;
  } | null>(null);
  const [pendingOtpDraft, setPendingOtpDraft] = useState<{
    requestId: string;
    targetVersion: number;
    requestedLimit: number;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const loadMessages = async () => {
    try {
      const msgs = await api.getAiMessages();
      setMessages(msgs);
    } catch (e) {
      console.warn('Could not load AI messages:', e);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    setInputText('');
    const tempUserMsg: ChatMessage = {
      role: AIMessageRole.USER,
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const reply = await api.sendAiMessage(text.trim());
      setMessages((prev) => [...prev, reply]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: AIMessageRole.ASSISTANT,
        content: `Désolé, une erreur est survenue lors de la communication avec l'assistant : ${err.message}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAiDraft = async (params: {
    requestId: string;
    targetVersion: number;
    requestedLimit: number;
  }) => {
    const file = attachedFiles[params.requestId];
    if (params.requestedLimit > 50000 && !file) {
      setSubmissionFeedback(
        `⚠️ Justificatif obligatoire : Le montant demandé (${formatCurrency(
          params.requestedLimit
        )}) dépassant 50 000 DH, veuillez joindre une pièce justificative (justificatif de domicile, bon de commande, devis ou facture) ci-dessus avant de valider.`
      );
      setPendingDraftToRetry(params);
      return;
    }

    // High amount requires Strong Customer Authentication (SCA) OTP
    if (params.requestedLimit > 50000) {
      setPendingOtpDraft(params);
      return;
    }

    await executeFinalSubmission(params);
  };

  const executeFinalSubmission = async (params: {
    requestId: string;
    targetVersion: number;
    requestedLimit: number;
  }) => {
    const file = attachedFiles[params.requestId];
    setIsSubmittingFromAi(true);
    setSubmissionFeedback(null);
    try {
      // 1. If document is attached, upload it first to the draft
      if (file) {
        await api.uploadDocument(params.requestId, file);
      }

      // 2. Submit the request
      const submitted = await api.submitRequest(params.requestId, {
        targetVersion: params.targetVersion,
      });

      setSubmissionFeedback(
        `✅ Demande ${submitted.reference} validée et transmise avec succès à votre conseiller !`
      );
      setPendingDraftToRetry(null);
      setPendingOtpDraft(null);

      if (onSuccessSubmission) {
        onSuccessSubmission(submitted.reference || submitted.id);
      }

      await handleSendMessage(
        `J'ai formellement confirmé et soumis ma demande ${submitted.reference}${
          file ? ` avec justificatif joint (${file.name})` : ''
        }.`
      );
    } catch (err: any) {
      setSubmissionFeedback(`❌ Erreur de soumission : ${err.message}`);
      setPendingDraftToRetry(params);
      throw err;
    } finally {
      setIsSubmittingFromAi(false);
    }
  };

  const handleClear = async () => {
    await api.clearAiMessages();
    setMessages([]);
    setSubmissionFeedback(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              {t('ai.assistantTitle')}
            </h3>
            <p className="text-[10px] text-slate-500">
              {t('ai.assistantSubtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          title="Effacer la conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 px-4">
            <Bot className="w-10 h-10 text-teal-600 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-slate-700">
              Bonjour ! Comment puis-je vous aider aujourd'hui ?
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Je peux consulter vos plafonds, vérifier la complétude de votre dossier et préparer vos demandes de relèvement.
            </p>

            {/* Quick Questions */}
            <div className="mt-5 space-y-1.5 max-w-md mx-auto text-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                {t('ai.quickQuestions')}
              </span>
              <button
                onClick={() => handleSendMessage(t('ai.q1'))}
                className="w-full text-start p-2.5 text-xs bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-200 rounded-lg text-slate-700 transition-colors flex items-center justify-between"
              >
                <span>{t('ai.q1')}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => handleSendMessage(t('ai.q2'))}
                className="w-full text-start p-2.5 text-xs bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-200 rounded-lg text-slate-700 transition-colors flex items-center justify-between"
              >
                <span>{t('ai.q2')}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => handleSendMessage(t('ai.q3'))}
                className="w-full text-start p-2.5 text-xs bg-slate-50 hover:bg-teal-50 border border-slate-200/80 hover:border-teal-200 rounded-lg text-slate-700 transition-colors flex items-center justify-between"
              >
                <span>{t('ai.q3')}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const isUser = m.role === AIMessageRole.USER;

          return (
            <div
              key={m.id || idx}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-brand-900 text-white'
                    : 'bg-teal-600 text-white shadow-xs'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-brand-900 text-white rounded-tr-xs'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs whitespace-pre-line'
                }`}
              >
                {m.content}

                {/* CONFIRMATION CARD (Prepared Draft by AI) */}
                {m.confirmationMetadata && m.confirmationMetadata.requiresConfirmation && (
                  <div className="mt-3 p-3.5 bg-white border border-teal-300 rounded-xl shadow-xs text-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-teal-900 font-bold">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>{t('ai.confirmationCardTitle')}</span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {t('ai.confirmationCardSubtitle')}
                    </p>

                    <div className="p-2.5 bg-slate-50 rounded-lg space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plafond :</span>
                        <span className="font-bold text-brand-900">
                          {formatCurrency(m.confirmationMetadata.parameters.requestedLimit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Durée :</span>
                        <span>{m.confirmationMetadata.parameters.durationDays} jours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Motif :</span>
                        <span className="italic font-sans text-slate-700">
                          « {m.confirmationMetadata.parameters.reason} »
                        </span>
                      </div>
                    </div>

                    {/* File Attachment / Supporting Justificatif */}
                    {(() => {
                      const reqId = m.confirmationMetadata.parameters.requestId;
                      const isHighAmount =
                        m.confirmationMetadata.parameters.requestedLimit > 50000;
                      const attached = attachedFiles[reqId];

                      return (
                        <div className="p-2.5 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 space-y-2 mt-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-teal-950 flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-teal-700" />
                              <span>
                                {isHighAmount
                                  ? 'Pièce justificative requise (> 50 000 DH ou Justificatif de domicile)'
                                  : 'Pièce justificative (optionnelle)'}
                              </span>
                            </span>
                            {isHighAmount && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                                Requis
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] text-teal-900 leading-tight">
                            {isHighAmount
                              ? 'Pour débloquer votre demande, veuillez joindre votre justificatif (justificatif de domicile, bon de commande, facture, etc.).'
                              : 'Vous pouvez joindre un justificatif complémentaire pour votre conseiller.'}
                          </p>

                          {attached ? (
                            <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-teal-300 text-xs shadow-2xs">
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div className="truncate">
                                  <span className="font-semibold text-slate-800 truncate block text-[11px]">
                                    {attached.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {(attached.size / 1024).toFixed(0)} Ko
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachedFiles((prev) => {
                                    const copy = { ...prev };
                                    delete copy[reqId];
                                    return copy;
                                  });
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                title="Supprimer ce fichier"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex items-center justify-center gap-2 p-2 bg-white hover:bg-teal-100/60 border border-teal-300 hover:border-teal-400 rounded-lg text-xs font-semibold text-teal-900 transition-colors shadow-2xs">
                              <Upload className="w-3.5 h-3.5 text-teal-700" />
                              <span>Joindre mon justificatif de domicile / document (PDF, PNG, JPG)</span>
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    setAttachedFiles((prev) => ({
                                      ...prev,
                                      [reqId]: file,
                                    }));
                                    setSubmissionFeedback(null);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })()}

                    <Button
                      size="sm"
                      variant="success"
                      className="w-full mt-2 font-bold"
                      isLoading={isSubmittingFromAi}
                      onClick={() =>
                        handleConfirmAiDraft({
                          requestId: m.confirmationMetadata!.parameters.requestId,
                          targetVersion: m.confirmationMetadata!.parameters.targetVersion,
                          requestedLimit:
                            m.confirmationMetadata!.parameters.requestedLimit,
                        })
                      }
                    >
                      <CheckCircle className="w-4 h-4 me-1.5" />
                      {t('ai.confirmAndSubmit')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic p-2">
            <Bot className="w-4 h-4 animate-bounce text-teal-600" />
            <span>L’assistant bancaire analyse votre demande...</span>
          </div>
        )}

        {submissionFeedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-2 ${
              submissionFeedback.startsWith('✅')
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : submissionFeedback.startsWith('⚠️')
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-2">
              {submissionFeedback.startsWith('✅') ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-semibold leading-relaxed">
                {submissionFeedback}
              </span>
            </div>

            {/* If blocked by missing document / incomplete file, show instant unblock upload form */}
            {pendingDraftToRetry && !submissionFeedback.startsWith('✅') && (
              <div className="pt-2 border-t border-rose-200/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-rose-700" />
                  <span>
                    {attachedFiles[pendingDraftToRetry.requestId]
                      ? attachedFiles[pendingDraftToRetry.requestId].name
                      : 'Joindre mon justificatif de domicile maintenant'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setAttachedFiles((prev) => ({
                          ...prev,
                          [pendingDraftToRetry.requestId]: file,
                        }));
                      }
                    }}
                  />
                </label>

                {attachedFiles[pendingDraftToRetry.requestId] && (
                  <Button
                    size="sm"
                    variant="success"
                    isLoading={isSubmittingFromAi}
                    onClick={() => handleConfirmAiDraft(pendingDraftToRetry)}
                    className="font-bold text-xs"
                  >
                    Débloquer et soumettre à nouveau
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Suggestion Chips */}
      <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {[
          'Mon plafond actuel et solde ?',
          'Augmenter mon plafond à 25 000 DH',
          'Mon dossier client est-il complet ?',
          'Quelles pièces justificatives ?',
        ].map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="whitespace-nowrap px-2.5 py-1 text-[11px] rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 font-medium transition-colors shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-slate-200/80 bg-white flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('ai.placeholder')}
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button
          type="submit"
          size="md"
          variant="primary"
          disabled={!inputText.trim() || isLoading}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* Strong Customer Authentication (SCA) OTP Modal for High-Value Requests (> 50,000 DH) */}
      <OtpModal
        isOpen={Boolean(pendingOtpDraft)}
        onClose={() => setPendingOtpDraft(null)}
        onConfirm={async () => {
          if (pendingOtpDraft) {
            await executeFinalSubmission(pendingOtpDraft);
          }
        }}
        amount={pendingOtpDraft?.requestedLimit}
        title="Validation par Authentification Forte (SCA)"
        description="Conformément aux exigences de sécurité bancaire pour les opérations à fort montant (> 50 000 DH), veuillez saisir le code de sécurité temporaire reçu par SMS."
      />
    </div>
  );
};
