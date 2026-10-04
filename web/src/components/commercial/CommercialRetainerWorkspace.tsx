import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  FileText,
  Filter,
  ShieldCheck,
  Search,
  DollarSign,
  ChevronRight,
  TrendingUp,
  Receipt,
  RotateCw,
  Check,
  UserCheck,
  Info,
} from 'lucide-react';
import { commercialApi, clientsApi, projectsApi, productsApi } from '../../api/endpoints';
import {
  CommercialContract,
  ContractPeriod,
  ContractWorklogConsumption,
  ContractOverageRequest,
  ClientStatementResponse,
  CommercialContractType,
  CommercialRolloverRule,
  CommercialContractStatus,
} from '../../types';

export const CommercialRetainerWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contracts' | 'periods' | 'consumptions' | 'overages' | 'statement'>('contracts');
  const [contracts, setContracts] = useState<CommercialContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<CommercialContract | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ContractPeriod | null>(null);
  const [statement, setStatement] = useState<ClientStatementResponse | null>(null);

  // Reference data
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Loading & notification states
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [rollingOver, setRollingOver] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [isNewPeriodOpen, setIsNewPeriodOpen] = useState(false);
  const [isNewOverageOpen, setIsNewOverageOpen] = useState(false);
  const [isDecideOverageOpen, setIsDecideOverageOpen] = useState(false);
  const [selectedOverageRequest, setSelectedOverageRequest] = useState<ContractOverageRequest | null>(null);

  // Form states
  const [contractForm, setContractForm] = useState({
    title: '',
    clientId: '',
    projectId: '',
    productId: '',
    contractType: 'RETAINER' as CommercialContractType,
    periodicity: 'MONTHLY',
    includedHoursPerPeriod: 40,
    hourlyRate: 2500,
    overageHourlyRate: 3200,
    currency: 'INR',
    rolloverRule: 'CAPPED_ROLLOVER' as CommercialRolloverRule,
    maxRolloverHours: 10,
    rolloverExpiryPeriods: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    termsAndConditions: '',
    notes: '',
  });

  const [periodForm, setPeriodForm] = useState({
    startDate: '',
    endDate: '',
    includedHours: 40,
    rolledOverHoursIn: 0,
  });

  const [overageForm, setOverageForm] = useState({
    requestedOverageHours: 10,
    estimatedAmount: 0,
    justification: '',
    changeRequestId: '',
  });

  const [decisionForm, setDecisionForm] = useState({
    decision: 'APPROVED' as 'APPROVED' | 'REJECTED' | 'WAIVED',
    approvedHours: 10,
    clientRemarks: '',
  });

  useEffect(() => {
    loadContracts();
    loadLookups();
  }, []);

  useEffect(() => {
    if (selectedContract) {
      loadContractDetails(selectedContract.id);
    }
  }, [selectedContract?.id]);

  useEffect(() => {
    if (selectedPeriod) {
      loadPeriodDetails(selectedPeriod.id);
      if (activeTab === 'statement' && selectedContract) {
        loadStatement(selectedContract.id, selectedPeriod.id);
      }
    }
  }, [selectedPeriod?.id, activeTab]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const res = await commercialApi.getContracts();
      setContracts(res.data);
      if (res.data.length > 0 && !selectedContract) {
        setSelectedContract(res.data[0]);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to load contracts' });
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [cRes, pRes, prRes] = await Promise.all([
        clientsApi.getAll().catch(() => ({ data: [] })),
        projectsApi.getProjects().catch(() => ({ data: [] })),
        productsApi.getProducts().catch(() => ({ data: [] })),
      ]);
      setClients(cRes.data || []);
      setProjects(pRes.data || []);
      setProducts(prRes.data || []);
    } catch (e) {
      console.error('Failed loading lookup data', e);
    }
  };

  const loadContractDetails = async (contractId: string) => {
    try {
      const res = await commercialApi.getContractById(contractId);
      setSelectedContract(res.data);
      if (res.data.periods && res.data.periods.length > 0) {
        // Prefer open period, else last
        const openP = res.data.periods.find((p: any) => p.status === 'OPEN') || res.data.periods[res.data.periods.length - 1];
        setSelectedPeriod(openP);
      } else {
        setSelectedPeriod(null);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to load contract details' });
    }
  };

  const loadPeriodDetails = async (periodId: string) => {
    try {
      const res = await commercialApi.getPeriodById(periodId);
      setSelectedPeriod(res.data);
    } catch (err: any) {
      console.error('Failed loading period', err);
    }
  };

  const loadStatement = async (contractId: string, periodId?: string) => {
    try {
      const res = await commercialApi.getClientStatement(contractId, periodId);
      setStatement(res.data);
    } catch (err: any) {
      console.error('Failed to load statement', err);
    }
  };

  const handleReconcilePeriod = async () => {
    if (!selectedPeriod) return;
    setReconciling(true);
    setFeedback(null);
    try {
      const res = await commercialApi.reconcilePeriod(selectedPeriod.id);
      setFeedback({
        type: 'success',
        message: `Period reconciled successfully! ${res.data.newlyConsumedCount} new approved worklogs consumed. Total approved usage: ${res.data.approvedConsumedHours} hrs.`,
      });
      await loadPeriodDetails(selectedPeriod.id);
      if (selectedContract) await loadContractDetails(selectedContract.id);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Reconciliation failed' });
    } finally {
      setReconciling(false);
    }
  };

  const handleCloseAndRollover = async () => {
    if (!selectedPeriod || !selectedContract) return;
    const confirm = window.confirm(
      `Close period ${selectedPeriod.period_code} and roll over unused hours to the next period according to "${selectedContract.rollover_rule}" policy?`,
    );
    if (!confirm) return;

    setRollingOver(true);
    setFeedback(null);
    try {
      const res = await commercialApi.closeAndRolloverPeriod(selectedPeriod.id);
      setFeedback({
        type: 'success',
        message: `Period ${selectedPeriod.period_code} closed! Rolled over ${res.data.rolloverSummary.rolledOverHours} hours to next period ${res.data.nextPeriod.period_code}.`,
      });
      await loadContractDetails(selectedContract.id);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Rollover failed' });
    } finally {
      setRollingOver(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: contractForm.title,
        clientId: contractForm.clientId,
        contractType: contractForm.contractType,
        periodicity: contractForm.periodicity,
        includedHoursPerPeriod: Number(contractForm.includedHoursPerPeriod),
        hourlyRate: Number(contractForm.hourlyRate),
        overageHourlyRate: Number(contractForm.overageHourlyRate),
        currency: contractForm.currency,
        rolloverRule: contractForm.rolloverRule,
        maxRolloverHours: Number(contractForm.maxRolloverHours),
        rolloverExpiryPeriods: Number(contractForm.rolloverExpiryPeriods),
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        termsAndConditions: contractForm.termsAndConditions,
        notes: contractForm.notes,
        autoCreateFirstPeriod: true,
      };
      if (contractForm.projectId) payload.projectId = contractForm.projectId;
      if (contractForm.productId) payload.productId = contractForm.productId;

      const res = await commercialApi.createContract(payload);
      setFeedback({ type: 'success', message: `Contract ${res.data.contract_number} created successfully!` });
      setIsNewContractOpen(false);
      await loadContracts();
      setSelectedContract(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to create contract' });
    }
  };

  const handleCreateOverage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriod) return;
    try {
      const res = await commercialApi.createOverageRequest(selectedPeriod.id, {
        requestedOverageHours: Number(overageForm.requestedOverageHours),
        estimatedAmount: Number(overageForm.estimatedAmount) || undefined,
        justification: overageForm.justification,
        changeRequestId: overageForm.changeRequestId || undefined,
      });
      setFeedback({ type: 'success', message: `Overage request ${res.data.request_code} recorded.` });
      setIsNewOverageOpen(false);
      await loadPeriodDetails(selectedPeriod.id);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to record overage request' });
    }
  };

  const handleDecideOverage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOverageRequest || !selectedPeriod) return;
    try {
      await commercialApi.decideOverageRequest(selectedOverageRequest.id, {
        decision: decisionForm.decision,
        approvedHours: Number(decisionForm.approvedHours),
        clientRemarks: decisionForm.clientRemarks,
      });
      setFeedback({ type: 'success', message: `Overage request ${selectedOverageRequest.request_code} marked ${decisionForm.decision}.` });
      setIsDecideOverageOpen(false);
      setSelectedOverageRequest(null);
      await loadPeriodDetails(selectedPeriod.id);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Decision update failed' });
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.client_name && c.client_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'ALL' || c.contract_type === filterType;
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              COMM-001
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Retainer & AMC Entitlements
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track contract periods, included hours, single approved consumption, rollovers, overage requests, and client statements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewContractOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            New Retainer / AMC
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-lg p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs underline hover:opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* Contract & Period Context Bar */}
      {selectedContract && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-bold text-sm">
                {selectedContract.contract_type === 'AMC' ? 'AMC' : 'RET'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedContract.title}</span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {selectedContract.contract_number}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {selectedContract.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                  <span>Client: <strong>{selectedContract.client_name}</strong></span>
                  {selectedContract.project_name && <span>Project: <strong>{selectedContract.project_name}</strong></span>}
                  {selectedContract.product_name && <span>Product: <strong>{selectedContract.product_name}</strong></span>}
                  <span>Rollover Rule: <strong className="text-blue-600 dark:text-blue-400">{selectedContract.rollover_rule}</strong> (Max: {selectedContract.max_rollover_hours}h)</span>
                </div>
              </div>
            </div>

            {/* Period Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Active Period:</span>
              <select
                value={selectedPeriod?.id || ''}
                onChange={(e) => {
                  const p = selectedContract.periods?.find((item) => item.id === e.target.value);
                  if (p) setSelectedPeriod(p);
                }}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {selectedContract.periods?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.period_code} ({p.start_date} to {p.end_date}) [{p.status}]
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition ${
              activeTab === 'contracts'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Contracts & Agreements ({contracts.length})
          </button>

          <button
            onClick={() => setActiveTab('periods')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition ${
              activeTab === 'periods'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            Period Entitlement & Rollover
          </button>

          <button
            onClick={() => setActiveTab('consumptions')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition ${
              activeTab === 'consumptions'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approved Worklog Ledger ({selectedPeriod?.consumptions?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('overages')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition ${
              activeTab === 'overages'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Overage Authorizations ({selectedPeriod?.overage_requests?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('statement')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition ${
              activeTab === 'statement'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            Client Statement
          </button>
        </nav>
      </div>

      {/* ========================================================
          TAB 1: Contracts & Agreements Registry
      ======================================================== */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search contracts or clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ALL">All Contract Types</option>
                <option value="RETAINER">Retainer (Monthly)</option>
                <option value="AMC">AMC (Annual/Quarterly)</option>
                <option value="TIME_AND_MATERIALS_CAP">T&M Cap</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredContracts.map((c) => {
              const isSelected = selectedContract?.id === c.id;
              const curP = c.current_period;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedContract(c)}
                  className={`cursor-pointer rounded-xl border p-5 transition shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/20 dark:border-blue-500 dark:bg-blue-950/20 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400">
                        {c.contract_number}
                      </span>
                      <h3 className="font-semibold text-slate-900 dark:text-white mt-1 text-base line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Client: <span className="font-medium text-slate-700 dark:text-slate-300">{c.client_name}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {c.contract_type}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                    <div>
                      <span className="text-slate-400">Allowance/Period</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {c.included_hours_per_period} hrs ({c.periodicity})
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Rate / Overage</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {c.currency} {c.hourly_rate} / {c.overage_hourly_rate}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Rollover Policy</span>
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {c.rollover_rule} ({c.max_rollover_hours}h max)
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Periods</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {c.total_periods_count || 1} periods
                      </p>
                    </div>
                  </div>

                  {curP && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-500">
                      <span>Active: <strong>{curP.period_code || (curP as any).periodCode}</strong></span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {curP.approved_consumed_hours ?? (curP as any).approvedConsumedHours} / {curP.total_allowance_hours ?? (curP as any).totalAllowanceHours} hrs consumed
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: Period Entitlement & Rollover Hub
      ======================================================== */}
      {activeTab === 'periods' && selectedPeriod && (
        <div className="space-y-6">
          {/* Acceptance Criteria Banner */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-xs dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-300">
              <ShieldCheck className="h-4 w-4" />
              <span>COMM-001 Acceptance Guarantee</span>
            </div>
            <p className="mt-1 text-blue-800 dark:text-blue-300">
              &bull; <strong>Single Consumption:</strong> Rejecting a worklog does not consume allowance. Approval retries do not consume allowance twice.
              <br />
              &bull; <strong>Agreed Rollover Policy:</strong> Closing a period automatically calculates unused allowance under contract rollover rules ({selectedContract?.rollover_rule}) and opens the next period with rolled-in balance.
            </p>
          </div>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-400">Total Allowance (This Period)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedPeriod.total_allowance_hours}h
                </span>
                <span className="text-xs text-slate-500">
                  ({selectedPeriod.included_hours}h base + {selectedPeriod.rolled_over_hours_in}h rolled in)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-400">Approved Consumed</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {selectedPeriod.approved_consumed_hours}h
                </span>
                <span className="text-xs text-slate-500">
                  {Math.round((Number(selectedPeriod.approved_consumed_hours) / (Number(selectedPeriod.total_allowance_hours) || 1)) * 100)}% burn
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-400">Remaining Allowance</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${Number(selectedPeriod.remaining_allowance_hours) <= 0 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {selectedPeriod.remaining_allowance_hours}h
                </span>
                <span className="text-xs text-slate-500">available</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-400">Overage Hours</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${Number(selectedPeriod.overage_hours) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {selectedPeriod.overage_hours}h
                </span>
                <span className="text-xs text-slate-500">
                  {Number(selectedPeriod.overage_hours) > 0 ? 'Beyond bucket' : 'Within budget'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                Period Execution & Reconciliation
              </h4>
              <p className="text-xs text-slate-500">
                Period Code: <strong>{selectedPeriod.period_code}</strong> | Status:{' '}
                <span className={`font-semibold ${selectedPeriod.status === 'OPEN' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {selectedPeriod.status}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleReconcilePeriod}
                disabled={reconciling || selectedPeriod.status === 'CLOSED'}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reconciling ? 'animate-spin' : ''}`} />
                {reconciling ? 'Reconciling...' : 'Reconcile Approved Worklogs'}
              </button>

              <button
                onClick={() => setIsNewOverageOpen(true)}
                disabled={selectedPeriod.status === 'CLOSED'}
                className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 transition disabled:opacity-50"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Request Overage Authorization
              </button>

              <button
                onClick={handleCloseAndRollover}
                disabled={rollingOver || selectedPeriod.status === 'CLOSED'}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${rollingOver ? 'animate-spin' : ''}`} />
                {rollingOver ? 'Closing...' : 'Close & Rollover to Next Period'}
              </button>
            </div>
          </div>

          {/* Historical Periods Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                Contract Period History
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Period Code</th>
                    <th className="px-5 py-3">Date Range</th>
                    <th className="px-5 py-3">Included</th>
                    <th className="px-5 py-3">Rolled In</th>
                    <th className="px-5 py-3">Total Allowance</th>
                    <th className="px-5 py-3">Approved Consumed</th>
                    <th className="px-5 py-3">Remaining</th>
                    <th className="px-5 py-3">Rolled Out</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedContract?.periods?.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPeriod(p)}
                      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                        selectedPeriod.id === p.id ? 'bg-blue-50/40 dark:bg-blue-950/20 font-medium' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 font-mono text-blue-600 dark:text-blue-400">{p.period_code}</td>
                      <td className="px-5 py-3.5">{p.start_date} to {p.end_date}</td>
                      <td className="px-5 py-3.5">{p.included_hours}h</td>
                      <td className="px-5 py-3.5 text-emerald-600">+{p.rolled_over_hours_in}h</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{p.total_allowance_hours}h</td>
                      <td className="px-5 py-3.5 font-semibold text-blue-600">{p.approved_consumed_hours}h</td>
                      <td className="px-5 py-3.5">{p.remaining_allowance_hours}h</td>
                      <td className="px-5 py-3.5 text-slate-500">{p.rolled_over_hours_out}h</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            p.status === 'OPEN'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: Approved Worklog Consumption Ledger
      ======================================================== */}
      {activeTab === 'consumptions' && selectedPeriod && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                Single Consumption Worklog Ledger ({selectedPeriod.period_code})
              </h3>
              <p className="text-xs text-slate-500">
                Only approved, billable worklogs are consumed. Unique constraints prevent duplicate consumption retries.
              </p>
            </div>
            <button
              onClick={handleReconcilePeriod}
              disabled={reconciling}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reconciling ? 'animate-spin' : ''}`} />
              Re-scan Worklogs
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Worklog Date</th>
                    <th className="px-5 py-3">Task Reference</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Hours Consumed</th>
                    <th className="px-5 py-3">Logged By</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Approval Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPeriod.consumptions && selectedPeriod.consumptions.length > 0 ? (
                    selectedPeriod.consumptions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{c.log_date}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-blue-600 dark:text-blue-400">{c.task_code}</span>
                          <div className="text-slate-500 text-[11px] line-clamp-1">{c.task_title}</div>
                        </td>
                        <td className="px-5 py-3.5">{c.task_type_name || 'General'}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{c.hours_consumed}h</td>
                        <td className="px-5 py-3.5 text-slate-500">{c.logged_by_user_name || 'Developer'}</td>
                        <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{c.worklog_description}</td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1 w-max">
                            <Check className="h-3 w-3" />
                            {c.approval_status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={async () => {
                              if (window.confirm('Remove this worklog consumption from this period?')) {
                                await commercialApi.removeConsumption(c.id);
                                loadPeriodDetails(selectedPeriod.id);
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-medium"
                          >
                            Unlink
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                        No approved worklogs currently consumed in this period. Click "Re-scan Worklogs" to import approved hours.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: Overage Authorizations (CLIENT-004)
      ======================================================== */}
      {activeTab === 'overages' && selectedPeriod && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                Overage Authorizations ({selectedPeriod.period_code})
              </h3>
              <p className="text-xs text-slate-500">
                Linked to CLIENT-004 change requests and client approval decisions.
              </p>
            </div>
            <button
              onClick={() => setIsNewOverageOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New Overage Request
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPeriod.overage_requests && selectedPeriod.overage_requests.length > 0 ? (
              selectedPeriod.overage_requests.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-semibold text-blue-600">{o.request_code}</span>
                      {o.cr_number && (
                        <span className="ml-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {o.cr_number}
                        </span>
                      )}
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm mt-1">
                        {o.requested_overage_hours} Hours Requested
                      </h4>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        o.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : o.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 p-2.5 rounded-lg dark:bg-slate-800/60">
                    {o.justification}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Estimated Amount:</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {o.currency} {o.estimated_amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Approved Hours:</span>
                      <p className="font-semibold text-emerald-600">{o.approved_hours}h</p>
                    </div>
                  </div>

                  {o.approved_by_contact_name && (
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                      Approved by: <strong>{o.approved_by_contact_name}</strong>
                    </div>
                  )}

                  {o.client_remarks && (
                    <p className="mt-2 text-xs italic text-slate-500">Remarks: "{o.client_remarks}"</p>
                  )}

                  {o.status === 'PENDING_CLIENT_APPROVAL' && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedOverageRequest(o);
                          setDecisionForm({
                            decision: 'APPROVED',
                            approvedHours: o.requested_overage_hours,
                            clientRemarks: '',
                          });
                          setIsDecideOverageOpen(true);
                        }}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Record Client / PM Decision
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 dark:border-slate-800">
                No overage authorization requests filed for this period.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: Client Entitlement Statement & Quotations
      ======================================================== */}
      {activeTab === 'statement' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {statement ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">
                    Official Entitlement & Usage Statement
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {statement.contract.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contract: {statement.contract.contractNumber} | Period: {statement.period.periodCode} ({statement.period.startDate} to {statement.period.endDate})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Client Organization</span>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{statement.contract.clientName}</h4>
                  <span className="text-xs font-mono text-slate-400">Generated: {new Date(statement.statementDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Allowance Snapshot Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <span className="text-xs text-slate-400">Period Allowance</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{statement.period.totalAllowanceHours}h</p>
                  <span className="text-[10px] text-slate-400">({statement.period.includedHours}h base + {statement.period.rolledOverHoursIn}h rolled in)</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Approved Usage</span>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{statement.period.approvedConsumedHours}h</p>
                  <span className="text-[10px] text-slate-400">{statement.summary.allowanceBurnPercentage}% consumed</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Remaining Balance</span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{statement.period.remainingAllowanceHours}h</p>
                  <span className="text-[10px] text-slate-400">available to spend</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Authorized Overage</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{statement.summary.authorizedOverageHours}h</p>
                  <span className="text-[10px] text-slate-400">under change requests</span>
                </div>
              </div>

              {/* Itemized Usage */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Itemized Approved Worklog Deliverables
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 font-semibold text-slate-500 text-[11px] dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Task Reference</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Hours</th>
                        <th className="px-4 py-2.5">Deliverable Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {statement.approvedUsage.map((u) => (
                        <tr key={u.consumptionId}>
                          <td className="px-4 py-3">{u.date}</td>
                          <td className="px-4 py-3 font-mono font-medium text-blue-600">{u.taskCode}</td>
                          <td className="px-4 py-3">{u.taskType}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{u.hoursConsumed}h</td>
                          <td className="px-4 py-3 text-slate-500">{u.workDescription}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Zero Confidential Margin Disclosure Note */}
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Client Confidentiality Guarantee: Internal cost rates, resource salaries, and margins are strictly omitted.
                </span>
                <span>Kashvira Infotech (KS-PMT) Commercial Engine</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">Loading statement...</div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: Create Commercial Contract
      ======================================================== */}
      {isNewContractOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Create Commercial Contract / Retainer / AMC
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure billable allowance, periodicity, and agreed rollover rules.
            </p>

            <form onSubmit={handleCreateContract} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Contract Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global 2026 Mobile SDK Retainer"
                  value={contractForm.title}
                  onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Client *</label>
                  <select
                    required
                    value={contractForm.clientId}
                    onChange={(e) => setContractForm({ ...contractForm, clientId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name || c.client_code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Contract Type *</label>
                  <select
                    value={contractForm.contractType}
                    onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="RETAINER">Retainer (Hours Bucket)</option>
                    <option value="AMC">AMC (Annual Maintenance)</option>
                    <option value="TIME_AND_MATERIALS_CAP">Time & Materials Cap</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Linked Project (Optional)</label>
                  <select
                    value={contractForm.projectId}
                    onChange={(e) => setContractForm({ ...contractForm, projectId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None / Multiple</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Linked Product (Optional)</label>
                  <select
                    value={contractForm.productId}
                    onChange={(e) => setContractForm({ ...contractForm, productId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">None</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Periodicity *</label>
                  <select
                    value={contractForm.periodicity}
                    onChange={(e) => setContractForm({ ...contractForm, periodicity: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Included Hours / Period *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={contractForm.includedHoursPerPeriod}
                    onChange={(e) => setContractForm({ ...contractForm, includedHoursPerPeriod: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Hourly Rate (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={contractForm.hourlyRate}
                    onChange={(e) => setContractForm({ ...contractForm, hourlyRate: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Rollover Rule *</label>
                  <select
                    value={contractForm.rolloverRule}
                    onChange={(e) => setContractForm({ ...contractForm, rolloverRule: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="CAPPED_ROLLOVER">Capped Rollover</option>
                    <option value="NO_ROLLOVER">No Rollover</option>
                    <option value="FULL_ROLLOVER">Full Rollover</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Max Rollover Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={contractForm.maxRolloverHours}
                    onChange={(e) => setContractForm({ ...contractForm, maxRolloverHours: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Overage Rate (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={contractForm.overageHourlyRate}
                    onChange={(e) => setContractForm({ ...contractForm, overageHourlyRate: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">End Date *</label>
                  <input
                    type="date"
                    required
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewContractOpen(false)}
                  className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Create & Initialize Period 1
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Request Overage Authorization
      ======================================================== */}
      {isNewOverageOpen && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Request Overage Authorization
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Period {selectedPeriod.period_code} &bull; Overtime Rate: {selectedPeriod.currency} {selectedPeriod.overage_hourly_rate}/hr
            </p>

            <form onSubmit={handleCreateOverage} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Requested Overage Hours *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={overageForm.requestedOverageHours}
                  onChange={(e) => {
                    const hrs = Number(e.target.value);
                    const rate = Number(selectedPeriod.overage_hourly_rate);
                    setOverageForm({
                      ...overageForm,
                      requestedOverageHours: hrs,
                      estimatedAmount: hrs * rate,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Estimated Total Amount ({selectedPeriod.currency})</label>
                <input
                  type="number"
                  value={overageForm.estimatedAmount}
                  onChange={(e) => setOverageForm({ ...overageForm, estimatedAmount: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Business Justification *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why work requires out-of-bucket overage hours..."
                  value={overageForm.justification}
                  onChange={(e) => setOverageForm({ ...overageForm, justification: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewOverageOpen(false)}
                  className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Submit for Client Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: Decide Overage Request
      ======================================================== */}
      {isDecideOverageOpen && selectedOverageRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Authorize Overage: {selectedOverageRequest.request_code}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Requested: {selectedOverageRequest.requested_overage_hours}h ({selectedOverageRequest.currency} {selectedOverageRequest.estimated_amount})
            </p>

            <form onSubmit={handleDecideOverage} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Decision *</label>
                <select
                  value={decisionForm.decision}
                  onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value as any })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="APPROVED">APPROVE Overage</option>
                  <option value="REJECTED">REJECT Overage</option>
                  <option value="WAIVED">WAIVE / Absorb Internally</option>
                </select>
              </div>

              {decisionForm.decision === 'APPROVED' && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Approved Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={decisionForm.approvedHours}
                    onChange={(e) => setDecisionForm({ ...decisionForm, approvedHours: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Client / Approver Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Record formal remarks..."
                  value={decisionForm.clientRemarks}
                  onChange={(e) => setDecisionForm({ ...decisionForm, clientRemarks: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDecideOverageOpen(false)}
                  className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
