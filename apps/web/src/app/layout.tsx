import type { Metadata } from 'next';
import './globals.css';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { I18nProvider } from '@/i18n';
import { AuthProvider } from '@/features/auth/auth-context';

export const metadata: Metadata = {
  title: 'PROORGA — AI-Powered Banking Workflow Platform',
  description:
    'Système bancaire d’augmentation temporaire de plafond avec validation multi-niveaux et agent IA contrôlé.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 antialiased selection:bg-brand-500 selection:text-white">
        <NuqsAdapter>
          <I18nProvider>
            <AuthProvider>{children}</AuthProvider>
          </I18nProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
