'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { useTranslation } from '@/i18n';
import { Header } from './header';
import { Sidebar, NavigationTab } from './sidebar';
import { SimulatorModal } from './simulator-modal';
import { ClientDashboard } from '@/features/client/client-dashboard';
import { NewRequestForm } from '@/features/client/new-request-form';
import { MyRequestsView } from '@/features/client/my-requests-view';
import { RequestDetailsModal } from '@/features/client/request-details-modal';
import { AdvisorWorkspace } from '@/features/advisor/advisor-workspace';
import { SupervisorWorkspace } from '@/features/supervisor/supervisor-workspace';
import { AiChatDrawer } from '@/features/ai-chat/ai-chat-drawer';
import { AuditView } from '@/features/audit/audit-view';
import { api } from '@/lib/api';
import {
  BankAccountSummary,
  LimitRequestDetail,
  Role,
} from '@proorga/shared-types';

export const AppShell: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { isRtl, t } = useTranslation();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('client-dashboard');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<LimitRequestDetail | null>(null);

  const [accounts, setAccounts] = useState<BankAccountSummary[]>([]);
  const [requests, setRequests] = useState<LimitRequestDetail[]>([]);
  const [customerProfile, setCustomerProfile] = useState<any>(null);

  // Automatically update tab when user role changes
  useEffect(() => {
    if (user) {
      if (user.role === Role.CLIENT) {
        setCurrentTab('client-dashboard');
      } else if (user.role === Role.CONSEILLER) {
        setCurrentTab('advisor-dashboard');
      } else if (user.role === Role.SUPERVISEUR) {
        setCurrentTab('supervisor-dashboard');
      } else {
        setCurrentTab('advisor-dashboard');
      }
    }
  }, [user?.role, user?.email]);

  const loadData = async () => {
    if (!user) return;
    try {
      if (user.role === Role.CLIENT) {
        const [accs, reqs, prof] = await Promise.all([
          api.getMyAccounts(),
          api.getMyRequests(),
          api.getMyProfile().catch(() => null),
        ]);
        setAccounts(accs);
        setRequests(reqs);
        setCustomerProfile(prof);
      } else if (user.role === Role.CONSEILLER) {
        const reqs = await api.getAdvisorQueue();
        setRequests(reqs);
      } else if (user.role === Role.SUPERVISEUR) {
        const reqs = await api.getSupervisorQueue();
        setRequests(reqs);
      }
    } catch (e) {
      console.warn('Error loading workspace data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.email, user?.role]);

  const handleOpenRequestDetails = async (requestId: string) => {
    try {
      const detail = await api.getRequestById(requestId);
      setSelectedRequestDetail(detail);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-900 border-t-transparent rounded-full animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden ${isRtl ? 'font-arabic' : 'font-sans'}`}>
      {/* Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenAiChat={() => setCurrentTab('ai-chat')}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {currentTab === 'client-dashboard' && (
              <ClientDashboard
                accounts={accounts}
                requests={requests}
                customerProfile={customerProfile}
                onNewRequest={() => setCurrentTab('client-new-request')}
                onViewRequest={handleOpenRequestDetails}
              />
            )}

            {currentTab === 'client-new-request' && (
              <NewRequestForm
                accounts={accounts}
                onSuccess={(newId) => {
                  loadData();
                  handleOpenRequestDetails(newId);
                  setCurrentTab('client-my-requests');
                }}
                onCancel={() => setCurrentTab('client-dashboard')}
              />
            )}

            {currentTab === 'client-my-requests' && (
              <MyRequestsView
                requests={requests}
                onNewRequest={() => setCurrentTab('client-new-request')}
                onViewRequest={handleOpenRequestDetails}
              />
            )}

            {currentTab === 'advisor-dashboard' && (
              <AdvisorWorkspace
                requests={requests}
                onRefresh={loadData}
              />
            )}

            {currentTab === 'supervisor-dashboard' && (
              <SupervisorWorkspace
                requests={requests}
                onRefresh={loadData}
              />
            )}

            {currentTab === 'ai-chat' && (
              <AiChatDrawer
                onSuccessSubmission={(id) => {
                  loadData();
                  handleOpenRequestDetails(id);
                }}
              />
            )}

            {currentTab === 'audit-trail' && <AuditView />}
          </div>
        </main>
      </div>

      {/* Modals */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onRefreshData={loadData}
      />

      <RequestDetailsModal
        request={selectedRequestDetail}
        isOpen={Boolean(selectedRequestDetail)}
        onClose={() => setSelectedRequestDetail(null)}
        onRefresh={loadData}
      />
    </div>
  );
};
