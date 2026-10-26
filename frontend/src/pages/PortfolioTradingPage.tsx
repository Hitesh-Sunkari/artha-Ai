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
  DollarSign,
  Clock,
  Sparkles,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sliders,
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
  const [cash, setCash] = useState<number>(675000.0);
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

  useEffect(() => {
    if (initialSymbol) {
      setOrderSymbol(initialSymbol);
      if (initialSide) setOrderSide(initialSide);
      setActiveTab('trading');
    }
  }, [initialSymbol, initialSide]);

  // Statutory Calculations (Finance Act 2024)
  const tradeValue = orderQty * orderPrice;
  const stt = tradeValue * 0.001; // 0.1% STT delivery
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

  const handleExecutePaperOrder = () => {
    if (orderSide === 'BUY' && netOutlay > cash) {
      alert('Insufficient simulated cash balance.');
      return;
    }

    const newOrder: PaperOrder = {
      orderId: `SIM-ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      symbol: orderSymbol,
      side: orderSide,
      shares: orderQty,
      price: orderPrice,
      statutoryCharges: parseFloat(totalFriction.toFixed(2)),
      totalOutlay: parseFloat(netOutlay.toFixed(2)),
      status: 'FILLED',
    };

    setOrders([newOrder, ...orders]);

    if (orderSide === 'BUY') {
      setCash((c) => c - netOutlay);
      setPositions((prev) => {
        const existing = prev.find((p) => p.symbol === orderSymbol);
        if (existing) {
          const totalShares = existing.shares + orderQty;
          const avgPrice =
            (existing.shares * existing.avgPrice + orderQty * orderPrice) / totalShares;
          return prev.map((p) =>
            p.symbol === orderSymbol
              ? { ...p, shares: totalShares, avgPrice, currentPrice: orderPrice }
              : p
          );
        } else {
          return [
            ...prev,
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
      });
    } else {
      setCash((c) => c + netOutlay);
      setPositions((prev) =>
        prev
          .map((p) => (p.symbol === orderSymbol ? { ...p, shares: Math.max(0, p.shares - orderQty) } : p))
          .filter((p) => p.shares > 0)
      );
    }

    setShowConfirmModal(false);
    setOrderNotification(`Simulated order ${newOrder.orderId} filled at ₹${orderPrice.toLocaleString()}!`);
    setTimeout(() => setOrderNotification(null), 4000);
  };

  const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* Workspace Header & Snapshot */}
      <div className="terminal-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#65D5C3]/15 text-[#65D5C3] font-mono text-xs font-bold border border-[#65D5C3]/30">
              PORTFOLIO & PAPER TRADING
            </span>
            <span className="px-2.5 py-1 rounded bg-[#E8B866]/15 text-[#E8B866] font-mono text-xs font-bold border border-[#E8B866]/30">
              SIMULATION MODE ONLY
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">
            Portfolio Construction & Simulated Execution Desk
          </h1>
          <p className="text-xs text-[#8998AC] mt-1">
            Build optimal portfolios with SLSQP solver or execute risk-free paper trades with Finance Act 2024 statutory friction modeling.
          </p>
        </div>

        {/* Real-time Account Balance Readout */}
        <div className="flex items-center gap-6 font-mono text-xs bg-[#101722] p-3 rounded-xl border border-[#2A3748]">
          <div>
            <span className="text-[#8998AC] block">Simulated Equity</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{fmtINR(totalPortfolioValue)}</span>
          </div>
          <div className="border-l border-[#2A3748] pl-4">
            <span className="text-[#8998AC] block">Unrealized P&L</span>
            <span
              className={`text-lg font-bold mt-0.5 block ${
                totalUnrealizedPnL >= 0 ? 'text-[#43C99A]' : 'text-[#F07883]'
              }`}
            >
              {totalUnrealizedPnL >= 0 ? '+' : ''}
              {fmtINR(totalUnrealizedPnL)} (
              {((totalUnrealizedPnL / (totalPortfolioValue - totalUnrealizedPnL)) * 100).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Sub-Workspace Selector */}
      <div className="segment-tab-bar">
        <button
          onClick={() => setActiveTab('builder')}
          className={`segment-tab-btn ${activeTab === 'builder' ? 'active' : ''}`}
        >
          <Sliders size={14} />
          <span>7-Step Portfolio Builder</span>
        </button>

        <button
          onClick={() => setActiveTab('trading')}
          className={`segment-tab-btn ${activeTab === 'trading' ? 'active' : ''}`}
        >
          <TrendingUp size={14} />
          <span>Paper Trading Desk</span>
        </button>

        <button
          onClick={() => setActiveTab('positions')}
          className={`segment-tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
        >
          <BarChart3 size={14} />
          <span>Positions & Trade History ({positions.length})</span>
        </button>
      </div>

      {orderNotification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#43C99A] font-mono text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{orderNotification}</span>
        </div>
      )}

      {/* ── Sub-view 1: 7-Step Portfolio Builder ─────────────────────────── */}
      {activeTab === 'builder' && (
        <PortfolioPage
          onHandoffToTrading={(ticker, side) => {
            setOrderSymbol(ticker);
            setOrderSide(side);
            setActiveTab('trading');
          }}
        />
      )}

      {/* ── Sub-view 2: Paper Trading Desk ──────────────────────────────── */}
      {activeTab === 'trading' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Order Placement Form */}
          <div className="lg:col-span-7 terminal-card space-y-5">
            <div className="flex items-center justify-between border-b border-[#2A3748] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-[#65D5C3]" />
                Simulated Order Form
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/10 text-[#65D5C3] border border-cyan-500/30">
                NSE CASH EQUITIES
              </span>
            </div>

            {/* Instrument Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#B4C0D0]">Instrument Symbol (NSE/BSE)</label>
              <input
                type="text"
                value={orderSymbol}
                onChange={(e) => setOrderSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE.NS"
                className="w-full font-mono text-sm font-bold text-white uppercase"
              />
              <div className="flex gap-1.5 mt-1">
                {['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'TATAMOTORS.NS'].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      setOrderSymbol(sym);
                      if (sym === 'RELIANCE.NS') setOrderPrice(1285.5);
                      if (sym === 'TCS.NS') setOrderPrice(4120.0);
                      if (sym === 'HDFCBANK.NS') setOrderPrice(1682.4);
                      if (sym === 'INFY.NS') setOrderPrice(1890.0);
                      if (sym === 'TATAMOTORS.NS') setOrderPrice(980.0);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                      orderSymbol === sym
                        ? 'bg-[#65D5C3] text-[#0B0F17] font-bold border-[#65D5C3]'
                        : 'bg-[#1C293A] text-[#B4C0D0] border-[#2A3748] hover:text-white'
                    }`}
                  >
                    {sym.replace('.NS', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Side & Order Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#B4C0D0]">Order Side</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderSide('BUY')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all border ${
                      orderSide === 'BUY'
                        ? 'bg-emerald-500/20 text-[#43C99A] border-[#43C99A]'
                        : 'bg-[#1C293A] text-[#8998AC] border-[#2A3748]'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide('SELL')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all border ${
                      orderSide === 'SELL'
                        ? 'bg-rose-500/20 text-[#F07883] border-[#F07883]'
                        : 'bg-[#1C293A] text-[#8998AC] border-[#2A3748]'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#B4C0D0]">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full font-mono text-xs"
                >
                  <option value="MARKET">MARKET ORDER (Immediate Fill)</option>
                  <option value="LIMIT">LIMIT ORDER</option>
                </select>
              </div>
            </div>

            {/* Quantity & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#B4C0D0]">Quantity (Shares)</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={orderQty}
                  onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full font-mono text-sm text-white font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#B4C0D0]">Price (₹)</label>
                <input
                  type="number"
                  step={0.05}
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(Math.max(0.05, parseFloat(e.target.value) || 0))}
                  className="w-full font-mono text-sm text-white font-bold"
                />
              </div>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              className={`btn w-full py-3 font-bold mt-2 ${
                orderSide === 'BUY'
                  ? 'btn-primary'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/20'
              }`}
            >
              <span>Review Simulated {orderSide} Order</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Statutory Friction Preview (Finance Act 2024) */}
          <div className="lg:col-span-5 terminal-card flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#2A3850] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#43C99A]" />
                  Finance Act 2024 Friction Modeling
                </h3>
                <span className="text-[10px] font-mono text-[#8998AC]">Statutory Breakdown</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[#B4C0D0]">
                  <span>Gross Trade Value:</span>
                  <span className="text-white font-bold">{fmtINR(tradeValue)}</span>
                </div>
                <div className="flex justify-between text-[#8998AC]">
                  <span>STT (0.1% Delivery):</span>
                  <span>₹{stt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#8998AC]">
                  <span>Brokerage (Max ₹20):</span>
                  <span>₹{brokerage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#8998AC]">
                  <span>Exchange Turnover (0.00345%):</span>
                  <span>₹{exchTurnover.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#8998AC]">
                  <span>GST (18% on Charges):</span>
                  <span>₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#8998AC]">
                  <span>Stamp Duty (0.015%):</span>
                  <span>₹{stampDuty.toFixed(2)}</span>
                </div>
                <div className="border-t border-[#2A3850] pt-2 flex justify-between text-[#B4C0D0] font-bold">
                  <span>Total Statutory Drag:</span>
                  <span className="text-[#E8B866]">₹{totalFriction.toFixed(2)}</span>
                </div>
                <div className="border-t border-[#2A3850] pt-2 flex justify-between text-sm font-bold">
                  <span className="text-white">Net Cash Outlay:</span>
                  <span className="text-[#65D5C3]">{fmtINR(netOutlay)}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101722] border border-[#2A3850] space-y-1.5 text-[11px] font-mono text-[#8998AC]">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <Lock size={13} className="text-[#65D5C3]" />
                  Simulated Safety Verification
                </div>
                <div>Available Cash: <strong className="text-white">{fmtINR(cash)}</strong></div>
                <div>Post-Trade Cash: <strong className="text-white">{fmtINR(orderSide === 'BUY' ? cash - netOutlay : cash + netOutlay)}</strong></div>
              </div>
            </div>

            <div className="text-[10px] text-[#8998AC] font-mono border-t border-[#2A3850] pt-2">
              Note: Orders remain strictly internal to the simulated portfolio. No real broker API is connected.
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-view 3: Positions & History ───────────────────────────────── */}
      {activeTab === 'positions' && (
        <div className="space-y-6">
          {/* Open Positions Table */}
          <div className="terminal-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase size={16} className="text-[#65D5C3]" />
              Open Simulated Positions ({positions.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#2A3850] text-[#8998AC] uppercase">
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3 text-right">Shares</th>
                    <th className="py-2.5 px-3 text-right">Avg Price</th>
                    <th className="py-2.5 px-3 text-right">Current Price</th>
                    <th className="py-2.5 px-3 text-right">Position Value</th>
                    <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3850]">
                  {positions.map((pos) => {
                    const pnl = pos.shares * (pos.currentPrice - pos.avgPrice);
                    const pnlPct = ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100;
                    return (
                      <tr key={pos.symbol} className="hover:bg-[#1C293A]/50">
                        <td className="py-3 px-3 font-bold text-[#65D5C3]">{pos.symbol}</td>
                        <td className="py-3 px-3 text-white">{pos.name}</td>
                        <td className="py-3 px-3 text-right font-bold text-white">{pos.shares}</td>
                        <td className="py-3 px-3 text-right text-[#B4C0D0]">₹{pos.avgPrice.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-bold text-white">₹{pos.currentPrice.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-bold text-white">
                          {fmtINR(pos.shares * pos.currentPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span className={pnl >= 0 ? 'text-[#43C99A]' : 'text-[#F07883]'}>
                            {pnl >= 0 ? '+' : ''}
                            {fmtINR(pnl)} ({pnlPct >= 0 ? '+' : ''}
                            {pnlPct.toFixed(1)}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Simulated Order Execution Log */}
          <div className="terminal-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-[#65D5C3]" />
              Simulated Order Execution Log
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#2A3850] text-[#8998AC] uppercase">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3 text-right">Shares</th>
                    <th className="py-2.5 px-3 text-right">Fill Price</th>
                    <th className="py-2.5 px-3 text-right">Statutory Drag</th>
                    <th className="py-2.5 px-3 text-right">Net Value</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3850]">
                  {orders.map((ord) => (
                    <tr key={ord.orderId} className="hover:bg-[#1C293A]/50">
                      <td className="py-3 px-3 font-bold text-[#65D5C3]">{ord.orderId}</td>
                      <td className="py-3 px-3 text-[#8998AC]">{ord.timestamp}</td>
                      <td className="py-3 px-3 font-bold text-white">{ord.symbol}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.side === 'BUY'
                              ? 'bg-emerald-500/10 text-[#43C99A] border border-emerald-500/30'
                              : 'bg-rose-500/10 text-[#F07883] border border-rose-500/30'
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-white font-bold">{ord.shares}</td>
                      <td className="py-3 px-3 text-right text-[#B4C0D0]">₹{ord.price.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-[#E8B866]">₹{ord.statutoryCharges.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">{fmtINR(ord.totalOutlay)}</td>
                      <td className="py-3 px-3 text-right font-bold text-[#43C99A]">{ord.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content p-6 space-y-5 max-w-md">
            <div className="flex justify-between items-center border-b border-[#2A3748] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#65D5C3]" />
                Confirm Simulated Order
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-[#E8B866] border border-amber-500/30">
                PAPER ONLY
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#101722] border border-[#2A3748] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#8998AC]">Instrument:</span>
                  <span className="font-bold text-white">{orderSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8998AC]">Action:</span>
                  <span className={`font-bold ${orderSide === 'BUY' ? 'text-[#43C99A]' : 'text-[#F07883]'}`}>
                    {orderSide} {orderQty} Shares @ ₹{orderPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8998AC]">Gross Trade Value:</span>
                  <span className="text-white font-bold">{fmtINR(tradeValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8998AC]">Finance Act 2024 Friction:</span>
                  <span className="text-[#E8B866] font-bold">₹{totalFriction.toFixed(2)}</span>
                </div>
                <div className="border-t border-[#2A3748] pt-1.5 flex justify-between font-bold text-sm">
                  <span className="text-white">Net Outlay:</span>
                  <span className="text-[#65D5C3]">{fmtINR(netOutlay)}</span>
                </div>
              </div>

              <p className="text-[11px] text-[#8998AC]">
                By confirming, this simulated order will execute in your paper portfolio. No real funds or broker connections are utilized.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowConfirmModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleExecutePaperOrder} className="btn btn-primary flex-1">
                Confirm Execution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
