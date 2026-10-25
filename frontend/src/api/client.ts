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
  // Default to localhost:8000 if running in standalone Vite mode, or relative path if same origin
  return window.location.port === '5173' ? 'http://127.0.0.1:8000' : '';
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

  listRuns: () => request<RunListItem[]>('/runs'),

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
};
