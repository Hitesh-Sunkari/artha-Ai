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

  // Authentication & Super-Admin Clearance
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

  // Telemetry & Error Reporting
  sendHeartbeat: (payload: import('./types').UserHeartbeatPayload) =>
    request<{ status: string }>('/telemetry/user-heartbeat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 4000),

  syncPortfolioToAdmin: (payload: { user_email: string; cash: number; positions: any[]; orders: any[] }) =>
    request<{ status: string }>('/telemetry/sync-portfolio', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 4000),

  reportClientError: (payload: import('./types').ClientErrorPayload) =>
    request<{ status: string }>('/telemetry/report-error', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 4000),
};
