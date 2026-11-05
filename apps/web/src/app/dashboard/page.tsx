'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { ClientDashboard } from '@/features/client/client-dashboard';
import { RequestDetailsDrawer } from '@/features/client/request-details-drawer';
import { useRequestDrawer } from '@/hooks/use-request-drawer';
import { useAuth } from '@/features/auth/auth-context';
import { useRealtimeNotifications } from '@/features/notifications/realtime-notifications-context';
import { api } from '@/lib/api';
import { BankAccountSummary, LimitRequestDetail, Role } from '@proorga/shared-types';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lastUpdatedRequest } = useRealtimeNotifications();

  const [accounts, setAccounts] = useState<BankAccountSummary[]>([]);
  const [requests, setRequests] = useState<LimitRequestDetail[]>([]);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { requestRef, openRequest, closeRequest, isOpen } = useRequestDrawer();

  const loadData = async () => {
    try {
      const [accs, reqs, prof] = await Promise.all([
        api.getMyAccounts(),
        api.getMyRequests(),
        api.getMyProfile().catch(() => null),
      ]);
      setAccounts(accs);
      setRequests(reqs);
      setCustomerProfile(prof);
    } catch (e) {
      console.warn('Error loading dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // If advisor or supervisor accidentally hits dashboard, redirect appropriately
      if (user.role === Role.CONSEILLER) {
        router.replace('/advisor');
        return;
      }
      if (user.role === Role.SUPERVISEUR) {
        router.replace('/supervisor');
        return;
      }
      loadData();
    }
  }, [user?.email, user?.role]);

  // Real-time automatic updates (Zero-Refresh / Zero-Polling)
  useEffect(() => {
    if (user && lastUpdatedRequest) {
      loadData();
    }
  }, [lastUpdatedRequest?.timestamp]);

  return (
    <WorkspaceLayout>
      <ClientDashboard
        accounts={accounts}
        requests={requests}
        customerProfile={customerProfile}
        onNewRequest={() => router.push('/requests/new')}
        onViewRequest={openRequest}
      />
      <RequestDetailsDrawer
        requestId={requestRef}
        isOpen={isOpen}
        onClose={closeRequest}
        onRefresh={loadData}
      />
    </WorkspaceLayout>
  );
}
