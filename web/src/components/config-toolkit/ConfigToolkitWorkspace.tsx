import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Package,
  Download,
  Upload,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Palette,
  Eye,
  RefreshCw,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  History,
  Building,
  Check,
  Globe,
  DollarSign,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { configToolkitApi, mastersApi } from '../../api/endpoints';
import {
  CompanySettings,
  ConfigurationPackage,
  ConfigurationAuditLog,
  PackageDiffResult,
  Branch,
} from '../../types';

export const ConfigToolkitWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'packages' | 'audit'>('wizard');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Company Settings & Wizard State
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isWizardMode, setIsWizardMode] = useState<boolean>(false);

  // Form State for Company Settings
  const [formData, setFormData] = useState({
    companyName: '',
    legalName: '',
    registrationNumber: '',
    taxId: '',
    companyDomain: '',
    primaryEmail: '',
    supportEmail: '',
    headquartersBranchId: '',
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'YYYY-MM-DD',
    brandingPrimaryColor: '#2563eb',
    brandingAccentColor: '#4f46e5',
    logoUrl: '',
    faviconUrl: '',
    enabledModules: {
      tasks: true,
      sprints: true,
      timesheets: true,
      crm_clients: true,
      qa_testing: true,
      customer_portal: true,
      commercial: true,
      sla_alerts: true,
      analytics: true,
      webhooks: true,
      config_packages: true,
    } as Record<string, boolean>,
  });

  // Configuration Packages State
  const [packages, setPackages] = useState<ConfigurationPackage[]>([]);
  const [auditLogs, setAuditLogs] = useState<ConfigurationAuditLog[]>([]);

  // Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportData, setExportData] = useState({
    packageCode: `PKG-EXP-${Math.floor(1000 + Math.random() * 9000)}`,
    packageName: '',
    packageType: 'FULL',
    description: '',
  });

  // Diff / Dry-run Modal
  const [selectedPkgForDiff, setSelectedPkgForDiff] = useState<ConfigurationPackage | null>(null);
  const [diffResult, setDiffResult] = useState<PackageDiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState<boolean>(false);
  const [conflictResolution, setConflictResolution] = useState<'SKIP' | 'OVERWRITE'>('SKIP');
  const [applying, setApplying] = useState<boolean>(false);

  // Initial Data Load
  useEffect(() => {
    loadSettings();
    loadPackages();
    loadAuditLogs();
    loadBranches();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await configToolkitApi.getSettings();
      setSettings(res.data);
      if (res.data) {
        setFormData({
          companyName: res.data.company_name || '',
          legalName: res.data.legal_name || '',
          registrationNumber: res.data.registration_number || '',
          taxId: res.data.tax_id || '',
          companyDomain: res.data.company_domain || '',
          primaryEmail: res.data.primary_email || '',
          supportEmail: res.data.support_email || '',
          headquartersBranchId: res.data.headquarters_branch_id || '',
          defaultCurrency: res.data.default_currency || 'INR',
          timezone: res.data.timezone || 'Asia/Kolkata',
          dateFormat: res.data.date_format || 'YYYY-MM-DD',
          brandingPrimaryColor: res.data.branding_primary_color || '#2563eb',
          brandingAccentColor: res.data.branding_accent_color || '#4f46e5',
          logoUrl: res.data.logo_url || '',
          faviconUrl: res.data.favicon_url || '',
          enabledModules: res.data.enabled_modules || {},
        });
        setWizardStep(res.data.setup_wizard_step || 1);
        setIsWizardMode(!res.data.setup_wizard_completed);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const res = await configToolkitApi.getPackages();
      setPackages(res.data || []);
    } catch (err: any) {
      console.error('Failed to load configuration packages', err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await configToolkitApi.getAuditLogs();
      setAuditLogs(res.data || []);
    } catch (err: any) {
      console.error('Failed to load audit logs', err);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await mastersApi.getBranches();
      setBranches(res.data || []);
    } catch (err: any) {
      console.error('Failed to load branches', err);
    }
  };

  const handleSaveSettings = async (completeWizard = false) => {
    try {
      setError(null);
      const res = await configToolkitApi.updateSettings({
        ...formData,
        setup_wizard_step: wizardStep,
        setup_wizard_completed: completeWizard || settings?.setup_wizard_completed,
      });
      setSettings(res.data);
      setSuccessMsg(completeWizard ? 'Setup wizard successfully completed!' : 'Company settings updated successfully.');
      if (completeWizard) {
        setIsWizardMode(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save settings');
    }
  };

  const handleResetWizard = async () => {
    if (!window.confirm('Reset setup wizard to Step 1? This allows re-evaluating corporate onboarding parameters.')) {
      return;
    }
    try {
      const res = await configToolkitApi.resetWizard();
      setSettings(res.data);
      setWizardStep(1);
      setIsWizardMode(true);
      setSuccessMsg('Setup wizard reset to Step 1.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to reset wizard');
    }
  };

  const handleExportPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await configToolkitApi.exportConfiguration({
        packageCode: exportData.packageCode,
        packageName: exportData.packageName,
        packageType: exportData.packageType,
        description: exportData.description,
      });
      setSuccessMsg(`Package ${res.data.package_code} exported successfully!`);
      setIsExportModalOpen(false);
      loadPackages();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Export failed');
    }
  };

  const handleDryRunPreview = async (pkg: ConfigurationPackage) => {
    setSelectedPkgForDiff(pkg);
    setDiffLoading(true);
    setDiffResult(null);
    try {
      const res = await configToolkitApi.dryRunPackage({ packageId: pkg.id });
      setDiffResult(res.data);
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Dry-run preview failed');
    } finally {
      setDiffLoading(false);
    }
  };

  const handleApplyPackage = async () => {
    if (!selectedPkgForDiff) return;
    setApplying(true);
    try {
      const res = await configToolkitApi.applyPackage({
        packageId: selectedPkgForDiff.id,
        conflictResolution,
      });
      setSuccessMsg(`Successfully applied package "${selectedPkgForDiff.package_name}". Applied: ${res.data.appliedCount}, Skipped: ${res.data.skippedCount}`);
      setSelectedPkgForDiff(null);
      setDiffResult(null);
      loadPackages();
      loadAuditLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  };

  const handleDownloadJson = (pkg: ConfigurationPackage) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pkg.package_data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${pkg.package_code}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Enterprise Setup Wizard & Configuration Packages
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ADMIN-001: Single-company initialization, sanitized branding, portable template packages, and audited diff engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => { loadSettings(); loadPackages(); loadAuditLogs(); }}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Live Config
          </button>
          {!isWizardMode && (
            <button
              onClick={handleResetWizard}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Re-run Setup Wizard
            </button>
          )}
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-300">Action Failed</h4>
            <p className="text-sm text-rose-700 dark:text-rose-400 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">&times;</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-emerald-800 dark:text-emerald-300">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-6">
        <button
          onClick={() => setActiveTab('wizard')}
          className={`py-3 px-1 text-sm font-medium border-b-2 flex items-center space-x-2 ${
            activeTab === 'wizard'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Company Setup & Profile {settings?.setup_wizard_completed ? '(Active)' : '(In Progress)'}</span>
        </button>
        <button
          onClick={() => { setActiveTab('packages'); loadPackages(); }}
          className={`py-3 px-1 text-sm font-medium border-b-2 flex items-center space-x-2 ${
            activeTab === 'packages'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Configuration Packages ({packages.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('audit'); loadAuditLogs(); }}
          className={`py-3 px-1 text-sm font-medium border-b-2 flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit & Application Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SETUP WIZARD & COMPANY PROFILE */}
      {/* ===================================================================== */}
      {activeTab === 'wizard' && (
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {[
                { step: 1, label: 'Identity & Legal' },
                { step: 2, label: 'Headquarters' },
                { step: 3, label: 'Localization' },
                { step: 4, label: 'Corporate Branding' },
                { step: 5, label: 'Enabled Modules' },
                { step: 6, label: 'Review & Finish' },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => setWizardStep(s.step)}
                  className={`text-left p-3 rounded-lg border text-xs transition ${
                    wizardStep === s.step
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                      : s.step < wizardStep
                      ? 'border-emerald-200 bg-emerald-50/30 text-emerald-800 dark:text-emerald-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    {s.step < wizardStep ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="font-mono text-[10px]">{s.step}</span>
                    )}
                    <span>Step {s.step}</span>
                  </div>
                  <div className="truncate">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Step Body */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
              {/* Step 1: Identity & Legal */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    <Building className="w-4 h-4 mr-2 text-indigo-600" /> Step 1: Corporate Legal Identity
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        placeholder="e.g. Kashvira Infotech Private Limited"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Legal Registered Entity
                      </label>
                      <input
                        type="text"
                        value={formData.legalName}
                        onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        placeholder="e.g. Kashvira Infotech Solutions Pvt. Ltd."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        CIN / Registration Number
                      </label>
                      <input
                        type="text"
                        value={formData.registrationNumber}
                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                        className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        placeholder="e.g. U72200MH2020PTC123456"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        GSTIN / Tax ID
                      </label>
                      <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                        className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        placeholder="e.g. 27AAAAA0000A1Z5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Company Domain
                      </label>
                      <input
                        type="text"
                        value={formData.companyDomain}
                        onChange={(e) => setFormData({ ...formData, companyDomain: e.target.value })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        placeholder="kashvirainfotech.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Corporate Primary Email
                      </label>
                      <input
                        type="email"
                        value={formData.primaryEmail}
                        onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        placeholder="admin@kashvirainfotech.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Headquarters & Branches */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    <Globe className="w-4 h-4 mr-2 text-indigo-600" /> Step 2: Corporate Headquarters & Office Structure
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Primary Headquarters Branch:
                    </label>
                    <select
                      value={formData.headquartersBranchId}
                      onChange={(e) => setFormData({ ...formData, headquartersBranchId: e.target.value })}
                      className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Corporate Head Office...</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name} ({b.city}, {b.state}) {b.is_head_office ? '★ Current HQ' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Headquarters serves as the fallback calendar timezone and billing root for company-level contracts.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Localization */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-indigo-600" /> Step 3: Currency & Regional Localization
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Default Currency
                      </label>
                      <select
                        value={formData.defaultCurrency}
                        onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                      >
                        <option value="INR">INR (₹ - Indian Rupee)</option>
                        <option value="USD">USD ($ - US Dollar)</option>
                        <option value="EUR">EUR (€ - Euro)</option>
                        <option value="GBP">GBP (£ - British Pound)</option>
                        <option value="AED">AED (United Arab Emirates Dirham)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        System Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="America/New_York">America/New_York (EST/EDT)</option>
                        <option value="Europe/London">Europe/London (GMT/BST)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Date Display Format
                      </label>
                      <select
                        value={formData.dateFormat}
                        onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                        className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (UK / India)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Corporate Branding */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    <Palette className="w-4 h-4 mr-2 text-indigo-600" /> Step 4: Constrained Corporate Branding
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Primary Theme Color (Hex)
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={formData.brandingPrimaryColor}
                          onChange={(e) => setFormData({ ...formData, brandingPrimaryColor: e.target.value })}
                          className="h-8 w-12 rounded cursor-pointer border border-gray-300"
                        />
                        <input
                          type="text"
                          value={formData.brandingPrimaryColor}
                          onChange={(e) => setFormData({ ...formData, brandingPrimaryColor: e.target.value })}
                          className="flex-1 font-mono text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Accent Theme Color (Hex)
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={formData.brandingAccentColor}
                          onChange={(e) => setFormData({ ...formData, brandingAccentColor: e.target.value })}
                          className="h-8 w-12 rounded cursor-pointer border border-gray-300"
                        />
                        <input
                          type="text"
                          value={formData.brandingAccentColor}
                          onChange={(e) => setFormData({ ...formData, brandingAccentColor: e.target.value })}
                          className="flex-1 font-mono text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Security check: Arbitrary CSS/JS injections are prevented via strict hex color sanitization.
                  </p>
                </div>
              )}

              {/* Step 5: Enabled Modules */}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    <Layers className="w-4 h-4 mr-2 text-indigo-600" /> Step 5: Modular Capability Switches
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(formData.enabledModules).map(([modKey, isEnabled]) => (
                      <label
                        key={modKey}
                        className="flex items-center space-x-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              enabledModules: {
                                ...formData.enabledModules,
                                [modKey]: e.target.checked,
                              },
                            })
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-gray-800 dark:text-gray-200 uppercase tracking-wider text-[11px]">
                          {modKey.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 6: Review & Finalize */}
              {wizardStep === 6 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" /> Step 6: Review Corporate Configuration
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-gray-500">Organization:</span>
                      <span className="font-semibold">{formData.companyName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-gray-500">Currency & TZ:</span>
                      <span className="font-semibold">{formData.defaultCurrency} ({formData.timezone})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-800">
                      <span className="text-gray-500">Primary Color:</span>
                      <span className="font-mono">{formData.brandingPrimaryColor}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Enabled Modules:</span>
                      <span className="font-semibold">{Object.values(formData.enabledModules).filter(Boolean).length} Active</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveSettings(true)}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Finalize & Complete Setup Wizard
                  </button>
                </div>
              )}

              {/* Wizard Nav Controls */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  disabled={wizardStep === 1}
                  onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                  className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 disabled:opacity-40"
                >
                  &larr; Previous Step
                </button>
                <div className="space-x-3">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg"
                  >
                    Save Draft
                  </button>
                  {wizardStep < 6 && (
                    <button
                      type="button"
                      onClick={() => setWizardStep((s) => Math.min(6, s + 1))}
                      className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                    >
                      Next Step &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Corporate Branding Preview Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Live Branding Theme Preview
              </h4>
              <div
                className="p-5 rounded-xl text-white shadow-sm transition-all"
                style={{ backgroundColor: formData.brandingPrimaryColor }}
              >
                <div className="text-base font-bold">{formData.companyName || 'Corporate PMT'}</div>
                <div className="text-xs opacity-90 mt-1">Multi-branch IT Project Delivery Portal</div>
                <div className="mt-4 flex space-x-2">
                  <span
                    className="px-2.5 py-1 rounded text-[11px] font-semibold text-white shadow"
                    style={{ backgroundColor: formData.brandingAccentColor }}
                  >
                    Accent Pill
                  </span>
                  <span className="px-2 py-1 rounded text-[11px] bg-white/20 backdrop-blur-xs">
                    {formData.defaultCurrency} &bull; {formData.timezone}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <div>HQ Branch: <strong className="text-gray-800 dark:text-gray-200">{settings?.headquarters_branch_name || 'None Set'}</strong></div>
                <div>Wizard Status: <strong className={settings?.setup_wizard_completed ? 'text-emerald-600' : 'text-amber-600'}>{settings?.setup_wizard_completed ? 'Completed' : 'Draft / Step ' + wizardStep}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: CONFIGURATION PACKAGES */}
      {/* ===================================================================== */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {pkg.package_code}
                      </span>
                      {pkg.is_builtin_template && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Built-in Starter
                        </span>
                      )}
                      {pkg.applied_at && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center">
                          <Check className="w-3 h-3 mr-0.5" /> Applied
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                      {pkg.package_name}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-gray-400">v{pkg.version}</span>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {pkg.description || 'Portable configuration bundle'}
                </p>

                {/* Manifest Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pkg.manifest && Object.entries(pkg.manifest).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                    >
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleDownloadJson(pkg)}
                    className="inline-flex items-center px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download JSON
                  </button>

                  <button
                    onClick={() => handleDryRunPreview(pkg)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    <Play className="w-3 h-3 mr-1" /> Dry-Run & Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: AUDIT & APPLICATION LOGS */}
      {/* ===================================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Executed By</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No configuration audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                      {log.package_name || log.package_code || 'Ad-hoc Export'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {log.executed_by_name || 'System Admin'}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-500">
                      {Array.isArray(log.applied_changes) ? `${log.applied_changes.length} change record(s)` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EXPORT CONFIGURATION */}
      {/* ===================================================================== */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
                <Download className="w-4 h-4 mr-2 text-indigo-600" /> Export Live Configuration
              </h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>

            <form onSubmit={handleExportPackage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Package Code *
                </label>
                <input
                  type="text"
                  required
                  value={exportData.packageCode}
                  onChange={(e) => setExportData({ ...exportData, packageCode: e.target.value.toUpperCase() })}
                  className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Release Delivery Baseline"
                  value={exportData.packageName}
                  onChange={(e) => setExportData({ ...exportData, packageName: e.target.value })}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes on included schemas and intended target installation..."
                  value={exportData.description}
                  onChange={(e) => setExportData({ ...exportData, description: e.target.value })}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-[11px] text-blue-800 dark:text-blue-300 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>Zero-Leak Guarantee: Users, passwords, client names, and financial margins are strictly excluded from portable exports.</span>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Generate Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DRY-RUN DIFF & APPLY */}
      {/* ===================================================================== */}
      {selectedPkgForDiff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Dry-Run Inspection: {selectedPkgForDiff.package_name}
                </h3>
                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                  {selectedPkgForDiff.package_code} (PMT Compatibility: v{selectedPkgForDiff.pmt_version_compatibility})
                </span>
              </div>
              <button onClick={() => setSelectedPkgForDiff(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>

            {diffLoading ? (
              <div className="text-center py-12 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs text-gray-500">Evaluating schema diff against live database...</p>
              </div>
            ) : diffResult ? (
              <div className="space-y-4 text-xs">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-lg text-center">
                  <div>
                    <div className="text-lg font-bold text-emerald-600">+{diffResult.newEntities}</div>
                    <div className="text-[10px] text-gray-400 uppercase">New Entities</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{diffResult.existingEntities}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Already Present</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-600">{diffResult.conflicts.length}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Conflicts Detected</div>
                  </div>
                </div>

                {/* Conflict Strategy */}
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Conflict Resolution Policy:
                  </label>
                  <select
                    value={conflictResolution}
                    onChange={(e: any) => setConflictResolution(e.target.value)}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                  >
                    <option value="SKIP">SKIP existing records (Safe Default - preserves current workflows)</option>
                    <option value="OVERWRITE">OVERWRITE existing records (Updates matching codes)</option>
                  </select>
                </div>

                {/* Detailed Diff Records */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  {diffResult.diffs.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {d.identifier} <span className="font-mono text-[10px] text-gray-400">({d.entity})</span>
                        </div>
                        <div className="text-[11px] text-gray-500">{d.details}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        d.action === 'CREATE_NEW'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {d.action}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setSelectedPkgForDiff(null)}
                    className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPackage}
                    disabled={applying}
                    className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    <CheckCircle2 className={`w-4 h-4 mr-1.5 ${applying ? 'animate-spin' : ''}`} />
                    {applying ? 'Applying Package...' : 'Confirm & Apply Package'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
