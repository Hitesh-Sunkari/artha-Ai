/**
 * ArthaAI Client-Side Telemetry, Error Surveillance & Synchronization Reporter.
 * 
 * Automatically captures:
 * 1. Periodic user session heartbeat & desk activity.
 * 2. Unhandled runtime errors & API fetch exceptions for instant Admin detection.
 * 3. Portfolio state synchronization for institutional aggregate surveillance.
 */

import { api } from '../api/client';
import type { AuthUser, UserHeartbeatPayload, ClientErrorPayload } from '../api/types';

const SUPER_ADMIN_EMAIL = 'hitesh.sunkari.23cse@bmu.edu.in';

let isInitialized = false;
let heartbeatInterval: any = null;

// Unique session ID per browser tab
const SESSION_ID = 'sess-tab-' + Math.random().toString(36).substring(2, 10);

export function getActiveAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('arthai_auth_user');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function setActiveAuthUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem('arthai_auth_user', JSON.stringify(user));
    localStorage.setItem('arthai_user_email', user.email);
    localStorage.setItem('arthai_user_name', user.name);
  } else {
    localStorage.removeItem('arthai_auth_user');
    localStorage.removeItem('arthai_user_email');
  }
  window.dispatchEvent(new Event('arthai_auth_changed'));
}

export function isUserSuperAdmin(): boolean {
  const user = getActiveAuthUser();
  if (user) {
    return user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  }
  const email = localStorage.getItem('arthai_user_email');
  return email ? email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() : false;
}

export function initTelemetryReporter(getCurrentTab?: () => string): void {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Unhandled Global Error Capture
  window.addEventListener('error', (event) => {
    try {
      const user = getActiveAuthUser();
      const payload: ClientErrorPayload = {
        user_email: user?.email || localStorage.getItem('arthai_user_email') || 'anonymous@arthai.in',
        source: 'USER_FRONTEND',
        error_type: event.error?.name || 'JavaScriptRuntimeError',
        message: event.message || 'Unknown window error',
        stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
        component: window.location.pathname,
      };
      api.reportClientError(payload).catch(() => {});
    } catch {}
  });

  // 2. Unhandled Promise Rejection Capture
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const user = getActiveAuthUser();
      const payload: ClientErrorPayload = {
        user_email: user?.email || localStorage.getItem('arthai_user_email') || 'anonymous@arthai.in',
        source: 'USER_FRONTEND',
        error_type: 'UnhandledPromiseRejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        component: window.location.pathname,
      };
      api.reportClientError(payload).catch(() => {});
    } catch {}
  });

  // 3. Heartbeat & Portfolio Sync Routine
  const sendTelemetryCycle = async () => {
    try {
      const user = getActiveAuthUser();
      const userEmail = user?.email || localStorage.getItem('arthai_user_email') || 'anonymous@arthai.in';
      const userName = user?.name || localStorage.getItem('arthai_user_name') || 'Investor';

      const cashStr = localStorage.getItem('arthai_paper_cash');
      const cash = cashStr ? parseFloat(cashStr) : 1000000;

      let positions: any[] = [];
      try {
        const posStr = localStorage.getItem('arthai_paper_positions');
        if (posStr) positions = JSON.parse(posStr);
      } catch {}

      let orders: any[] = [];
      try {
        const ordStr = localStorage.getItem('arthai_paper_orders');
        if (ordStr) orders = JSON.parse(ordStr);
      } catch {}

      const totalInvested = positions.reduce(
        (acc, p) => acc + (p.shares || 0) * (p.currentPrice || p.avgPrice || 0),
        0
      );
      const totalAum = Math.round((cash + totalInvested) * 100) / 100;

      const tab = getCurrentTab ? getCurrentTab() : window.location.pathname;

      const heartbeat: UserHeartbeatPayload = {
        session_id: SESSION_ID,
        user_email: userEmail,
        user_name: userName,
        current_page: window.location.pathname,
        current_tab: tab,
        paper_cash: cash,
        paper_positions_count: positions.length,
        paper_aum: totalAum,
      };

      await api.sendHeartbeat(heartbeat);

      // Synchronize portfolio holdings for admin surveillance
      await api.syncPortfolioToAdmin({
        user_email: userEmail,
        cash,
        positions,
        orders,
      });
    } catch {}
  };

  // Immediate first run, then every 15 seconds
  sendTelemetryCycle();
  heartbeatInterval = setInterval(sendTelemetryCycle, 15000);

  // Sync on local storage modifications
  window.addEventListener('storage', () => {
    sendTelemetryCycle();
  });
}
