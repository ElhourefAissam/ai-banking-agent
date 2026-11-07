'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import {
  BankAccountSummary,
  AccountOperation,
  AccountOperationCategory,
} from '@proorga/shared-types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  RotateCcw,
  Clock,
  Search,
  Download,
  CreditCard,
  History,
  FileText,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { exportToCsv } from '@/lib/export-csv';

interface AccountOperationsLedgerProps {
  accounts: BankAccountSummary[];
  selectedAccountId?: string;
  onViewRequest?: (reference: string) => void;
}

export const AccountOperationsLedger: React.FC<AccountOperationsLedgerProps> = ({
  accounts,
  selectedAccountId: propSelectedAccountId,
  onViewRequest,
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();

  const [activeAccountId, setActiveAccountId] = useState<string>(
    propSelectedAccountId || accounts[0]?.id || ''
  );
  const [operations, setOperations] = useState<AccountOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AccountOperationCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync selected account when props or accounts list changes
  useEffect(() => {
    if (propSelectedAccountId && propSelectedAccountId !== activeAccountId) {
      setActiveAccountId(propSelectedAccountId);
    } else if (!activeAccountId && accounts.length > 0) {
      setActiveAccountId(accounts[0].id);
    }
  }, [propSelectedAccountId, accounts]);

  // Load operations when active account changes
  useEffect(() => {
    if (!activeAccountId) return;
    const fetchOperations = async () => {
      setIsLoading(true);
      try {
        const data = await api.getAccountOperations(activeAccountId);
        setOperations(data);
      } catch (err) {
        console.warn('Failed to fetch operations for account:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOperations();
  }, [activeAccountId]);

  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  // Filter operations based on category and search query
  const filteredOperations = operations.filter((op) => {
    if (categoryFilter !== 'ALL' && op.category !== categoryFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      op.label.toLowerCase().includes(q) ||
      op.description.toLowerCase().includes(q) ||
      (op.reference && op.reference.toLowerCase().includes(q)) ||
      (op.amount && String(op.amount).includes(q))
    );
  });

  const counts = {
    all: operations.length,
    financial: operations.filter((op) => op.category === 'FINANCIAL').length,
    limit: operations.filter((op) => op.category === 'LIMIT').length,
  };

  const handleExportCsv = () => {
    exportToCsv(
      `releve_operations_${activeAccount?.accountNumber || 'compte'}_${new Date().toISOString().split('T')[0]}`,
      [
        { key: 'date', label: 'Date & Heure', transform: (val) => formatDate(val) },
        { key: 'accountNumber', label: 'Numéro de Compte' },
        { key: 'category', label: 'Catégorie' },
        { key: 'label', label: 'Libellé de l’Opération' },
        { key: 'description', label: 'Description' },
        { key: 'reference', label: 'Référence' },
        {
          key: 'amount',
          label: 'Montant (DH)',
          transform: (val, row) => (val ? `${row.isDebit ? '-' : '+'}${Number(val)}` : ''),
        },
        { key: 'limitBefore', label: 'Plafond Avant (DH)' },
        { key: 'limitAfter', label: 'Plafond Après (DH)' },
        { key: 'status', label: 'Statut' },
      ],
      filteredOperations
    );
  };

  const getOperationBadge = (op: AccountOperation) => {
    const translatedType =
      t(`accountOperations.types.${op.type}`) !== `accountOperations.types.${op.type}`
        ? t(`accountOperations.types.${op.type}`)
        : op.type;

    switch (op.type) {
      case 'TRANSFER_CREDIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
            {translatedType}
          </span>
        );
      case 'TRANSFER_DEBIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <ArrowUpRight className="w-3 h-3 text-rose-600" />
            {translatedType}
          </span>
        );
      case 'DIRECT_DEBIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <CreditCard className="w-3 h-3 text-slate-500" />
            {translatedType}
          </span>
        );
      case 'LIMIT_ACTIVATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Zap className="w-3 h-3 text-emerald-600" />
            {translatedType}
          </span>
        );
      case 'LIMIT_EXPIRED_RESTORED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <RotateCcw className="w-3 h-3 text-blue-600" />
            {translatedType}
          </span>
        );
      case 'LIMIT_INCREASE_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-900 border border-brand-200">
            <FileText className="w-3 h-3 text-brand-700" />
            {translatedType}
          </span>
        );
      case 'LIMIT_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            {translatedType}
          </span>
        );
      case 'LIMIT_RECOMMENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            {translatedType}
          </span>
        );
      case 'LIMIT_REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            {translatedType}
          </span>
        );
      case 'LIMIT_CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <RotateCcw className="w-3 h-3 text-slate-500" />
            {translatedType}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {translatedType}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Account Selector & Export */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-100 text-brand-800">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t('accountOperations.title')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('accountOperations.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-account switch chips if multiple accounts */}
          {accounts.length > 1 && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setActiveAccountId(acc.id)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                    activeAccountId === acc.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {acc.accountNumber}
                </button>
              ))}
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredOperations.length === 0}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 me-1.5 text-brand-600" />
            {t('accountOperations.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Toolbar: Filter Pills & Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-brand-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('accountOperations.filters.all')} ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('FINANCIAL')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'FINANCIAL'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('accountOperations.filters.financial')} ({counts.financial})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('LIMIT')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === 'LIMIT'
                ? 'bg-indigo-700 text-white shadow-2xs'
                : 'bg-white text-indigo-800 hover:bg-indigo-50 border border-indigo-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t('accountOperations.filters.limit')} ({counts.limit})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('accountOperations.searchPlaceholder')}
            className="w-full ps-9 pe-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Operations Ledger Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t('accountOperations.dateCol')}</th>
                <th className="py-3 px-4 text-start">{t('accountOperations.natureCol')}</th>
                <th className="py-3 px-4 text-start">{t('accountOperations.detailCol')}</th>
                <th className="py-3 px-4 text-start">{t('accountOperations.referenceCol')}</th>
                <th className="py-3 px-4 text-end">{t('accountOperations.amountCol')}</th>
                <th className="py-3 px-4 text-end">{t('accountOperations.limitImpactCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    {t('accountOperations.loadingMessage')}
                  </td>
                </tr>
              ) : filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    {t('accountOperations.emptyMessage')}
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op) => {
                  const isFinancial = op.category === 'FINANCIAL';
                  const isDebit = op.isDebit;
                  const isLimitReq = op.reference?.startsWith('REQ-');

                  return (
                    <tr key={op.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDate(op.date)}
                      </td>

                      {/* Badge / Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getOperationBadge(op)}
                      </td>

                      {/* Label & Description */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-xs">
                          {op.label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {op.description}
                        </div>
                      </td>

                      {/* Reference (Clickable if REQ-) */}
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                        {op.reference ? (
                          isLimitReq && onViewRequest ? (
                            <button
                              type="button"
                              onClick={() => onViewRequest(op.reference!)}
                              className="text-brand-900 font-bold hover:underline cursor-pointer flex items-center gap-1"
                              title="Ouvrir le dossier dans le tiroir"
                            >
                              <span>{op.reference}</span>
                              <ArrowUpRight className="w-3 h-3 text-brand-600" />
                            </button>
                          ) : (
                            <span className="text-slate-600 font-semibold">{op.reference}</span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Financial Amount */}
                      <td className="py-3 px-4 text-end font-mono whitespace-nowrap">
                        {isFinancial && op.amount !== undefined && op.amount !== null ? (
                          <span
                            className={`font-bold text-xs ${
                              isDebit ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {isDebit ? '−' : '+'} {formatCurrency(op.amount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {t('accountOperations.nonMonetary')}
                          </span>
                        )}
                      </td>

                      {/* Limit Impact */}
                      <td className="py-3 px-4 text-end font-mono whitespace-nowrap">
                        {op.limitAfter !== undefined ? (
                          <span className="text-xs font-semibold text-brand-900">
                            {op.limitBefore !== undefined && (
                              <span className="text-slate-400 line-through me-1 text-[11px]">
                                {formatCurrency(op.limitBefore)}
                              </span>
                            )}
                            <span className="font-bold text-indigo-700">
                              ➔ {formatCurrency(op.limitAfter)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
