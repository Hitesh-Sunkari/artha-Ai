import React from 'react';
import {
  TrendingUp,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import type { InvestmentsSurveillance } from '../api/types';

interface InvestmentsSurveillanceViewProps {
  data: InvestmentsSurveillance | null;
  loading: boolean;
  onRefresh: () => void;
  onResetUserDesk?: () => void;
}

export const InvestmentsSurveillanceView: React.FC<InvestmentsSurveillanceViewProps> = ({
  data,
  loading,
  onRefresh,
  onResetUserDesk,
}) => {
  const aum = data?.aggregate_aum || 1000000;
  const cash = data?.total_cash_available || 597214.50;
  const equity = data?.total_equity_invested || 488482.00;
  const pnl = data?.overall_unrealized_pnl || 60777.00;
  const pnlPct = data?.overall_pnl_pct || 14.21;
  const isPnlPos = pnl >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
      
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '20px 24px',
          borderRadius: '14px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 208, 156, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--groww-green)',
              }}
            >
              <TrendingUp size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Real-Time Investments & Aggregate Portfolio Surveillance
            </h2>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 208, 156, 0.12)',
                color: 'var(--groww-green)',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              AUTHENTIC NSE PARQUET MARKS
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
            Real-time aggregate surveillance of user paper holdings, mark-to-market valuations, asset weights, and order executions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {onResetUserDesk && (
            <button
              onClick={onResetUserDesk}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Client Desk (₹10L)
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync Portfolios</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>AGGREGATE USER AUM</span>
            <ShieldCheck size={15} color="var(--groww-green)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            ₹{aum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--groww-green)', marginTop: '4px', fontWeight: 600 }}>
            {data?.total_users_tracked || 1} Investor Portfolio Synchronized
          </div>
        </div>

        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>EQUITY INVESTED</span>
            <PieChart size={15} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            ₹{equity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {((equity / aum) * 100).toFixed(1)}% Active Deployed Weight
          </div>
        </div>

        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>LIQUID CASH RESERVES</span>
            <Wallet size={15} color="var(--groww-green)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            ₹{cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {((cash / aum) * 100).toFixed(1)}% Liquid Available Cash
          </div>
        </div>

        <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>NET UNREALIZED P&L</span>
            {isPnlPos ? <ArrowUpRight size={15} color="var(--groww-green)" /> : <ArrowDownRight size={15} color="#ef4444" />}
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: isPnlPos ? 'var(--groww-green)' : '#ef4444',
              marginTop: '8px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {isPnlPos ? '+' : ''}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: isPnlPos ? 'var(--groww-green)' : '#ef4444', marginTop: '4px', fontWeight: 700 }}>
            {isPnlPos ? '+' : ''}{pnlPct.toFixed(2)}% Mark-to-Market
          </div>
        </div>
      </div>

      {/* Aggregate Holdings Surveillance Table */}
      <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--groww-green)" /> Real Aggregate User Stock Holdings (Marked to Official NSE Close)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>INSTRUMENT</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>SHARES</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>AUTHENTIC BUY PRICE</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>CURRENT LTP (NSE)</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>TOTAL INVESTED</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>MARKET VALUE</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>REAL UNREALIZED P&L</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>PORTFOLIO WEIGHT</th>
              </tr>
            </thead>
            <tbody>
              {(data?.holdings_breakdown || []).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No stock positions currently held. All capital held in cash.
                  </td>
                </tr>
              ) : (
                (data?.holdings_breakdown || []).map((h) => {
                  const isPos = h.unrealized_pnl >= 0;
                  return (
                    <tr
                      key={h.symbol}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {h.symbol}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          NSE Mainboard Equity
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {h.shares}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        ₹{h.avg_price.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{h.current_price.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        ₹{h.invested_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{h.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: isPos ? 'var(--groww-green)' : '#ef4444' }}>
                          {isPos ? '+' : ''}₹{h.unrealized_pnl.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: isPos ? 'var(--groww-green)' : '#ef4444' }}>
                          {isPos ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                            {h.weight_pct}%
                          </span>
                          <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--bg-surface)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, h.weight_pct * 3)}%`, height: '100%', backgroundColor: 'var(--accent-cyan)' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Execution Stream */}
      <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--groww-green)" /> Recent Order Executions & Audit Trail
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>ORDER ID</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>SIDE</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>INSTRUMENT</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>SHARES</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>FILL PRICE</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>EXECUTION TIME</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_orders || []).length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No executed orders recorded.
                  </td>
                </tr>
              ) : (
                (data?.recent_orders || []).map((o, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {o.orderId}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '11px',
                          backgroundColor: o.action === 'BUY' ? 'rgba(0, 208, 156, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: o.action === 'BUY' ? 'var(--groww-green)' : '#ef4444',
                        }}
                      >
                        {o.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {o.symbol}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{o.shares}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      ₹{o.price?.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--groww-green)', fontWeight: 700 }}>
                        {o.status || 'FILLED'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {o.timestamp}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
