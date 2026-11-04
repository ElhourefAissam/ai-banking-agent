'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { Role } from '@proorga/shared-types';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user?.role === Role.CLIENT) {
        router.replace('/dashboard');
      } else if (user?.role === Role.CONSEILLER) {
        router.replace('/advisor');
      } else if (user?.role === Role.SUPERVISEUR) {
        router.replace('/supervisor');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user?.role, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-medium">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-brand-900 border-t-transparent rounded-full animate-spin" />
        <span>Redirection vers votre espace...</span>
      </div>
    </div>
  );
}
