'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { SupervisorWorkspace } from '@/features/supervisor/supervisor-workspace';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import { LimitRequestDetail } from '@proorga/shared-types';

export default function SupervisorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<LimitRequestDetail[]>([]);

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

  return (
    <WorkspaceLayout>
      <SupervisorWorkspace
        requests={requests}
        onRefresh={loadData}
        onViewRequest={(id) => router.push(`/requests/${id}`)}
      />
    </WorkspaceLayout>
  );
}
