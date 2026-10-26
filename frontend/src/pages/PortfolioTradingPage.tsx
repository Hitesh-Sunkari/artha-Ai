import React, { useState } from 'react';
import {
  Briefcase,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  DollarSign,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PortfolioPage } from './PortfolioPage';

const API = 'http://127.0.0.1:8000';

type PortfolioSubTab = 'builder' | 'trading' | 'positions';

interface PaperPosition {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  side: 'BUY' | 'SELL';
}

interface PaperOrder {
  orderId: string;
  timestamp: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  shares: number;
  price: number;
  statutoryCharges: number;
  totalOutlay: number;
  status: 'FILLED' | 'REJECTED';
}

interface PortfolioTradingProps {
  initialSymbol?: string;
  initialSide?: 'BUY' | 'SELL';
}

export const PortfolioTradingPage: React.FC<PortfolioTradingProps> = ({
  initialSymbol,
  initialSide = 'BUY',
}) => {
  const [activeTab, setActiveTab] = useState<PortfolioSubTab>(initialSymbol ? 'trading' : 'builder');

  // Simulated Account State (Isolated Paper Trading)
  const [cash, setCash] = useState<number>(675000.0); // Baseline available paper cash
  const [positions, setPositions] = useState<PaperPosition[]>([
    {
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries Ltd',
      shares: 100,
      avgPrice: 1250.0,
      currentPrice: 1285.5,
      side: 'BUY',
    },
    {
      symbol: 'TCS.NS',
      name: 'Tata Consultancy Services',
      shares: 40,
      avgPrice: 4050.0,
      currentPrice: 4120.0,
      side: 'BUY',
    },
    {
      symbol: 'HDFCBANK.NS',
      name: 'HDFC Bank Ltd',
      shares: 60,
      avgPrice: 1650.0,
      currentPrice: 1682.4,
      side: 'BUY',
    },
  ]);

  const [orders, setOrders] = useState<PaperOrder[]>([
    {
      orderId: 'SIM-ORD-10928',
      timestamp: '2026-10-26 14:32:10 UTC',
      symbol: 'RELIANCE.NS',
      side: 'BUY',
      shares: 100,
      price: 1250.0,
      statutoryCharges: 148.25,
      totalOutlay: 125148.25,
      status: 'FILLED',
    },
    {
      orderId: 'SIM-ORD-10929',
      timestamp: '2026-10-26 15:10:45 UTC',
      symbol: 'TCS.NS',
      side: 'BUY',
      shares: 40,
      price: 4050.0,
      statutoryCharges: 192.8,
      totalOutlay: 162192.8,
      status: 'FILLED',
    },
  ]);

  // Order Form State
  const [orderSymbol, setOrderSymbol] = useState(initialSymbol || 'RELIANCE.NS');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>(initialSide);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [orderQty, setOrderQty] = useState<number>(50);
  const [orderPrice, setOrderPrice] = useState<number>(1285.5);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderNotification, setOrderNotification] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialSymbol) {
      setOrderSymbol(initialSymbol);
      if (initialSide) setOrderSide(initialSide);
      setActiveTab('trading');
    }
  }, [initialSymbol, initialSide]);

  // Statutory Calculations (Finance Act 2024)
  const tradeValue = orderQty * orderPrice;
  const stt = orderSide === 'BUY' ? tradeValue * 0.001 : tradeValue * 0.001; // 0.1% STT delivery
  const brokerage = Math.min(20, tradeValue * 0.0003); // ₹20 cap
  const exchTurnover = tradeValue * 0.0000345;
  const gst = (brokerage + exchTurnover) * 0.18;
  const stampDuty = orderSide === 'BUY' ? tradeValue * 0.00015 : 0;
  const totalFriction = stt + brokerage + exchTurnover + gst + stampDuty;
  const netOutlay = orderSide === 'BUY' ? tradeValue + totalFriction : tradeValue - totalFriction;

  // Portfolio Calculations
  const positionsValue = positions.reduce((acc, p) => acc + p.shares * p.currentPrice, 0);
  const totalPortfolioValue = cash + positionsValue;
  const totalUnrealizedPnL = positions.reduce(
    (acc, p) => acc + p.shares * (p.currentPrice - p.avgPrice),
    0
  );
  const unrealizedPnLPct = ((totalUnrealizedPnL / (totalPortfolioValue - totalUnrealizedPnL)) * 100);

  const handleExecuteSimulatedTrade = () => {
    setShowConfirmModal(false);

    if (orderSide === 'BUY') {
      if (cash < netOutlay) {
        setOrderNotification(`Simulated order rejected: Insufficient cash balance (₹${cash.toLocaleString()} available).`);
        return;
      }
      setCash((prev) => prev - netOutlay);
      // update positions
      const existing = positions.find((p) => p.symbol === orderSymbol);
      if (existing) {
        const totalShares = existing.shares + orderQty;
        const newAvg = (existing.shares * existing.avgPrice + orderQty * orderPrice) / totalShares;
        setPositions((prev) =>
          prev.map((p) => (p.symbol === orderSymbol ? { ...p, shares: totalShares, avgPrice: newAvg } : p))
        );
      } else {
        setPositions((prev) => [
          ...prev,
          {
            symbol: orderSymbol,
            name: `${orderSymbol} (Simulated)`,
            shares: orderQty,
            avgPrice: orderPrice,
            currentPrice: orderPrice,
            side: 'BUY',
          },
        ]);
      }
    } else {
      // SELL
      const existing = positions.find((p) => p.symbol === orderSymbol);
      if (!existing || existing.shares < orderQty) {
        setOrderNotification(`Simulated order rejected: Cannot sell ${orderQty} shares (You hold ${existing ? existing.shares : 0}).`);
        return;
      }
      setCash((prev) => prev + netOutlay);
      if (existing.shares === orderQty) {
        setPositions((prev) => prev.filter((p) => p.symbol !== orderSymbol));
      } else {
        setPositions((prev) =>
          prev.map((p) => (p.symbol === orderSymbol ? { ...p, shares: p.shares - orderQty } : p))
        );
      }
    }

    const newOrder: PaperOrder = {
      orderId: `SIM-ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      symbol: orderSymbol,
      side: orderSide,
      shares: orderQty,
      price: orderPrice,
      statutoryCharges: totalFriction,
      totalOutlay: netOutlay,
      status: 'FILLED',
    };
    setOrders((prev) => [newOrder, ...prev]);
    setOrderNotification(`✓ Simulated ${orderSide} filled for ${orderQty} shares of ${orderSymbol} at ₹${orderPrice.toLocaleString()}. Zero capital at risk.`);
    setTimeout(() => setOrderNotification(null), 5000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Top Workspace Header with Integrated Sub-Nav ──────────────────── */}
      <div
        className="terminal-card"
        style={{
          padding: '18px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(52, 211, 153, 0.12)',
                  color: 'var(--accent-emerald)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              >
                <Briefcase size={13} /> PORTFOLIO & PAPER TRADING
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(251, 191, 36, 0.12)',
                  color: 'var(--accent-amber)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              >
                <ShieldCheck size={12} /> SIMULATION MODE ONLY
              </span>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
              Portfolio Construction & Simulated Execution Desk
            </h1>
          </div>

          {/* Account Snapshot Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simulated Equity</div>
              <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                ₹{totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unrealized P&L</div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: totalUnrealizedPnL >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                }}
              >
                {totalUnrealizedPnL >= 0 ? '+' : ''}₹{totalUnrealizedPnL.toLocaleString()} ({unrealizedPnLPct.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>

        {/* ── Sub-Navigation Bar ─────────────────────────────────────────── */}
        <div className="segment-tab-bar" style={{ alignSelf: 'flex-start' }}>
          <button
            onClick={() => setActiveTab('builder')}
            className={`segment-tab-btn ${activeTab === 'builder' ? 'active' : ''}`}
          >
            <Layers size={15} /> 7-Step Portfolio Builder
          </button>
          <button
            onClick={() => setActiveTab('trading')}
            className={`segment-tab-btn ${activeTab === 'trading' ? 'active' : ''}`}
          >
            <TrendingUp size={15} /> Paper Trading Desk
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`segment-tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Positions & Trade History ({positions.length})
          </button>
        </div>
      </div>

      {/* ── View 1: 7-Step Portfolio Builder ──────────────────────────────── */}
      {activeTab === 'builder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PortfolioPage />
        </div>
      )}

      {/* ── View 2: Paper Trading Desk ────────────────────────────────────── */}
      {activeTab === 'trading' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Order Configuration Form */}
          <div className="terminal-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Simulate Paper Order Execution
            </h3>

            {orderNotification && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: orderNotification.includes('rejected')
                    ? 'rgba(251, 113, 133, 0.15)'
                    : 'rgba(52, 211, 153, 0.15)',
                  border: `1px solid ${
                    orderNotification.includes('rejected') ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                  }`,
                  color: orderNotification.includes('rejected') ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                  fontSize: '12px',
                  marginBottom: '16px',
                  fontWeight: 600,
                }}
              >
                {orderNotification}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Order Side Selector */}
              <div>
                <label className="form-label">Execution Side</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setOrderSide('BUY')}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: orderSide === 'BUY' ? 'var(--accent-emerald)' : 'var(--bg-surface)',
                      color: orderSide === 'BUY' ? '#090D16' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    BUY (Long Accumulation)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide('SELL')}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: orderSide === 'SELL' ? 'var(--accent-rose)' : 'var(--bg-surface)',
                      color: orderSide === 'SELL' ? '#090D16' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    SELL (Square-off / Liquidation)
                  </button>
                </div>
              </div>

              {/* Symbol */}
              <div>
                <label className="form-label">Ticker Symbol</label>
                <input
                  type="text"
                  value={orderSymbol}
                  onChange={(e) => setOrderSymbol(e.target.value.toUpperCase())}
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                />
              </div>

              {/* Quantity and Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Quantity (Shares)</label>
                  <input
                    type="number"
                    min={1}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div>
                  <label className="form-label">Simulated Execution Price (₹)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              {/* Statutory Friction Preview */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Statutory Friction & Outlay (Finance Act 2024)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Gross Order Value:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    ₹{tradeValue.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Securities Transaction Tax (0.10% STT):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    ₹{stt.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Brokerage, GST & Stamp Duty:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    ₹{(totalFriction - stt).toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border-subtle)',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <span>Total Net Estimated Outlay:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                    ₹{netOutlay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Review & Execute Button */}
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="btn btn-primary"
                style={{ padding: '12px 20px', fontSize: '14px', marginTop: '6px' }}
              >
                Review & Confirm Simulated Order
              </button>
            </div>
          </div>

          {/* Account Balance & Cash Reserve Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="terminal-card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                Simulated Account Status
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Available Cash:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    ₹{cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Invested in Securities:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    ₹{positionsValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Positions Count:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {positions.length} Assets
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Broker Execution:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>100% PAPER (Zero Capital Risk)</span>
                </div>
              </div>
            </div>

            <div
              className="terminal-card"
              style={{
                padding: '20px',
                backgroundColor: 'rgba(52, 211, 153, 0.05)',
                borderColor: 'rgba(52, 211, 153, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                <ShieldCheck size={16} /> Paper Trading Safety Invariant
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                ArthaAI strictly models order fills using real Yahoo Finance tick prices and Finance Act 2024 statutory friction. Live broker execution remains hard-blocked.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── View 3: Open Positions & Order History ─────────────────────────── */}
      {activeTab === 'positions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Open Positions */}
          <div className="terminal-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
              Simulated Open Positions ({positions.length})
            </h3>
            <div className="terminal-table-container">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Shares</th>
                    <th>Avg Buy Price</th>
                    <th>Current Price</th>
                    <th>Market Value</th>
                    <th>Unrealized P&L</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const val = p.shares * p.currentPrice;
                    const pnl = p.shares * (p.currentPrice - p.avgPrice);
                    const pnlPct = ((p.currentPrice - p.avgPrice) / p.avgPrice) * 100;
                    return (
                      <tr key={p.symbol}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.symbol}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{p.shares}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>₹{p.avgPrice.toLocaleString()}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>₹{p.currentPrice.toLocaleString()}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{val.toLocaleString()}</td>
                        <td
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: pnl >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          }}
                        >
                          {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setOrderSymbol(p.symbol);
                              setOrderSide('SELL');
                              setOrderQty(p.shares);
                              setOrderPrice(p.currentPrice);
                              setActiveTab('trading');
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Square Off
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Execution History */}
          <div className="terminal-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
              Paper Order Execution Log
            </h3>
            <div className="terminal-table-container">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Timestamp</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Shares</th>
                    <th>Price</th>
                    <th>Statutory Friction</th>
                    <th>Total Outlay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.orderId}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {o.orderId}
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{o.timestamp}</td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{o.symbol}</td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: o.side === 'BUY' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                            backgroundColor: o.side === 'BUY' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 113, 133, 0.15)',
                          }}
                        >
                          {o.side}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{o.shares}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{o.price.toLocaleString()}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        ₹{o.statutoryCharges.toFixed(2)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        ₹{o.totalOutlay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                          ● {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ────────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
              Confirm Simulated Paper Order
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              You are about to execute a simulated <strong>{orderSide}</strong> of{' '}
              <strong>{orderQty} shares</strong> of <strong>{orderSymbol}</strong> at ₹{orderPrice.toLocaleString()} per share.
            </p>

            <div
              style={{
                margin: '16px 0',
                padding: '14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Net Outlay:</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  ₹{netOutlay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Finance Act 2024 Friction:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  ₹{totalFriction.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trading Mode:</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>100% Simulated Paper Execution</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSimulatedTrade}
                className="btn btn-primary"
                style={{ fontSize: '13px' }}
              >
                Confirm & Fill Paper Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioTradingPage;
