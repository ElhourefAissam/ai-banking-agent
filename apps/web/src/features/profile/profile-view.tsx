'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import {
  UserProfileDetail,
  Role,
  CustomerFileStatus,
} from '@proorga/shared-types';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Save,
  Lock,
  Building2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { t, formatCurrency, formatDate } = useTranslation();
  const { user, refreshUser } = useAuth();

  const [profile, setProfile] = useState<UserProfileDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields (Editable contact info only)
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const loadProfile = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getMyProfile();
      setProfile(data);
      setPhone(data.phone || '');
      setAddress(data.address || '');
    } catch (err: any) {
      console.warn('Failed to load profile:', err);
      setErrorMessage(
        err.message || 'Impossible de charger les données du profil bancaire.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updated = await api.updateMyProfile({
        phone: phone.trim(),
        address: address.trim(),
      });

      setProfile(updated);
      setPhone(updated.phone || '');
      setAddress(updated.address || '');
      setSuccessMessage(t('profile.updateSuccess'));
      await refreshUser();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec de la mise à jour des coordonnées.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-8 h-8 border-3 border-brand-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">{t('common.loading')}</span>
      </div>
    );
  }

  const isClient = profile?.role === Role.CLIENT;
  const isComplete = profile?.fileStatus === CustomerFileStatus.COMPLETE;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl font-bold font-mono shadow-inner">
              {profile ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}` : 'PO'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {profile?.firstName} {profile?.lastName}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-500/30 text-brand-200 border border-brand-400/30">
                  {t(`roles.${profile?.role}`)}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-2">
                <span>{profile?.email}</span>
                {profile?.cin && (
                  <>
                    <span>•</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-200">
                      CIN : {profile.cin}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="text-start sm:text-end space-y-1">
            <span className="text-[11px] text-slate-400 block">
              {t('profile.memberSince')}
            </span>
            <span className="text-xs font-mono font-medium text-slate-200 block">
              {formatDate(profile?.createdAt)}
            </span>
            {isClient && (
              <div className="pt-1">
                <StatusBadge status={profile?.fileStatus || 'COMPLETE'} size="sm" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-3 animate-in fade-in-0 duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-center gap-3 animate-in fade-in-0 duration-200">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Regulatory Incomplete Notice (if applicable) */}
      {isClient && !isComplete && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">
              Attention : Dossier Réglementaire Incomplet
            </span>
            <p className="text-amber-800 leading-relaxed">
              {profile?.incompleteReason ||
                "Des justificatifs complémentaires sont requis par votre conseiller. Toute demande de relèvement de plafond est temporairement bloquée jusqu'à mise en conformité de votre dossier."}
            </p>
          </div>
        </div>
      )}

      {/* Profile Edit Form */}
      <Card>
        <CardHeader
          title={t('profile.title')}
          subtitle={t('profile.subtitle')}
        />

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Section 1: Certified Legal Identity (KYC) - Read-only */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-700" />
                {t('profile.certifiedIdentity')}
              </h3>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-800 bg-brand-50 border border-brand-200/80 px-2.5 py-0.5 rounded-full">
                <Lock className="w-3 h-3 text-brand-700" />
                {t('profile.lockedField')}
              </span>
            </div>

            {/* KYC Explanation Alert */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5 mb-4">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px] text-slate-600">
                {t('profile.certifiedNotice')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('profile.firstName')}
                  </label>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3" />
                    {t('profile.lockedField')}
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={profile?.firstName || ''}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed font-medium select-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('profile.lastName')}
                  </label>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3" />
                    {t('profile.lockedField')}
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={profile?.lastName || ''}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed font-medium select-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('profile.email')}
                  </label>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3" />
                    {t('profile.lockedField')}
                  </span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="w-full ps-9 pe-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed font-mono select-all"
                  />
                </div>
              </div>

              {profile?.cin && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('profile.cin')}
                    </label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <Lock className="w-3 h-3" />
                      {t('profile.lockedField')}
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={profile.cin}
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed font-mono font-bold select-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Contact & Residential Details (Editable) */}
          <div className="border-t border-slate-100 pt-6">
            <div className="mb-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-brand-700" />
                {t('profile.contactInfo')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('profile.contactSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('profile.phone')}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+212 6 XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full ps-9 pe-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('profile.address')}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ex. 45 Boulevard d'Anfa, Casablanca"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full ps-9 pe-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadProfile}
              disabled={isSaving}
            >
              <RefreshCw className="w-3.5 h-3.5 me-1.5" />
              {t('common.back')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
            >
              <Save className="w-3.5 h-3.5 me-1.5" />
              {t('profile.saveChanges')}
            </Button>
          </div>
        </form>
      </Card>

      {/* Associated Bank Accounts (if Client) */}
      {isClient && profile?.accounts && profile.accounts.length > 0 && (
        <Card>
          <CardHeader
            title={t('profile.accountsTitle')}
            subtitle="Comptes bancaires actifs associés à votre profil et plafonds de virement appliqués."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {profile.accounts.map((acc) => {
              const hasActiveLimit = Number(acc.currentTransferLimit) > Number(acc.initialTransferLimit);
              return (
                <div
                  key={acc.id}
                  className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-900 font-bold">
                        <CreditCard className="w-4 h-4 text-brand-900" />
                      </div>
                      <div>
                        <span className="font-mono font-bold text-slate-900 block">
                          {acc.accountNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[200px]">
                          IBAN : {acc.iban}
                        </span>
                      </div>
                    </div>
                    {hasActiveLimit && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Plafond Rehaussé
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 font-mono text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">
                        Solde disponible :
                      </span>
                      <strong className="text-slate-900">
                        {formatCurrency(Number(acc.balance))}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">
                        Plafond actuel :
                      </span>
                      <strong className="text-brand-900">
                        {formatCurrency(Number(acc.currentTransferLimit))}
                      </strong>
                    </div>
                  </div>

                  {acc.activeLimitExpiry && (
                    <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200/60 flex items-center gap-1.5 font-sans">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      <span>Expire le {formatDate(acc.activeLimitExpiry)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
