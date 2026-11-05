'use client';

import React, { useState, useEffect } from 'react';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { SupervisorWorkspace } from '@/features/supervisor/supervisor-workspace';
import { RequestDetailsDrawer } from '@/features/client/request-details-drawer';
import { useRequestDrawer } from '@/hooks/use-request-drawer';
import { useAuth } from '@/features/auth/auth-context';
import { useRealtimeNotifications } from '@/features/notifications/realtime-notifications-context';
import { api } from '@/lib/api';
import { LimitRequestDetail } from '@proorga/shared-types';

export default function SupervisorPage() {
  const { user } = useAuth();
  const { lastUpdatedRequest } = useRealtimeNotifications();
  const [requests, setRequests] = useState<LimitRequestDetail[]>([]);
  const { requestRef, openRequest, closeRequest, isOpen } = useRequestDrawer();

  const loadData = async () => {
    try {
      const data = await api.getSupervisorQueue();
      setRequests(data);
    } catch (e) {
      console.warn('Error loading supervisor queue:', e);
    }
  };

  useEffect(() => {
    if (user) {
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
      <SupervisorWorkspace
        requests={requests}
        onRefresh={loadData}
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
