# ArthaAI — Intellectual Property & License Audit
**Date:** September 2026  
**Auditor:** ArthaAI Architecture Forensics Team  
**Scope:** Reference Repositories 1 through 8  

---

## 1. Summary Classification

| Project | License Type | OSI Approved? | Commercial SaaS Safe? | Redistribution Conditions | ArthaAI Permitted Use |
|---|---|---|---|---|---|
| **TradingAgents** | Apache 2.0 | ✅ Yes | ✅ Yes | Keep copyright & NOTICE file | Permitted: Adapt prompts & multi-agent debate patterns |
| **LangGraph** | MIT | ✅ Yes | ✅ Yes | Keep MIT copyright notice | Permitted: Direct pip dependency (`langgraph`) |
| **OpenBB** | **AGPL-3.0** | ✅ Yes | ❌ **DANGEROUS (Viral)** | Network use triggers full source code disclosure | **FORBIDDEN AS CORE DEPENDENCY.** Reference only; build independent clean-room adapters. |
| **Paperclip** | MIT | ✅ Yes | ✅ Yes | Keep MIT copyright notice | Permitted: Adapt governance models, UI patterns, and schemas |
| **Hermes Agent** | MIT | ✅ Yes | ✅ Yes | Keep MIT copyright notice | Permitted: Adapt 3-tier memory & skill synthesis logic |
| **NautilusTrader** | **LGPL-3.0-or-later** | ✅ Yes | ✅ Safe if unmodified | Dynamically linked library; modifications to core library must remain LGPL | Permitted: Use as external pip wheel dependency (`pip install nautilus_trader`). Do NOT embed source files into ArthaAI. |
| **VectorBT** | **Commons Clause (Apache 2.0)** | ❌ **No (Source Available)** | ❌ **RESTRICTED** | Cannot sell or provide as fee-based service | **FORBIDDEN AS EMBEDDED ENGINE.** Reference mathematical formulas only; implement native Polars screener. |
| **LEAN** | Apache 2.0 | ✅ Yes | ✅ Yes | Keep copyright & NOTICE file | Permitted: Adapt 5-stage architectural abstractions |

---

## 2. Deep Dive & Risk Analysis

### 2.1 The OpenBB AGPL-3.0 Viral Risk
- **Mechanism:** GNU Affero General Public License (AGPL) Section 13 states that if an application is accessed over a network (e.g. cloud SaaS, web UI, API), the complete source code of the entire combined work must be made available to all network users under AGPL-3.0.
- **Impact on ArthaAI:** If ArthaAI imports `openbb` directly in its backend, ArthaAI's proprietary trading strategies, multi-agent reasoning prompts, and alpha signals could be legally compelled to be released publicly under AGPL-3.0.
- **Mitigation:** **ZERO IMPORT POLICY.** ArthaAI will NOT install `openbb` in its core runtime. ArthaAI will write clean, independent REST/WebSocket connectors for market data (e.g. `aiohttp` to NSE, Kite, Yahoo Finance, FRED) with zero code copied from OpenBB.

### 2.2 The VectorBT "Commons Clause" Commercial Trap
- **Mechanism:** VectorBT's `LICENSE.md` adds the *Commons Clause License Condition v1.0* on top of Apache 2.0:
  > *"Without limiting other conditions in the License, the grant of rights under the License will not include, and the License does not grant to you, the right to Sell the Software... where 'Sell' means to provide to third parties, for a fee or other consideration (including without limitation fees for hosting or consulting/support services), a product or service whose value derives, entirely or substantially, from the functionality of the Software."*
- **Impact on ArthaAI:** If ArthaAI ever charges a subscription, provides API access, runs a hedge fund / prop desk, or offers enterprise deployment, embedding VectorBT creates direct legal liability.
- **Mitigation:** ArthaAI develops its own high-performance vectorized screening engine using **Polars** and **Numba/Rust** from scratch, with zero VectorBT dependency.

### 2.3 The NautilusTrader LGPL-3.0 Boundary Strategy
- **Mechanism:** GNU Lesser General Public License (LGPL) allows proprietary applications to import and dynamically link to an LGPL library, provided the library can be replaced by the end user and no modifications to the library's own source code are kept proprietary.
- **Impact on ArthaAI:**
  - Installing `nautilus_trader` via `pip install` or dynamic wheel is **100% compliant**.
  - ArthaAI's strategy files, agent code, and proprietary risk algorithms remain completely proprietary.
  - ArthaAI will **not** fork or modify the internal Rust crates of NautilusTrader inside the ArthaAI repo.

### 2.4 Permissive MIT & Apache 2.0 Repositories
- **LangGraph, Paperclip, Hermes Agent, TradingAgents, LEAN:**
  - These repositories allow commercial use, closed-source derivative works, sublicensing, and modification.
  - Requirement: Retain the original copyright notices and Apache 2.0 `NOTICE` headers in adapted modules.

---

## 3. Compliance Action Plan

1. **Clean-Room Code Guarantee:** Any code adapted into ArthaAI will undergo clean-room review to ensure no AGPL or Commons Clause fragments enter the codebase.
2. **Third-Party Attribution File:** ArthaAI will maintain `CREDITS.md` acknowledging open-source inspirations (TradingAgents, LEAN, Hermes Agent, Paperclip, LangGraph).
3. **Automated License Checking:** In CI/CD (`github-actions`), implement `pip-licenses` and `cargo-deny` to fail any pull request that introduces an AGPL, GPL, or Commons Clause dependency.
