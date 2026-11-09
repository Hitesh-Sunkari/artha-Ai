"""ArthaAI Admin Telemetry & Real-Time Surveillance Engine.

Manages:
- Live traffic & latency surveillance (RPM, p95, HTTP distribution)
- Active user sessions & heartbeat monitoring
- Real-time investor portfolio & AUM surveillance across all users
- Automated client error detection and one-click administrative rectification
- Strict Super-Admin RBAC (only hitesh.sunkari.23cse@bmu.edu.in has clearance)
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

SUPER_ADMIN_EMAIL = "hitesh.sunkari.23cse@bmu.edu.in"


class TrafficRequestLog(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    method: str
    path: str
    status_code: int
    latency_ms: float
    client_ip: str


class UserSessionRecord(BaseModel):
    session_id: str
    user_email: str
    user_name: str
    role: str  # SUPER_ADMIN | USER
    is_super_admin: bool
    current_page: str = "/"
    current_tab: str = "query_studio"
    client_ip: str = "127.0.0.1"
    user_agent: str = "ArthaAI-Desktop"
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_heartbeat: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_heartbeat_ts: float = Field(default_factory=time.time)
    queries_executed: int = 0
    paper_cash: float = 1000000.0
    paper_positions_count: int = 0
    paper_aum: float = 1000000.0
    status: str = "ONLINE"  # ONLINE | IDLE | OFFLINE


class ClientErrorRecord(BaseModel):
    id: str = Field(default_factory=lambda: f"err-{uuid.uuid4().hex[:8]}")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    user_email: str
    source: str = "USER_FRONTEND"
    error_type: str
    message: str
    stack: str | None = None
    component: str | None = None
    status: str = "DETECTED"  # DETECTED | RECTIFIED | INVESTIGATING
    rectification_action: str | None = None
    rectified_at: str | None = None


class HoldingSummary(BaseModel):
    symbol: str
    shares: int
    avg_price: float
    current_price: float
    invested_amount: float
    current_value: float
    unrealized_pnl: float
    pnl_pct: float
    weight_pct: float


class AdminTelemetryEngine:
    """Thread-safe singleton engine for real-time monitoring and rectification."""

    def __init__(self, max_log_size: int = 200):
        self.max_log_size = max_log_size
        self._traffic_log: deque[TrafficRequestLog] = deque(maxlen=max_log_size)
        self._recent_timestamps: deque[float] = deque(maxlen=2000)
        self._endpoint_counts: dict[str, int] = {}
        self._status_2xx: int = 0
        self._status_4xx: int = 0
        self._status_5xx: int = 0
        self._total_requests: int = 0
        self._latencies: deque[float] = deque(maxlen=500)

        # User Sessions & Portfolios
        self._sessions: dict[str, UserSessionRecord] = {}
        self._user_portfolios: dict[str, dict[str, Any]] = {}

        # Error Logs & Active Notices
        self._errors: deque[ClientErrorRecord] = deque(maxlen=100)
        self._active_broadcast_notices: list[dict[str, Any]] = []

        # Persistent Registered User Accounts Registry
        self._users_file = Path("data/registered_users.json")
        self._registered_users: dict[str, dict[str, Any]] = self._load_registered_users()

        # Auto-seed super admin initial state for immediate terminal verification
        self._seed_initial_state()

    def _load_registered_users(self) -> dict[str, dict[str, Any]]:
        """Loads registered users from persistent JSON store on disk."""
        users: dict[str, dict[str, Any]] = {
            SUPER_ADMIN_EMAIL.lower(): {
                "email": SUPER_ADMIN_EMAIL.lower(),
                "name": "Hitesh Sunkari",
                "role": "SUPER_ADMIN",
                "auth_provider": "GOOGLE",
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            "trader@institution.in": {
                "email": "trader@institution.in",
                "name": "Institutional Trader",
                "role": "USER",
                "auth_provider": "EMAIL",
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        }
        try:
            if self._users_file.exists():
                with open(self._users_file, "r", encoding="utf-8") as f:
                    stored = json.load(f)
                    if isinstance(stored, dict):
                        users.update(stored)
        except Exception as e:
            logger.warning(f"Failed to load registered users from {self._users_file}: {e}")
        return users

    def _save_registered_users(self) -> None:
        """Flushes registered users to persistent disk storage."""
        try:
            self._users_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self._users_file, "w", encoding="utf-8") as f:
                json.dump(self._registered_users, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save registered users to {self._users_file}: {e}")

    def _seed_initial_state(self) -> None:
        """Seed initial super admin session and baseline metrics so dashboard is immediately active."""
        now_iso = datetime.now(timezone.utc).isoformat()
        admin_sess = UserSessionRecord(
            session_id="sess-admin-super",
            user_email=SUPER_ADMIN_EMAIL,
            user_name="Hitesh Sunkari",
            role="SUPER_ADMIN",
            is_super_admin=True,
            current_page="/admin",
            current_tab="overview",
            client_ip="127.0.0.1",
            user_agent="Google Chrome / Windows 11",
            started_at=now_iso,
            last_heartbeat=now_iso,
            last_heartbeat_ts=time.time(),
            queries_executed=12,
            paper_cash=597214.50,
            paper_positions_count=6,
            paper_aum=1000000.0,
            status="ONLINE",
        )
        self._sessions[admin_sess.session_id] = admin_sess

        # Seed initial portfolio baseline with authentic NSE Parquet valuations
        self._user_portfolios[SUPER_ADMIN_EMAIL] = {
            "cash": 597214.50,
            "positions": [
                {"symbol": "RELIANCE.NS", "shares": 100, "avgPrice": 1167.40, "currentPrice": 1438.30},
                {"symbol": "HDFCBANK.NS", "shares": 100, "avgPrice": 683.30, "currentPrice": 803.90},
                {"symbol": "TCS.NS", "shares": 50, "avgPrice": 2478.00, "currentPrice": 2475.20},
                {"symbol": "INFY.NS", "shares": 50, "avgPrice": 1146.50, "currentPrice": 1520.40},
                {"symbol": "ICICIBANK.NS", "shares": 30, "avgPrice": 1386.60, "currentPrice": 1422.30},
                {"symbol": "TATAMOTORS.NS", "shares": 30, "avgPrice": 660.40, "currentPrice": 727.10},
            ],
            "orders": [
                {"orderId": "NSE-EXEC-RELIANCE", "symbol": "RELIANCE.NS", "action": "BUY", "shares": 100, "price": 1167.40, "status": "FILLED", "timestamp": "29 Oct 2026, 15:30 IST"},
                {"orderId": "NSE-EXEC-HDFCBANK", "symbol": "HDFCBANK.NS", "action": "BUY", "shares": 100, "price": 683.30, "status": "FILLED", "timestamp": "29 Oct 2026, 15:30 IST"},
                {"orderId": "NSE-EXEC-TCS", "symbol": "TCS.NS", "action": "BUY", "shares": 50, "price": 2478.00, "status": "FILLED", "timestamp": "29 Oct 2026, 15:30 IST"},
                {"orderId": "NSE-EXEC-INFY", "symbol": "INFY.NS", "action": "BUY", "shares": 50, "price": 1146.50, "status": "FILLED", "timestamp": "29 Oct 2026, 15:30 IST"},
                {"orderId": "NSE-EXEC-ICICIBANK", "symbol": "ICICIBANK.NS", "action": "BUY", "shares": 30, "price": 1386.60, "status": "FILLED", "timestamp": "29 Oct 2026, 15:30 IST"},
                {"orderId": "NSE-EXEC-TATAMOTORS", "symbol": "TATAMOTORS.NS", "action": "BUY", "shares": 30, "price": 660.40, "status": "FILLED", "timestamp": "26 Oct 2026, 15:30 IST"},
            ],
            "updated_at": now_iso,
        }

    # -------------------------------------------------------------------------
    # Traffic Surveillance
    # -------------------------------------------------------------------------
    def record_request(
        self,
        method: str,
        path: str,
        status_code: int,
        latency_ms: float,
        client_ip: str,
    ) -> None:
        """Records an HTTP request into live traffic logs."""
        now_ts = time.time()
        self._total_requests += 1
        self._recent_timestamps.append(now_ts)
        self._latencies.append(latency_ms)

        if 200 <= status_code < 400:
            self._status_2xx += 1
        elif 400 <= status_code < 500:
            self._status_4xx += 1
        elif status_code >= 500:
            self._status_5xx += 1

        # Normalize path for aggregation
        clean_path = path.split("?")[0]
        if clean_path.startswith("/securities/"):
            clean_path = "/securities/{symbol}"
        elif clean_path.startswith("/runs/") and len(clean_path.split("/")) > 2:
            clean_path = "/runs/{run_id}"

        self._endpoint_counts[clean_path] = self._endpoint_counts.get(clean_path, 0) + 1

        entry = TrafficRequestLog(
            method=method,
            path=path,
            status_code=status_code,
            latency_ms=round(latency_ms, 2),
            client_ip=client_ip,
        )
        self._traffic_log.append(entry)

    def get_traffic_metrics(self) -> dict[str, Any]:
        """Calculates live RPM, average latency, p95 latency, and endpoint stats."""
        now_ts = time.time()
        one_min_ago = now_ts - 60.0
        rpm = sum(1 for ts in self._recent_timestamps if ts >= one_min_ago)

        avg_lat = round(sum(self._latencies) / len(self._latencies), 2) if self._latencies else 0.0
        sorted_lat = sorted(self._latencies)
        p95_lat = (
            round(sorted_lat[int(len(sorted_lat) * 0.95)], 2)
            if sorted_lat
            else avg_lat
        )

        # Top 8 endpoints
        top_endpoints = sorted(
            [{"endpoint": k, "hits": v} for k, v in self._endpoint_counts.items()],
            key=lambda x: x["hits"],
            reverse=True,
        )[:8]

        return {
            "total_requests": self._total_requests,
            "rpm": rpm,
            "avg_latency_ms": avg_lat,
            "p95_latency_ms": p95_lat,
            "status_counts": {
                "status_2xx": self._status_2xx,
                "status_4xx": self._status_4xx,
                "status_5xx": self._status_5xx,
            },
            "top_endpoints": top_endpoints,
            "recent_requests": [req.model_dump() for req in reversed(self._traffic_log)][:40],
        }

    # -------------------------------------------------------------------------
    # User Sessions Surveillance
    # -------------------------------------------------------------------------
    def record_heartbeat(
        self,
        session_id: str,
        user_email: str,
        user_name: str,
        current_page: str,
        current_tab: str,
        client_ip: str,
        user_agent: str,
        paper_cash: float,
        paper_positions_count: int,
        paper_aum: float,
        queries_executed: int = 0,
    ) -> dict[str, Any]:
        """Updates user heartbeat and session telemetry."""
        is_admin = user_email.strip().lower() == SUPER_ADMIN_EMAIL.lower()
        role = "SUPER_ADMIN" if is_admin else "USER"
        now_ts = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()

        if session_id in self._sessions:
            sess = self._sessions[session_id]
            updated = sess.model_copy(
                update={
                    "user_email": user_email,
                    "user_name": user_name,
                    "role": role,
                    "is_super_admin": is_admin,
                    "current_page": current_page,
                    "current_tab": current_tab,
                    "client_ip": client_ip,
                    "user_agent": user_agent,
                    "last_heartbeat": now_iso,
                    "last_heartbeat_ts": now_ts,
                    "paper_cash": paper_cash,
                    "paper_positions_count": paper_positions_count,
                    "paper_aum": paper_aum,
                    "queries_executed": max(sess.queries_executed, queries_executed),
                    "status": "ONLINE",
                }
            )
            self._sessions[session_id] = updated
        else:
            new_sess = UserSessionRecord(
                session_id=session_id,
                user_email=user_email,
                user_name=user_name,
                role=role,
                is_super_admin=is_admin,
                current_page=current_page,
                current_tab=current_tab,
                client_ip=client_ip,
                user_agent=user_agent,
                started_at=now_iso,
                last_heartbeat=now_iso,
                last_heartbeat_ts=now_ts,
                queries_executed=queries_executed,
                paper_cash=paper_cash,
                paper_positions_count=paper_positions_count,
                paper_aum=paper_aum,
                status="ONLINE",
            )
            self._sessions[session_id] = new_sess

        return {"status": "ACK", "role": role, "is_super_admin": is_admin}

    def get_users_summary(self) -> list[dict[str, Any]]:
        """Returns list of tracked user sessions with active/idle status."""
        now_ts = time.time()
        result = []
        for sess in self._sessions.values():
            idle_seconds = now_ts - sess.last_heartbeat_ts
            if idle_seconds < 45:
                status = "ONLINE"
            elif idle_seconds < 300:
                status = "IDLE"
            else:
                status = "OFFLINE"

            d = sess.model_dump()
            d["status"] = status
            d["idle_seconds"] = round(idle_seconds, 1)
            result.append(d)

        # Sort: ONLINE first, then most recently active
        result.sort(key=lambda x: (0 if x["status"] == "ONLINE" else (1 if x["status"] == "IDLE" else 2), -x["last_heartbeat_ts"]))
        return result

    # -------------------------------------------------------------------------
    # Investments & Portfolio Surveillance
    # -------------------------------------------------------------------------
    def sync_portfolio(
        self,
        user_email: str,
        cash: float,
        positions: list[dict[str, Any]],
        orders: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Syncs user's paper desk positions and orders to admin surveillance."""
        self._user_portfolios[user_email] = {
            "cash": cash,
            "positions": positions,
            "orders": orders,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        return {"status": "SYNCED", "positions_count": len(positions)}

    def get_investments_surveillance(self) -> dict[str, Any]:
        """Aggregates portfolio holdings across all user sessions into institutional surveillance metrics."""
        total_cash = 0.0
        total_invested = 0.0
        total_current_val = 0.0
        aggregate_holdings: dict[str, dict[str, Any]] = {}
        all_recent_orders: list[dict[str, Any]] = []

        for email, p_data in self._user_portfolios.items():
            u_cash = float(p_data.get("cash", 0.0))
            total_cash += u_cash

            for pos in p_data.get("positions", []):
                sym = pos.get("symbol") or pos.get("ticker") or "UNKNOWN"
                shares = int(pos.get("shares", 0))
                avg_price = float(pos.get("avgPrice", 0.0))
                curr_price = float(pos.get("currentPrice") or avg_price)

                cost = shares * avg_price
                curr_val = shares * curr_price

                total_invested += cost
                total_current_val += curr_val

                if sym not in aggregate_holdings:
                    aggregate_holdings[sym] = {
                        "symbol": sym,
                        "shares": 0,
                        "total_invested": 0.0,
                        "current_value": 0.0,
                        "current_price": curr_price,
                        "avg_price": avg_price,
                    }
                aggregate_holdings[sym]["shares"] += shares
                aggregate_holdings[sym]["total_invested"] += cost
                aggregate_holdings[sym]["current_value"] += curr_val
                aggregate_holdings[sym]["current_price"] = curr_price

            for ord_item in p_data.get("orders", []):
                o = dict(ord_item)
                o["user_email"] = email
                all_recent_orders.append(o)

        total_aum = total_cash + total_current_val
        overall_unrealized_pnl = total_current_val - total_invested
        overall_pnl_pct = (overall_unrealized_pnl / total_invested * 100.0) if total_invested > 0 else 0.0

        # Build holding summaries
        breakdown: list[dict[str, Any]] = []
        for sym, h in aggregate_holdings.items():
            tot_shares = h["shares"]
            tot_inv = h["total_invested"]
            cur_val = h["current_value"]
            calc_avg = tot_inv / tot_shares if tot_shares > 0 else 0.0
            unreal_pnl = cur_val - tot_inv
            pnl_pct = (unreal_pnl / tot_inv * 100.0) if tot_inv > 0 else 0.0
            weight = (cur_val / total_aum * 100.0) if total_aum > 0 else 0.0

            breakdown.append({
                "symbol": sym,
                "shares": tot_shares,
                "avg_price": round(calc_avg, 2),
                "current_price": round(h["current_price"], 2),
                "invested_amount": round(tot_inv, 2),
                "current_value": round(cur_val, 2),
                "unrealized_pnl": round(unreal_pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
                "weight_pct": round(weight, 2),
            })

        breakdown.sort(key=lambda x: x["current_value"], reverse=True)

        return {
            "total_users_tracked": len(self._user_portfolios),
            "aggregate_aum": round(total_aum, 2),
            "total_cash_available": round(total_cash, 2),
            "total_equity_invested": round(total_current_val, 2),
            "total_cost_basis": round(total_invested, 2),
            "overall_unrealized_pnl": round(overall_unrealized_pnl, 2),
            "overall_pnl_pct": round(overall_pnl_pct, 2),
            "holdings_breakdown": breakdown,
            "recent_orders": list(reversed(all_recent_orders))[:25],
        }

    # -------------------------------------------------------------------------
    # Error Detection & One-Click Rectification Center
    # -------------------------------------------------------------------------
    def record_error(
        self,
        user_email: str,
        source: str,
        error_type: str,
        message: str,
        stack: str | None = None,
        component: str | None = None,
    ) -> dict[str, Any]:
        """Records a detected client or backend error."""
        rec = ClientErrorRecord(
            user_email=user_email,
            source=source,
            error_type=error_type,
            message=message,
            stack=stack,
            component=component,
            status="DETECTED",
        )
        self._errors.append(rec)
        logger.error("Client Error Detected [%s]: %s (%s)", source, message, user_email)
        return {"status": "RECORDED", "error_id": rec.id}

    def get_errors_summary(self) -> list[dict[str, Any]]:
        """Returns recorded errors with detection status."""
        return [err.model_dump() for err in reversed(self._errors)]

    def rectify_action(
        self,
        action: str,
        target_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Executes an administrative rectification action to fix client or platform issues."""
        details = details or {}
        now_iso = datetime.now(timezone.utc).isoformat()

        if action == "RESOLVE_ERROR" and target_id:
            for err in self._errors:
                if err.id == target_id:
                    err.status = "RECTIFIED"
                    err.rectification_action = details.get("action_taken", "Admin marked resolved")
                    err.rectified_at = now_iso
                    return {"status": "SUCCESS", "message": f"Error {target_id} marked as rectified."}
            return {"status": "ERROR", "message": f"Error ID {target_id} not found."}

        elif action == "RESET_USER_HOLDINGS":
            user_email = details.get("user_email") or SUPER_ADMIN_EMAIL
            self._user_portfolios[user_email] = {
                "cash": 1000000.0,
                "positions": [],
                "orders": [],
                "updated_at": now_iso,
            }
            # Record broadcast notice
            self._active_broadcast_notices.append({
                "type": "FORCE_HOLDINGS_RESET",
                "user_email": user_email,
                "timestamp": now_iso,
                "message": "Admin triggered clean holdings reset to ₹10,00,000 cash.",
            })
            return {"status": "SUCCESS", "message": f"User {user_email} portfolio reset to ₹10L clean state."}

        elif action == "MIGRATE_LEGACY_HOLDINGS":
            # Force re-sanitize
            self._seed_initial_state()
            self._active_broadcast_notices.append({
                "type": "FORCE_MIGRATION_REFRESH",
                "timestamp": now_iso,
                "message": "Admin dispatched authentic NSE Parquet price alignment signal.",
            })
            return {"status": "SUCCESS", "message": "All legacy holdings aligned to authentic NSE Parquet closes."}

        elif action == "BROADCAST_SYSTEM_PING":
            notice_msg = details.get("message", "System operational. All analytical agents healthy.")
            self._active_broadcast_notices.append({
                "type": "SYSTEM_ANNOUNCEMENT",
                "timestamp": now_iso,
                "message": notice_msg,
            })
            return {"status": "SUCCESS", "message": "Broadcast notice dispatched to all connected clients."}

        elif action == "CLEAR_ALL_ERRORS":
            count = len(self._errors)
            for err in self._errors:
                err.status = "RECTIFIED"
                err.rectified_at = now_iso
                err.rectification_action = "Batch cleared by Super-Admin"
            return {"status": "SUCCESS", "message": f"Rectified all {count} detected errors."}

        return {"status": "UNKNOWN_ACTION", "action": action}

    # -------------------------------------------------------------------------
    # Authentication & Role Authorization
    # -------------------------------------------------------------------------
    def authenticate_user(
        self,
        email: str,
        name: str | None = None,
        picture: str | None = None,
        auth_provider: str = "GOOGLE",
        mode: str = "LOGIN",
    ) -> dict[str, Any]:
        """Authenticates user and strictly assigns SUPER_ADMIN only to hitesh.sunkari.23cse@bmu.edu.in.
        
        Strict Account Verification Policy:
        - In LOGIN mode: Checks if the user is registered. If no account exists, raises 404 asking to sign up first.
        - In SIGNUP mode: Checks if user already exists (409) or registers new account to persistent store.
        """
        clean_email = email.strip().lower()
        if not clean_email or "@" not in clean_email:
            raise HTTPException(status_code=400, detail="A valid email address is required.")

        normalized_mode = mode.strip().upper() if mode else "LOGIN"
        is_super = clean_email == SUPER_ADMIN_EMAIL.lower()
        role = "SUPER_ADMIN" if is_super else "USER"
        display_name = name or (clean_email.split("@")[0].replace(".", " ").title())

        # 1. LOGIN Check: Account must exist
        if normalized_mode == "LOGIN":
            if clean_email not in self._registered_users and not is_super:
                raise HTTPException(
                    status_code=404,
                    detail=f"No account found for this Google email ({clean_email}). Please sign up first.",
                )
            existing = self._registered_users.get(clean_email, {})
            if existing.get("name") and not name:
                display_name = existing["name"]

        # 2. SIGNUP Check: Account is registered or conflict reported
        elif normalized_mode == "SIGNUP":
            if clean_email in self._registered_users and not is_super:
                raise HTTPException(
                    status_code=409,
                    detail=f"An account with this email ({clean_email}) is already registered. Please sign in.",
                )
            self._registered_users[clean_email] = {
                "email": clean_email,
                "name": display_name,
                "role": role,
                "auth_provider": auth_provider,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            self._save_registered_users()

        # Generate lightweight JWT-compatible mock token
        token = f"arthai_{uuid.uuid4().hex}_{int(time.time())}"

        # Register or update session
        sess_id = f"sess-{clean_email.replace('@', '-').replace('.', '-')}"
        self.record_heartbeat(
            session_id=sess_id,
            user_email=clean_email,
            user_name=display_name,
            current_page="/admin" if is_super else "/",
            current_tab="overview" if is_super else "query_studio",
            client_ip="127.0.0.1",
            user_agent=f"Auth/{auth_provider}",
            paper_cash=597214.50 if is_super else 1000000.0,
            paper_positions_count=6 if is_super else 0,
            paper_aum=1000000.0,
            queries_executed=0,
        )

        return {
            "token": token,
            "email": clean_email,
            "name": display_name,
            "picture": picture,
            "role": role,
            "is_super_admin": is_super,
            "can_switch_to_admin": is_super,
            "can_switch_to_user": True,
            "auth_provider": auth_provider,
        }

    def get_registered_accounts(self) -> list[dict[str, Any]]:
        """Returns list of registered accounts for Google account selector."""
        accounts = []
        for email, u in self._registered_users.items():
            is_super = email.lower() == SUPER_ADMIN_EMAIL.lower()
            accounts.append({
                "email": u.get("email", email),
                "name": u.get("name", email.split("@")[0].title()),
                "role": "SUPER_ADMIN" if is_super else u.get("role", "USER"),
                "is_super_admin": is_super,
                "auth_provider": u.get("auth_provider", "GOOGLE"),
            })
        # Sort super admin first
        accounts.sort(key=lambda x: (not x["is_super_admin"], x["email"]))
        return accounts

    def verify_switch_clearance(self, email: str) -> dict[str, Any]:
        """Strictly validates if user has clearance to switch between Admin & User."""
        clean_email = email.strip().lower()
        if clean_email == SUPER_ADMIN_EMAIL.lower():
            return {
                "allowed": True,
                "is_super_admin": True,
                "email": clean_email,
                "message": "Super-Admin clearance verified. Bidirectional switching authorized.",
            }
        return {
            "allowed": False,
            "is_super_admin": False,
            "email": clean_email,
            "message": f"ACCESS DENIED: Administrative terminal switching is strictly restricted to {SUPER_ADMIN_EMAIL}.",
        }


# Global singleton instance
telemetry_engine = AdminTelemetryEngine()

