'use client';

import React from 'react';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { ScenariosRunner } from '@/features/scenarios/scenarios-runner';

export default function ScenariosPage() {
  return (
    <WorkspaceLayout>
      <ScenariosRunner />
    </WorkspaceLayout>
  );
}
