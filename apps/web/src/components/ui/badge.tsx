'use client';

import React from 'react';
import { LimitRequestStatus, DecisionType } from '@proorga/shared-types';
import { useTranslation } from '@/i18n';

export type StatusOrDecision = LimitRequestStatus | DecisionType | string;

export function getStatusLabel(status: string | null | undefined, t: (keyPath: string) => string): string {
  if (!status) return '—';

  const decisionTrans = t(`decision.${status}`);
  if (decisionTrans && decisionTrans !== `decision.${status}`) {
    return decisionTrans;
  }

  const statusTrans = t(`status.${status}`);
  if (statusTrans && statusTrans !== `status.${status}`) {
    return statusTrans;
  }

  const fileTrans = t(`customerFileStatus.${status}`);
  if (fileTrans && fileTrans !== `customerFileStatus.${status}`) {
    return fileTrans;
  }

  const actTrans = t(`activationStatus.${status}`);
  if (actTrans && actTrans !== `activationStatus.${status}`) {
    return actTrans;
  }

  // Format constant string to human readable format as safe fallback
  return String(status)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  status: StatusOrDecision;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
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
      case DecisionType.REQUEST_COMPLEMENT:
      case 'REQUEST_COMPLEMENT':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case LimitRequestStatus.PENDING_SUPERVISOR:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case DecisionType.RECOMMEND_APPROVAL:
      case 'RECOMMEND_APPROVAL':
        return 'bg-purple-50 text-purple-800 border-purple-300';
      case LimitRequestStatus.APPROVED_PENDING_ACTIVATION:
        return 'bg-teal-50 text-teal-700 border-teal-300';
      case LimitRequestStatus.ACTIVE:
      case DecisionType.APPROVE:
      case 'APPROVE':
      case 'COMPLETE':
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium';
      case LimitRequestStatus.ACTIVATION_FAILED:
      case 'FAILED':
        return 'bg-orange-50 text-orange-850 border-orange-300';
      case LimitRequestStatus.REJECTED:
      case DecisionType.REJECT:
      case 'REJECT':
      case 'INCOMPLETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case LimitRequestStatus.CANCELLED:
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case LimitRequestStatus.EXPIRED:
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${getStyle()} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current me-1.5 opacity-80" />
      {getStatusLabel(status, t)}
    </span>
  );
};
