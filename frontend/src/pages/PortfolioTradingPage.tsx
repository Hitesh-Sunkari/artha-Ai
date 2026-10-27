import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sliders,
  Plus,
  Minus,
  Info,
  Clock,
} from 'lucide-react';
import { PortfolioPage } from './PortfolioPage';
import { getApiBaseUrl } from '../api/client';

const API = getApiBaseUrl();

type PortfolioSubTab = 'trading' | 'positions' | 'builder';

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
  const [activeTab, setActiveTab] = useState<PortfolioSubTab>(initialSymbol ? 'trading' : 'trading');

  // Simulated Account State (Isolated Paper Trading backed by LocalStorage)
  const [cash, setCash] = useState<number>(() => {
    const s = localStorage.getItem('arthai_paper_cash');
    return s ? parseFloat(s) : 1000000.0;
  });
  const [positions, setPositions] = useState<PaperPosition[]>(() => {
    const s = localStorage.getItem('arthai_paper_positions');
    return s ? JSON.parse(s) : [];
  });
  const [orders, setOrders] = useState<PaperOrder[]>(() => {
    const s = localStorage.getItem('arthai_paper_orders');
    return s ? JSON.parse(s) : [];
  });

  // Order Form State (Groww Style)
  const [orderSymbol, setOrderSymbol] = useState(initialSymbol || 'RELIANCE.NS');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>(initialSide);
  const [productType, setProductType] = useState<'DELIVERY' | 'INTRADAY'>('DELIVERY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [orderQty, setOrderQty] = useState<number>(50);
  const [orderPrice, setOrderPrice] = useState<number>(1285.5);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderNotification, setOrderNotification] = useState<string | null>(null);
  const [liveStocks, setLiveStocks] = useState<any[]>([]);

  const fetchLivePrices = async () => {
    try {
      const res = await fetch(`${API}/market/stocks`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLiveStocks(data);
          const match = data.find((s: any) => s.ticker === orderSymbol);
          if (match && orderType === 'MARKET') {
            setOrderPrice(match.rawPrice);
          }
          setPositions((prev) =>
            prev.map((pos) => {
              const live = data.find((s: any) => s.ticker === pos.symbol);
              return live ? { ...pos, currentPrice: live.rawPrice } : pos;
            })
          );
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 3000);
    return () => clearInterval(interval);
  }, [orderSymbol, orderType]);

  useEffect(() => {
    if (initialSymbol) {
      setOrderSymbol(initialSymbol);
      if (initialSide) setOrderSide(initialSide);
      setActiveTab('trading');
    }
  }, [initialSymbol, initialSide]);

  // Statutory Calculations (Finance Act 2024)
  const tradeValue = orderQty * orderPrice;
  const stt = productType === 'DELIVERY' ? tradeValue * 0.001 : tradeValue * 0.00025; // 0.1% delivery, 0.025% intraday
  const brokerage = Math.min(20, tradeValue * 0.0003); // ₹20 cap
  const exchTurnover = tradeValue * 0.0000345;
  const gst = (brokerage + exchTurnover) * 0.18;
  const stampDuty = orderSide === 'BUY' ? tradeValue * (productType === 'DELIVERY' ? 0.00015 : 0.00003) : 0;
  const totalFriction = stt + brokerage + exchTurnover + gst + stampDuty;
  const netOutlay = orderSide === 'BUY' ? tradeValue + totalFriction : tradeValue - totalFriction;

  // Portfolio Calculations
  const positionsValue = positions.reduce((acc, p) => acc + p.shares * p.currentPrice, 0);
  const totalPortfolioValue = cash + positionsValue;
  const totalCostBasis = positions.reduce((acc, p) => acc + p.shares * p.avgPrice, 0);
  const totalUnrealizedPnL = positionsValue - totalCostBasis;
  const pnlPct = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0.0;

  const handleExecutePaperOrder = () => {
    if (orderSide === 'BUY' && netOutlay > cash) {
      alert('Insufficient simulated cash balance. Add paper funds or reduce order quantity.');
      return;
    }

    const newOrder: PaperOrder = {
      orderId: `GROWW-ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      symbol: orderSymbol,
      side: orderSide,
      shares: orderQty,
      price: orderPrice,
      statutoryCharges: parseFloat(totalFriction.toFixed(2)),
      totalOutlay: parseFloat(netOutlay.toFixed(2)),
      status: 'FILLED',
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem('arthai_paper_orders', JSON.stringify(updatedOrders));

    let updatedCash = cash;
    let updatedPositions: PaperPosition[] = [];

    if (orderSide === 'BUY') {
      updatedCash = cash - netOutlay;
      const existing = positions.find((p) => p.symbol === orderSymbol);
      if (existing) {
        const totalShares = existing.shares + orderQty;
        const avgPrice =
          (existing.shares * existing.avgPrice + orderQty * orderPrice) / totalShares;
        updatedPositions = positions.map((p) =>
          p.symbol === orderSymbol
            ? { ...p, shares: totalShares, avgPrice, currentPrice: orderPrice }
            : p
        );
      } else {
        updatedPositions = [
          ...positions,
          {
            symbol: orderSymbol,
            name: orderSymbol.replace('.NS', ''),
            shares: orderQty,
            avgPrice: orderPrice,
            currentPrice: orderPrice,
            side: 'BUY',
          },
        ];
      }
    } else {
      updatedCash = cash + netOutlay;
      updatedPositions = positions
        .map((p) => (p.symbol === orderSymbol ? { ...p, shares: Math.max(0, p.shares - orderQty) } : p))
        .filter((p) => p.shares > 0);
    }

    setCash(updatedCash);
    setPositions(updatedPositions);
    localStorage.setItem('arthai_paper_cash', updatedCash.toString());
    localStorage.setItem('arthai_paper_positions', JSON.stringify(updatedPositions));

    setShowConfirmModal(false);
    setOrderNotification(`Order ${newOrder.orderId} executed! ${orderQty} ${orderSymbol} at ₹${orderPrice.toLocaleString()}`);
    setTimeout(() => setOrderNotification(null), 4000);
  };

  const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const popularSymbols =
    liveStocks.length > 0
      ? liveStocks.map((s: any) => ({ sym: s.ticker, price: s.rawPrice }))
      : [
          { sym: 'RELIANCE.NS', price: 1285.50 },
          { sym: 'TCS.NS', price: 4120.00 },
          { sym: 'HDFCBANK.NS', price: 1682.40 },
          { sym: 'INFY.NS', price: 1850.15 },
          { sym: 'TATAMOTORS.NS', price: 885.60 },
        ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Groww Style Portfolio Balance Banner ──────────────────────────── */}
      <div className="groww-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pill-badge pill-badge-green">
              ● PAPER TRADING
            </span>
            <span className="pill-badge pill-badge-neutral">
              FINANCE ACT 2024 STATUTORY DRAG
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', letterSpacing: '-0.02em' }}>
            Investments & Trading Desk
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Execute simulated orders with real-time statutory friction (STT, GST, stamp duty) or build optimal SLSQP portfolios
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', backgroundColor: 'var(--bg-input)', padding: '14px 20px', borderRadius: 'var(--radius-lg)' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Portfolio Value</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
              {fmtINR(totalPortfolioValue)}
            </span>
          </div>
          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Unrealized P&L</span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: totalUnrealizedPnL >= 0 ? 'var(--groww-green)' : 'var(--groww-red)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {totalUnrealizedPnL >= 0 ? '+' : ''}{fmtINR(totalUnrealizedPnL)}
              <span style={{ fontSize: '12px' }}>({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Groww Pill Tab Selector ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className={`groww-chip ${activeTab === 'trading' ? 'active' : ''}`}
          onClick={() => setActiveTab('trading')}
        >
          <TrendingUp size={15} style={{ marginRight: '6px' }} />
          <span>Paper Order Pad</span>
        </button>

        <button
          className={`groww-chip ${activeTab === 'positions' ? 'active' : ''}`}
          onClick={() => setActiveTab('positions')}
        >
          <Briefcase size={15} style={{ marginRight: '6px' }} />
          <span>Holdings & Orders ({positions.length})</span>
        </button>

        <button
          className={`groww-chip ${activeTab === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          <Sliders size={15} style={{ marginRight: '6px' }} />
          <span>SLSQP Portfolio Optimizer</span>
        </button>
      </div>

      {orderNotification && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--groww-green-light)',
            border: '1px solid rgba(0, 208, 156, 0.3)',
            color: 'var(--groww-green)',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{orderNotification}</span>
        </div>
      )}

      {/* ── Sub-view 1: Groww-Style Order Pad ─────────────────────────────── */}
      {activeTab === 'trading' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Order Placement Pad */}
          <div className="groww-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Groww Side Switcher (Full Width Tabs) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setOrderSide('BUY')}
                style={{
                  padding: '12px',
                  backgroundColor: orderSide === 'BUY' ? 'var(--groww-green)' : 'var(--bg-input)',
                  color: orderSide === 'BUY' ? '#0F1217' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setOrderSide('SELL')}
                style={{
                  padding: '12px',
                  backgroundColor: orderSide === 'SELL' ? 'var(--groww-red)' : 'var(--bg-input)',
                  color: orderSide === 'SELL' ? '#FFFFFF' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                SELL
              </button>
            </div>

            {/* Instrument Search & Ticker Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                STOCK / INSTRUMENT
              </label>
              <input
                type="text"
                value={orderSymbol}
                onChange={(e) => setOrderSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE.NS"
                style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase' }}
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {popularSymbols.map((s) => (
                  <button
                    key={s.sym}
                    type="button"
                    onClick={() => {
                      setOrderSymbol(s.sym);
                      setOrderPrice(s.price);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: orderSymbol === s.sym ? 'var(--groww-green-light)' : 'var(--bg-elevated)',
                      color: orderSymbol === s.sym ? 'var(--groww-green)' : 'var(--text-secondary)',
                      border: `1px solid ${orderSymbol === s.sym ? 'var(--groww-green)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    {s.sym.replace('.NS', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Type & Order Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  PRODUCT TYPE
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setProductType('DELIVERY')}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: productType === 'DELIVERY' ? 'var(--bg-interactive)' : 'var(--bg-input)',
                      color: productType === 'DELIVERY' ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: `1px solid ${productType === 'DELIVERY' ? 'var(--border-medium)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    Delivery (CNC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('INTRADAY')}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: productType === 'INTRADAY' ? 'var(--bg-interactive)' : 'var(--bg-input)',
                      color: productType === 'INTRADAY' ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: `1px solid ${productType === 'INTRADAY' ? 'var(--border-medium)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    Intraday (MIS)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  ORDER TYPE
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  style={{ width: '100%', height: '36px' }}
                >
                  <option value="MARKET">Market (Instant Fill)</option>
                  <option value="LIMIT">Limit</option>
                </select>
              </div>
            </div>

            {/* Quantity Stepper & Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  QUANTITY (SHARES)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setOrderQty(Math.max(1, orderQty - 10))}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: '15px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setOrderQty(orderQty + 10)}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  PRICE (₹)
                </label>
                <input
                  type="number"
                  step={0.05}
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(Math.max(0.05, parseFloat(e.target.value) || 0))}
                  style={{ height: '38px', fontWeight: 800, fontSize: '15px' }}
                />
              </div>
            </div>

            {/* Quick Quantity Presets */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[10, 25, 50, 100, 250].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setOrderQty(q)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: orderQty === q ? 'var(--groww-green-light)' : 'var(--bg-input)',
                    color: orderQty === q ? 'var(--groww-green)' : 'var(--text-muted)',
                    border: `1px solid ${orderQty === q ? 'var(--groww-green)' : 'var(--border-subtle)'}`,
                  }}
                >
                  +{q}
                </button>
              ))}
            </div>

            {/* Prominent CTA */}
            <button
              onClick={() => setShowConfirmModal(true)}
              className={orderSide === 'BUY' ? 'btn-groww-primary' : 'btn-groww-sell'}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 800,
                borderRadius: 'var(--radius-md)',
                marginTop: '10px',
              }}
            >
              <span>{orderSide} {orderSymbol} ({orderQty} Shares)</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Groww Statutory Breakdown & Margin Card */}
          <div className="groww-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="var(--groww-green)" />
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Statutory Taxes & Charges
                  </h3>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Finance Act 2024</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Gross Trade Value:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmtINR(tradeValue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <span>Securities Transaction Tax (STT):</span>
                  <span>₹{stt.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <span>Brokerage (Max ₹20):</span>
                  <span>₹{brokerage.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <span>Exchange Turnover Charges:</span>
                  <span>₹{exchTurnover.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <span>GST (18% on charges):</span>
                  <span>₹{gst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <span>Stamp Duty (0.015%):</span>
                  <span>₹{stampDuty.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Statutory Drag:</span>
                  <span style={{ color: 'var(--groww-amber)' }}>₹{totalFriction.toFixed(2)} ({(totalFriction / tradeValue * 100).toFixed(4)}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Net Cash Outlay:</span>
                  <span style={{ color: 'var(--groww-green)' }}>{fmtINR(netOutlay)}</span>
                </div>
              </div>

              {/* Cash & Margin Status */}
              <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Available Paper Cash:</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{fmtINR(cash)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Estimated Post-Trade Balance:</span>
                  <span style={{ fontWeight: 800, color: orderSide === 'BUY' && cash < netOutlay ? 'var(--groww-red)' : 'var(--text-primary)' }}>
                    {fmtINR(orderSide === 'BUY' ? cash - netOutlay : cash + netOutlay)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Note: ArthaAI enforces zero live capital risk (`live_trading_enabled = False`). All trades execute in paper simulation mode.
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-view 2: Holdings & Orders (Groww Style) ───────────────────── */}
      {activeTab === 'positions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Holdings Table */}
          <div className="groww-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Your Holdings ({positions.length})
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Real-time paper trading portfolio holdings
                </p>
              </div>
              <button
                onClick={() => setActiveTab('trading')}
                className="btn-groww-primary"
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                <span>+ Buy Stocks</span>
              </button>
            </div>

            {positions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                <Briefcase size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: '15px', fontWeight: 700 }}>No active stock holdings</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Execute a paper buy order to build your investment portfolio.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>INSTRUMENT</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>SHARES</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>AVG PRICE</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>CURRENT PRICE</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>CURRENT VALUE</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>UNREALIZED P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => {
                      const curVal = pos.shares * pos.currentPrice;
                      const pnl = pos.shares * (pos.currentPrice - pos.avgPrice);
                      const pnlPct = ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
                      const isPos = pnl >= 0;
                      return (
                        <tr key={pos.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{pos.symbol}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pos.name}</div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700 }}>
                            {pos.shares}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            ₹{pos.avgPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800 }}>
                            ₹{pos.currentPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800 }}>
                            {fmtINR(curVal)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <span className={`pill-badge ${isPos ? 'pill-badge-green' : 'pill-badge-red'}`}>
                              {isPos ? '+' : ''}₹{pnl.toFixed(2)} ({isPos ? '+' : ''}{pnlPct.toFixed(2)}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Orders History Table */}
          <div className="groww-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Paper Order History ({orders.length})
            </h3>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
                <Clock size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: '14px' }}>No orders placed yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>ORDER ID</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>TIME</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>SYMBOL</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>SIDE</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>QTY</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>PRICE</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>STATUTORY TAX</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord.orderId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {ord.orderId}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {ord.timestamp}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                          {ord.symbol}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`pill-badge ${ord.side === 'BUY' ? 'pill-badge-green' : 'pill-badge-red'}`}>
                            {ord.side}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>
                          {ord.shares}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          ₹{ord.price.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--groww-amber)' }}>
                          ₹{ord.statutoryCharges.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <span className="pill-badge pill-badge-green">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-view 3: SLSQP Optimizer ───────────────────────────────────── */}
      {activeTab === 'builder' && (
        <PortfolioPage
          onHandoffToTrading={(ticker, side) => {
            setOrderSymbol(ticker);
            setOrderSide(side);
            setActiveTab('trading');
          }}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '28px', maxWidth: '440px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Confirm {orderSide} Order
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Review simulated order parameters and Finance Act 2024 statutory friction:
            </p>

            <div style={{ backgroundColor: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Instrument:</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{orderSymbol}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Quantity:</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{orderQty} Shares</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Execution Price:</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>₹{orderPrice.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Statutory Tax Drag:</span>
                <span style={{ color: 'var(--groww-amber)', fontWeight: 700 }}>₹{totalFriction.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontWeight: 800 }}>
                <span>Net Outlay:</span>
                <span style={{ color: 'var(--groww-green)' }}>{fmtINR(netOutlay)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-groww-secondary"
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePaperOrder}
                className={orderSide === 'BUY' ? 'btn-groww-primary' : 'btn-groww-sell'}
                style={{ flex: 1, padding: '12px' }}
              >
                Execute {orderSide}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
