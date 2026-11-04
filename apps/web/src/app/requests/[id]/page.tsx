'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { RequestDetailsDrawer } from '@/features/client/request-details-drawer';
import { ClientDashboard } from '@/features/client/client-dashboard';
import { AdvisorWorkspace } from '@/features/advisor/advisor-workspace';
import { SupervisorWorkspace } from '@/features/supervisor/supervisor-workspace';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { LimitRequestDetail, Role, BankAccountSummary } from '@proorga/shared-types';

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = React.use(params);

  const [requests, setRequests] = useState<LimitRequestDetail[]>([]);
  const [accounts, setAccounts] = useState<BankAccountSummary[]>([]);
  const [customerProfile, setCustomerProfile] = useState<any>(null);

  const loadWorkspaceData = async () => {
    if (!user) return;
    try {
      if (user.role === Role.CLIENT) {
        const [accs, reqs, prof] = await Promise.all([
          api.getMyAccounts(),
          api.getMyRequests(),
          api.getMyProfile().catch(() => null),
        ]);
        setAccounts(accs);
        setRequests(reqs);
        setCustomerProfile(prof);
      } else if (user.role === Role.CONSEILLER) {
        const reqs = await api.getAdvisorQueue();
        setRequests(reqs);
      } else if (user.role === Role.SUPERVISEUR) {
        const reqs = await api.getSupervisorQueue();
        setRequests(reqs);
      }
    } catch (e) {
      console.warn('Could not load background workspace data:', e);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [user?.email, user?.role]);

  const handleCloseDrawer = () => {
    if (user?.role === Role.CONSEILLER) {
      router.push('/advisor');
    } else if (user?.role === Role.SUPERVISEUR) {
      router.push('/supervisor');
    } else {
      router.push('/requests');
    }
  };

  return (
    <WorkspaceLayout>
      {/* Background workspace context based on active user role */}
      {user?.role === Role.CLIENT && (
        <ClientDashboard
          accounts={accounts}
          requests={requests}
          customerProfile={customerProfile}
          onNewRequest={() => router.push('/requests/new')}
          onViewRequest={(reqId) => router.push(`/requests/${reqId}`)}
        />
      )}

      {(user?.role === Role.CONSEILLER || user?.role === Role.ADMIN) && (
        <AdvisorWorkspace
          requests={requests}
          onRefresh={loadWorkspaceData}
          onViewRequest={(reqId) => router.push(`/requests/${reqId}`)}
        />
      )}

      {user?.role === Role.SUPERVISEUR && (
        <SupervisorWorkspace
          requests={requests}
          onRefresh={loadWorkspaceData}
          onViewRequest={(reqId) => router.push(`/requests/${reqId}`)}
        />
      )}

      {/* Slide-out Drawer for this specific request ID */}
      <RequestDetailsDrawer
        requestId={id}
        isOpen={Boolean(id)}
        onClose={handleCloseDrawer}
        onRefresh={loadWorkspaceData}
      />
    </WorkspaceLayout>
  );
}
