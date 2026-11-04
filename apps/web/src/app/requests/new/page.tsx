'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { NewRequestForm } from '@/features/client/new-request-form';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { BankAccountSummary } from '@proorga/shared-types';

export default function NewRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccountSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      api
        .getMyAccounts()
        .then((data) => {
          setAccounts(data);
        })
        .catch(console.warn)
        .finally(() => setIsLoading(false));
    }
  }, [user?.email]);

  return (
    <WorkspaceLayout>
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
          <div className="w-8 h-8 border-3 border-brand-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Chargement de vos comptes bancaires...</span>
        </div>
      ) : (
        <NewRequestForm
          accounts={accounts}
          onSuccess={(newRef) => router.push(`/requests?ref=${encodeURIComponent(newRef)}`)}
          onCancel={() => router.push('/dashboard')}
        />
      )}
    </WorkspaceLayout>
  );
}
