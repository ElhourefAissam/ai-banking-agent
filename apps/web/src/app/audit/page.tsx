'use client';

import React from 'react';
import Link from 'next/link';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { AuditView } from '@/features/audit/audit-view';
import { useAuth } from '@/features/auth/auth-context';
import { Role } from '@proorga/shared-types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuditPage() {
  const { user, isLoading } = useAuth();

  const isAuthorized =
    user?.role === Role.CONSEILLER ||
    user?.role === Role.SUPERVISEUR ||
    user?.role === Role.ADMIN;

  return (
    <WorkspaceLayout>
      {!isLoading && !isAuthorized ? (
        <div className="max-w-md mx-auto my-16 bg-white border border-rose-200 rounded-2xl p-6 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Accès Réservé au Personnel Habilité
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              La consultation de la piste d'audit immuable et des registres de conformité réglementaire est strictement réservée aux <strong>Conseillers Clientèle</strong>, <strong>Superviseurs des Risques</strong> et <strong>Administrateurs</strong>.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button size="sm" variant="outline">
                <ArrowLeft className="w-3.5 h-3.5 me-1.5" />
                Retour à mon Espace Client
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <AuditView />
      )}
    </WorkspaceLayout>
  );
}
