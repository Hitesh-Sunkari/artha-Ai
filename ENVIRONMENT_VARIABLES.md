# ArthaAI Environment Variables Specification
**Version:** 1.0.0-PROD  
**Classification:** Production Configuration Standard  

---

## 1. Master Environment Variable Catalog

| Variable Name | Required | Default Value | Data Type | Valid Options / Examples | Purpose & Behavior |
|---|---|---|---|---|---|
| `ARTHAAI_ENVIRONMENT` | Yes | `production` | String | `development`, `production`, `test` | Dictates error verbosity, profiling, and security assertion policies. |
| `ARTHAAI_LIVE_TRADING_ENABLED` | **CRITICAL** | `false` | Boolean | `false` (**ONLY**) | **Immutable safety barrier.** Must strictly remain `false`. Setting to `true` halts application startup. |
| `ARTHAAI_DATA_DIR` | No | `data` | String / Path | `data`, `/app/data` | Root path to persistent analytical Parquet datasets and ChromaDB vector corpus. |
| `ARTHAAI_LOG_LEVEL` | No | `INFO` | String | `DEBUG`, `INFO`, `WARNING`, `ERROR` | Controls logging verbosity across ADK, CrewAI, FastMCP, and FastAPI. |
| `ARTHAAI_API_HOST` | No | `0.0.0.0` | String | `0.0.0.0`, `127.0.0.1` | Network interface IP binding for the Uvicorn ASGI server. |
| `ARTHAAI_API_PORT` | No | `8000` | Integer | `8000`, `7860` | Internal listening port for FastAPI. |
| `PORT` | No | `7860` | Integer | `7860`, `8000`, `10000` | Standard cloud provider container port (Hugging Face default is `7860`). |
| `ARTHAAI_ALLOWED_ORIGINS` | No | `*` | String (CSV) | `*`, `https://app.example.com` | Configures CORS allowed HTTP origins. |
| `VITE_API_URL` | No | `""` (Empty) | String (URL) | `""`, `https://api.example.com` | Base URL for frontend API calls. When empty, uses relative same-origin routing. |
| `GEMINI_API_KEY` | **Recommended** | None | Secret String | `AIzaSy...` | Primary LLM provider key for Google Gemini 3.1 Flash Lite synthesis. |
| `OPENAI_API_KEY` | Optional | None | Secret String | `sk-...` | Secondary fallback LLM provider key. |
| `LLM_DEFAULT_PROVIDER` | No | `GEMINI` | String | `GEMINI`, `OPENAI` | Default active model family for multi-agent synthesis and analysis. |
| `LLM_GEMINI_MODEL` | No | `gemini-3.1-flash-lite` | String | `gemini-3.1-flash-lite`, `gemini-1.5-flash` | Gemini model identifier used by `llm_adapter.py`. |
| `LLM_OPENAI_MODEL` | No | `gpt-4o-mini` | String | `gpt-4o-mini`, `gpt-4o` | OpenAI model identifier used by `llm_adapter.py`. |
| `LLM_TIMEOUT_SECONDS` | No | `45` | Integer | `15` to `90` | Maximum network timeout per individual LLM inference request. |
| `LLM_MAX_CALLS_PER_RUN` | No | `20` | Integer | `5` to `50` | Circuit-breaker ceiling preventing infinite loop agent token consumption. |
| `LLM_MAX_BUDGET_PER_RUN_USD` | No | `0.10` | Float | `0.01` to `1.00` | Hard cost ceiling per research run. |
| `ARTHAAI_RISK_MAX_DAILY_LOSS_PCT` | No | `0.02` | Float | `0.01` to `0.05` | 2% max daily portfolio risk parameter. |
| `ARTHAAI_RISK_MAX_SINGLE_STOCK_EXPOSURE_PCT` | No | `0.05` | Float | `0.02` to `0.20` | 5% max single equity exposure limit for diversification. |
| `ARTHAAI_RISK_FNO_BAN_ENFORCED` | No | `true` | Boolean | `true`, `false` | Enforces SEBI MWPL 95% derivative market surveillance bans. |
| `ARTHAAI_RISK_CIRCUIT_BREAKERS_ENFORCED` | No | `true` | Boolean | `true`, `false` | Enforces NSE 10%, 15%, 20% systemic market-wide circuit breaker halts. |

---

## 2. Configuration Profiles

### 2.1 Production Profile (Hugging Face Spaces / Free Cloud Container)
```bash
ARTHAAI_ENVIRONMENT=production
ARTHAAI_LIVE_TRADING_ENABLED=false
ARTHAAI_DATA_DIR=/app/data
ARTHAAI_LOG_LEVEL=INFO
ARTHAAI_API_HOST=0.0.0.0
PORT=7860
ARTHAAI_ALLOWED_ORIGINS=*
GEMINI_API_KEY=AIzaSy...
LLM_DEFAULT_PROVIDER=GEMINI
LLM_GEMINI_MODEL=gemini-3.1-flash-lite
LLM_TIMEOUT_SECONDS=45
LLM_MAX_CALLS_PER_RUN=20
```

### 2.2 Production Profile (Oracle Cloud / GCP Docker Compose)
```bash
ARTHAAI_ENVIRONMENT=production
ARTHAAI_LIVE_TRADING_ENABLED=false
ARTHAAI_DATA_DIR=/app/data
ARTHAAI_LOG_LEVEL=INFO
ARTHAAI_API_HOST=0.0.0.0
ARTHAAI_API_PORT=8000
HOST_PORT=80
ARTHAAI_ALLOWED_ORIGINS=*
GEMINI_API_KEY=AIzaSy...
LLM_DEFAULT_PROVIDER=GEMINI
LLM_GEMINI_MODEL=gemini-3.1-flash-lite
LLM_TIMEOUT_SECONDS=45
LLM_MAX_CALLS_PER_RUN=20
```

---

## 3. Secret Management & Security Policies

1. **Zero Secret Leakage to Frontend:**
   - Secrets (`GEMINI_API_KEY`, `OPENAI_API_KEY`) must **never** be prefixed with `VITE_`.
   - The Vite frontend never receives or requires model API keys; all model inference is executed strictly on the backend via `llm_adapter.py`.
2. **Never Commit `.env` Files:**
   - `.env`, `.env.local`, and `.env.production` are strictly ignored by `.gitignore` and `.dockerignore`.
3. **Container Secret Injection:**
   - In Hugging Face Spaces: inject via **Settings** -> **Variables and secrets**.
   - In Docker Compose: inject via host `.env` file mounted at runtime or system environment variables.

