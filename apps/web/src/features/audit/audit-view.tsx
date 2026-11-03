'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/i18n';
import { Activity, Shield, User } from 'lucide-react';

export const AuditView: React.FC = () => {
  const { t, formatDate } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Audit logs can be fetched or mock-loaded from audit service
    fetch('http://localhost:4001/api/v1/health')
      .then(() => {
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            Conformité & Contrôle Interne
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Piste d’Audit Immuable
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Traçabilité intégrale de l'ensemble des interventions humaines, décisions et activations bancaires.
          </p>
        </div>
        <Shield className="w-10 h-10 text-slate-300" />
      </div>

      <Card className="p-6">
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
            <Activity className="w-4 h-4 text-brand-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800">
                Audit Trail Enregistré dans PostgreSQL
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Chaque transition d'état, décision motivée, et appel d'outil IA est consigné dans la table <code>AuditEvent</code> avec horodatage UTC, acteur, version et empreinte cryptographique d'idempotence.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
