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
  // Default to relative path so requests route seamlessly through Vite proxy or same-origin backend
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

  try {
    const res = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      let detail = '';
      try {
        const errJson = await res.json();
        detail = errJson.detail || errJson.message || JSON.stringify(errJson);
      } catch {
        detail = await res.text();
      }
      throw new ApiError(detail || `HTTP ${res.status}: ${res.statusText}`, res.status, detail);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request timeout after ${timeoutMs}ms to ${fullUrl}`, 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(`Network connection failure: ${err.message || 'Cannot reach API backend.'}`, 0, err);
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

  // Super-Admin Authentication & RBAC Verification
  loginWithEmail: (email: string, password?: string, name?: string) =>
    request<import('./types').AuthUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  loginWithGoogle: (email: string, name?: string, picture?: string) =>
    request<import('./types').AuthUser>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, name, picture }),
    }),

  checkSwitchClearance: (email: string) =>
    request<import('./types').SwitchClearanceResponse>('/auth/switch-check', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
};
