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

  useEffect(() => {
    if (user) {
      api.getMyAccounts().then(setAccounts).catch(console.warn);
    }
  }, [user?.email]);

  return (
    <WorkspaceLayout>
      <NewRequestForm
        accounts={accounts}
        onSuccess={(newRef) => router.push(`/requests?ref=${encodeURIComponent(newRef)}`)}
        onCancel={() => router.push('/dashboard')}
      />
    </WorkspaceLayout>
  );
}
