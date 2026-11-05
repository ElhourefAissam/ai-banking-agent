'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useQueryState, parseAsString } from 'nuqs';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  QrCode,
  FileCheck,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Calendar,
  Lock,
  ArrowLeft,
  Globe,
} from 'lucide-react';

interface VerificationResult {
  isValid: boolean;
  message?: string;
  reference?: string;
  status?: string;
  holderMaskedName?: string;
  accountMasked?: string;
  requestedLimit?: number;
  initialLimit?: number;
  durationDays?: number;
  activeFrom?: string | null;
  activeUntil?: string | null;
  certifiedAt?: string;
}

function VerifyContent() {
  const { t, locale, setLocale, formatCurrency, formatDate } = useTranslation();
  const [refParam, setRefParam] = useQueryState('ref', parseAsString);
  const [hashParam] = useQueryState('hash', parseAsString);

  const [inputRef, setInputRef] = useState(refParam || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (refParam) {
      setInputRef(refParam);
      performVerification(refParam, hashParam || undefined);
    }
  }, [refParam, hashParam]);

  const performVerification = async (ref: string, hash?: string) => {
    const trimmed = ref.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await api.verifyCertificate(trimmed, hash);
      setResult(data);
    } catch (err: any) {
      setResult({
        isValid: false,
        message: err.message || 'Erreur lors de la vérification du document bancaire.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRef.trim()) {
      setRefParam(inputRef.trim());
      performVerification(inputRef.trim(), hashParam || undefined);
    }
  };

  const handleCopyRef = () => {
    if (result?.reference) {
      navigator.clipboard.writeText(result.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Official Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0a192f] flex items-center justify-center text-white font-bold tracking-wider text-base shadow-sm">
              PO
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight block">
                PROORGA BANK
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                Portail Officiel d'Authentification
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              {(['fr', 'en', 'ar'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLocale(lang)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    locale === lang
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('attestation.backHome')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Title & Description */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
            <QrCode className="w-3.5 h-3.5" />
            <span>Contrôle d'Authenticité QR Code</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('attestation.portalTitle')}
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            {t('attestation.portalSubtitle')}
          </p>
        </div>

        {/* Search Bar Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputRef}
              onChange={(e) => setInputRef(e.target.value)}
              placeholder={t('attestation.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none uppercase font-mono"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            className="shrink-0"
          >
            <ShieldCheck className="w-4 h-4 me-1.5" />
            <span>{t('attestation.verifyBtn')}</span>
          </Button>
        </form>

        {/* Verification Result Card */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm animate-pulse">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ShieldCheck className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                {t('attestation.verifying')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Interrogation du registre central chiffré des attestations PROORGA.
              </p>
            </div>
          </div>
        ) : result ? (
          result.isValid ? (
            /* VALID CERTIFICATE CARD */
            <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-md overflow-hidden animate-in fade-in-0 duration-200">
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 block">
                      Certificat Conforme & Actif
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                      {t('attestation.validTitle')}
                    </h2>
                  </div>
                </div>

                <div className="hidden sm:block text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-white text-emerald-800 shadow-2xs">
                    SCEAU BANCAIRE VÉRIFIÉ
                  </span>
                </div>
              </div>

              {/* Body Details */}
              <div className="p-6 space-y-6">
                <p className="text-xs text-slate-600 leading-relaxed border-b border-slate-100 pb-4">
                  {t('attestation.validSubtitle')}
                </p>

                {/* Amount Highlight Box */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 block">
                      {t('attestation.grantedLimit')}
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900 mt-0.5">
                      {formatCurrency(result.requestedLimit || 0)}
                    </div>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200">
                    <span className="text-[11px] text-emerald-700 block">
                      {t('attestation.initialLimit')}
                    </span>
                    <span className="font-bold text-sm text-emerald-900">
                      {formatCurrency(result.initialLimit || 10000)}
                    </span>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium block">
                      {t('attestation.reference')}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {result.reference}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyRef}
                        className="text-slate-400 hover:text-slate-700 p-1 transition-colors"
                        title="Copier la référence"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium block">
                      {t('attestation.status')}
                    </span>
                    <div className="mt-1">
                      <StatusBadge status={result.status || 'ACTIVE'} size="sm" />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium block">
                      {t('attestation.holder')}
                    </span>
                    <span className="font-semibold text-slate-900 mt-1 block">
                      {result.holderMaskedName || 'Client PROORGA'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-medium block">
                      {t('attestation.account')}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 mt-1 block">
                      {result.accountMasked || '****'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-slate-500 font-medium block">
                      {t('attestation.validityPeriod')}
                    </span>
                    <span className="font-semibold text-slate-900 mt-1 block">
                      {result.activeFrom && result.activeUntil
                        ? `Du ${formatDate(result.activeFrom)} au ${formatDate(result.activeUntil)} (${result.durationDays || 3} jours)`
                        : `Durée autorisée : ${result.durationDays || 3} jours`}
                    </span>
                  </div>
                </div>

                {/* Cryptographic & Legal Seal Notice */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Intégrité & Valeur Probante</span>
                  </div>
                  <p className="leading-relaxed">
                    {t('attestation.tamperNotice')}
                  </p>
                  {result.certifiedAt && (
                    <div className="text-[10px] text-slate-400 font-mono pt-1">
                      Horodaté le {formatDate(result.certifiedAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* INVALID CERTIFICATE CARD */
            <div className="bg-white rounded-2xl border-2 border-red-300 shadow-md overflow-hidden animate-in fade-in-0 duration-200">
              <div className="bg-gradient-to-r from-red-600 to-rose-700 p-5 text-white flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <XCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-100 block">
                    Alerte Sécurité Bancaire
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    {t('attestation.invalidTitle')}
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {result.message || t('attestation.invalidSubtitle')}
                </p>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <span className="font-bold block">Recommandation pour tiers vérificateurs :</span>
                  <p>
                    Si ce document vous a été présenté sous forme papier ou électronique,
                    veuillez demander au titulaire de vous présenter l'original directement
                    depuis son application bancaire PROORGA sécurisée.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Empty Initial Welcome Prompt */
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-3 shadow-2xs">
            <Building2 className="w-10 h-10 text-brand-600 mx-auto" />
            <h3 className="font-bold text-base text-slate-900">
              Vérification instantanée de tout certificat officiel
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Saisissez la référence du dossier indiquée sur l'attestation bancaire (ex:{' '}
              <span className="font-mono font-semibold text-slate-700">REQ-2026-0001</span>)
              pour vérifier sa validité, son montant et son horodatage officiel.
            </p>
          </div>
        )}
      </main>

      {/* Official Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">
          PROORGA BANK SA — Société Anonyme Bancaire au capital de 12 000 000 000 MAD
        </p>
        <p className="text-[11px] text-slate-400">
          Agrément Bank Al-Maghrib N° 45/2012 — Siège Social : Tour PROORGA, Casablanca Finance City
        </p>
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Chargement du portail de vérification...</p>
          </div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
