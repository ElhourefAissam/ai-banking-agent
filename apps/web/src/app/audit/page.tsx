'use client';

import React from 'react';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { AuditView } from '@/features/audit/audit-view';

export default function AuditPage() {
  return (
    <WorkspaceLayout>
      <AuditView />
    </WorkspaceLayout>
  );
}
