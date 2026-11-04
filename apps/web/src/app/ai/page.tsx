'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';
import { AiChatDrawer } from '@/features/ai-chat/ai-chat-drawer';

export default function AiPage() {
  const router = useRouter();

  return (
    <WorkspaceLayout>
      <div className="max-w-4xl mx-auto">
        <AiChatDrawer
          onSuccessSubmission={(id) => router.push(`/requests/${id}`)}
        />
      </div>
    </WorkspaceLayout>
  );
}
