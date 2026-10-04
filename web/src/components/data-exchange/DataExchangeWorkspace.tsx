import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Search,
  Database,
  Layers,
  Clock,
  Play,
  FileCheck,
  ChevronRight,
  Filter,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { dataExchangeApi, projectsApi, productsApi } from '../../api/endpoints';
import {
  ImportEntityType,
  ImportMode,
  DataImportBatch,
  DataImportPreviewResponse,
  Project,
  Product,
} from '../../types';

export const DataExchangeWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'batches' | 'export'>('import');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Projects & Products for filters
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedEntity, setSelectedEntity] = useState<ImportEntityType>('TASKS');
  const [selectedMode, setSelectedMode] = useState<ImportMode>('UPSERT');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('import.csv');
  const [templateInfo, setTemplateInfo] = useState<{
    headers: string[];
    descriptions: Record<string, string>;
    sampleRow: Record<string, any>;
  } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<DataImportPreviewResponse | null>(null);
  const [allowPartial, setAllowPartial] = useState<boolean>(true);
  const [executionResult, setExecutionResult] = useState<DataImportBatch | null>(null);

  // Batches state
  const [batches, setBatches] = useState<DataImportBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<DataImportBatch | null>(null);
  const [batchFilterEntity, setBatchFilterEntity] = useState<string>('ALL');

  // Export state
  const [exportEntity, setExportEntity] = useState<ImportEntityType>('TASKS');
  const [exportProjectId, setExportProjectId] = useState<string>('');
  const [exportProductId, setExportProductId] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load initial data
  useEffect(() => {
    loadProjectsAndProducts();
    loadTemplate(selectedEntity);
    loadBatches();
  }, []);

  const loadProjectsAndProducts = async () => {
    try {
      const [projRes, prodRes] = await Promise.all([
        projectsApi.getProjects(),
        productsApi.getProducts(),
      ]);
      setProjects(projRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err: any) {
      console.error('Failed to load projects/products', err);
    }
  };

  const loadTemplate = async (entity: ImportEntityType) => {
    try {
      setLoading(true);
      const res = await dataExchangeApi.getTemplate(entity);
      setTemplateInfo(res.data);
      // Initialize 1:1 mapping for template headers
      const defaultMapping: Record<string, string> = {};
      res.data.headers.forEach((h: string) => {
        defaultMapping[h] = h;
      });
      setColumnMapping(defaultMapping);
    } catch (err: any) {
      console.error('Failed to load template', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await dataExchangeApi.getAllBatches();
      setBatches(res.data || []);
    } catch (err: any) {
      console.error('Failed to load batches', err);
    }
  };

  const handleEntityChange = (entity: ImportEntityType) => {
    setSelectedEntity(entity);
    loadTemplate(entity);
  };

  const handleDownloadTemplate = () => {
    if (!templateInfo) return;
    const headers = templateInfo.headers.join(',');
    const sampleValues = templateInfo.headers
      .map((h) => {
        const val = templateInfo.sampleRow[h] ?? '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      })
      .join(',');
    const csvData = `${headers}\n${sampleValues}`;
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `template_${selectedEntity.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvContent(text);
      autoDetectMapping(text);
    };
    reader.readAsText(file);
  };

  const autoDetectMapping = (content: string) => {
    if (!content || !templateInfo) return;
    const firstLine = content.split(/\r?\n/)[0];
    if (!firstLine) return;
    const csvHeaders = firstLine.split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
    const newMapping: Record<string, string> = {};
    csvHeaders.forEach((ch) => {
      // Find matching template header
      const match = templateInfo.headers.find(
        (th) => th.toLowerCase() === ch.toLowerCase().replace(/[\s_-]+/g, '_'),
      );
      if (match) {
        newMapping[ch] = match;
      } else {
        newMapping[ch] = '';
      }
    });
    setColumnMapping(newMapping);
  };

  const handleDryRun = async () => {
    if (!csvContent.trim()) {
      setError('Please provide CSV data before previewing');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await dataExchangeApi.dryRunImport({
        entityType: selectedEntity,
        importMode: selectedMode,
        rawCsvContent: csvContent,
        columnMapping,
        originalFileName: fileName,
      });
      setPreviewResult(res.data);
      setWizardStep(3);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Dry-run preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewResult?.batchId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await dataExchangeApi.executeImport(previewResult.batchId, {
        allowPartial,
      });
      setExecutionResult(res.data);
      setWizardStep(4);
      setSuccessMessage(`Import processed: ${res.data.success_count} succeeded, ${res.data.failed_count} failed.`);
      loadBatches();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Import execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryBatch = async (batchId: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await dataExchangeApi.retryBatch(batchId);
      setSuccessMessage(`Retry batch complete: ${res.data.success_count} succeeded, ${res.data.failed_count} still failing.`);
      if (selectedBatch?.id === batchId) {
        const updated = await dataExchangeApi.getBatchById(batchId);
        setSelectedBatch(updated.data);
      }
      loadBatches();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Batch retry failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectBatch = async (batchId: string) => {
    setLoading(true);
    try {
      const res = await dataExchangeApi.getBatchById(batchId);
      setSelectedBatch(res.data);
    } catch (err: any) {
      setError('Failed to inspect batch');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const res = await dataExchangeApi.exportData({
        entityType: exportEntity,
        projectId: exportProjectId || undefined,
        productId: exportProductId || undefined,
        format: exportFormat,
      });

      const data = res.data;
      if (exportFormat === 'csv' && data.csvContent) {
        const blob = new Blob([data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', data.filename || `export_${exportEntity.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const blob = new Blob([JSON.stringify(data.data || data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', data.filename || `export_${exportEntity.toLowerCase()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setSuccessMessage(`Export generated successfully (${data.count} records). Formula-injection sanitized.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'CREATED':
      case 'VALID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      case 'PARTIALLY_FAILED':
      case 'UPDATED':
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      case 'FAILED':
      case 'INVALID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
            <XCircle className="w-3 h-3 mr-1" />
            {status}
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const filteredBatches = batches.filter(
    (b) => batchFilterEntity === 'ALL' || b.entity_type === batchFilterEntity,
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Data Exchange & Portable Imports
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Permission-controlled CSV importing with dry-run validation, reference resolution, idempotent retry & CWE-1236 sanitized exports.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Badges */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            CWE-1236 Sanitized
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
            <Database className="w-3.5 h-3.5 mr-1" />
            Idempotent Retries
          </span>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Validation or Processing Error</h4>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-sm">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Operation Successful</h4>
            <p className="text-sm mt-0.5">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 text-sm">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8">
        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'import'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Upload className="w-4 h-4" />
          Import Wizard
        </button>
        <button
          onClick={() => {
            setActiveTab('batches');
            loadBatches();
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'batches'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          Batch History & Retries ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'export'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Download className="w-4 h-4" />
          Portable Export Studio
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: GUIDED IMPORT WIZARD */}
      {/* ======================================================== */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="grid grid-cols-4 gap-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 p-2">
            {[
              { num: 1, title: '1. Template & Upload', desc: 'Select entity & load CSV' },
              { num: 2, title: '2. Field Mapping', desc: 'Map columns & options' },
              { num: 3, title: '3. Dry-Run Preview', desc: 'Zero-write validation' },
              { num: 4, title: '4. Batch Execution', desc: 'Commit & Idempotent Retries' },
            ].map((step) => (
              <button
                key={step.num}
                onClick={() => {
                  if (step.num < wizardStep) setWizardStep(step.num as any);
                }}
                disabled={step.num > wizardStep}
                className={`text-left p-3 rounded-lg transition-all ${
                  wizardStep === step.num
                    ? 'bg-white dark:bg-slate-800 shadow-sm border border-indigo-200 dark:border-indigo-800 font-semibold text-indigo-600 dark:text-indigo-400'
                    : wizardStep > step.num
                    ? 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 cursor-pointer'
                    : 'bg-transparent text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <div className="text-xs uppercase tracking-wider">{step.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">{step.desc}</div>
              </button>
            ))}
          </div>

          {/* STEP 1: Template & Upload */}
          {wizardStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Entity & Mode Configuration */}
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Target Entity & Mode
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Import Entity Type
                  </label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => handleEntityChange(e.target.value as ImportEntityType)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="TASKS">Tasks & Defects</option>
                    <option value="REQUIREMENTS">Requirements & Criteria</option>
                    <option value="TEST_CASES">QA Test Cases</option>
                    <option value="CLIENT_REQUESTS">Client Intake Requests</option>
                    <option value="RAID_ITEMS">RAID Risks & Decisions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Execution Mode
                  </label>
                  <div className="space-y-2">
                    {[
                      { mode: 'UPSERT', label: 'UPSERT (Create new, Update matched)', desc: 'Matches by external_id' },
                      { mode: 'CREATE_ONLY', label: 'CREATE_ONLY (Reject duplicates)', desc: 'Errors if external_id exists' },
                      { mode: 'UPDATE_ONLY', label: 'UPDATE_ONLY (Existing records only)', desc: 'Errors if external_id not found' },
                    ].map((item) => (
                      <label
                        key={item.mode}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer text-xs transition-colors ${
                          selectedMode === item.mode
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value={item.mode}
                          checked={selectedMode === item.mode}
                          onChange={() => setSelectedMode(item.mode as ImportMode)}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-semibold">{item.label}</div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Template Download Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Official Template</span>
                    <span className="text-slate-400">{templateInfo?.headers.length || 0} fields</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pre-configured template with sample row, external ID headers, and reference column format.
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    disabled={!templateInfo}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV Template
                  </button>
                </div>
              </div>

              {/* Right Column: Upload / Paste CSV Content */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    Load CSV Data
                  </h3>
                  {fileName && (
                    <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      File: {fileName}
                    </span>
                  )}
                </div>

                {/* Drag & Drop File Input */}
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Choose a CSV file or drag and drop
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Comma-separated values (.csv) with header row
                  </p>
                  <label className="mt-4 inline-block">
                    <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm">
                      Browse File
                    </span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Or Direct Paste TextArea */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Or Paste CSV Text Directly
                    </label>
                    <span className="text-xs text-slate-400">
                      {csvContent ? `${csvContent.split('\n').filter((l) => l.trim()).length} lines` : 'Empty'}
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={csvContent}
                    onChange={(e) => {
                      setCsvContent(e.target.value);
                      autoDetectMapping(e.target.value);
                    }}
                    placeholder="external_id,title,description,project_code,priority&#10;TASK-EXT-01,Create Login,Initial user login screen,PRJ-ALPHA,HIGH"
                    className="w-full font-mono text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Step 1 Actions */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      if (!csvContent.trim()) {
                        setError('Please provide CSV data before proceeding.');
                        return;
                      }
                      setWizardStep(2);
                    }}
                    disabled={!csvContent.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    Proceed to Field Mapping
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Field Mapping */}
          {wizardStep === 2 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Field & Value Mapping
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Match each CSV column to its destination field in {selectedEntity}. Required fields must be mapped.
                  </p>
                </div>
                <button
                  onClick={() => autoDetectMapping(csvContent)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Auto-Detection
                </button>
              </div>

              {/* Protected Fields Notice Banner */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <div className="font-semibold">Security Boundary: Protected Fields Stripped</div>
                  <div>
                    Approval fields (<code className="font-mono text-[11px] bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">approval_status</code>, <code className="font-mono text-[11px] bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">reviewed_by</code>, <code className="font-mono text-[11px] bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">is_scope_addition</code>), audit timestamps, and employee compensation data are locked and cannot be overwritten via imports.
                  </div>
                </div>
              </div>

              {/* Column Mapping Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">CSV Column Header</th>
                      <th className="py-2.5 px-4">Destination Field</th>
                      <th className="py-2.5 px-4">Field Description</th>
                      <th className="py-2.5 px-4">Sample Template Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {Object.keys(columnMapping).map((csvCol) => {
                      const currentDest = columnMapping[csvCol];
                      const desc = templateInfo?.descriptions[currentDest] || 'Unmapped column';
                      const sample = templateInfo?.sampleRow[currentDest] ?? '-';
                      return (
                        <tr key={csvCol} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                            {csvCol}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={currentDest}
                              onChange={(e) =>
                                setColumnMapping({
                                  ...columnMapping,
                                  [csvCol]: e.target.value,
                                })
                              }
                              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                            >
                              <option value="">-- Ignore Column --</option>
                              {templateInfo?.headers.map((th) => (
                                <option key={th} value={th}>
                                  {th} {th === 'title' || th === 'name' ? '(Required)' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {desc}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                            {String(sample)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Back to Upload
                </button>
                <button
                  onClick={handleDryRun}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Performing Dry-Run...
                    </>
                  ) : (
                    <>
                      Execute Dry-Run Preview
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Dry-Run Preview */}
          {wizardStep === 3 && previewResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-indigo-500" />
                    Zero-Write Dry-Run Preview
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Batch <span className="font-mono font-semibold text-indigo-600">{previewResult.batchNumber}</span> generated without writing to permanent entity tables.
                  </p>
                </div>

                {/* Preview Stats Badges */}
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Total: <span className="font-bold">{previewResult.totalRows}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Permitted / Valid: <span className="font-bold">{previewResult.validRowsCount}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-xs font-medium text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    Rejected / Errors: <span className="font-bold">{previewResult.invalidRowsCount}</span>
                  </div>
                </div>
              </div>

              {/* Execution Options */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Partial Batch Execution Policy
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Allow valid rows to be imported while recording invalid rows for idempotent retry.
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPartial}
                    onChange={(e) => setAllowPartial(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Allow Partial Import
                </label>
              </div>

              {/* Row Diagnostic Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Row #</th>
                      <th className="py-2.5 px-3">External ID</th>
                      <th className="py-2.5 px-3">Validation Status</th>
                      <th className="py-2.5 px-3">Diagnostic Errors / Reference Checks</th>
                      <th className="py-2.5 px-3">Mapped Values Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                    {previewResult.previewRows.map((r) => (
                      <tr
                        key={r.rowIndex}
                        className={
                          r.isValid
                            ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                            : 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70'
                        }
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                          {r.rowIndex}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 dark:text-white font-medium">
                          {r.externalId || <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.isValid ? (
                            <span className="inline-flex items-center text-emerald-600 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              VALID
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-600 font-semibold">
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              REJECTED
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {r.isValid ? (
                            <span className="text-slate-400 italic">No validation issues detected</span>
                          ) : (
                            <div className="space-y-1">
                              {r.errors.map((err, i) => (
                                <div key={i} className="text-rose-600 dark:text-rose-400 text-xs flex items-start gap-1">
                                  <span className="font-semibold uppercase tracking-wider text-[10px] bg-rose-100 dark:bg-rose-900/60 px-1 py-0.5 rounded">
                                    {err.code}
                                  </span>
                                  <span>{err.field ? `${err.field}: ` : ''}{err.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-xs">
                          {JSON.stringify(r.mappedData)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 3 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Adjust Field Mapping
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={loading || (!allowPartial && previewResult.invalidRowsCount > 0)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Executing Import...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Commit Permitted Rows ({previewResult.validRowsCount})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Execution Results & Retry Console */}
          {wizardStep === 4 && executionResult && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Import Batch Processed: {executionResult.batch_number}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mode: {executionResult.import_mode} | Entity: {executionResult.entity_type}
                  </p>
                </div>
                {getStatusBadge(executionResult.status)}
              </div>

              {/* Outcome Scorecards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Rows Processed</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{executionResult.total_rows}</div>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Successfully Created/Updated</div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{executionResult.success_count}</div>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg">
                  <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">Rejected / Failed</div>
                  <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1">{executionResult.failed_count}</div>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">Skipped Rows</div>
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">{executionResult.skipped_count}</div>
                </div>
              </div>

              {/* Idempotent Retry Section if failures exist */}
              {executionResult.failed_count > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                      Idempotent Retries Available
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Failed rows can be retried without re-creating or duplicating previously successful rows.
                    </p>
                  </div>
                  <button
                    onClick={() => handleRetryBatch(executionResult.id)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry {executionResult.failed_count} Failed Rows
                  </button>
                </div>
              )}

              {/* Step 4 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setWizardStep(1);
                    setCsvContent('');
                    setPreviewResult(null);
                    setExecutionResult(null);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Start New Import
                </button>
                <button
                  onClick={() => {
                    setActiveTab('batches');
                    loadBatches();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  View All Batches in History
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BATCH HISTORY & RETRIES */}
      {/* ======================================================== */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filter by Entity:</span>
              <select
                value={batchFilterEntity}
                onChange={(e) => setBatchFilterEntity(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
              >
                <option value="ALL">All Entities</option>
                <option value="TASKS">Tasks</option>
                <option value="REQUIREMENTS">Requirements</option>
                <option value="TEST_CASES">Test Cases</option>
                <option value="CLIENT_REQUESTS">Client Requests</option>
                <option value="RAID_ITEMS">RAID Items</option>
              </select>
            </div>
            <button
              onClick={loadBatches}
              className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Batches
            </button>
          </div>

          {/* Batches Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Total Rows</th>
                    <th className="py-3 px-4">Outcomes (S / F / Sk)</th>
                    <th className="py-3 px-4">Executed By</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No import batches found.
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {batch.batch_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {batch.entity_type}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {batch.import_mode}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(batch.status)}</td>
                        <td className="py-3 px-4 font-medium">{batch.total_rows}</td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-600 font-semibold">{batch.success_count}</span> /{' '}
                          <span className="text-rose-600 font-semibold">{batch.failed_count}</span> /{' '}
                          <span className="text-amber-600">{batch.skipped_count}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {batch.executed_by_name || batch.created_by_name || 'System'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(batch.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleInspectBatch(batch.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </button>
                          {batch.failed_count > 0 && (
                            <button
                              onClick={() => handleRetryBatch(batch.id)}
                              disabled={loading}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded font-medium text-xs transition-colors border border-blue-200 dark:border-blue-800"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Retry Failed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batch Detail Modal / Drawer */}
          {selectedBatch && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Batch Details: {selectedBatch.batch_number}
                      </h3>
                      {getStatusBadge(selectedBatch.status)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      File: {selectedBatch.original_file_name} | Entity: {selectedBatch.entity_type} | Mode: {selectedBatch.import_mode}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-xs text-slate-500">Total Rows</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedBatch.total_rows}</div>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                      <div className="text-xs text-emerald-600 font-medium">Succeeded</div>
                      <div className="text-lg font-bold text-emerald-600">{selectedBatch.success_count}</div>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
                      <div className="text-xs text-rose-600 font-medium">Failed</div>
                      <div className="text-lg font-bold text-rose-600">{selectedBatch.failed_count}</div>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <div className="text-xs text-amber-600 font-medium">Skipped</div>
                      <div className="text-lg font-bold text-amber-600">{selectedBatch.skipped_count}</div>
                    </div>
                  </div>

                  {/* Row Outcomes List */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                      Row-Level Outcomes & Error Diagnostics
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Row #</th>
                            <th className="py-2.5 px-3">External ID</th>
                            <th className="py-2.5 px-3">Outcome</th>
                            <th className="py-2.5 px-3">Record Code</th>
                            <th className="py-2.5 px-3">Validation / Execution Details</th>
                            <th className="py-2.5 px-3">Retried</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                          {selectedBatch.row_outcomes?.map((row) => (
                            <tr
                              key={row.id}
                              className={
                                row.outcome_status === 'FAILED' || row.outcome_status === 'INVALID'
                                  ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                              }
                            >
                              <td className="py-2.5 px-3 font-semibold">{row.row_index}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                                {row.external_id || '-'}
                              </td>
                              <td className="py-2.5 px-3">{getStatusBadge(row.outcome_status)}</td>
                              <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400 font-semibold">
                                {row.target_record_code || '-'}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-xs">
                                {row.execution_error && (
                                  <div className="text-rose-600 font-medium">{row.execution_error}</div>
                                )}
                                {row.validation_errors && row.validation_errors.length > 0 && (
                                  <div className="space-y-0.5">
                                    {row.validation_errors.map((e, idx) => (
                                      <div key={idx} className="text-rose-600 text-xs">
                                        [{e.code}] {e.field ? `${e.field}: ` : ''}{e.message}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {!row.execution_error && (!row.validation_errors || row.validation_errors.length === 0) && (
                                  <span className="text-slate-400 italic">Completed successfully</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {row.is_retried ? (
                                  <span className="text-blue-600 font-semibold">Yes</span>
                                ) : (
                                  <span className="text-slate-400">No</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                  {selectedBatch.failed_count > 0 ? (
                    <button
                      onClick={() => handleRetryBatch(selectedBatch.id)}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Idempotent Retry Failed Rows
                    </button>
                  ) : (
                    <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      All records in this batch completed successfully
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PORTABLE EXPORT STUDIO */}
      {/* ======================================================== */}
      {activeTab === 'export' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Security Banner: CWE-1236 Defense Guarantee */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
              <h4 className="font-bold text-sm">Automated CSV Injection Defense (CWE-1236)</h4>
              <p>
                All portable exports automatically sanitize formula trigger characters (<code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded">=</code>, <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded">+</code>, <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded">-</code>, <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded">@</code>, <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded">\t</code>, <code className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-1 py-0.5 rounded">\r</code>) by prepending a single quote prefix. Formulas cannot execute when opened in Microsoft Excel or LibreOffice Calc. Restricted fields (salaries, internal cost margins, password hashes) are excluded from export payloads.
              </p>
            </div>
          </div>

          {/* Export Query Builder */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-500" />
              Configure Export Scope
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Entity Scope
                </label>
                <select
                  value={exportEntity}
                  onChange={(e) => setExportEntity(e.target.value as ImportEntityType)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="TASKS">Tasks & Bugs</option>
                  <option value="REQUIREMENTS">Requirements & Acceptance Criteria</option>
                  <option value="TEST_CASES">QA Test Cases</option>
                  <option value="CLIENT_REQUESTS">Client Intake Requests</option>
                  <option value="RAID_ITEMS">RAID Risks & Decisions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Export Format
                </label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Portable CSV (Spreadsheets)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Structured JSON (Developers)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Filter by Project (Optional)
                </label>
                <select
                  value={exportProjectId}
                  onChange={(e) => setExportProjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">All Accessible Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} ({p.project_code || 'NO-CODE'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Filter by Product (Optional)
                </label>
                <select
                  value={exportProductId}
                  onChange={(e) => setExportProductId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">All Accessible Products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} ({p.product_code || 'NO-CODE'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating Portable Export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export {exportFormat.toUpperCase()} File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
