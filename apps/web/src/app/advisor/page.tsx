'use client';

import React, { useState, useEffect } from 'react';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { AdvisorWorkspace } from '@/features/advisor/advisor-workspace';
import { RequestDetailsDrawer } from '@/features/client/request-details-drawer';
import { useRequestDrawer } from '@/hooks/use-request-drawer';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { LimitRequestDetail } from '@proorga/shared-types';

export default function AdvisorPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LimitRequestDetail[]>([]);
  const { requestRef, openRequest, closeRequest, isOpen } = useRequestDrawer();

  const loadData = async () => {
    try {
      const data = await api.getAdvisorQueue();
      setRequests(data);
    } catch (e) {
      console.warn('Error loading advisor queue:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user?.email, user?.role]);

  return (
    <WorkspaceLayout>
      <AdvisorWorkspace
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
