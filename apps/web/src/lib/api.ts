import {
  UserSummary,
  BankAccountSummary,
  LimitRequestDetail,
  EligibilityResult,
  Role,
  LimitRequestStatus,
  SimulationFailureMode,
  ChatMessage,
  CreateDraftInput,
  UpdateDraftInput,
  SubmitRequestInput,
  MotivatedDecisionInput,
  RespondComplementInput,
} from '@proorga/shared-types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('proorga_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errBody: any;
    try {
      errBody = await res.json();
    } catch {
      errBody = { message: res.statusText };
    }
    const error: any = new Error(errBody.message || 'API request failed');
    error.status = res.status;
    error.code = errBody.errorCode;
    error.data = errBody;
    throw error;
  }

  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password = 'Password123!') {
    const data = await request<{ accessToken: string; user: UserSummary }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem('proorga_token', data.accessToken);
    }
    return data;
  },

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('proorga_token');
    }
  },

  async getMe() {
    return request<UserSummary>('/auth/me');
  },

  // Accounts & Profile
  async getMyAccounts() {
    return request<BankAccountSummary[]>('/accounts/my-accounts');
  },

  async getAccount(id: string) {
    return request<BankAccountSummary>(`/accounts/${id}`);
  },

  async checkEligibility(accountId: string) {
    return request<EligibilityResult>(`/accounts/${accountId}/eligibility`);
  },

  async getMyProfile() {
    return request<any>('/customers/me');
  },

  // Requests
  async getMyRequests() {
    return request<LimitRequestDetail[]>('/requests/my-requests');
  },

  async getAdvisorQueue(status?: LimitRequestStatus) {
    const query = status ? `?status=${status}` : '';
    return request<LimitRequestDetail[]>(`/requests/advisor-queue${query}`);
  },

  async getSupervisorQueue() {
    return request<LimitRequestDetail[]>('/requests/supervisor-queue');
  },

  async getRequestById(id: string) {
    return request<LimitRequestDetail>(`/requests/${id}`);
  },

  async createDraft(payload: CreateDraftInput) {
    return request<LimitRequestDetail>('/requests/draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateDraft(id: string, payload: UpdateDraftInput) {
    return request<LimitRequestDetail>(`/requests/${id}/draft`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async submitRequest(id: string, payload: SubmitRequestInput) {
    return request<LimitRequestDetail>(`/requests/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async requestComplement(id: string, payload: MotivatedDecisionInput) {
    return request<LimitRequestDetail>(`/requests/${id}/complement`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resubmitComplement(id: string, payload: RespondComplementInput) {
    return request<LimitRequestDetail>(`/requests/${id}/resubmit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async recommendApproval(id: string, payload: MotivatedDecisionInput) {
    return request<LimitRequestDetail>(`/requests/${id}/recommend`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async approveRequest(id: string, payload: MotivatedDecisionInput) {
    return request<LimitRequestDetail>(`/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async rejectRequest(id: string, payload: MotivatedDecisionInput) {
    return request<LimitRequestDetail>(`/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async cancelRequest(id: string, payload: SubmitRequestInput) {
    return request<LimitRequestDetail>(`/requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Documents
  async uploadDocument(requestId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>(`/documents/${requestId}/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  // AI Assistant
  async sendAiMessage(message: string, conversationId?: string) {
    return request<ChatMessage>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    });
  },

  async getAiMessages() {
    return request<ChatMessage[]>('/ai/messages');
  },

  async clearAiMessages() {
    return request<any>('/ai/clear', {
      method: 'DELETE',
    });
  },

  // Banking Simulator Management
  async getSimulatorMode() {
    return request<{ failureMode: SimulationFailureMode }>('/banking-simulator/failure-mode');
  },

  async overrideSimulatorMode(mode: SimulationFailureMode) {
    return request<any>('/banking-simulator/override-failure-mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  async activateLimit(requestId: string) {
    return request<any>(`/banking-simulator/activate/${requestId}`, {
      method: 'POST',
    });
  },

  async restoreLimit(requestId: string) {
    return request<any>(`/banking-simulator/restore/${requestId}`, {
      method: 'POST',
    });
  },

  async checkExpirations() {
    return request<any>('/banking-simulator/check-expirations', {
      method: 'POST',
    });
  },
};
