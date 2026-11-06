'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, Smartphone, RefreshCw, KeyRound, Check } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (otp: string) => Promise<void> | void;
  title?: string;
  description?: string;
  amount?: number;
  reference?: string;
  phoneHint?: string;
}

const DEFAULT_DEMO_CODE = '749281';

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Authentification Forte Client (SCA)',
  description = 'Conformément aux exigences de sécurité bancaire pour les opérations à fort montant (> 50 000 DH), veuillez saisir le code de sécurité temporaire reçu par SMS.',
  amount,
  reference,
  phoneHint = '+212 6** *** *89',
}) => {
  const { formatCurrency } = useTranslation();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(300); // 5 minutes
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setCountdown(300);
      setErrorMessage(null);
      setIsSubmitting(false);
      setIsCopied(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleInputChange = (index: number, value: string) => {
    // Only accept numeric character
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    const char = cleaned[cleaned.length - 1];
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);
    setErrorMessage(null);

    // Auto-advance
    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || '';
    }
    setDigits(nextDigits);
    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const handleAutoFillDemo = () => {
    const demoArray = DEFAULT_DEMO_CODE.split('');
    setDigits(demoArray);
    setErrorMessage(null);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = digits.join('');
    if (fullOtp.length < 6) {
      setErrorMessage('Veuillez saisir le code complet à 6 chiffres.');
      return;
    }

    if (countdown <= 0) {
      setErrorMessage('Le code a expiré. Veuillez cliquer sur Renvoyer un nouveau code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm(fullOtp);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Code de vérification invalide.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullOtpEntered = digits.every((d) => d.length === 1);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Security Header Banner */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-emerald-900 leading-relaxed">
            <p className="font-bold text-emerald-950">
              Protocole DSP2 / 3D-Secure Renforcé
            </p>
            <p className="mt-0.5 text-emerald-800">
              {description}
            </p>
            {(amount !== undefined || reference) && (
              <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center gap-4 font-mono font-bold">
                {reference && <span>Dossier : {reference}</span>}
                {amount !== undefined && <span>Montant : {formatCurrency(amount)}</span>}
              </div>
            )}
          </div>
        </div>

        {/* SMS Notification Info */}
        <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand-700" />
            <span>Code envoyé au : <strong className="text-slate-900 font-mono">{phoneHint}</strong></span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>{formatTimer(countdown)}</span>
          </div>
        </div>

        {/* Test Code Auto-fill Demo Box */}
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Code de test démo : <strong className="font-mono text-sm tracking-wider font-bold">{DEFAULT_DEMO_CODE}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutoFillDemo}
            className="px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Rempli</span>
              </>
            ) : (
              <span>Remplir auto</span>
            )}
          </button>
        </div>

        {/* OTP 6-Digit Input Grid */}
        <div className="py-2">
          <label className="block text-center text-xs font-semibold text-slate-700 mb-2">
            Saisissez le code de validation à 6 chiffres
          </label>
          <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-11 h-13 text-center text-xl font-bold font-mono rounded-xl border transition-all focus:outline-none ${
                  digit
                    ? 'border-brand-600 bg-brand-50/40 text-brand-950 shadow-xs ring-1 ring-brand-500'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
                }`}
              />
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 text-center font-medium animate-in fade-in-0 duration-150">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setCountdown(300);
              setErrorMessage(null);
            }}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 underline underline-offset-2 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Renvoyer un nouveau code</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSubmit()}
              disabled={!fullOtpEntered || isSubmitting}
              isLoading={isSubmitting}
              className="bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-500 text-white"
            >
              <ShieldCheck className="w-4 h-4 me-1.5" />
              Confirmer l'opération
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
