# ArthaAI Production Security & Compliance Checklist
**Version:** 1.0.0-PROD  
**Classification:** Security Architecture & Financial Governance  

---

## 1. Security Architecture Summary

ArthaAI operates as an institutional decision-support and quantitative research platform. It enforces defense-in-depth across five security tiers:
1. **Financial Safety & Execution Isolation**
2. **Secrets & Credential Protection**
3. **API & Network Perimeter Security**
4. **Container & Host Sandboxing**
5. **Prompt Injection & Adversarial Defense**

---

## 2. Security Verification Checklist

| Security Control | Implementation Mechanism | Verification Method | Status |
|---|---|---|---|
| **Immutable Live Trading Lockout** | `ARTHAAI_LIVE_TRADING_ENABLED=false` asserted in `AppConfig` and `ADKRiskValidator`. | Startup exception if flag is changed; verified via `test_config.py`. | **PASS** |
| **No Trading Credentials Exposed** | No broker API keys (Zerodha, Upstox, AngelOne) exist in code or schemas. | Codebase regex scan for secret patterns. | **PASS** |
| **Secrets Outside Source Code** | All keys loaded exclusively via environment variables (`.env`). | `.gitignore` and `.dockerignore` exclude `.env*`. | **PASS** |
| **No Secrets Exposed to Frontend** | Zero `VITE_` prefixed secret keys. Frontend never communicates directly with LLMs. | Inspected `frontend/src` build bundle chunks. | **PASS** |
| **Prompt Injection Defense** | `InputGuardrail.sanitize_and_validate_prompt()` detects and redacts malicious prompts. | 14 passed tests in `test_adversarial_guardrails.py`. | **PASS** |
| **Non-Root Container Execution** | Linux containers run as `appuser` (UID 1000, GID 1000). | Verified in `Dockerfile` and `Dockerfile.backend`. | **PASS** |
| **Restricted CORS Configuration** | Parameterized `ARTHAAI_ALLOWED_ORIGINS` via FastAPI `CORSMiddleware`. | Verified in `src/arthaai/api/research_api.py`. | **PASS** |
| **Zero Raw Stack Traces to Web Clients** | FastAPI exception handlers return clean structured JSON errors. | Tested via malformed and illegal input tests. | **PASS** |
| **Path Traversal Defense** | Document retrieval strictly validates canonical IDs against registered manifests. | Verified in `src/arthaai/rag/chroma_store.py`. | **PASS** |
| **Statutory Tax Accounting** | Dynamically calculates Finance Act 2024 LTCG (12.5%), STCG (20%), and STT (0.1%). | Validated via `ADKRiskValidator` and FastMCP tools. | **PASS** |
| **SEBI LODR Compliance Audit** | ChromaDB RAG checks Regulations 30 and 33 for audit qualifications. | Verified against NSE/BSE corporate filings. | **PASS** |
| **Deterministic Audit Hash** | SHA-256 cryptographic provenance hash computed over all report contents. | Verified in `QuantitativeResearchReport.compute_audit_hash()`. | **PASS** |

---

## 3. Financial Safety Rules (Non-Negotiable)

1. **Research Only:** ArthaAI produces quantitative scenario analysis, Ledoit-Wolf covariance matrices, and stochastic wealth projections. It **never places live orders** on any exchange.
2. **Explicit Caveats & Provenance:** Every report includes explicit data limitations, point-in-time timestamps, and statutory friction estimates.
3. **No Fabricated Return Guarantees:** The system rejects any prompt instructing it to guarantee investment returns, complying with SEBI Investment Advisers Regulations (2013).

