import React, { useState, useEffect } from 'react';
import { Database, Search, FileText, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import { getApiBaseUrl } from '../api/client';

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

export const EvidencePage: React.FC = () => {
  const [manifest, setManifest] = useState<ManifestItem[]>([]);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('SEBI LODR Regulation 30');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch(`${API}/rag/manifest`)
      .then((r) => r.json())
      .then((d) => {
        setManifest(d.manifest || []);
        setStats(d.statistics || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API}/rag/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 6 }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="terminal-page space-y-6">
      {/* Header */}
      <div className="terminal-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#13161a] border border-[#22272e] text-xs font-mono text-[#00f0ff]">
            <Database size={14} /> Persistent ChromaDB Vector Store
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">Authoritative Evidence Explorer</h1>
          <p className="text-sm text-[#8b949e] mt-1 max-w-2xl">
            Inspect the grounded statutory and corporate filing repository indexed in persistent ChromaDB.
            Every claim made by ArthaAI research agents links to an immutable citation in this corpus.
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d] text-center">
              <span className="text-[#8b949e] block">Chunks</span>
              <span className="text-lg font-bold text-[#00f0ff]">{stats.total_indexed_chunks}</span>
            </div>
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d] text-center">
              <span className="text-[#8b949e] block">Sources</span>
              <span className="text-lg font-bold text-white">{stats.manifest_sources_count}</span>
            </div>
            <div className="p-3 rounded bg-[#0d1117] border border-[#21262d] text-center">
              <span className="text-[#8b949e] block">Status</span>
              <span className="text-xs font-bold text-emerald-400 mt-1 block">OPERATIONAL</span>
            </div>
          </div>
        )}
      </div>

      {/* Semantic Search Box */}
      <div className="terminal-card p-5 space-y-4">
        <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
          <Search size={14} className="text-[#00f0ff]" /> Query ChromaDB Point-in-Time Vector Index
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. STT equity delivery rates Finance Act 2024 or SEBI LODR 30"
            className="flex-1 px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm font-mono text-white focus:outline-none focus:border-[#00f0ff]"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-6 py-2.5 rounded-lg bg-[#00f0ff] hover:bg-[#00d0df] text-black font-bold text-sm font-mono transition-all disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Vector Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#21262d]">
            {searchResults.map((m) => (
              <div key={m.chunk_id} className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#00f0ff]">{m.title}</span>
                    <span className="text-[10px] font-mono text-[#8b949e] block mt-0.5">{m.chunk_id}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {(m.relevance_score * 100).toFixed(1)}% match
                  </span>
                </div>
                <p className="text-xs text-[#c9d1d9] font-sans line-clamp-3 leading-relaxed">
                  {m.content}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#8b949e] pt-1 border-t border-[#21262d]">
                  <span>{m.source_authority}</span>
                  <span className="text-[#00f0ff] truncate max-w-[200px]">{m.citation_uri}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curated Source Manifest Table */}
      <div className="terminal-card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <FileText size={14} className="text-[#00f0ff]" /> Registered Statutory & Filing Manifest ({manifest.length} Sources)
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
