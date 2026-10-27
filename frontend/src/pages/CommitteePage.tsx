import React, { useState } from 'react';
import { Shield, Users, CheckCircle, AlertTriangle, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import { getApiBaseUrl } from '../api/client';

const API = getApiBaseUrl();

interface CommitteeStatement {
  persona_id: string;
  member_name: string;
  role_title: string;
  avatar_color: string;
  framework: string;
  stance: 'BULLISH' | 'CAUTIOUS' | 'NEUTRAL' | 'SKEPTICAL' | 'DECISIVE';
  argument: string;
  vote: 'APPROVE' | 'CONDITIONAL' | 'REJECT';
  dissent_notes?: string;
  timestamp: string;
}

interface CommitteeResult {
  session_id: string;
  target_subject: string;
  chairperson: string;
  deliberation_timestamp: string;
  transcript: CommitteeStatement[];
  votes_summary: Record<string, number>;
  official_verdict: 'APPROVED' | 'CONDITIONALLY_APPROVED' | 'REJECTED';
  consensus_rationale: string;
  binding_constraints: string[];
}

export const CommitteePage: React.FC = () => {
  const [subject, setSubject] = useState('RELIANCE.NS');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CommitteeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conveneCommittee = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${API}/committee/deliberate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_subject: subject,
          symbol: subject,
          latest_close: 2950.0,
          volatility: 0.182,
          rsi: 54.2,
          macro_regime: 'RBI Repo Rate 6.50% corridor; Neutral stance; CPI 4.8%',
          statutory_drag: 0.1186,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Deliberation failed');
    } finally {
      setRunning(false);
    }
  };

  const getVoteBadge = (vote: string) => {
    if (vote === 'APPROVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle size={12} /> APPROVE
        </span>
      );
    }
    if (vote === 'CONDITIONAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle size={12} /> CONDITIONAL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <XCircle size={12} /> REJECT
      </span>
    );
  };

  return (
    <div className="terminal-page space-y-6">
      {/* Header */}
      <div className="terminal-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#13161a] border border-[#22272e] text-xs font-mono text-[#00f0ff]">
            <Users size={14} /> Multi-Persona Deliberation Room
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">Investment Committee Chamber</h1>
          <p className="text-sm text-[#8b949e] mt-1 max-w-2xl">
            Simulates a formal institutional investment committee meeting featuring 4 AI specialists:
            Chief Macro Strategist, Quantitative Risk Officer, Adversarial Skeptic, and Chief Investment Officer.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value.toUpperCase())}
            placeholder="Symbol or Portfolio ID"
            className="px-3.5 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm font-mono text-white focus:outline-none focus:border-[#00f0ff] w-48"
          />
          <button
            onClick={conveneCommittee}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00f0ff] hover:bg-[#00d0df] text-black font-bold text-sm transition-all disabled:opacity-50"
          >
            {running ? (
              <>
                <span className="animate-spin inline-block">⚙</span> Convening...
              </>
            ) : (
              <>
                <Sparkles size={14} /> Convene Committee
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="terminal-card p-4 border-rose-500/40 bg-rose-500/10 text-rose-300 text-sm font-mono">
          {error}
        </div>
      )}

      {!result && !running && (
        <div className="terminal-card p-12 text-center border-dashed border-[#30363d]">
          <Users size={40} className="mx-auto text-[#8b949e] mb-3" />
          <h3 className="text-lg font-bold text-white">Chamber Adjourned</h3>
          <p className="text-sm text-[#8b949e] max-w-md mx-auto mt-1">
            Click "Convene Committee" to initiate multi-persona debate across macroeconomic policy, quantitative risk models, and adversarial thesis challenges.
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Verdict Banner */}
          <div className="terminal-card p-6 border-l-4 border-l-[#00f0ff] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0d1117]">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#8b949e]">Official Committee Resolution</span>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-xl font-bold text-white tracking-tight">{result.target_subject}</h2>
                <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
                  {result.official_verdict}
                </span>
              </div>
              <p className="text-xs text-[#8b949e] mt-2 max-w-2xl font-mono leading-relaxed">
                {result.consensus_rationale}
              </p>
            </div>
            <div className="text-right font-mono text-xs text-[#8b949e]">
              <div>Session: {result.session_id}</div>
              <div>Chair: {result.chairperson}</div>
              <div className="mt-2 flex items-center gap-2 justify-end">
                <span className="text-emerald-400 font-bold">{result.votes_summary.APPROVE || 0} Approve</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{result.votes_summary.CONDITIONAL || 0} Conditional</span>
                <span>•</span>
                <span className="text-rose-400 font-bold">{result.votes_summary.REJECT || 0} Reject</span>
              </div>
            </div>
          </div>

          {/* Persona Transcript */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.transcript.map((stmt) => (
              <div
                key={stmt.persona_id}
                className="terminal-card p-5 space-y-3 relative overflow-hidden"
                style={{ borderTop: `3px solid ${stmt.avatar_color}` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base">{stmt.member_name}</h3>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e] mt-0.5">
                      <span>{stmt.role_title}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-[10px]">
                        {stmt.framework}
                      </span>
                    </div>
                  </div>
                  {getVoteBadge(stmt.vote)}
                </div>

                <p className="text-sm text-[#c9d1d9] font-sans leading-relaxed pt-2 border-t border-[#21262d]">
                  "{stmt.argument}"
                </p>

                {stmt.dissent_notes && (
                  <div className="p-3 rounded bg-[#161b22] border border-[#30363d] text-xs font-mono text-amber-300">
                    <span className="font-bold">Caveat / Condition: </span>
                    {stmt.dissent_notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Binding Constraints */}
          <div className="terminal-card p-5 space-y-3">
            <h3 className="text-sm font-bold font-mono text-[#00f0ff] uppercase tracking-wider flex items-center gap-2">
              <Shield size={14} /> Binding Committee Risk Constraints
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#c9d1d9]">
              {result.binding_constraints.map((c, i) => (
                <div key={i} className="p-3 rounded bg-[#0d1117] border border-[#21262d] flex items-center gap-2">
                  <span className="text-[#00f0ff] font-bold">#{i + 1}</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
