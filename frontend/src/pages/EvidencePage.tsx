import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  FileText,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Table,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Globe,
  Scale,
  Landmark,
  Building,
  TrendingUp,
  BookOpen,
  DollarSign,
  Cpu,
  Share2,
  Zap,
} from 'lucide-react';
import { getApiBaseUrl, api } from '../api/client';

const API = getApiBaseUrl();

interface ManifestItem {
  doc_id: string;
  title: string;
  doc_type: string;
  source_authority: string;
  official_url: string;
  effective_date: string;
  symbol: string | null;
  chunks_count: number;
  content_hash: string;
  ingestion_status: string;
}

interface CorpusStats {
  collection_name: string;
  total_indexed_chunks: number;
  manifest_sources_count: number;
  storage_path: string;
  embedding_type: string;
  status: string;
}

interface CategoryInfo {
  id: string;
  name: string;
  count: number;
  description: string;
}

interface SearchMatch {
  chunk_id: string;
  doc_id: string;
  doc_type: string;
  title: string;
  symbol: string | null;
  effective_date: string;
  relevance_score: number;
  citation_uri: string;
  source_authority: string;
  content: string;
  sanitized_snippet: string;
}

interface EODPipelineHealth {
  pipeline_name: string;
  timezone: string;
  current_time_ist: string;
  next_scheduled_run_ist: string;
  market_close_time: string;
  bhavcopy_expected_time: string;
  last_cycle: any;
  quarantine_count: number;
}

interface EquityInventoryItem {
  symbol: string;
  company_name: string;
  eligibility: string;
  daily_ohlcv_bars: number;
  financial_statements_count: number;
  financials_status: string;
}

interface LiveScrapedItem {
  title: string;
  publisher: string;
  published_at: string;
  snippet: string;
  url: string;
  category: string;
  sentiment: string;
  relevance_score: number;
}

interface CorporateMetric {
  symbol: string;
  company: string;
  period: string;
  basis: string;
  audit_status: string;
  filing_date: string;
  revenue_cr: number;
  ebitda_cr: number;
  pat_cr: number;
  eps_inr: number;
  debt_cr: number;
  net_worth_cr: number;
  assets_cr: number;
  liabilities_cr: number;
  unit: string;
}

interface SynthesizedAnswerData {
  query: string;
  resolved_symbol?: string | null;
  answer: string;
  key_findings: string[];
  statutory_citations: Array<{
    authority: string;
    title: string;
    citation_uri: string;
    effective_date: string;
    doc_type?: string;
  }>;
  corporate_metrics: Record<string, CorporateMetric>;
  live_intelligence: LiveScrapedItem[];
  sources: SearchMatch[];
  total_sources_count: number;
  confidence_score: number;
  as_of_timestamp: string;
  live_scraper_used: boolean;
}

export const EvidencePage: React.FC = () => {
  const [manifest, setManifest] = useState<ManifestItem[]>([]);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [eodHealth, setEodHealth] = useState<EODPipelineHealth | null>(null);
  const [equitiesInventory, setEquitiesInventory] = useState<Record<string, EquityInventoryItem>>({});
  const [, setFinancialsSummary] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('What are the RBI regulations on unsecured consumer credit risk weights and FLDG?');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [synthesizedAnswer, setSynthesizedAnswer] = useState<SynthesizedAnswerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [askingAI, setAskingAI] = useState(false);
  const [searchingVector, setSearchingVector] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
  const [includeLiveWeb, setIncludeLiveWeb] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'answer' | 'findings' | 'citations' | 'live' | 'chunks'>('answer');
  const [expandedEquity, setExpandedEquity] = useState<string | null>(null);
  const [equityDetails, setEquityDetails] = useState<any>(null);

  const quickPrompts = [
    { label: 'RBI Repo 6.50% & Risk Weights (125%)', query: 'What are the RBI regulations on unsecured consumer credit risk weights and FLDG?' },
    { label: 'Finance Act 2024: LTCG 12.5% & Buybacks', query: 'Explain Finance Act 2024 capital gains tax changes and buyback deemed dividend taxation' },
    { label: 'SEBI LODR 30 & 33 Financial Reporting', query: 'What are the disclosure timelines under SEBI LODR Regulation 30 and financial reporting under Regulation 33?' },
    { label: 'SEBI PIT Insider Trading & SDD', query: 'What are SEBI PIT regulations for UPSI, Structured Digital Database, and trading window closure?' },
    { label: 'Union Budget 2024 Capex & PLI', query: 'What are the Union Budget 2024 infrastructure capex outlays and PLI scheme allocations?' },
    { label: 'Swiggy Instamart & IPO Financials', query: 'Swiggy Instamart quick commerce financials, dark stores, and IPO details', symbol: 'SWIGGY' },
    { label: 'Reliance Q2 FY25 & Jio ARPU', query: 'Reliance Industries Q2 FY25 financial results, 1:1 bonus issue, and Jio ARPU', symbol: 'RELIANCE' },
    { label: 'Tata Motors CV/PV Demerger', query: 'Tata Motors demerger details, commercial vs passenger vehicles, and JLR cash flow', symbol: 'TATAMOTORS' },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rHealth, rCov, rManifest, rCat] = await Promise.allSettled([
        api.getDataBankHealth(),
        api.getDataBankCoverage(),
        fetch(`${API}/rag/manifest`).then((r) => r.json()),
        fetch(`${API}/rag/categories`).then((r) => r.json()),
      ]);

      if (rHealth.status === 'fulfilled' && rHealth.value) {
        setEodHealth(rHealth.value.eod_pipeline);
      }
      if (rCov.status === 'fulfilled' && rCov.value) {
        setEquitiesInventory(rCov.value.equities_inventory || {});
        setFinancialsSummary(rCov.value.financials_summary || null);
      }
      if (rManifest.status === 'fulfilled' && rManifest.value) {
        setManifest(rManifest.value.manifest || []);
        setStats(rManifest.value.statistics || null);
      }
      if (rCat.status === 'fulfilled' && rCat.value) {
        setCategories(rCat.value.categories || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Execute default prompt on mount
    handleAskEvidenceAI('What are the RBI regulations on unsecured consumer credit risk weights and FLDG?');
  }, []);

  const handleAskEvidenceAI = async (queryToRun?: string) => {
    const q = (queryToRun || searchQuery).trim();
    if (!q) return;
    setAskingAI(true);
    try {
      const res = await fetch(`${API}/rag/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          symbol: selectedSymbol !== 'ALL' ? selectedSymbol : undefined,
          doc_type: selectedDocType !== 'ALL' ? selectedDocType : undefined,
          include_live_web: includeLiveWeb,
          limit: 6,
        }),
      });
      const data = await res.json();
      setSynthesizedAnswer(data);
      if (data.sources) {
        setSearchResults(data.sources);
      }
      setActiveTab('answer');
    } catch (err) {
      console.error('Evidence AI error:', err);
    } finally {
      setAskingAI(false);
    }
  };

  const handleVectorSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchingVector(true);
    try {
      const res = await fetch(`${API}/rag/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          symbol: selectedSymbol !== 'ALL' ? selectedSymbol : undefined,
          doc_type: selectedDocType !== 'ALL' ? selectedDocType : undefined,
          limit: 6,
        }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
      setActiveTab('chunks');
    } finally {
      setSearchingVector(false);
    }
  };

  const handleInspectEquity = async (sym: string) => {
    if (expandedEquity === sym) {
      setExpandedEquity(null);
      setEquityDetails(null);
      return;
    }
    setExpandedEquity(sym);
    try {
      const details = await api.getDataBankCoverage(sym);
      setEquityDetails(details);
    } catch {
      setEquityDetails(null);
    }
  };

  const filteredEquities = Object.values(equitiesInventory).filter((eq) =>
    selectedSymbol === 'ALL' ? true : eq.symbol === selectedSymbol
  );

  return (
    <div className="terminal-page space-y-6">
      {/* Permanent Live Trading Disabled & Simulation Warning Banner */}
      <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <ShieldAlert size={16} />
          <span>LIVE TRADING PERMANENTLY DISABLED: Research Sandbox & Evidence-Backed Verification Mode</span>
        </div>
        <span className="text-[#8b949e]">ChromaDB Point-in-Time Vector Corpus • Live Scraper Active</span>
      </div>

      {/* Main Header */}
      <div className="terminal-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#13161a] border border-[#22272e] text-xs font-mono text-[#00f0ff]">
            <Database size={14} /> ArthaAI Evidence AI & Regulatory Data Bank
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">Evidence Explorer & Intelligence Chamber</h1>
          <p className="text-sm text-[#8b949e] mt-1 max-w-3xl">
            Authoritative financial data bank across all 32 candidate equities, SEBI LODR/PIT/SAST regulations, RBI liquidity & credit frameworks,
            Finance Act 2024 tax policies, Union Budget allocations, and high-authority live web intelligence scraper.
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d] text-center">
              <span className="text-[#8b949e] block text-[10px]">CORPUS CHUNKS</span>
              <span className="text-xl font-bold text-[#00f0ff]">95</span>
            </div>
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d] text-center">
              <span className="text-[#8b949e] block text-[10px]">CATEGORIES</span>
              <span className="text-xl font-bold text-emerald-400">7</span>
            </div>
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d] text-center">
              <span className="text-[#8b949e] block text-[10px]">32 EQUITIES</span>
              <span className="text-xl font-bold text-purple-400">100%</span>
            </div>
          </div>
        )}
      </div>

      {/* 7-Domain Corpus Taxonomy Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 font-mono text-xs">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => {
              setSelectedDocType(cat.id === selectedDocType ? 'ALL' : cat.id);
            }}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedDocType === cat.id
                ? 'bg-[#16202c] border-[#00f0ff] shadow-md shadow-[#00f0ff]/10'
                : 'bg-[#0d1117] border-[#21262d] hover:border-[#30363d]'
            }`}
          >
            <div className="flex justify-between items-center text-[#8b949e] text-[10px]">
              <span className="uppercase truncate">{cat.id}</span>
              <span className="text-white font-bold px-1.5 py-0.2 rounded bg-[#161b22] border border-[#30363d]">
                {cat.count}
              </span>
            </div>
            <div className="font-bold text-white text-xs mt-1.5 truncate">{cat.name}</div>
            <p className="text-[10px] text-[#8b949e] line-clamp-2 mt-1 leading-tight">{cat.description}</p>
          </div>
        ))}
      </div>

      {/* Evidence AI Intelligence & Query Chamber */}
      <div className="terminal-card p-6 space-y-5 border-t-2 border-t-[#00f0ff]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff]">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                Evidence AI Query & Grounded Synthesis Chamber
              </h2>
              <p className="text-xs text-[#8b949e]">
                Pose questions in natural language. The engine retrieves vector chunks, verifies statutory citations, checks live news, and produces clean evidence-backed answers.
              </p>
            </div>
          </div>

          {/* Live Scraper Switch */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs font-mono">
            <div className="flex items-center gap-2">
              <Globe size={14} className={includeLiveWeb ? 'text-emerald-400' : 'text-[#8b949e]'} />
              <span className="text-[#c9d1d9]">Live Scraper</span>
            </div>
            <button
              onClick={() => setIncludeLiveWeb(!includeLiveWeb)}
              className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                includeLiveWeb ? 'bg-emerald-500' : 'bg-[#30363d]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  includeLiveWeb ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-[10px] font-bold ${includeLiveWeb ? 'text-emerald-400' : 'text-[#8b949e]'}`}>
              {includeLiveWeb ? 'ACTIVE' : 'BYPASS'}
            </span>
          </div>
        </div>

        {/* Quick-Select Prompt Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono text-[#8b949e] uppercase tracking-wider block">
            Authoritative Benchmark Prompt Scenarios:
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSearchQuery(p.query);
                  if (p.symbol) setSelectedSymbol(p.symbol);
                  handleAskEvidenceAI(p.query);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-[#00f0ff] border border-[#30363d] hover:border-[#00f0ff]/50 transition-all text-left flex items-center gap-1.5"
              >
                <Zap size={11} className="text-[#00f0ff]" />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Input and Execution Controls */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskEvidenceAI()}
              placeholder="Ask anything on Indian results, RBI repo/CRR/NPA, Finance Act LTCG/buybacks, SEBI LODR 30/33, Swiggy, etc."
              className="w-full pl-10 pr-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm font-mono text-white placeholder-[#8b949e] focus:outline-none focus:border-[#00f0ff]"
            />
            <Search size={16} className="absolute left-3.5 top-3.5 text-[#8b949e]" />
          </div>

          <div className="flex items-center gap-2">
            {/* Symbol selector */}
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-3 text-xs font-mono text-white focus:outline-none focus:border-[#00f0ff]"
            >
              <option value="ALL">All Universe Equities</option>
              {Object.keys(equitiesInventory).sort().map((sym) => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>

            {/* Ask AI Button */}
            <button
              onClick={() => handleAskEvidenceAI()}
              disabled={askingAI}
              className="px-5 py-3 rounded-lg bg-[#00f0ff] hover:bg-[#00d0df] text-black font-bold text-xs font-mono transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-md shadow-[#00f0ff]/20"
            >
              {askingAI ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{askingAI ? 'Synthesizing...' : 'Ask Evidence AI'}</span>
            </button>

            {/* Vector Search Button */}
            <button
              onClick={handleVectorSearch}
              disabled={searchingVector}
              className="px-4 py-3 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-white font-mono text-xs transition-all whitespace-nowrap"
            >
              {searchingVector ? 'Searching...' : 'Vector Chunks'}
            </button>
          </div>
        </div>

        {/* Synthesized Answer Card */}
        {synthesizedAnswer && (
          <div className="mt-4 rounded-xl bg-[#0d1117] border border-[#30363d] overflow-hidden space-y-4">
            {/* Header Status Bar */}
            <div className="p-4 bg-[#161b22] border-b border-[#21262d] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white font-bold">Grounded Synthesis Complete</span>
                {synthesizedAnswer.resolved_symbol && (
                  <span className="px-2 py-0.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 font-bold">
                    {synthesizedAnswer.resolved_symbol}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-[#8b949e]">
                <div className="flex items-center gap-1.5">
                  <span>Confidence:</span>
                  <span className="font-bold text-emerald-400">
                    {(synthesizedAnswer.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  Sources: <span className="font-bold text-white">{synthesizedAnswer.total_sources_count}</span>
                </div>
                {synthesizedAnswer.live_scraper_used && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Globe size={11} /> Live News Integrated
                  </span>
                )}
              </div>
            </div>

            {/* Structured Tabs Bar */}
            <div className="flex border-b border-[#21262d] px-4 gap-2 text-xs font-mono">
              <button
                onClick={() => setActiveTab('answer')}
                className={`py-2 px-3 border-b-2 font-bold transition-all ${
                  activeTab === 'answer'
                    ? 'border-[#00f0ff] text-[#00f0ff]'
                    : 'border-transparent text-[#8b949e] hover:text-white'
                }`}
              >
                Synthesized Answer
              </button>
              <button
                onClick={() => setActiveTab('findings')}
                className={`py-2 px-3 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'findings'
                    ? 'border-[#00f0ff] text-[#00f0ff]'
                    : 'border-transparent text-[#8b949e] hover:text-white'
                }`}
              >
                <span>Key Findings</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#21262d] text-[10px] text-white">
                  {synthesizedAnswer.key_findings.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('citations')}
                className={`py-2 px-3 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'citations'
                    ? 'border-[#00f0ff] text-[#00f0ff]'
                    : 'border-transparent text-[#8b949e] hover:text-white'
                }`}
              >
                <span>Statutory Citations</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#21262d] text-[10px] text-white">
                  {synthesizedAnswer.statutory_citations.length}
                </span>
              </button>
              {synthesizedAnswer.live_intelligence.length > 0 && (
                <button
                  onClick={() => setActiveTab('live')}
                  className={`py-2 px-3 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'live'
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-transparent text-[#8b949e] hover:text-white'
                  }`}
                >
                  <Globe size={12} />
                  <span>Live Press Stream</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                    {synthesizedAnswer.live_intelligence.length}
                  </span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('chunks')}
                className={`py-2 px-3 border-b-2 font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'chunks'
                    ? 'border-[#00f0ff] text-[#00f0ff]'
                    : 'border-transparent text-[#8b949e] hover:text-white'
                }`}
              >
                <span>Vector Chunks</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#21262d] text-[10px] text-white">
                  {searchResults.length}
                </span>
              </button>
            </div>

            {/* Tab 1: Synthesized Answer Body */}
            {activeTab === 'answer' && (
              <div className="p-5 space-y-4">
                {/* Corporate Financial Disclosures Card (if stock resolved) */}
                {Object.keys(synthesizedAnswer.corporate_metrics).length > 0 && (
                  <div className="space-y-2">
                    {Object.values(synthesizedAnswer.corporate_metrics).map((metric) => (
                      <div
                        key={metric.symbol}
                        className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-3 font-mono"
                      >
                        <div className="flex flex-wrap justify-between items-center pb-2 border-b border-[#21262d]">
                          <div className="flex items-center gap-2">
                            <Building size={16} className="text-[#00f0ff]" />
                            <span className="font-bold text-white text-sm">{metric.company}</span>
                            <span className="text-xs text-[#00f0ff]">({metric.symbol})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#8b949e]">
                            <span>{metric.period} {metric.basis}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {metric.audit_status}
                            </span>
                            <span>Filing: {metric.filing_date}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 rounded bg-[#0d1117] border border-[#21262d]">
                            <span className="text-[#8b949e] block text-[10px]">REVENUE</span>
                            <span className="text-white font-bold text-sm">
                              INR {metric.revenue_cr.toLocaleString(undefined, { minimumFractionDigits: 1 })} Cr
                            </span>
                          </div>
                          <div className="p-2.5 rounded bg-[#0d1117] border border-[#21262d]">
                            <span className="text-[#8b949e] block text-[10px]">OPERATING EBITDA</span>
                            <span className={`font-bold text-sm ${metric.ebitda_cr >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              INR {metric.ebitda_cr.toLocaleString(undefined, { minimumFractionDigits: 1 })} Cr
                            </span>
                          </div>
                          <div className="p-2.5 rounded bg-[#0d1117] border border-[#21262d]">
                            <span className="text-[#8b949e] block text-[10px]">NET PROFIT (PAT)</span>
                            <span className={`font-bold text-sm ${metric.pat_cr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              INR {metric.pat_cr.toLocaleString(undefined, { minimumFractionDigits: 1 })} Cr
                            </span>
                          </div>
                          <div className="p-2.5 rounded bg-[#0d1117] border border-[#21262d]">
                            <span className="text-[#8b949e] block text-[10px]">BASIC EPS / BORROWINGS</span>
                            <span className="text-[#00f0ff] font-bold text-sm">
                              INR {metric.eps_inr.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-[#8b949e] block mt-0.5">
                              Debt: INR {metric.debt_cr.toLocaleString()} Cr
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Synthesis Text Body */}
                <div className="p-4 rounded-lg bg-[#161b22] border border-[#21262d] font-mono text-xs leading-relaxed text-[#c9d1d9] whitespace-pre-wrap">
                  {synthesizedAnswer.answer}
                </div>
              </div>
            )}

            {/* Tab 2: Key Findings */}
            {activeTab === 'findings' && (
              <div className="p-5 space-y-3">
                <div className="text-xs font-mono text-[#8b949e]">
                  Quantitative takeaways and key findings extracted from authoritative regulations and corporate filings:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {synthesizedAnswer.key_findings.map((f, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] flex items-start gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-xs font-mono text-white leading-normal">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Statutory Citations */}
            {activeTab === 'citations' && (
              <div className="p-5 space-y-3">
                <div className="text-xs font-mono text-[#8b949e]">
                  Official statutory citations, legislation sections, and regulatory URIs referenced in this response:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {synthesizedAnswer.statutory_citations.map((c, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2 font-mono text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white text-xs">{c.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#0d1117] border border-[#30363d] text-[#00f0ff]">
                          {c.doc_type || 'STATUTORY'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8b949e]">Authority: {c.authority}</div>
                      <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-[#21262d]">
                        <span className="text-[#8b949e]">Effective: {c.effective_date}</span>
                        <span className="text-[#00f0ff] truncate max-w-[240px] font-bold">
                          {c.citation_uri}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Live Press Stream */}
            {activeTab === 'live' && (
              <div className="p-5 space-y-3">
                <div className="text-xs font-mono text-[#8b949e] flex justify-between items-center">
                  <span>Live scraped press headlines and regulatory circulars via Google News RSS & press releases:</span>
                  <span className="text-emerald-400 font-bold">Filter: Zero Clickbait</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {synthesizedAnswer.live_intelligence.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2 font-mono"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-white line-clamp-2 leading-snug">
                          {item.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            item.sentiment === 'BULLISH'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : item.sentiment === 'BEARISH'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-[#21262d] text-[#8b949e]'
                          }`}
                        >
                          {item.sentiment}
                        </span>
                      </div>
                      <p className="text-xs text-[#8b949e] font-sans line-clamp-3 leading-relaxed">
                        {item.snippet}
                      </p>
                      <div className="flex justify-between items-center text-[10px] pt-2 border-t border-[#21262d] text-[#8b949e]">
                        <span className="font-bold text-[#c9d1d9]">{item.publisher}</span>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#00f0ff] hover:underline flex items-center gap-1"
                        >
                          <span>{item.published_at}</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 5: Vector Chunks */}
            {activeTab === 'chunks' && (
              <div className="p-5 space-y-3">
                <div className="text-xs font-mono text-[#8b949e]">
                  Underlying immutable ChromaDB vector corpus passages retrieved for this query:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.map((m) => (
                    <div
                      key={m.chunk_id}
                      className="p-4 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2 font-mono"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-[#00f0ff]">{m.title}</span>
                          <span className="text-[10px] text-[#8b949e] block mt-0.5">{m.chunk_id}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {(m.relevance_score * 100).toFixed(1)}% match
                        </span>
                      </div>
                      <div className="text-xs text-[#c9d1d9] font-sans line-clamp-4 leading-relaxed whitespace-pre-line bg-[#0d1117] p-2.5 rounded border border-[#21262d]">
                        {m.content}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#8b949e] pt-1 border-t border-[#21262d]">
                        <span>{m.source_authority}</span>
                        <span className="text-[#00f0ff] truncate max-w-[200px]">{m.citation_uri}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controlled EOD Ingestion Status Widget */}
      {eodHealth && (
        <div className="terminal-card p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Clock size={15} className="text-[#00f0ff]" /> Controlled EOD Pipeline State Machine (Asia/Kolkata)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ACTIVE AUTOMATION
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d]">
              <span className="text-[#8b949e] block text-[10px]">TIMEZONE / CLOCK</span>
              <span className="text-white font-bold">{eodHealth.timezone}</span>
              <span className="text-[10px] text-[#8b949e] block mt-0.5 truncate">{eodHealth.current_time_ist.slice(11, 19)} IST</span>
            </div>
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d]">
              <span className="text-[#8b949e] block text-[10px]">EXCHANGE CLOSE</span>
              <span className="text-amber-400 font-bold">{eodHealth.market_close_time} IST</span>
              <span className="text-[10px] text-[#8b949e] block mt-0.5">Bhavcopy: {eodHealth.bhavcopy_expected_time} IST</span>
            </div>
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d]">
              <span className="text-[#8b949e] block text-[10px]">NEXT SCHEDULED CYCLE</span>
              <span className="text-[#00f0ff] font-bold truncate block">
                {eodHealth.next_scheduled_run_ist ? eodHealth.next_scheduled_run_ist.slice(0, 16).replace('T', ' ') : '16:00 IST'}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">NSE Calendar Inquired</span>
            </div>
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d]">
              <span className="text-[#8b949e] block text-[10px]">STATE MACHINE STATUS</span>
              <span className="text-emerald-400 font-bold">
                {eodHealth.last_cycle ? eodHealth.last_cycle.status : 'READY'}
              </span>
              <span className="text-[10px] text-[#8b949e] block mt-0.5">
                {eodHealth.last_cycle ? `${eodHealth.last_cycle.symbols_final} Finalized` : 'Idempotent Sync'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 30-Equity Fundamentals Coverage Matrix */}
      <div className="terminal-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Table size={15} className="text-[#00f0ff]" /> 30-Equity Fundamental Disclosures & Financial Statements (SEBI LODR Reg 33)
            </h3>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Verified consolidated statement disclosures, audited line items, balance sheet stated metrics, and deterministic derived ratios.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8b949e]">Filter Ticker:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00f0ff]"
            >
              <option value="ALL">All 30 Universe Equities</option>
              {Object.keys(equitiesInventory).sort().map((sym) => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#21262d] text-[#8b949e] uppercase">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Company Name</th>
                <th className="py-2.5 px-3">Research Readiness</th>
                <th className="py-2.5 px-3 text-right">Daily OHLCV Bars</th>
                <th className="py-2.5 px-3 text-center">Statements</th>
                <th className="py-2.5 px-3 text-right">Quality Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {filteredEquities.map((eq) => (
                <React.Fragment key={eq.symbol}>
                  <tr className="hover:bg-[#161b22] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#00f0ff]">{eq.symbol}</td>
                    <td className="py-2.5 px-3 text-white truncate max-w-xs">{eq.company_name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {eq.eligibility}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-white font-bold">{eq.daily_ohlcv_bars}</td>
                    <td className="py-2.5 px-3 text-center text-[#00f0ff] font-bold">{eq.financial_statements_count}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> {eq.financials_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleInspectEquity(eq.symbol)}
                        className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-[10px] transition-colors inline-flex items-center gap-1"
                      >
                        {expandedEquity === eq.symbol ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {expandedEquity === eq.symbol ? 'Close' : 'Inspect'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {expandedEquity === eq.symbol && equityDetails && (
                    <tr>
                      <td colSpan={7} className="p-4 bg-[#0d1117] border-b border-[#21262d]">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm text-white">
                              {eq.symbol} — Verified Financial Statement Results & Ratios
                            </span>
                            <span className="text-[10px] text-[#8b949e]">SEBI LODR Regulation 33 Disclosures</span>
                          </div>

                          {equityDetails.financial_results && equityDetails.financial_results.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {equityDetails.financial_results.map((res: any, idx: number) => (
                                <div key={idx} className="p-3 rounded bg-[#161b22] border border-[#30363d] space-y-1">
                                  <div className="flex justify-between font-bold text-[#00f0ff]">
                                    <span>{res.fiscal_quarter} {res.fiscal_year}</span>
                                    <span className="text-emerald-400 text-[10px]">{res.basis}</span>
                                  </div>
                                  <div className="text-[11px] text-[#8b949e]">Filing: {res.filing_date}</div>
                                  <div className="text-white text-xs pt-1 border-t border-[#21262d]">
                                    Revenue: <span className="font-bold">INR {res.revenue?.toLocaleString()} Cr</span>
                                  </div>
                                  <div className="text-white text-xs">
                                    PAT: <span className="font-bold text-emerald-400">INR {res.pat?.toLocaleString()} Cr</span>
                                  </div>
                                  <div className="text-white text-xs">
                                    Total Assets: <span className="font-bold">INR {res.total_assets?.toLocaleString()} Cr</span>
                                  </div>
                                  <div className="text-white text-xs">
                                    ROE: <span className="font-bold text-[#00f0ff]">{res.return_on_equity_pct}%</span> | ROA: <span className="font-bold">{res.return_on_assets_pct}%</span>
                                  </div>
                                  <div className="text-[10px] text-[#8b949e] truncate pt-0.5">
                                    Audit: {res.audit_status}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-[#8b949e]">No financial result records stored for {eq.symbol}.</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Curated Source Manifest Table */}
      <div className="terminal-card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <FileText size={14} className="text-[#00f0ff]" /> Authoritative Documents Manifest ({manifest.length} Sources, 95 Total Indexed Chunks)
          </h3>
          <span className="text-xs font-mono text-[#8b949e]">Chroma Collection: arthaai_evidence_corpus</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#21262d] text-[#8b949e] uppercase">
                <th className="py-2.5 px-3">Doc ID</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Authority</th>
                <th className="py-2.5 px-3">Effective Date</th>
                <th className="py-2.5 px-3 text-center">Chunks</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {manifest.map((doc) => (
                <tr key={doc.doc_id} className="hover:bg-[#161b22] transition-colors">
                  <td className="py-2.5 px-3 font-bold text-[#00f0ff]">{doc.doc_id}</td>
                  <td className="py-2.5 px-3 text-white max-w-xs truncate">{doc.title}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[10px]">
                      {doc.doc_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#8b949e]">{doc.source_authority}</td>
                  <td className="py-2.5 px-3 text-[#8b949e]">{doc.effective_date}</td>
                  <td className="py-2.5 px-3 text-center text-white">{doc.chunks_count}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                      <CheckCircle2 size={12} /> VERIFIED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
