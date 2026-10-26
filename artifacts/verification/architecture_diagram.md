# ArthaAI — Complete System Architecture & Topology

## Executive Overview
ArthaAI is a production-grade institutional quantitative financial research platform designed for Indian capital markets. It integrates Google ADK, CrewAI, FastMCP, the official Agent-to-Agent (A2A) protocol, a versioned typed Blackboard, and a persistent ChromaDB vector store into an institutional-grade investment research engine.

---

## 1. High-Level Architectural Topology

```mermaid
flowchart TB
    subgraph UI ["Institutional Terminal Frontend (React + Vite + TypeScript)"]
        DASH[Control-Plane Dashboard]
        PORT[7-Step Portfolio Engine]
        COMM[Deliberation Room]
        EVID[Evidence Explorer]
        TELEM[LLM Telemetry Observatory]
        COPILOT[Floating AI Copilot]
    end

    subgraph API ["FastAPI Research API Engine (:8000)"]
        ROUTER[Unified REST Endpoints]
        GUARD_IN[Adversarial Input Guardrail]
        GUARD_TOOL[Tool Argument Guardrail]
        GUARD_OUT[Report Output Guardrail]
    end

    subgraph ADK ["Google ADK Orchestration Tier"]
        MGR[ADK Research Manager]
        SYNTH[Rubric & Policy Synthesizer]
        HEAT[Agent Operational Heatmap]
    end

    subgraph A2A_LAYER ["A2A Protocol Layer (:8001/rpc)"]
        BRIDGE[A2A Client Bridge (JSON-RPC)]
        CARD[A2A Agent Cards & Route Registry]
    end

    subgraph CREW ["CrewAI Specialist Suite"]
        MACRO[Macro & Monetary Specialist]
        FILING[Filing & Corporate Disclosures Specialist]
        RED[Adversarial Skeptic & Red Team]
    end

    subgraph SHARED_STATE ["Typed & Versioned Blackboard (E:\ArthAI\data\blackboard\)"]
        BB_REQ[REQUEST Namespace]
        BB_MKT[MARKET_DATA Namespace]
        BB_RAG[RAG_EVIDENCE Namespace]
        BB_AGNT[AGENT_CONTRIBUTIONS Namespace]
        BB_TOOL[TOOL_RESULTS Namespace]
        BB_VAL[VALIDATION Namespace]
        BB_GOV[GOVERNANCE: live_trading_enabled=False]
    end

    subgraph MCP_TIER ["Official FastMCP Tool Engine"]
        MCP_SRV[FastMCP Server]
        TOOL_MKT[query_market_data]
        TOOL_REG[retrieve_regulatory_evidence]
        TOOL_STAT[compute_statutory_costs]
        TOOL_QUANT[compute_quant_metrics]
    end

    subgraph DATA_RAG ["Data & Knowledge Tier (Local E: Drive Persistence)"]
        YF[Yahoo Finance Pipeline + Parquet Cache]
        CHROMA[(ChromaDB Persistent Store: data/chroma_db)]
        MANIFEST[10 Authoritative Regulatory Sources / 13 Chunks]
    end

    %% Connections
    UI -->|REST / JSON| ROUTER
    ROUTER --> GUARD_IN
    GUARD_IN --> ADK
    ADK <-->|Monotonic Read/Write| SHARED_STATE
    ADK -->|FastMCP Tools| MCP_TIER
    MCP_TIER --> TOOL_MKT & TOOL_REG & TOOL_STAT & TOOL_QUANT
    TOOL_MKT --> YF
    TOOL_REG --> CHROMA
    ADK -->|JSON-RPC 2.0| BRIDGE
    BRIDGE --> CARD --> CREW
    CREW -->|Specialist Findings| BRIDGE
    BRIDGE --> SHARED_STATE
    ADK --> SYNTH --> GUARD_OUT
    GUARD_OUT --> ROUTER
```

---

## 2. Component Breakdown & Boundaries

| Component | Technology | Role | Safety / Security Guarantees |
| :--- | :--- | :--- | :--- |
| **Control-Plane UI** | React 18, Vite, TypeScript | Interactive portfolio engineering, live agent runs, committee chamber, copilot | 100% strict TypeScript types, zero synthetic visual placeholders |
| **Research API** | FastAPI, Starlette, Pydantic v2 | Exposes asynchronous run lifecycle, portfolio optimization, RAG retrieval | Dual-layered validation, CORS controls, rate-limit resilience |
| **ADK Coordinator** | Google ADK Core Engine | Orchestrates lifecycle, evaluates specialist evidence, verifies invariants | Enforces UTC point-in-time constraints, immutable governance flags |
| **A2A Protocol** | Official `a2a` Python SDK | Facilitates JSON-RPC communication between ADK and CrewAI | Strict specification compliance, AgentCard metadata verification |
| **CrewAI Specialists** | CrewAI Framework | Independent domain specialists (Macro, Financials, Adversarial) | Isolated execution, provenance tracking, deterministic heuristic fallback |
| **Typed Blackboard** | Custom High-Integrity State Layer | Monotonically versioned shared blackboard with consumer/producer tracking | Namespace isolation, immutable fields, durable disk backup |
| **FastMCP Server** | Official `mcp` FastMCP SDK | Exposes tools for market data, regulatory evidence, and statutory drag | Schema validation, zero-hallucination market provenance |
| **ChromaDB RAG Store** | Persistent `chromadb` (E: Drive) | Stores official regulatory laws (SEBI, RBI, Finance Act 2024) | Deterministic 384-D lexical embeddings, prompt injection sanitization |

---

## 3. Strict Safety Invariants
1. `live_trading_enabled = False`: Hardcoded across all config schemas, blackboard entries, and system readiness probes.
2. `Zero Lookahead Bias`: All queries strictly filter historical bars and filings on or before the user's `as_of_time`.
3. `Finance Act 2024 Statutory Accuracy`: Exact statutory tax and friction modeling:
   - Securities Transaction Tax (STT): 0.10% on delivery equity transactions.
   - Long-Term Capital Gains (LTCG): 12.5% for equity assets held > 12 months.
   - Short-Term Capital Gains (STCG): 20.0% for equity assets held ≤ 12 months.
