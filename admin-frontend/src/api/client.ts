/**
 * ArthaAI Institutional Terminal — Centralized Typed API Client.
 * Handles timeouts, network failure recovery, CORS, and endpoint routing.
 */

import type {
  EvaluationDatasetResponse,
  EvaluationSummaryResponse,
  ExperimentReport,
  HealthResponse,
  ReadinessResponse,
  ResearchRequestBody,
  ResearchSubmitResponse,
  RunDetailsResponse,
  RunListItem,
  RunTraceResponse,
  SystemStatusResponse,
} from './types';

const STORAGE_KEY_API_URL = 'arthai_api_base_url';

export function getApiBaseUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEY_API_URL);
  if (stored) return stored.replace(/\/+$/, '');
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');
  // If running locally, connect directly to FastAPI backend on port 8000 for maximum throughput & 0-proxy latency
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8000';
  }
  return '';
}

export function setApiBaseUrl(url: string): void {
  const cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned) {
    localStorage.setItem(STORAGE_KEY_API_URL, cleaned);
  } else {
    localStorage.removeItem(STORAGE_KEY_API_URL);
  }
  window.dispatchEvent(new CustomEvent('arthai_api_url_changed', { detail: cleaned }));
}

export class ApiError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}, timeoutMs = 12000): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${path}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  // Automatically attach Super-Admin session token to Authorization headers
  const token = localStorage.getItem('arthai_admin_token') || localStorage.getItem('arthai_session_token');
  const authHeaders: Record<string, string> = {};
  if (token && token.trim()) {
    authHeaders['Authorization'] = `Bearer ${token.trim()}`;
    authHeaders['X-ArthaAI-Admin-Token'] = token.trim();
  }

  try {
    const res = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...authHeaders,
        ...(options.headers || {}),
      },
    });

    // Safely consume response text exactly once
    let rawText = '';
    try {
      rawText = await res.text();
    } catch {
      rawText = '';
    }

    let parsedJson: any = null;
    if (rawText && rawText.trim()) {
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        // Raw text was not JSON
      }
    }

    if (!res.ok) {
      const detail =
        parsedJson?.detail ||
        parsedJson?.message ||
        (rawText && rawText.length < 300 ? rawText : `HTTP ${res.status}: ${res.statusText}`);
      throw new ApiError(detail, res.status, parsedJson || detail);
    }

    return (parsedJson !== null ? parsedJson : {}) as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request timeout after ${timeoutMs}ms to ${fullUrl}`, 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Cannot reach API backend.', 0, err);
  } finally {
    clearTimeout(id);
  }
}

export const api = {
  // Observability & Readiness
  getHealth: () => request<HealthResponse>('/health', {}, 5000),
  getReadiness: () => request<ReadinessResponse>('/ready', {}, 6000),
  getSystemStatus: () => request<SystemStatusResponse>('/system/status', {}, 8000),

  // Research Execution & Status
  submitResearch: (body: ResearchRequestBody) =>
    request<ResearchSubmitResponse>('/research', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getRun: (runId: string) => request<RunDetailsResponse>(`/runs/${encodeURIComponent(runId)}`),

  getRunTrace: (runId: string) => request<RunTraceResponse>(`/runs/${encodeURIComponent(runId)}/trace`),

  listRuns: (onlySuccessful = false) =>
    request<RunListItem[]>(`/runs${onlySuccessful ? '?only_successful=true' : ''}`),

  // Evaluation & Benchmarking
  getEvaluationSummary: () => request<EvaluationSummaryResponse>('/evaluation/summary'),

  getEvaluationDataset: () => request<EvaluationDatasetResponse>('/evaluation/dataset'),

  listEvaluationExperiments: () => request<ExperimentReport[]>('/evaluation/experiments'),

  runEvaluation: (maxCases = 12) =>
    request<ExperimentReport>(
      `/evaluation/run?max_cases=${maxCases}`,
      {
        method: 'POST',
      },
      45000,
    ),

  // Live Market Sessions & Real-Time IST Quotes
  getMarketSession: () => request<import('./types').MarketSessionState>('/market/session', {}, 5000),
  getMarketIndices: () => request<any[]>('/market/indices', {}, 5000),
  getMarketStocks: () => request<any[]>('/market/stocks', {}, 5000),

  // Financial Data Bank & EOD Ingestion (Phase B)
  getDataBankCoverage: (symbol?: string) =>
    request<any>(`/api/v1/data-bank/coverage${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''}`, {}, 10000),
  getDataBankHealth: () => request<any>('/api/v1/data-bank/health', {}, 6000),

  // Real-Time Surveillance & Administrative Control
  getTrafficTelemetry: () => request<import('./types').TrafficTelemetry>('/admin/traffic', {}, 5000),
  getUsersSurveillance: () => request<import('./types').UserSession[]>('/admin/users', {}, 5000),
  getInvestmentsSurveillance: () => request<import('./types').InvestmentsSurveillance>('/admin/investments', {}, 5000),
  getClientErrors: () => request<import('./types').ClientErrorReport[]>('/admin/errors', {}, 5000),

  executeRectification: (action: string, target_id?: string, details?: any) =>
    request<any>('/admin/rectify', {
      method: 'POST',
      body: JSON.stringify({ action, target_id, details }),
    }, 8000),

  // Master Canonical Benchmark & Continuous Evaluation Suite
  getBenchmarkScenarios: () => request<import('./types').BenchmarkScenario[]>('/admin/benchmark/scenarios', {}, 15000),

  getBenchmarkReport: () => request<import('./types').BenchmarkReport>('/admin/benchmark/report', {}, 25000),

  runMasterBenchmark: (maxRepetitions = 4, scenarioIds?: string[]) =>
    request<import('./types').BenchmarkReport>(
      '/admin/benchmark/run',
      {
        method: 'POST',
        body: JSON.stringify({ max_repetitions: maxRepetitions, scenario_ids: scenarioIds }),
      },
      180000,
    ),

  listBenchmarkExperiments: () => request<any[]>('/admin/benchmark/experiments', {}, 10000),

  getBenchmarkExperiment: (experimentId: string) =>
    request<any>(`/admin/benchmark/experiments/${experimentId}`, {}, 15000),

  startOrchestrator: (maxRepetitions = 4, scenarioIds?: string[]) =>
    request<any>('/admin/benchmark/orchestrator/start', {
      method: 'POST',
      body: JSON.stringify({ max_repetitions: maxRepetitions, scenario_ids: scenarioIds }),
    }, 30000),

  pauseOrchestrator: () =>
    request<any>('/admin/benchmark/orchestrator/pause', { method: 'POST' }, 5000),

  resumeOrchestrator: () =>
    request<any>('/admin/benchmark/orchestrator/resume', { method: 'POST' }, 5000),

  cancelOrchestrator: () =>
    request<any>('/admin/benchmark/orchestrator/cancel', { method: 'POST' }, 5000),

  getOrchestratorStatus: () =>
    request<any>('/admin/benchmark/orchestrator/status', {}, 5000),

  listBenchmarkReviews: () =>
    request<any[]>('/admin/benchmark/reviews', {}, 5000),

  submitBenchmarkReview: (review: { execution_id: string; scenario_id: string; reviewer: string; verdict_rating: number; factual_accuracy_rating: number; notes: string }) =>
    request<any>('/admin/benchmark/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    }, 5000),

  listBenchmarkFailures: () =>
    request<any[]>('/admin/benchmark/failures', {}, 5000),

  getDualChannelEvaluation: () =>
    request<any>('/admin/benchmark/dual-channel-evaluation', {}, 15000),

  listUserRuns: (limit = 100) =>
    request<any[]>(`/admin/benchmark/user-runs?limit=${limit}`, {}, 15000),

  getBoxplots: () =>
    request<any>('/admin/benchmark/boxplots', {}, 10000),

  getRagEvaluation: () =>
    request<any>('/admin/benchmark/rag/evaluation', {}, 10000),

  getBenchmarkV2Report: () =>
    request<any>('/admin/benchmark/v2/report', {}, 15000),

  getBenchmarkV2Scenarios: () =>
    request<any[]>('/admin/benchmark/v2/scenarios', {}, 10000),

  getBenchmarkExportUrl: (format: 'markdown' | 'json' | 'csv' | 'pdf') => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/admin/benchmark/export/${format}`;
  },

  getBenchmarkDatasetDownloadUrl: (format: 'json' | 'csv') => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/admin/benchmark/dataset/download/${format}`;
  },

  downloadBenchmarkDataset: async (format: 'json' | 'csv') => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/admin/benchmark/dataset/download/${format}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `arthaai_benchmark_v2.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Blob download failed, opening direct URL:', err);
      window.open(url, '_blank');
    }
  },

  downloadBenchmarkExport: async (format: 'markdown' | 'json' | 'csv' | 'pdf') => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/admin/benchmark/export/${format}`;
    if (format === 'pdf') {
      window.open(url, '_blank');
      return;
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const ext = format === 'markdown' ? 'md' : format;
      link.download = `benchmark_evaluation_report.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Blob download failed, opening direct URL:', err);
      window.open(url, '_blank');
    }
  },

  // Empirical Live Evaluation Studio (100% Real Runs)
  runSingleArchitecture: (body: { query: string; architecture: string; symbol?: string; symbols?: string[]; risk_tolerance?: number; initial_capital?: number }) =>
    request<any>('/admin/evaluation/run-single-architecture', {
      method: 'POST',
      body: JSON.stringify(body),
    }, 150000),

  finalizeComparison: (body: { query: string; results: Record<string, any>; symbol?: string; symbols?: string[]; run_type?: string; comparison_id?: string }) =>
    request<any>('/admin/evaluation/finalize-comparison', {
      method: 'POST',
      body: JSON.stringify(body),
    }, 30000),

  compareSingleQuery: (body: { query: string; architectures: string[]; symbols?: string[]; symbol?: string; risk_tolerance?: number; initial_capital?: number; run_type?: string }) =>
    request<any>('/admin/evaluation/compare-single-query', {
      method: 'POST',
      body: JSON.stringify(body),
    }, 300000),

  getSampleEvaluationDataset: () =>
    request<any[]>('/admin/evaluation/sample-dataset', {}, 10000),

  uploadEvaluationDataset: (items: any[]) =>
    request<any[]>('/admin/evaluation/upload-dataset', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }, 15000),

  runBatchEvaluationItem: (body: { query: string; architectures: string[]; symbol?: string }) =>
    request<any>('/admin/evaluation/run-batch-item', {
      method: 'POST',
      body: JSON.stringify(body),
    }, 180000),

  listEvaluationRuns: (runType: 'ALL' | 'SINGLE' | 'DATASET' = 'ALL') =>
    request<any[]>(`/admin/evaluation/runs?run_type=${runType}`, {}, 15000),

  getEvaluationRun: (comparisonId: string) =>
    request<any>(`/admin/evaluation/runs/${comparisonId}`, {}, 15000),

  getAggregateEvaluationMetrics: () =>
    request<any>('/admin/evaluation/aggregate-metrics', {}, 15000),

  downloadEvaluationJsonUrl: (comparisonId: string) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/admin/evaluation/download/${comparisonId}/json`;
  },

  downloadEvaluationCsvUrl: (comparisonId: string) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/admin/evaluation/download/${comparisonId}/csv`;
  },

  downloadEvaluationPdfUrl: (comparisonId: string) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/admin/evaluation/download/${comparisonId}/pdf`;
  },

  downloadEvaluationPdf: async (comparisonId: string) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/admin/evaluation/download/${comparisonId}/pdf`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const blob = await resp.blob();
      const isPdf = resp.headers.get('content-type')?.includes('application/pdf') || blob.type.includes('pdf');
      const ext = isPdf ? 'pdf' : 'html';
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `evaluation_${comparisonId}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('PDF download error, opening direct URL:', err);
      window.open(url, '_blank');
    }
  },

  downloadEvaluationCsv: async (comparisonId: string) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/admin/evaluation/download/${comparisonId}/csv`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `evaluation_${comparisonId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('CSV download error, opening direct URL:', err);
      window.open(url, '_blank');
    }
  },

  generateEvaluationPdf: async (reportData: any) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/admin/evaluation/generate-pdf`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const blob = await resp.blob();
      const isPdf = resp.headers.get('content-type')?.includes('application/pdf') || blob.type.includes('pdf');
      const ext = isPdf ? 'pdf' : 'html';
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `arthaai_empirical_evaluation_${reportData.comparison_id || 'report'}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('PDF download error:', err);
      throw err;
    }
  },

  deleteEvaluationRun: (comparisonId: string) =>
    request<any>(`/admin/evaluation/runs/${comparisonId}`, {
      method: 'DELETE',
    }),

  // Super-Admin Authentication & RBAC Verification
  loginWithEmail: (email: string, password?: string, name?: string, mode: 'LOGIN' | 'SIGNUP' = 'LOGIN') =>
    request<import('./types').AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, mode }),
    }),

  registerWithEmail: (email: string, password?: string, name?: string) =>
    request<import('./types').AuthUser>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  loginWithGoogle: (email: string, name?: string, picture?: string, mode: 'LOGIN' | 'SIGNUP' = 'LOGIN') =>
    request<import('./types').AuthUser>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, name, picture, mode }),
    }),

  verifyGoogleIdToken: (idToken: string) =>
    request<import('./types').AuthUser>('/auth/google/verify', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, credential: idToken, token: idToken }),
    }),

  getMe: () =>
    request<import('./types').AuthUser>('/auth/me', {}, 6000),

  logout: () =>
    request<{ status: string; message: string }>('/auth/logout', {
      method: 'POST',
    }, 4000),

  getGoogleOAuthConfig: () =>
    request<{ client_id: string }>('/auth/google/config', {}, 3000),

  getGoogleAccounts: () =>
    request<Array<{ email: string; name: string; role: string; is_super_admin: boolean; auth_provider: string }>>(
      '/auth/google/accounts',
      {},
      4000
    ),

  checkSwitchClearance: (email: string) =>
    request<import('./types').SwitchClearanceResponse>('/auth/switch-check', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};
