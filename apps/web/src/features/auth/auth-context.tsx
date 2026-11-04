'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSummary, Role } from '@proorga/shared-types';
import { api } from '@/lib/api';

export interface DemoAccount {
  email: string;
  name: string;
  role: Role;
  description: string;
  badge: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'client1@proorga.bank',
    name: 'Karim Alami',
    role: Role.CLIENT,
    description: 'Client avec dossier complet & solde 75 450 DH',
    badge: 'Client régulier',
  },
  {
    email: 'client2@proorga.bank',
    name: 'Leila Benjelloun',
    role: Role.CLIENT,
    description: 'Client patrimonial avec demande 65k escaladée',
    badge: 'Client VIP',
  },
  {
    email: 'client3@proorga.bank',
    name: 'Youssef Tazi',
    role: Role.CLIENT,
    description: 'Dossier client INCOMPLET (soumission bloquée)',
    badge: 'Dossier incomplet',
  },
  {
    email: 'conseiller1@proorga.bank',
    name: 'Mehdi Chraibi',
    role: Role.CONSEILLER,
    description: 'Conseiller Clientèle (Délégation ≤ 30 000 DH)',
    badge: 'Conseiller Casa',
  },
  {
    email: 'conseiller2@proorga.bank',
    name: 'Fatima-Zahra Idrissi',
    role: Role.CONSEILLER,
    description: 'Conseillère Clientèle (Portefeuille Rabat)',
    badge: 'Conseillère Rabat',
  },
  {
    email: 'superviseur1@proorga.bank',
    name: 'Omar Berrada',
    role: Role.SUPERVISEUR,
    description: 'Superviseur Risques (Validation dossiers > 30 000 DH)',
    badge: 'Superviseur 1',
  },
  {
    email: 'superviseur2@proorga.bank',
    name: 'Nadia Mansouri',
    role: Role.SUPERVISEUR,
    description: 'Superviseur Risques (Séparation des tâches)',
    badge: 'Superviseur 2',
  },
  {
    email: 'admin@proorga.bank',
    name: 'Tariq Amrani',
    role: Role.ADMIN,
    description: 'Administrateur Général (Conformité, Audit & Contrôle)',
    badge: 'Administrateur',
  },
];

interface AuthContextType {
  user: UserSummary | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  quickSwitch: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  quickSwitch: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const token = localStorage.getItem('proorga_token');
        if (token) {
          const profile = await api.getMe();
          setUser(profile);
        } else {
          // Default to client1 for immediate zero-friction demo testing
          const defaultAuth = await api.login('client1@proorga.bank', 'Password123!');
          setUser(defaultAuth.user);
        }
      } catch (err) {
        console.warn('Initial session check failed:', err);
        localStorage.removeItem('proorga_token');
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password = 'Password123!') => {
    setIsLoading(true);
    try {
      const auth = await api.login(email, password);
      setUser(auth.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const quickSwitch = async (email: string) => {
    await login(email);
  };

  const refreshUser = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch (e) {
      console.warn('Failed to refresh user profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        quickSwitch,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
