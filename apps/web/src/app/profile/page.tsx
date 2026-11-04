'use client';

import React from 'react';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { ProfileView } from '@/features/profile/profile-view';

export default function ProfilePage() {
  return (
    <WorkspaceLayout>
      <ProfileView />
    </WorkspaceLayout>
  );
}
