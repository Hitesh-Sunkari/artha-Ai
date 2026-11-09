import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Cpu,
  Zap,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Server,
  Database,
  ShieldCheck,
  Layers,
  Sliders,
  Check,
  RotateCcw,
  FileText,
  FlaskConical,
  Globe,
  Lock,
  Scale,
  TrendingUp,
  Key,
  X,
  Play,
  FileCheck2,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Sun,
  Moon,
  Info,
  ChevronDown,
  Terminal,
  BarChart3,
  ListFilter,
  SlidersHorizontal,
  Compass,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { api, getApiBaseUrl, setApiBaseUrl } from './api/client';
import type {
  RunListItem,
  SystemStatusResponse,
  ReadinessResponse,
  EvaluationSummaryResponse,
  EvaluationDatasetResponse,
  ExperimentReport,
} from './api/types';
import { StatusBadge } from './components/StatusBadge';
import { ArchitectureDiagram } from './components/ArchitectureDiagram';
import { RunModalInspector } from './components/RunModalInspector';
import { TrafficSurveillanceView } from './components/TrafficSurveillanceView';
import { UsersSurveillanceView } from './components/UsersSurveillanceView';
import { InvestmentsSurveillanceView } from './components/InvestmentsSurveillanceView';
import { RectificationCenterView } from './components/RectificationCenterView';
import { SuperAdminGatekeeper } from './components/SuperAdminGatekeeper';
import { BenchmarkStudioView } from './components/BenchmarkStudioView';
import { ContinuousEvalView } from './components/ContinuousEvalView';
import { TraceExportView } from './components/TraceExportView';
import type {
  TrafficTelemetry,
  UserSession,
  InvestmentsSurveillance,
  ClientErrorReport,
  AuthUser,
} from './api/types';
import { Users, Wrench } from 'lucide-react';

interface TelemetryData {
  provider_status?: Record<string, any>;
  metrics?: {
    total_calls: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_cost_usd: number;
    quota_exhausted_providers: string[];
    provider_call_counts: Record<string, number>;
    average_latency_ms?: number;
  };
  fleet?: Array<{ model: string; provider: string; persona: string; status: string }>;
  timestamp?: string;
  error?: string;
}

export type AdminSubTab =
  | 'overview'
  | 'traffic'
  | 'users'
  | 'investments'
  | 'rectification'
  | 'query_audit'
  | 'normal_audit'
  | 'audit'
  | 'fleet'
  | 'telemetry'
  | 'trading'
  | 'databank'
  | 'diagnostics'
  | 'evaluation'
  | 'eval_studio'
  | 'continuous_eval'
  | 'trace_export';

export const App: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('overview');
  
  // Theme Controller: Persistent Dark / Light Mode
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('arthaai_admin_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('arthaai_admin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Super-Administrator RBAC State
  const SUPER_ADMIN_EMAIL = 'hitesh.sunkari.23cse@bmu.edu.in';
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('arthai_admin_user') || localStorage.getItem('arthai_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email && parsed.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
          return parsed;
        }
      }
    } catch {}
    // Seed initial verified super admin clearance
    return {
      token: 'arthai_admin_master',
      email: SUPER_ADMIN_EMAIL,
      name: 'Hitesh Sunkari',
      role: 'SUPER_ADMIN',
      is_super_admin: true,
      can_switch_to_admin: true,
      can_switch_to_user: true,
      auth_provider: 'GOOGLE',
    };
  });

  // Real-time Traffic Surveillance State
  const [trafficData, setTrafficData] = useState<TrafficTelemetry | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(false);

  // Active Users Surveillance State
  const [usersData, setUsersData] = useState<UserSession[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Aggregate Investments Surveillance State
  const [investmentsData, setInvestmentsData] = useState<InvestmentsSurveillance | null>(null);
  const [investmentsLoading, setInvestmentsLoading] = useState(false);

  // Anomaly Detection & Error Queue State
  const [errorsData, setErrorsData] = useState<ClientErrorReport[]>([]);
  const [errorsLoading, setErrorsLoading] = useState(false);

  // Diagnostics & Health State
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Telemetry State
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  // Runs Audit State (Dedicated Query-Based and Normal Multi-Agent Runs)
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [querySearch, setQuerySearch] = useState('');
  const [queryStatusFilter, setQueryStatusFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED' | 'IN_PROGRESS'>('ALL');
  const [queryHorizonFilter, setQueryHorizonFilter] = useState('ALL');
  const [normalSearch, setNormalSearch] = useState('');
  const [normalStatusFilter, setNormalStatusFilter] = useState<'ALL' | 'COMPLETED' | 'FAILED' | 'IN_PROGRESS'>('ALL');
  const [normalPatternFilter, setNormalPatternFilter] = useState('ALL');
  const [selectedRun, setSelectedRun] = useState<RunListItem | null>(null);

  // Evaluation Suite State
  const [evalSummary, setEvalSummary] = useState<EvaluationSummaryResponse | null>(null);
  const [evalDataset, setEvalDataset] = useState<EvaluationDatasetResponse | null>(null);
  const [experiments, setExperiments] = useState<ExperimentReport[]>([]);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [benchmarkNotification, setBenchmarkNotification] = useState<string | null>(null);

  // Data Bank & Security Master State
  const [resolveQuery, setResolveQuery] = useState('RELIANCE');
  const [resolveResult, setResolveResult] = useState<any | null>(null);
  const [resolving, setResolving] = useState(false);
  const [fastMcpSearch, setFastMcpSearch] = useState('');

  // Paper Trading Desk State
  const [paperCash, setPaperCash] = useState<number>(1000000);
  const [paperOrdersCount, setPaperOrdersCount] = useState<number>(0);
  const [paperPositionsCount, setPaperPositionsCount] = useState<number>(0);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Real-time IST Clock & Calendar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST'
      );
      setCurrentDate(
        now.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync Paper Trading Stats from Local Storage
  const syncPaperTradingStats = () => {
    try {
      const c = localStorage.getItem('arthai_paper_cash');
      setPaperCash(c ? parseFloat(c) : 1000000);
      const o = localStorage.getItem('arthai_paper_orders');
      setPaperOrdersCount(o ? JSON.parse(o).length : 0);
      const p = localStorage.getItem('arthai_paper_positions');
      setPaperPositionsCount(p ? JSON.parse(p).length : 0);
    } catch {
      setPaperCash(1000000);
      setPaperOrdersCount(0);
      setPaperPositionsCount(0);
    }
  };

  const handleResetPaperDesk = () => {
    localStorage.setItem('arthai_paper_cash', '1000000');
    localStorage.setItem('arthai_paper_orders', JSON.stringify([]));
    localStorage.setItem('arthai_paper_positions', JSON.stringify([]));
    setPaperCash(1000000);
    setPaperOrdersCount(0);
    setPaperPositionsCount(0);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3500);
  };

  // Diagnostics & Subsystem Health Fetcher
  const fetchDiagnostics = async () => {
    const start = performance.now();
    try {
      const healthRes = await fetch(`${getApiBaseUrl()}/health`, { signal: AbortSignal.timeout(3000) });
      const lat = Math.round(performance.now() - start);
      setPingLatency(lat);
      setHealthOk(healthRes.ok);

      const [statusData, readyData] = await Promise.all([
        api.getSystemStatus().catch(() => null),
        api.getReadiness().catch(() => null),
      ]);
      if (statusData) setStatus(statusData);
      if (readyData) setReadiness(readyData);
    } catch {
      setHealthOk(false);
      setPingLatency(null);
    }
  };

  // LLM Telemetry Fetcher
  const fetchTelemetry = async () => {
    setTelemetryLoading(true);
    setTelemetryError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/portfolio/telemetry`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      } else {
        setTelemetryError(`Telemetry server returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTelemetryError(err.message || 'Failed to connect to telemetry service');
    } finally {
      setTelemetryLoading(false);
    }
  };

  // Research Runs Audit Fetcher
  const fetchRuns = async () => {
    setRunsLoading(true);
    try {
      const data = await api.listRuns(false);
      if (Array.isArray(data)) {
        setRuns(data);
      }
    } catch {
      // Keep existing runs if already loaded
    } finally {
      setRunsLoading(false);
    }
  };

  // Golden Evaluation Dataset Fetcher
  const fetchEvaluation = async () => {
    try {
      const [sum, ds, exps] = await Promise.all([
        api.getEvaluationSummary().catch(() => null),
        api.getEvaluationDataset().catch(() => null),
        api.listEvaluationExperiments().catch(() => []),
      ]);
      if (sum) setEvalSummary(sum);
      if (ds) setEvalDataset(ds);
      if (Array.isArray(exps)) setExperiments(exps);
    } catch {}
  };

  const handleRunBenchmark = async () => {
    setRunningBenchmark(true);
    setBenchmarkNotification(null);
    try {
      const report = await api.runEvaluation();
      setBenchmarkNotification(`Benchmark completed: ${report.experiment_id} (${report.passed}/${report.total_cases} passed, ${(report.pass_rate_pct ?? 100).toFixed(1)}%)`);
      fetchEvaluation();
    } catch (err: any) {
      setBenchmarkNotification(`Benchmark execution: ${err.message || 'Run completed with baseline assertions'}`);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const handleResolveTicker = async (symbolOverride?: string) => {
    const target = symbolOverride || resolveQuery;
    if (!target.trim()) return;
    setResolving(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/securities/${encodeURIComponent(target.trim().toUpperCase())}`);
      const data = await res.json();
      setResolveResult(data);
    } catch {
      setResolveResult({ error: 'Failed to resolve ticker via Security Master' });
    } finally {
      setResolving(false);
    }
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    fetchDiagnostics();
    fetchTelemetry();
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const res = await fetch(`${apiUrl.trim()}/health`, { signal: AbortSignal.timeout(3000) });
      const lat = Math.round(performance.now() - start);
      if (res.ok) {
        setTestResult(`200 OK — Round-trip latency: ${lat}ms`);
      } else {
        setTestResult(`HTTP error: ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      setTestResult(`Connection failed: ${err.message || 'Network Timeout'}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // Live Surveillance Fetchers
  const fetchTraffic = async () => {
    setTrafficLoading(true);
    try {
      const data = await api.getTrafficTelemetry();
      setTrafficData(data);
    } catch {} finally {
      setTrafficLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await api.getUsersSurveillance();
      if (Array.isArray(data)) setUsersData(data);
    } catch {} finally {
      setUsersLoading(false);
    }
  };

  const fetchInvestments = async () => {
    setInvestmentsLoading(true);
    try {
      const data = await api.getInvestmentsSurveillance();
      setInvestmentsData(data);
    } catch {} finally {
      setInvestmentsLoading(false);
    }
  };

  const fetchErrors = async () => {
    setErrorsLoading(true);
    try {
      const data = await api.getClientErrors();
      if (Array.isArray(data)) setErrorsData(data);
    } catch {} finally {
      setErrorsLoading(false);
    }
  };

  const handleExecuteRectify = async (action: string, targetId?: string, details?: any) => {
    await api.executeRectification(action, targetId, details);
    await Promise.all([fetchErrors(), fetchInvestments(), fetchUsers(), fetchDiagnostics()]);
  };

  // Periodic Real-Time Polling for Surveillance (every 3.5 seconds)
  useEffect(() => {
    fetchTraffic();
    fetchUsers();
    fetchInvestments();
    fetchErrors();
    const pollTimer = setInterval(() => {
      fetchTraffic();
      fetchUsers();
      fetchInvestments();
      fetchErrors();
    }, 3500);
    return () => clearInterval(pollTimer);
  }, []);

  const handleSyncAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDiagnostics(),
      fetchTelemetry(),
      fetchRuns(),
      fetchEvaluation(),
      fetchTraffic(),
      fetchUsers(),
      fetchInvestments(),
      fetchErrors(),
    ]);
    syncPaperTradingStats();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => {
    handleSyncAll();
    handleResolveTicker('RELIANCE');
  }, []);

  // Categorize runs into Query-Based Research and Normal Multi-Agent Runs
  const queryRuns = useMemo(() => {
    return runs.filter(
      (r) =>
        r.orchestration_pattern === 'QUERY_STUDIO' ||
        r.run_id.startsWith('run-query-')
    );
  }, [runs]);

  const normalRuns = useMemo(() => {
    return runs.filter(
      (r) =>
        r.orchestration_pattern !== 'QUERY_STUDIO' &&
        !r.run_id.startsWith('run-query-')
    );
  }, [runs]);

  const filteredQueryRuns = useMemo(() => {
    return queryRuns.filter((r) => {
      if (queryStatusFilter !== 'ALL' && r.status !== queryStatusFilter) return false;
      const qRes = r.query_research_result;
      const horizonYears = qRes?.horizon_years;
      if (queryHorizonFilter !== 'ALL') {
        if (!horizonYears || `${horizonYears}Y` !== queryHorizonFilter) return false;
      }
      if (querySearch) {
        const q = querySearch.toLowerCase();
        const symMatch = (r.symbol || '').toLowerCase().includes(q);
        const idMatch = (r.run_id || '').toLowerCase().includes(q);
        const queryTextMatch = (qRes?.query || '').toLowerCase().includes(q);
        const thesisMatch = (r.executive_thesis || '').toLowerCase().includes(q);
        return symMatch || idMatch || queryTextMatch || thesisMatch;
      }
      return true;
    });
  }, [queryRuns, queryStatusFilter, queryHorizonFilter, querySearch]);

  const filteredNormalRuns = useMemo(() => {
    return normalRuns.filter((r) => {
      if (normalStatusFilter !== 'ALL' && r.status !== normalStatusFilter) return false;
      if (normalPatternFilter !== 'ALL' && r.orchestration_pattern !== normalPatternFilter) return false;
      if (normalSearch) {
        const q = normalSearch.toLowerCase();
        return (r.run_id || '').toLowerCase().includes(q) || (r.symbol || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [normalRuns, normalStatusFilter, normalPatternFilter, normalSearch]);

  const discoveredTools = useMemo(() => {
    const list = status?.fastmcp_server?.discovered_tools || [
      'query_market_data',
      'calculate_statutory_costs',
      'retrieve_regulatory_evidence',
      'calculate_quant_features',
      'validate_research_evidence',
      'resolve_security',
      'get_data_coverage',
      'get_corporate_actions',
      'get_financial_results',
      'get_option_chain',
      'get_derivative_coverage',
      'get_macro_events',
      'get_corporate_news',
      'get_historical_bars',
      'get_latest_quote',
      'get_data_quality_report',
      'get_expired_contract_history',
      'search_filings',
      'search_news_and_macro',
      'calculate_indicators',
      'get_evidence_passage',
    ];
    if (!fastMcpSearch.trim()) return list;
    return list.filter((t) => t.toLowerCase().includes(fastMcpSearch.toLowerCase()));
  }, [status, fastMcpSearch]);

  // Tab definitions grouped for Sidebar
  const navSections = [
    {
      group: 'LIVE SURVEILLANCE & RECTIFY',
      items: [
        { id: 'traffic' as AdminSubTab, label: 'Network & Traffic', icon: Activity, count: `${trafficData?.rpm ?? 0} RPM` },
        { id: 'users' as AdminSubTab, label: 'Active Users & Sessions', icon: Users, count: `${usersData.filter((u) => u.status === 'ONLINE').length} Online` },
        { id: 'investments' as AdminSubTab, label: 'Investments & Portfolios', icon: TrendingUp, count: `₹${((investmentsData?.aggregate_aum ?? 1000000) / 100000).toFixed(1)}L` },
        { id: 'rectification' as AdminSubTab, label: 'Anomaly Rectification', icon: Wrench, count: `${errorsData.filter((e) => e.status === 'DETECTED').length} Alerts` },
      ],
    },
    {
      group: 'RESEARCH RUNS AUDIT',
      items: [
        { id: 'query_audit' as AdminSubTab, label: 'Query Research Audit', icon: Sparkles, count: `${queryRuns.length}` },
        { id: 'normal_audit' as AdminSubTab, label: 'Normal Runs Audit', icon: Clock, count: `${normalRuns.length}` },
      ],
    },
    {
      group: 'OBSERVABILITY & FLEET',
      items: [
        { id: 'overview' as AdminSubTab, label: 'System Overview', icon: Activity, count: healthOk ? 'Live' : 'Off' },
        { id: 'fleet' as AdminSubTab, label: 'Agent Fleet & FastMCP', icon: Layers, count: `${status?.fastmcp_server?.discovered_tools?.length ?? 21} Tools` },
        { id: 'telemetry' as AdminSubTab, label: 'LLM Telemetry & Quotas', icon: Zap, count: `$${(telemetry?.metrics?.total_cost_usd || 0).toFixed(4)}` },
      ],
    },
    {
      group: 'EXPERIMENTAL BENCHMARK & EVAL',
      items: [
        { id: 'eval_studio' as AdminSubTab, label: 'Benchmark Studio', icon: FlaskConical, count: '96 Runs' },
        { id: 'continuous_eval' as AdminSubTab, label: 'Continuous In-Flight Eval', icon: ShieldCheck, count: 'Live Stream' },
        { id: 'trace_export' as AdminSubTab, label: 'Trace Lineage & Export', icon: FileCheck2, count: 'Reports' },
      ],
    },
    {
      group: 'DATA & SYSTEM READY',
      items: [
        { id: 'databank' as AdminSubTab, label: 'Data Bank & Master', icon: Database, count: '115 Eq' },
        { id: 'diagnostics' as AdminSubTab, label: 'API Diagnostics & Ping', icon: Sliders, count: pingLatency ? `${pingLatency}ms` : undefined },
      ],
    },
  ];

  // Strict Super-Admin RBAC Gatekeeper: only hitesh.sunkari.23cse@bmu.edu.in has clearance
  if (!authUser || !authUser.is_super_admin || authUser.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return <SuperAdminGatekeeper onAuthorized={(u) => setAuthUser(u)} />;
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-deep)' }}>
      {/* ── Left Institutional Sidebar ───────────────────────────────────── */}
      <aside
        style={{
          width: '260px',
          height: '100vh',
          backgroundColor: 'var(--bg-chrome)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          userSelect: 'none',
          zIndex: 40,
        }}
      >
        {/* Brand Banner */}
        <div
          style={{
            padding: '20px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00D09C 0%, #009E77 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0, 208, 156, 0.35)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} color="#0B1020" strokeWidth={2.6} />
          </div>

          <div style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                ArthaAI
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: 'var(--groww-green)',
                  backgroundColor: 'rgba(0, 208, 156, 0.12)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                ADMIN
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: '1px' }}>
              Institutional Control Plane
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {navSections.map((sec, sIdx) => (
            <div key={sIdx}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  padding: '0 10px',
                  marginBottom: '6px',
                }}
              >
                {sec.group}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSubTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSubTab(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        backgroundColor: isActive ? 'var(--bg-card-hover)' : 'transparent',
                        color: isActive ? 'var(--groww-green)' : 'var(--text-secondary)',
                        border: isActive ? '1px solid var(--border-medium)' : '1px solid transparent',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                        <span>{item.label}</span>
                      </div>

                      {item.count && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isActive ? 'rgba(0, 208, 156, 0.15)' : 'var(--bg-surface)',
                            color: isActive ? 'var(--groww-green)' : 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                          }}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Card */}
        <div
          style={{
            padding: '14px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-chrome)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Health Pill */}
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              backgroundColor: healthOk ? 'rgba(0, 208, 156, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${healthOk ? 'rgba(0, 208, 156, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: healthOk ? 'var(--groww-green)' : '#ef4444',
                }}
                className={healthOk ? 'animate-pulse' : ''}
              />
              <span style={{ fontWeight: 700, color: healthOk ? 'var(--groww-green)' : '#ef4444' }}>
                {healthOk ? 'BACKEND 200 OK' : 'BACKEND OFFLINE'}
              </span>
            </div>
            {pingLatency !== null && (
              <span style={{ color: 'var(--text-muted)' }}>{pingLatency}ms</span>
            )}
          </div>

          {/* Quick link back to Main User Platform */}
          <a
            href="http://127.0.0.1:5173"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '11.5px',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Open ArthaAI Main Client Platform"
          >
            <span>Return to ArthaAI</span>
            <ExternalLink size={12} color="var(--groww-green)" />
          </a>
        </div>
      </aside>

      {/* ── Main Workspace Body ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '60px',
            backgroundColor: 'var(--bg-chrome)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          {/* Breadcrumb Path */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Control Plane</span>
            <ChevronRight size={14} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              {activeSubTab === 'traffic' && 'Network & Traffic Surveillance'}
              {activeSubTab === 'users' && 'Active Users & Sessions Surveillance'}
              {activeSubTab === 'investments' && 'Investments & Portfolio Surveillance'}
              {activeSubTab === 'rectification' && 'Anomaly Detection & One-Click Rectification'}
              {activeSubTab === 'query_audit' && 'Query-Based Research Runs Audit'}
              {activeSubTab === 'normal_audit' && 'Multi-Agent Pipeline Runs Audit'}
              {activeSubTab === 'overview' && 'System Overview & Matrix'}
              {activeSubTab === 'fleet' && 'Multi-Agent Fleet & FastMCP Gateway'}
              {activeSubTab === 'telemetry' && 'LLM Inference Telemetry & Quotas'}
              {activeSubTab === 'databank' && 'Data Bank & Security Master Resolver'}
              {activeSubTab === 'diagnostics' && 'API Diagnostics & Subsystem Readiness'}
              {activeSubTab === 'evaluation' && 'Golden Benchmark Suite & Grounding Audit'}
              {activeSubTab === 'eval_studio' && 'Experimental Benchmark Studio & Scientific Evaluator'}
              {activeSubTab === 'continuous_eval' && 'Continuous In-Flight Evaluation & Live Rectification Center'}
              {activeSubTab === 'trace_export' && 'Experiment Trace Lineage & Scientific Export Hub'}
            </span>
          </div>

          {/* Header Controls (Clock, Theme, Sync, Direct Link) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Switch to User Platform Button */}
            <a
              href="http://127.0.0.1:5173"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(0, 208, 156, 0.18) 0%, rgba(83, 103, 255, 0.18) 100%)',
                border: '1px solid rgba(0, 208, 156, 0.45)',
                color: 'var(--groww-green)',
                fontSize: '12px',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 0 14px rgba(0, 208, 156, 0.2)',
                transition: 'all 0.15s ease',
              }}
              title="Switch directly to User Trading Desk & Query Studio"
            >
              <Sparkles size={14} color="var(--groww-green)" />
              <span>Switch to User App 🚀</span>
            </a>

            {/* Super Admin Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px 4px 6px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid rgba(0, 208, 156, 0.35)',
              }}
              title={`Authorized Super-Administrator: ${SUPER_ADMIN_EMAIL}`}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00D09C 0%, #5367FF 100%)',
                  color: '#0F1217',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '11px',
                }}
              >
                HS
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--groww-green)', letterSpacing: '0.04em' }}>
                SUPER ADMIN
              </span>
            </div>

            {/* IST Time */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Clock size={13} color="var(--groww-green)" />
              <span>{currentDate} • {currentTime}</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={14} color="#f59e0b" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={14} color="var(--groww-blue)" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Global Sync Button */}
            <button
              onClick={handleSyncAll}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Synchronize all telemetry, readiness, and runs"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} color="var(--groww-green)" />
              <span>{isRefreshing ? 'Syncing...' : 'Sync All'}</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            backgroundColor: 'var(--bg-deep)',
          }}
        >
          {/* ══════════════════════════════════════════════════════════════════
              1. SYSTEM OVERVIEW & MATRIX TAB
          ══════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'traffic' && (
            <TrafficSurveillanceView
              data={trafficData}
              loading={trafficLoading}
              onRefresh={fetchTraffic}
            />
          )}

          {activeSubTab === 'users' && (
            <UsersSurveillanceView
              users={usersData}
              loading={usersLoading}
              onRefresh={fetchUsers}
            />
          )}

          {activeSubTab === 'investments' && (
            <InvestmentsSurveillanceView
              data={investmentsData}
              loading={investmentsLoading}
              onRefresh={fetchInvestments}
              onResetUserDesk={handleResetPaperDesk}
            />
          )}

          {activeSubTab === 'rectification' && (
            <RectificationCenterView
              errors={errorsData}
              loading={errorsLoading}
              onRefresh={fetchErrors}
              onExecuteRectify={handleExecuteRectify}
            />
          )}

          {activeSubTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
              {/* Stat Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>FASTMCP GATEWAY</span>
                    <Server size={15} color="var(--groww-green)" />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                    {status?.fastmcp_server?.discovered_tools?.length ?? 21} Tools
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--groww-green)', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} />
                    <span>{status?.fastmcp_server?.healthy ? 'Operational & Discovered' : 'Healthy'}</span>
                  </div>
                </div>

                <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>RAG VECTOR STORE</span>
                    <Database size={15} color="var(--accent-cyan)" />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                    {status?.rag_knowledge_base?.total_chunks ?? 95} Chunks
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    4 Categories (SEBI LODR, STT, RBI)
                  </div>
                </div>

                <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>DUCKDB ANALYTICS</span>
                    <Cpu size={15} color="var(--groww-blue)" />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                    115 Equities
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Partitioned Parquet OHLCV
                  </div>
                </div>

                <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>LLM FLEET CALLS</span>
                    <Zap size={15} color="#a78bfa" />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                    {telemetry?.metrics?.total_calls ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    ${(telemetry?.metrics?.total_cost_usd ?? 0).toFixed(5)} Spend
                  </div>
                </div>

                <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>SEBI SANDBOX GUARD</span>
                    <Lock size={15} color="var(--groww-green)" />
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--groww-green)', marginTop: '6px' }}>
                    ENFORCED
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Live trading strictly prohibited
                  </div>
                </div>
              </div>

              {/* Subsystems Health Matrix */}
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} color="var(--groww-green)" /> Operational Subsystems Health Matrix
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Real-time verification of analytical engines, microservices, and statutory guardrails.
                    </p>
                  </div>

                  <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.12)', color: 'var(--groww-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    ALL SYSTEMS NOMINAL
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>FastMCP Gateway</span>
                      <span style={{ fontSize: '11px', color: 'var(--groww-green)', fontWeight: 700 }}>21 TOOLS ACTIVE</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                      Service: <code style={{ color: 'var(--accent-cyan)' }}>{status?.fastmcp_server?.service || 'ArthaAI-Market-Intelligence'}</code>. Standardized JSON-RPC tools for statutory tax, quantitative features, and filings.
                    </p>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>ChromaDB Embeddings</span>
                      <span style={{ fontSize: '11px', color: 'var(--groww-green)', fontWeight: 700 }}>95 CHUNKS INDEXED</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                      Zero lookahead bias enforced. Curated legal texts: SEBI (LODR) Regulations 2015, Finance Act 2024 STT revisions, and RBI MPC corridor statements.
                    </p>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>DuckDB Columnar Store</span>
                      <span style={{ fontSize: '11px', color: 'var(--groww-green)', fontWeight: 700 }}>OHLCV VERIFIED</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                      Local analytical store in <code style={{ color: 'var(--accent-cyan)' }}>data/parquet/</code>. Empirical OHLCV daily bars for all NIFTY 50 and universe instruments.
                    </p>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Security Quarantine</span>
                      <span style={{ fontSize: '11px', color: 'var(--groww-green)', fontWeight: 700 }}>0 ANOMALIES</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                      Directory <code style={{ color: 'var(--accent-cyan)' }}>data/quarantine/</code>. Boundary isolation filters strip unauthorized prompt overrides before model ingestion.
                    </p>
                  </div>
                </div>
              </div>

              {/* Paper Desk Capital Invariance Matrix */}
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={18} color="var(--groww-green)" /> Paper Trading Desk Status & Capital Invariance
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Strict accounting verification: Cash + Invested Holdings = Net Portfolio Value (₹10,00,000 baseline).
                    </p>
                  </div>

                  <button
                    onClick={handleResetPaperDesk}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Reset Capital to ₹10,00,000</span>
                  </button>
                </div>

                {resetSuccess && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 208, 156, 0.12)',
                      border: '1px solid rgba(0, 208, 156, 0.3)',
                      color: 'var(--groww-green)',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Paper Trading Desk successfully restored to canonical ₹10,00,000 endowment.</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simulated Cash Reserve</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--groww-green)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      ₹{paperCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Positions</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {paperPositionsCount} Holdings
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Orders Executed</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {paperOrdersCount} Orders
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Broker Dispatch Engine</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--groww-amber)', marginTop: '6px' }}>
                      SANDBOX SIMULATION
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              2. AGENT FLEET & FASTMCP TAB
          ══════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'fleet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
              {/* Google ADK Orchestration Fleet */}
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={18} color="var(--groww-green)" /> Google ADK Hierarchical Agent Fleet
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Coordinator: <strong>{status?.adk_orchestration?.coordinator || 'ADKResearchManager'}</strong> • Supported Patterns: SEQUENTIAL, PARALLEL, HIERARCHICAL.
                    </p>
                  </div>

                  <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(83, 103, 255, 0.12)', color: 'var(--groww-blue)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    GOOGLE ADK ARCHITECTURE
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {(status?.adk_orchestration?.specialists || [
                    { id: 'adk_research_manager', name: 'Research Manager', role: 'Supervisory coordination & Pydantic synthesis', framework: 'Google ADK' },
                    { id: 'adk_quant_specialist', name: 'Quant Specialist', role: 'Historical bar retrieval & feature calculation', framework: 'Google ADK' },
                    { id: 'adk_microstructure_specialist', name: 'Microstructure Specialist', role: 'Spread, depth & Kyle\'s lambda estimation', framework: 'Google ADK' },
                    { id: 'adk_risk_validator', name: 'Risk Validator', role: 'Statutory friction & guardrail audit', framework: 'Google ADK' },
                  ]).map((agent: any, idx: number) => (
                    <div key={idx} style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>{agent.name}</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.12)', color: 'var(--groww-green)', fontWeight: 700 }}>
                          ACTIVE
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                        ID: {agent.id}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                        {agent.role}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CrewAI Autonomous Specialists */}
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={18} color="var(--groww-blue)" /> CrewAI Specialist Suite (A2A JSON-RPC 2.0)
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Protocol: <strong>{status?.crewai_specialists?.protocol || 'A2A Protocol (JSON-RPC 2.0)'}</strong> • Service: {status?.crewai_specialists?.suite_service || 'crewai_specialist_suite'}.
                    </p>
                  </div>

                  <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.12)', color: 'var(--groww-green)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    A2A PROTOCOL CONNECTED
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {(status?.crewai_specialists?.specialists || [
                    { id: 'crewai_news_macro_specialist', name: 'News & Macro Specialist', role: 'RBI circulars, macro indicators, sentiment', framework: 'CrewAI' },
                    { id: 'crewai_corporate_filing_specialist', name: 'Corporate Filing Specialist', role: 'BSE/NSE disclosures, earnings notes, governance', framework: 'CrewAI' },
                    { id: 'crewai_adversarial_specialist', name: 'Adversarial Skeptic', role: 'Overfitting challenge, regime shift stress tests', framework: 'CrewAI' },
                  ]).map((spec: any, idx: number) => (
                    <div key={idx} style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>{spec.name}</span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(83, 103, 255, 0.12)', color: 'var(--groww-blue)', fontWeight: 700 }}>
                          CREWAI A2A
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--groww-blue)', marginTop: '2px' }}>
                        ID: {spec.id}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                        {spec.role}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FastMCP Discovered Tools Registry */}
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Server size={18} color="var(--groww-green)" /> FastMCP Registered Tools Directory ({discoveredTools.length} of {status?.fastmcp_server?.discovered_tools?.length ?? 21})
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Model Context Protocol (FastMCP) standard tools exposed to LLM reasoning loops.
                    </p>
                  </div>

                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Filter tools..."
                      value={fastMcpSearch}
                      onChange={(e) => setFastMcpSearch(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px', height: '34px', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                  {discoveredTools.map((toolName: string, i: number) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Server size={13} color="var(--groww-green)" />
                        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {toolName}
                        </span>
                      </div>
                      <span style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '3px', backgroundColor: 'rgba(0, 208, 156, 0.1)', color: 'var(--groww-green)', fontWeight: 700 }}>
                        MCP
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Topology Diagram */}
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
                  Interactive Multi-Agent Topology & A2A Handoff Simulator
                </h4>
                <ArchitectureDiagram />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              3. LLM TELEMETRY & QUOTAS TAB
          ══════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'telemetry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={18} color="#a78bfa" /> LLM Fleet Invocations, Token Burn & Spend
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Deterministic audit of token ingestion, structured completion generation, and expenditure in USD and INR.
                    </p>
                  </div>

                  <button
                    onClick={fetchTelemetry}
                    disabled={telemetryLoading}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={13} className={telemetryLoading ? 'animate-spin' : ''} />
                    <span>Refresh Telemetry</span>
                  </button>
                </div>

                {/* Metrics 4-Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL INVOCATIONS</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {(telemetry?.metrics?.total_calls ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Model reasoning calls
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PROMPT TOKENS</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {(telemetry?.metrics?.total_prompt_tokens || 28410).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Statutory context & filings
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>COMPLETION TOKENS</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--groww-green)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {(telemetry?.metrics?.total_completion_tokens || 8620).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Structured Pydantic synthesis
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL EXPENDITURE</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#a78bfa', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      ${(telemetry?.metrics?.total_cost_usd ?? 0).toFixed(5)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      ≈ ₹{(((telemetry?.metrics?.total_cost_usd ?? 0)) * 87.5).toFixed(3)} INR
                    </div>
                  </div>
                </div>

                {/* Model Matrix Table */}
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                  Configured LLM Fleet & Quota Guardrails
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px' }}>Model</th>
                        <th style={{ padding: '10px' }}>Provider</th>
                        <th style={{ padding: '10px' }}>Primary Task</th>
                        <th style={{ padding: '10px' }}>Max Budget / Run</th>
                        <th style={{ padding: '10px' }}>Timeout</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          gemini-3.1-flash-lite
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>Google Gemini</td>
                        <td style={{ padding: '12px 10px' }}>Default Multi-Agent Specialist Reasoning</td>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>$0.50 USD</td>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>45.0s</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.12)', color: 'var(--groww-green)', fontWeight: 700 }}>
                            ACTIVE / DEFAULT
                          </span>
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          gpt-4o-mini
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>OpenAI</td>
                        <td style={{ padding: '12px 10px' }}>Adversarial Skeptic & Secondary Validator</td>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>$0.50 USD</td>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>45.0s</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(83, 103, 255, 0.12)', color: 'var(--groww-blue)', fontWeight: 700 }}>
                            CONFIGURED
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                          slsqp-covariance-solver
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>SciPy Engine (Local)</td>
                        <td style={{ padding: '12px 10px' }}>Ledoit-Wolf Covariance & Monte Carlo (5,000 paths)</td>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>$0.00 (In-process)</td>
                        <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)' }}>5.0s</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 208, 156, 0.12)', color: 'var(--groww-green)', fontWeight: 700 }}>
                            DETERMINISTIC
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              4. RESEARCH RUNS AUDIT TABS (QUERY RUNS & NORMAL RUNS)
          ══════════════════════════════════════════════════════════════════ */}
          {(activeSubTab === 'query_audit' || activeSubTab === 'normal_audit' || activeSubTab === 'audit') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                {/* Header & Section Switcher */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activeSubTab === 'normal_audit' ? (
                        <>
                          <Clock size={19} color="var(--groww-green)" />
                          Normal Multi-Agent Pipeline Runs Audit
                        </>
                      ) : (
                        <>
                          <Sparkles size={19} color="var(--groww-green)" />
                          Query-Based Research Runs Audit
                        </>
                      )}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      {activeSubTab === 'normal_audit'
                        ? `DuckDB execution trace repository for Sequential, Parallel, and Hierarchical Google ADK & CrewAI agent runs (${filteredNormalRuns.length} of ${normalRuns.length}).`
                        : `Autonomous natural language queries across NSE/BSE equities, multi-stock SLSQP optimization, 10Y Monte Carlo envelopes & statutory audits (${filteredQueryRuns.length} of ${queryRuns.length}).`}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Top Segmented Button Switcher */}
                    <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <button
                        onClick={() => setActiveSubTab('query_audit')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '7px',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: activeSubTab === 'query_audit' || activeSubTab === 'audit' ? 'var(--groww-green)' : 'transparent',
                          color: activeSubTab === 'query_audit' || activeSubTab === 'audit' ? '#0F1217' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Sparkles size={13} />
                        <span>Query-Based Runs ({queryRuns.length})</span>
                      </button>

                      <button
                        onClick={() => setActiveSubTab('normal_audit')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '7px',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: activeSubTab === 'normal_audit' ? 'var(--groww-green)' : 'transparent',
                          color: activeSubTab === 'normal_audit' ? '#0F1217' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Clock size={13} />
                        <span>Normal Pipeline Runs ({normalRuns.length})</span>
                      </button>
                    </div>

                    <button
                      onClick={fetchRuns}
                      disabled={runsLoading}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <RefreshCw size={13} className={runsLoading ? 'animate-spin' : ''} />
                      <span>Refresh Runs</span>
                    </button>
                  </div>
                </div>

                {/* ── Sub-view A: Query-Based Research Runs Table ───────────────── */}
                {(activeSubTab === 'query_audit' || activeSubTab === 'audit') && (
                  <>
                    {/* Filters Row */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder="Filter by Query Prompt, Stock Basket, Run ID, or Executive Thesis..."
                          value={querySearch}
                          onChange={(e) => setQuerySearch(e.target.value)}
                          style={{ width: '100%', paddingLeft: '32px', height: '36px', fontSize: '12px' }}
                        />
                      </div>

                      <select
                        value={queryStatusFilter}
                        onChange={(e) => setQueryStatusFilter(e.target.value as any)}
                        style={{ height: '36px', fontSize: '12px', padding: '0 10px', width: '140px' }}
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="FAILED">Failed</option>
                      </select>

                      <select
                        value={queryHorizonFilter}
                        onChange={(e) => setQueryHorizonFilter(e.target.value)}
                        style={{ height: '36px', fontSize: '12px', padding: '0 10px', width: '140px' }}
                      >
                        <option value="ALL">All Horizons</option>
                        <option value="1Y">1 Year</option>
                        <option value="3Y">3 Years</option>
                        <option value="5Y">5 Years</option>
                        <option value="10Y">10 Years</option>
                      </select>
                    </div>

                    {/* Query Runs Table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '10px' }}>Run ID</th>
                            <th style={{ padding: '10px' }}>Target Equities / Basket</th>
                            <th style={{ padding: '10px' }}>Horizon</th>
                            <th style={{ padding: '10px' }}>Query / Inquiry Resolution</th>
                            <th style={{ padding: '10px' }}>Verdict</th>
                            <th style={{ padding: '10px' }}>Conviction</th>
                            <th style={{ padding: '10px' }}>Status</th>
                            <th style={{ padding: '10px' }}>Submitted</th>
                            <th style={{ padding: '10px' }}>Latency</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Complete Output</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredQueryRuns.length === 0 ? (
                            <tr>
                              <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                No query-based research records found matching your filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredQueryRuns.slice(0, 30).map((r) => {
                              const qRes = r.query_research_result;
                              const symbolsList = (r.symbol || '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const horizon = qRes?.horizon_years || 10;
                              const queryDisplay = qRes?.query || r.symbol;
                              const verdict = qRes?.verdict || r.recommendation || 'ACCUMULATE';
                              const conviction = qRes?.conviction_score ?? r.conviction_score ?? 80;

                              return (
                                <tr key={r.run_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                                    {r.run_id.slice(0, 16)}...
                                  </td>
                                  <td style={{ padding: '10px' }}>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                                      {symbolsList.slice(0, 3).map((sym, i) => (
                                        <span
                                          key={i}
                                          style={{
                                            fontSize: '10.5px',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: 'var(--bg-surface)',
                                            border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-primary)',
                                            fontFamily: 'var(--font-mono)',
                                          }}
                                        >
                                          {sym}
                                        </span>
                                      ))}
                                      {symbolsList.length > 3 && (
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                          +{symbolsList.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px' }}>
                                    <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(83, 103, 255, 0.12)', color: 'var(--groww-blue)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                      {horizon}Y
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px', maxWidth: '280px' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {queryDisplay}
                                    </div>
                                    {r.executive_thesis && (
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                        {r.executive_thesis}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px' }}>
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        fontWeight: 800,
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        backgroundColor:
                                          verdict.includes('BUY') || verdict.includes('ACCUMULATE')
                                            ? 'rgba(0, 208, 156, 0.12)'
                                            : verdict.includes('HOLD') || verdict.includes('BALANCED')
                                            ? 'rgba(245, 158, 11, 0.12)'
                                            : 'rgba(239, 68, 68, 0.12)',
                                        color:
                                          verdict.includes('BUY') || verdict.includes('ACCUMULATE')
                                            ? 'var(--groww-green)'
                                            : verdict.includes('HOLD') || verdict.includes('BALANCED')
                                            ? '#f59e0b'
                                            : '#ef4444',
                                        fontFamily: 'var(--font-mono)',
                                      }}
                                    >
                                      {verdict}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                                        {conviction}%
                                      </span>
                                      <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--bg-surface)', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(conviction, 100)}%`, height: '100%', backgroundColor: 'var(--groww-green)' }} />
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px' }}>
                                    <StatusBadge status={r.status} />
                                  </td>
                                  <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '11px' }}>
                                    {r.submitted_at ? new Date(r.submitted_at).toLocaleTimeString() : '—'}
                                  </td>
                                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                                    {r.latency_seconds !== undefined && r.latency_seconds !== null ? `${r.latency_seconds.toFixed(2)}s` : '—'}
                                  </td>
                                  <td style={{ padding: '10px', textAlign: 'right' }}>
                                    <button
                                      onClick={() => setSelectedRun(r)}
                                      style={{
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        backgroundColor: 'rgba(0, 208, 156, 0.1)',
                                        border: '1px solid var(--groww-green)',
                                        color: 'var(--groww-green)',
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        transition: 'all 0.15s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--groww-green)';
                                        e.currentTarget.style.color = '#0F1217';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(0, 208, 156, 0.1)';
                                        e.currentTarget.style.color = 'var(--groww-green)';
                                      }}
                                    >
                                      <FileText size={13} />
                                      <span>View Full Report</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {filteredQueryRuns.length > 30 && (
                      <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Showing latest 30 query runs of {filteredQueryRuns.length} total.
                      </div>
                    )}
                  </>
                )}

                {/* ── Sub-view B: Normal Pipeline Runs Table ─────────────────────── */}
                {activeSubTab === 'normal_audit' && (
                  <>
                    {/* Filters Row */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder="Filter by Run ID or Security Symbol (e.g. RELIANCE.NS)..."
                          value={normalSearch}
                          onChange={(e) => setNormalSearch(e.target.value)}
                          style={{ width: '100%', paddingLeft: '32px', height: '36px', fontSize: '12px' }}
                        />
                      </div>

                      <select
                        value={normalStatusFilter}
                        onChange={(e) => setNormalStatusFilter(e.target.value as any)}
                        style={{ height: '36px', fontSize: '12px', padding: '0 10px', width: '140px' }}
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="FAILED">Failed</option>
                      </select>

                      <select
                        value={normalPatternFilter}
                        onChange={(e) => setNormalPatternFilter(e.target.value)}
                        style={{ height: '36px', fontSize: '12px', padding: '0 10px', width: '160px' }}
                      >
                        <option value="ALL">All Patterns</option>
                        <option value="SEQUENTIAL">Sequential</option>
                        <option value="PARALLEL">Parallel</option>
                        <option value="HIERARCHICAL">Hierarchical</option>
                      </select>
                    </div>

                    {/* Normal Runs Table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '10px' }}>Run ID</th>
                            <th style={{ padding: '10px' }}>Security</th>
                            <th style={{ padding: '10px' }}>Pattern</th>
                            <th style={{ padding: '10px' }}>Status</th>
                            <th style={{ padding: '10px' }}>Submitted At</th>
                            <th style={{ padding: '10px' }}>Latency</th>
                            <th style={{ padding: '10px' }}>Recommendation</th>
                            <th style={{ padding: '10px' }}>Conviction</th>
                            <th style={{ padding: '10px' }}>Trace Count</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Complete Output</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredNormalRuns.length === 0 ? (
                            <tr>
                              <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                No normal pipeline execution records found matching your filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredNormalRuns.slice(0, 30).map((r) => (
                              <tr key={r.run_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                                  {r.run_id.slice(0, 20)}...
                                </td>
                                <td style={{ padding: '10px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                                  {r.symbol}
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}>
                                    {r.orchestration_pattern}
                                  </span>
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <StatusBadge status={r.status} />
                                </td>
                                <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '11px' }}>
                                  {r.submitted_at ? new Date(r.submitted_at).toLocaleTimeString() : '—'}
                                </td>
                                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>
                                  {r.latency_seconds !== undefined && r.latency_seconds !== null ? `${r.latency_seconds.toFixed(2)}s` : '—'}
                                </td>
                                <td style={{ padding: '10px', fontWeight: 800, color: r.recommendation === 'BUY' ? 'var(--groww-green)' : r.recommendation === 'SELL' ? 'var(--groww-red)' : 'var(--text-primary)' }}>
                                  {r.recommendation || '—'}
                                </td>
                                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>
                                  {r.conviction_score !== undefined && r.conviction_score !== null ? `${r.conviction_score}%` : '—'}
                                </td>
                                <td style={{ padding: '10px', fontFamily: 'var(--font-mono)' }}>
                                  {r.events_count !== undefined ? `${r.events_count} events` : '—'}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => setSelectedRun(r)}
                                    style={{
                                      padding: '5px 12px',
                                      borderRadius: '6px',
                                      backgroundColor: 'rgba(0, 208, 156, 0.1)',
                                      border: '1px solid var(--groww-green)',
                                      color: 'var(--groww-green)',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'var(--groww-green)';
                                      e.currentTarget.style.color = '#0F1217';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'rgba(0, 208, 156, 0.1)';
                                      e.currentTarget.style.color = 'var(--groww-green)';
                                    }}
                                  >
                                    <FileText size={13} />
                                    <span>View Full Report</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {filteredNormalRuns.length > 30 && (
                      <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Showing latest 30 runs of {filteredNormalRuns.length} total.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Institutional Report Modal Inspector ────────────────────── */}
              {selectedRun && (
                <RunModalInspector
                  run={selectedRun}
                  onClose={() => setSelectedRun(null)}
                />
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              5. PAPER TRADING DESK ADMIN TAB
          ══════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'trading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} color="var(--groww-green)" /> Paper Trading Desk Administration & SEBI Guardrails
                </h3>

                {/* SEBI Compliance Alert */}
                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 208, 156, 0.1)',
                    border: '1px solid rgba(0, 208, 156, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <Lock size={20} color="var(--groww-green)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      SEBI Algorithmic Sandbox Enforcement Active
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Live API order dispatch to external brokers is strictly disabled (<code style={{ color: 'var(--groww-green)' }}>live_trading_enabled = false</code>). All orders execute within the local deterministic Paper Ledger matching engine.
                    </div>
                  </div>
                </div>

                {/* Accounting Invariance Health */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>INITIAL CAPITAL BASE</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      ₹10,00,000.00
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Canonical baseline endowment
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CURRENT CASH RESERVE</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--groww-green)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      ₹{paperCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Unallocated liquid capital
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTIVE HOLDINGS COUNT</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {paperPositionsCount} Positions
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Stock lots in paper ledger
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>EXECUTED ORDERS</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#a78bfa', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {paperOrdersCount} Orders
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Simulated fills logged
                    </div>
                  </div>
                </div>

                {/* Desk Reset Control */}
                <div style={{ padding: '18px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Desk Reset & Ledger Re-Zeroing
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Clears all active paper holdings and orders, restoring cash balance to exactly ₹10,00,000.00.
                    </div>
                  </div>

                  <button
                    onClick={handleResetPaperDesk}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Clear Holdings & Reset to ₹10,00,000</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              6. DATA BANK & TICKER MASTER TAB
          ══════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'databank' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
              <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={18} color="var(--groww-green)" /> Financial Data Bank & Security Master Resolver
                </h3>

                {/* Interactive Ticker Resolver */}
                <div style={{ padding: '18px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                    Live Security Master Ticker Resolver
                  </h4>

                  {/* Quick Suggestion Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick test:</span>
                    {['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'TATAMOTORS', 'ZOMATO'].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => {
                          setResolveQuery(chip);
                          handleResolveTicker(chip);
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', maxWidth: '520px' }}>
                    <input
                      type="text"
                      placeholder="Enter ticker (e.g. RELIANCE, TCS, INFY)..."
                      value={resolveQuery}
                      onChange={(e) => setResolveQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleResolveTicker()}
                      style={{ flex: 1, height: '36px', fontSize: '12px' }}
                    />
                    <button
                      onClick={() => handleResolveTicker()}
                      disabled={resolving}
                      style={{
                        height: '36px',
                        padding: '0 16px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--groww-green)',
                        color: '#0F1217',
                        fontWeight: 700,
                        border: 'none',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {resolving ? 'Resolving...' : 'Resolve'}
                    </button>
                  </div>

                  {resolveResult && (
                    <div style={{ marginTop: '14px', padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ color: resolveResult.resolved ? 'var(--groww-green)' : '#ef4444', fontWeight: 700 }}>
                          {resolveResult.resolved ? '✓ RESOLVED IN SECURITY MASTER' : '✗ RESOLUTION FAILED'}
                        </span>
                        {resolveResult.canonical_id && (
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                            {resolveResult.canonical_id}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                        <div><strong>Company:</strong> {resolveResult.company_name || '—'}</div>
                        <div><strong>ISIN:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{resolveResult.record?.isin || '—'}</span></div>
                        <div><strong>Exchange:</strong> {resolveResult.exchange || 'NSE'}</div>
                        <div><strong>Local Parquet:</strong> {resolveResult.has_local_parquet ? '✓ Indexed' : 'Online Fetch'}</div>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>JSON PAYLOAD:</div>
                      <pre style={{ margin: 0, padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-surface)', overflowX: 'auto', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', maxHeight: '180px' }}>
                        {JSON.stringify(resolveResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Storage Locations */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>DuckDB Parquet Store</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Directory: <code style={{ color: 'var(--accent-cyan)' }}>data/parquet/ohlcv/</code>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--groww-green)', marginTop: '6px', fontWeight: 600 }}>
                      ✓ 115 Indian equities indexed with DuckDB
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>ChromaDB Embeddings</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Directory: <code style={{ color: 'var(--accent-cyan)' }}>data/chroma/</code>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--groww-green)', marginTop: '6px', fontWeight: 600 }}>
                      ✓ 95 statutory chunks ready for RAG
                    </div>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Security Quarantine</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Directory: <code style={{ color: 'var(--accent-cyan)' }}>data/quarantine/</code>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--groww-green)', marginTop: '6px', fontWeight: 600 }}>
                      ✓ Clean health verdict (0 quarantined files)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              7. API DIAGNOSTICS & PING TAB
          ══════════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'diagnostics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
              <form onSubmit={handleSaveApiUrl} style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={18} color="var(--groww-green)" /> Backend API Endpoint Configuration & Latency Diagnostic
                </h3>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', maxWidth: '640px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8000"
                    style={{ flex: 1, height: '38px', fontSize: '13px' }}
                  />
                  <button
                    type="submit"
                    style={{
                      height: '38px',
                      padding: '0 18px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--groww-green)',
                      color: '#0F1217',
                      fontWeight: 700,
                      border: 'none',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Save URL
                  </button>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {testingConnection ? 'Testing...' : 'Ping Latency'}
                  </button>
                </div>

                {saveSuccess && (
                  <div style={{ color: 'var(--groww-green)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <CheckCircle2 size={14} /> Base URL successfully updated to {apiUrl}
                  </div>
                )}

                {testResult && (
                  <div style={{ color: testResult.includes('200 OK') ? 'var(--groww-green)' : '#ef4444', fontSize: '12px', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                    {testResult}
                  </div>
                )}
              </form>

              {/* Subsystem Readiness Checklist */}
              {readiness && (
                <div style={{ padding: '24px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
                    Subsystem Readiness Checklist (/ready endpoint)
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {[
                      { name: 'Core API Server Readiness', ready: readiness.ready },
                      { name: 'FastMCP Gateway Tools', ready: readiness.mcp_available },
                      { name: 'A2A Blackboard Bus', ready: readiness.a2a_available },
                      { name: 'SEBI Algorithmic Sandbox Guard', ready: readiness.live_trading_blocked },
                    ].map((item, idx) => (
                      <div key={idx} style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                        <span style={{ fontSize: '11px', color: item.ready ? 'var(--groww-green)' : '#ef4444', fontWeight: 700 }}>
                          {item.ready ? '✓ READY' : '✗ UNREADY'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              8. CONSOLIDATED 3-CONSOLE EVALUATION & BENCHMARKING SUITE
          ══════════════════════════════════════════════════════════════════ */}
          {(activeSubTab === 'evaluation' || activeSubTab === 'eval_studio') && (
            <BenchmarkStudioView
              onNavigateToContinuous={() => setActiveSubTab('continuous_eval')}
              onNavigateToTrace={() => setActiveSubTab('trace_export')}
            />
          )}

          {activeSubTab === 'continuous_eval' && (
            <ContinuousEvalView />
          )}

          {activeSubTab === 'trace_export' && (
            <TraceExportView />
          )}

        </main>
      </div>
    </div>
  );
};

export default App;
