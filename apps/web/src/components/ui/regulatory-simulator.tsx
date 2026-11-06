'use client';

import React from 'react';
import { useTranslation } from '@/i18n';
import { BANKING_RULES } from '@proorga/shared-types';
import { ShieldCheck, UserCheck, ShieldAlert, Calendar, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

interface RegulatorySimulatorProps {
  amount: number;
  durationDays: number;
  onAmountChange?: (amount: number) => void;
  onDurationChange?: (duration: number) => void;
  isInteractive?: boolean;
}

export const RegulatorySimulator: React.FC<RegulatorySimulatorProps> = ({
  amount,
  durationDays,
  onAmountChange,
  onDurationChange,
  isInteractive = false,
}) => {
  const { formatCurrency } = useTranslation();

  const isTier1 = amount <= BANKING_RULES.ADVISOR_MAX_THRESHOLD;
  const isTier2 =
    amount > BANKING_RULES.ADVISOR_MAX_THRESHOLD &&
    amount <= BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD;
  const isTier3 = amount > BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD;

  // Calculate timeline dates
  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(startDate.getDate() + (durationDays || 1));

  const formatShortDate = (d: Date) => {
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-100 text-brand-800">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Simulateur Réglementaire & Trajectoire Temporelle
            </h4>
            <p className="text-[11px] text-slate-500">
              Règles prudentielles Bank Al-Maghrib & circuit de décision en temps réel
            </p>
          </div>
        </div>

        {/* Dynamic Tier Badge */}
        {isTier1 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Palier 1 : Délégation Conseiller Directe (≤ 30k)
          </span>
        )}
        {isTier2 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            Palier 2 : Double Validation Superviseur (30k - 50k)
          </span>
        )}
        {isTier3 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Palier 3 : Seuil Élevé & Justificatif Requis (&gt; 50k)
          </span>
        )}
      </div>

      {/* Optional Interactive Sliders if enabled */}
      {isInteractive && onAmountChange && onDurationChange && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Plafond souhaité :</span>
              <span className="font-mono font-bold text-brand-900 text-sm">
                {formatCurrency(amount)}
              </span>
            </div>
            <input
              type="range"
              min={11000}
              max={100000}
              step={1000}
              value={amount}
              onChange={(e) => onAmountChange(Number(e.target.value))}
              className="w-full accent-brand-800 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
              <span>11 000 DH</span>
              <span className="text-emerald-700 font-bold">30 000 DH</span>
              <span className="text-amber-700 font-bold">50 000 DH</span>
              <span>100 000 DH</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Durée temporaire :</span>
              <span className="font-mono font-bold text-brand-900 text-sm">
                {durationDays} {durationDays > 1 ? 'jours' : 'jour'}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={durationDays}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              className="w-full accent-brand-800 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
              <span>1 jour</span>
              <span>3 jours</span>
              <span>5 jours</span>
              <span>7 jours max</span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Explanation Box */}
      <div
        className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
          isTier1
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : isTier2
            ? 'bg-blue-50/70 border-blue-200 text-blue-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <div className="font-bold flex items-center gap-1.5 mb-1">
          {isTier1 && '⚡ Décision Rapide : Accord Direct Conseiller'}
          {isTier2 && '👔 Validation Collégiale : Conseiller + Arbitrage Superviseur'}
          {isTier3 && '🔒 Exigence Réglementaire Renforcée : Pièce Justificative & SCA'}
        </div>
        <p className="text-[11.5px]">
          {isTier1 &&
            `Le montant de ${formatCurrency(
              amount
            )} est éligible à la délégation directe de votre conseiller d’agence. Aucun arbitrage hiérarchique supérieur ni pièce justificative obligatoire.`}
          {isTier2 &&
            `Pour un montant de ${formatCurrency(
              amount
            )} (entre 30 000 DH et 50 000 DH), une recommandation technique de votre conseiller est transmise au superviseur pour validation définitive.`}
          {isTier3 &&
            `Le montant de ${formatCurrency(
              amount
            )} dépasse 50 000 DH : vous devez impérativement joindre une pièce justificative (facture proforma, bon de commande ou devis) et valider par Authentification Forte (SCA).`}
        </p>
      </div>

      {/* Dynamic Lifecycle Timeline */}
      <div className="pt-2 border-t border-slate-200/80">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2.5">
          Cycle de Vie Prévu du Plafond Temporaire
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Step 1: Activation */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Calendar className="w-3.5 h-3.5 text-brand-600" />
              <span>Prise d'effet</span>
            </div>
            <div className="font-mono text-xs text-brand-900 font-bold">
              Dès validation formelle
            </div>
            <div className="text-[11px] text-slate-500">
              Plafond porté à <strong className="text-slate-800">{formatCurrency(amount)}</strong>
            </div>
          </div>

          {/* Step 2: Duration */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Durée active</span>
            </div>
            <div className="font-mono text-xs text-indigo-900 font-bold">
              {durationDays} jour{durationDays > 1 ? 's' : ''} consécutif{durationDays > 1 ? 's' : ''}
            </div>
            <div className="text-[11px] text-slate-500">
              Échéance : <strong className="text-slate-800">{formatShortDate(expiryDate)}</strong>
            </div>
          </div>

          {/* Step 3: Auto-revert */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rétablissement Auto</span>
            </div>
            <div className="font-mono text-xs text-emerald-800 font-bold">
              10 000 DH standard
            </div>
            <div className="text-[11px] text-slate-500">
              Retour automatique sans frais
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
