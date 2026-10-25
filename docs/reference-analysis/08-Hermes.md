# Hermes Agent — Forensic Analysis
**Source:** https://github.com/NousResearch/hermes-agent  
**Version Studied:** Latest main branch / Nous Research release  
**License:** MIT License (Permissive)  
**Language:** Python 3.11+ (asyncio, uv, Pydantic)  

---

## 1. What Problem Does It Solve?

Most LLM agent implementations suffer from **Agent Amnesia**: once a session ends, the agent loses everything it learned, repeating the same errors, forgetting user preferences, and failing to build compound procedural capability over time.

Hermes Agent solves this by implementing a **self-improving, persistent-memory agent architecture**:
- **Three-Layer Memory Hierarchy:**
  1. *Session Context:* Ephemeral conversation and scratchpad for the current task.
  2. *Persistent Facts:* Long-term knowledge base of verified facts, user preferences, and market environment rules.
  3. *Procedural Skills:* A growing library of reusable tools, execution scripts, and reasoning patterns distilled from past successes.
- **Closed-Loop Learning:** After executing complex tasks, the agent evaluates the outcome and crystallizes successful solutions into executable "Skills" for future reuse.
- **Lightweight Holographic SQLite Memory:** Uses SQLite with full-text search (FTS5) for instant retrieval without the heavy operational overhead of external vector databases (Pinecone, Qdrant, Milvus).

---

## 2. Architecture & Source Tree Overview

```
hermes-agent/
├── hermes/
│   ├── agent/                 — Core AIAgent orchestration loop
│   │   ├── runner.py          — Main prompt-think-act-reflect cycle
│   │   ├── state.py           — AgentState, MessageHistory, ContextCompression
│   │   └── reflection.py      — Post-execution self-evaluation and skill distillation
│   ├── memory/                — 3-tier memory engine
│   │   ├── sqlite_store.py    — SQLite FTS5 persistence for conversations & facts
│   │   ├── hierarchical.py    — Fact extraction, memory decay, and relevance scoring
│   │   └── compression.py     — Recursive context compression for long histories
│   ├── skills/                — Skill catalog and dynamic loader
│   │   ├── loader.py          — Dynamic import of Python/Markdown skill definitions
│   │   ├── registry.py        — Catalog of 80+ loadable skills
│   │   └── synthesizer.py     — Closed-loop skill creator (generates new skills from task traces)
│   ├── tools/                 — Tool execution engine
│   │   ├── native/            — Built-in tools: terminal, file, web search, browser, git
│   │   ├── mcp/               — Model Context Protocol (MCP) client bridge
│   │   └── rpc_sandbox.py     — Isolated subprocess execution via RPC sockets
│   └── providers/             — Multi-provider LLM abstraction
│       ├── openrouter.py      — Universal multi-model routing
│       ├── anthropic.py       — Claude 3.5/3.7 Sonnet streaming
│       ├── openai.py          — GPT-4o / o1 / o3-mini reasoning models
│       └── local_nous.py      — Local Hermes-2/3 weights via vLLM / Ollama
```

---

## 3. Core Abstractions & Data Models

### 3.1 Three-Layer Memory Engine
```
Ephemeral Context (RAM) ──► Task Working Memory (scratchpad, active tool outputs)
          │
          ▼
Persistent Facts (SQLite FTS5) ──► "Client prefers 15-minute Supertrend signals on BankNifty"
          │
          ▼
Procedural Skills (Code Repository) ──► `skills/options_straddle_screener.py`
```
When a new prompt arrives:
1. Agent queries SQLite FTS5 for relevant historical facts.
2. Agent scans `skills/` for procedural workflows matching the intent.
3. System injects only relevant memories and skill signatures into prompt context.

### 3.2 Closed-Loop Skill Synthesis
When a complex quantitative analysis succeeds:
1. `reflection.py` analyzes the tool-use trajectory.
2. Identifies repeatable procedural steps (e.g. "How to compute Indian VIX implied volatility surface").
3. Writes a parameterized Python skill file into `skills/`.
4. Tests the generated skill in sandbox.
5. Registers it in the skill registry. Future agents invoke it as a zero-shot tool!

---

## 4. Architectural Forensic Questions (Phases C)

### What problem does it solve?
Long-term agent learning, persistent memory across trading sessions, self-synthesizing skills, and lightweight zero-vector-DB search.

### What is its best component?
1. **The Closed-Loop Skill Synthesis & Distillation Engine:** Converting messy trial-and-error reasoning into persistent, clean, reusable procedural tools.
2. **SQLite FTS5 Persistent Memory Architecture:** Fast, embedded, zero-infrastructure full-text retrieval that outperforms complex vector embeddings for structured domain facts.
3. **MCP (Model Context Protocol) Native Integration:** Seamless connectivity to external data tools and sandboxes.

### What should ArthaAI reuse?
- **The 3-Layer Memory Design:** Adopt Session Context + SQLite Persistent Facts + Procedural Skills for ArthaAI's trading agents.
- **Closed-Loop Strategy Evolution:** ArthaAI's `EvolutionEngine` should use Hermes's skill-synthesis pattern to let agents discover profitable parameter variations and code them into persistent strategy files.

### What should ArthaAI wrap?
- Wrap Hermes Agent as an execution worker backend for autonomous quantitative research and code generation tasks.

### What should ArthaAI rewrite or develop natively?
- **Financial Tool Registry:** Hermes's native tools are general-purpose (bash, file edit, web scrape). ArthaAI needs trading-specific tools: `get_nse_option_chain`, `calculate_order_flow_imbalance`, `run_vector_backtest`, `compute_var_exposure`.
- **Deterministic Risk Gates:** Hermes allows free-form tool execution. In financial trading, an agent cannot be allowed to execute orders without strict deterministic pre-trade risk validation.

### What should ArthaAI avoid?
- Do not let LLM agents run live broker order execution directly via open terminal commands. All trading actions must flow through ArthaAI's deterministic Risk and Execution engines.

### What dependencies would it introduce?
- `pydantic`, `sqlite3` (standard library), `httpx`, `uvloop`, `rich`. Very lightweight footprint.

### What performance cost would it introduce?
- SQLite FTS5 queries execute in <2ms. Extremely low latency compared to remote vector database calls.

### What license constraints exist?
- **MIT License.** Completely permissive. Clean integration and code adaptation permitted.

### What maintenance risks exist?
- Self-improving skill synthesis requires strict sandboxing and AST validation to avoid generating broken or unsafe code into the runtime.
