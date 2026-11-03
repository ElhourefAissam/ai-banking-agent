'use client';

import React from 'react';
import { LimitRequestStatus } from '@proorga/shared-types';
import { useTranslation } from '@/i18n';

interface StatusBadgeProps {
  status: LimitRequestStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const { t } = useTranslation();

  const getStyle = () => {
    switch (status) {
      case LimitRequestStatus.DRAFT:
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case LimitRequestStatus.SUBMITTED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case LimitRequestStatus.UNDER_REVIEW:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case LimitRequestStatus.COMPLEMENT_REQUESTED:
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case LimitRequestStatus.PENDING_SUPERVISOR:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case LimitRequestStatus.APPROVED_PENDING_ACTIVATION:
        return 'bg-teal-50 text-teal-700 border-teal-300';
      case LimitRequestStatus.ACTIVE:
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium';
      case LimitRequestStatus.ACTIVATION_FAILED:
        return 'bg-orange-50 text-orange-850 border-orange-300';
      case LimitRequestStatus.REJECTED:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case LimitRequestStatus.CANCELLED:
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case LimitRequestStatus.EXPIRED:
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStyle()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current me-1.5 opacity-80" />
      {t(`status.${status}`)}
    </span>
  );
};
