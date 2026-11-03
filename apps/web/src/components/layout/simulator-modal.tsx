'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { api } from '@/lib/api';
import { SimulationFailureMode } from '@proorga/shared-types';
import { Cpu, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [currentMode, setCurrentMode] = useState<SimulationFailureMode>(
    SimulationFailureMode.NONE
  );
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getSimulatorMode().then((res) => {
        setCurrentMode(res.failureMode);
      }).catch(console.error);
    }
  }, [isOpen]);

  const handleSetMode = async (mode: SimulationFailureMode) => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      await api.overrideSimulatorMode(mode);
      setCurrentMode(mode);
      setActionMessage(`Mode de simulation configuré sur : ${mode}`);
    } catch (e: any) {
      setActionMessage(`Erreur: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckExpirations = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await api.checkExpirations();
      setActionMessage(
        `Expirations vérifiées : ${res.expiredCount} demande(s) expirée(s) et rétablie(s) à 10 000 DH.`
      );
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      setActionMessage(`Erreur vérification expirations: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Simulateur Bancaire & Gestion des Incidents" maxWidth="lg">
      <div className="space-y-6 text-sm">
        <div>
          <p className="text-slate-600 mb-3 text-xs leading-relaxed">
            Ce panneau de démonstration permet de tester la résilience du système face aux
            incidents de communication avec le serveur bancaire central (Core Banking Switch).
          </p>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-700 block mb-2">
              Mode de panne deterministe actif :
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-md ${
                  currentMode === SimulationFailureMode.NONE
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {currentMode}
              </span>
              <span className="text-xs text-slate-500">
                {currentMode === SimulationFailureMode.NONE
                  ? 'Nominal : Les activations réussissent immédiatement.'
                  : currentMode === SimulationFailureMode.LOST_ACK
                  ? 'Perte d’ACK : Le plafond est activé dans le core, mais la réponse réseau est perdue. La reprise idempotente doit retrouver le statut sans double activation.'
                  : 'Panne simulée active.'}
              </span>
            </div>
          </div>
        </div>

        {/* Failure Mode Switcher Buttons */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-2">
            Injecter un scénario de panne pour la prochaine activation :
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleSetMode(SimulationFailureMode.NONE)}
              className={`p-3 rounded-lg border text-start transition-colors ${
                currentMode === SimulationFailureMode.NONE
                  ? 'border-brand-600 bg-brand-50 text-brand-900 font-bold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-emerald-700 font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>NONE (Succès nominal)</span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                Comportement standard sans erreur.
              </p>
            </button>

            <button
              onClick={() => handleSetMode(SimulationFailureMode.NETWORK_TIMEOUT)}
              className={`p-3 rounded-lg border text-start transition-colors ${
                currentMode === SimulationFailureMode.NETWORK_TIMEOUT
                  ? 'border-brand-600 bg-brand-50 text-brand-900 font-bold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-amber-700 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>NETWORK_TIMEOUT</span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                Délai d’attente dépassé (statut ACTIVATION_FAILED).
              </p>
            </button>

            <button
              onClick={() => handleSetMode(SimulationFailureMode.LOST_ACK)}
              className={`p-3 rounded-lg border text-start transition-colors col-span-2 ${
                currentMode === SimulationFailureMode.LOST_ACK
                  ? 'border-brand-600 bg-brand-50 text-brand-900 font-bold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-purple-700 font-semibold">
                <ShieldAlert className="w-4 h-4" />
                <span>LOST_ACK (Réponse perdue & Reprise idempotente)</span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                Plafond appliqué côté core mais coupure socket avant l’ACK. Une relance avec la clé d’idempotence valide la réussite sans double activation.
              </p>
            </button>
          </div>
        </div>

        {/* Expiration trigger */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-800 text-xs block">
              Contrôle des échéances & Rétablissement
            </span>
            <span className="text-[11px] text-slate-500">
              Scanne les plafonds actifs dont la date de fin est atteinte et rétablit 10 000 DH.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckExpirations}
            isLoading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5 me-1" />
            Vérifier expirations
          </Button>
        </div>

        {actionMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs font-medium animate-in fade-in-0">
            {actionMessage}
          </div>
        )}
      </div>
    </Modal>
  );
};
