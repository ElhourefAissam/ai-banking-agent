'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { Role } from '@proorga/shared-types';

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = React.use(params);

  useEffect(() => {
    if (!id) return;

    if (user?.role === Role.CONSEILLER) {
      router.replace(`/advisor?ref=${encodeURIComponent(id)}`);
    } else if (user?.role === Role.SUPERVISEUR) {
      router.replace(`/supervisor?ref=${encodeURIComponent(id)}`);
    } else {
      router.replace(`/requests?ref=${encodeURIComponent(id)}`);
    }
  }, [id, user?.role, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-medium">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-brand-900 border-t-transparent rounded-full animate-spin" />
        <span>Redirection vers le dossier {id}...</span>
      </div>
    </div>
  );
}
