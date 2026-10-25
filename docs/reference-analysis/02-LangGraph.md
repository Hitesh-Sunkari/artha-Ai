# LangGraph — Forensic Analysis
**Source:** https://github.com/langchain-ai/langgraph  
**Version Studied:** Latest HEAD (depth-1 clone, Sep 2026)  
**License:** MIT  
**Language:** Python (core), TypeScript (SDK)  

---

## 1. What Problem Does It Solve?

LangGraph is a **low-level graph orchestration library** for building stateful, multi-step agent and workflow applications backed by LLMs. It provides:
- Stateful graph execution with reducers
- Persistence / checkpointing at node level
- Human-in-the-loop interrupts
- Multi-agent coordination primitives (subgraphs, Send, Command)
- Streaming support (values, updates, events, messages, debug)

---

## 2. Architecture Overview

```
StateGraph / CompiledStateGraph
  ├── Channels (state management)
  │     ├── LastValue       — standard field, last write wins
  │     ├── BinaryOperatorAggregate — Annotated[list, add_messages]
  │     ├── EphemeralValue  — scratch field, cleared after each node
  │     ├── DeltaChannel    — diff-based update
  │     └── NamedBarrierValue — synchronization primitive
  ├── Nodes (StateNode)
  │     ├── Regular nodes: sync or async callables
  │     ├── ToolNode: executes tool calls from message list
  │     ├── Subgraph nodes: nested StateGraph
  │     └── FunctionGraph (func/) for functional API
  ├── Edges
  │     ├── Static edges: add_edge(A, B)
  │     ├── Conditional edges: add_conditional_edges(A, router, {case: node})
  │     └── Dynamic edges: Command(goto=...) or Send(node, state)
  ├── Checkpointing (Pregel model)
  │     ├── BaseCheckpointSaver interface
  │     ├── InMemorySaver (dev/test)
  │     ├── SqliteSaver (libs/checkpoint-sqlite)
  │     ├── PostgresSaver (libs/checkpoint-postgres)
  │     └── thread_id based state isolation
  ├── Store (BaseStore)
  │     ├── Long-term, cross-thread memory
  │     └── InMemoryStore (dev/test)
  ├── Cache (BaseCache)
  │     └── LLM call caching
  └── Managed Values
        └── Context injection across graph
```

---

## 3. Source Tree

```
libs/
  langgraph/         — Python core library
    langgraph/
      graph/
        state.py     — StateGraph (1979 lines), CompiledStateGraph
        message.py   — MessagesState, add_messages reducer
        _branch.py   — BranchSpec (conditional routing)
        _node.py     — StateNode, StateNodeSpec
      channels/
        base.py      — BaseChannel
        last_value.py
        binop.py     — BinaryOperatorAggregate (add_messages uses this)
        delta.py
        ephemeral_value.py
        named_barrier_value.py
      pregel/         — Execution engine (Pregel algorithm)
        __init__.py   — Pregel class (main executor)
        _read.py      — ChannelRead, PregelNode
        _write.py     — ChannelWrite
        loop.py       — SyncPregelLoop, AsyncPregelLoop
        runner.py     — Parallel node execution
      types.py        — Send, Command, Interrupt, RetryPolicy, CachePolicy, TimeoutPolicy
      constants.py    — START, END, INTERRUPT, TAG_HIDDEN
      errors.py       — InvalidUpdateError, GraphRecursionError, NodeInterrupt
      stream/         — streaming primitives
      func/           — functional API (@task, @entrypoint)
      runtime.py      — async runtime support
  checkpoint/         — BaseCheckpointSaver + InMemorySaver
  checkpoint-sqlite/  — SqliteSaver
  checkpoint-postgres/ — AsyncPostgresSaver, ShallowPostgresSaver
  prebuilt/           — ToolNode, create_react_agent, InjectedState
  sdk-py/             — Python SDK (remote graph client)
  sdk-js/             — TypeScript SDK
  cli/                — langgraph CLI (server deploy)
```

---

## 4. Core Abstractions

### StateGraph
The main object. A directed graph where each node is a function `(state: S) -> dict | Command`. Nodes communicate through shared state.

```python
from langgraph.graph import StateGraph, MessagesState

graph = StateGraph(MessagesState)
graph.add_node("agent", agent_fn)
graph.add_node("tools", ToolNode(tools))
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", route_fn, {"tools": "tools", "end": END})
graph.add_edge("tools", "agent")
compiled = graph.compile(checkpointer=SqliteSaver(...))
```

### Channel System
State fields are backed by channels. The `Annotated` type hint selects the channel:
```python
class State(TypedDict):
    messages: Annotated[list, add_messages]  # BinaryOperatorAggregate
    report: str                               # LastValue
    scratch: Annotated[str, EphemeralValue()]
```

### Pregel Execution Model
LangGraph uses the Pregel computation model:
- Each node reads from input channels, computes, writes to output channels
- Multiple rounds of "supersteps" until no more updates
- Enables parallel execution of independent nodes
- Handles cycles naturally

### Send / Command
```python
# Fan-out: spawn multiple node invocations with different states
def router(state) -> list[Send]:
    return [Send("worker", {"item": x}) for x in state["items"]]

# Dynamic routing with state update
def node(state) -> Command:
    return Command(goto="other_node", update={"result": value})
```

### Checkpointing
- Thread-based state isolation: `config = {"configurable": {"thread_id": "run-123"}}`
- Checkpoint after every node
- Resume: `graph.invoke(None, config)` resumes from last checkpoint
- Cross-thread memory: `BaseStore` (separate from checkpoint)

### ToolNode
```python
from langgraph.prebuilt import ToolNode
tools = [my_tool_fn]
node = ToolNode(tools)  # automatically calls tools from AIMessage.tool_calls
```

---

## 5. API Surface

```python
# Compile + run
graph = workflow.compile(
    checkpointer=...,     # optional persistence
    store=...,            # optional long-term memory  
    interrupt_before=[],  # human-in-the-loop
    interrupt_after=[],
)

# Invoke (sync)
result = graph.invoke(input, config={"configurable": {"thread_id": "x"}})

# Stream (async, multiple modes)
async for chunk in graph.astream(input, config, stream_mode="values"):
    ...

# Available stream modes: "values", "updates", "events", "messages", "debug"

# Subgraph
parent = StateGraph(ParentState)
child = StateGraph(ChildState)
parent.add_node("child", child.compile())
```

---

## 6. Dependencies

**Core (minimal):**
- `langchain-core` — Runnable, RunnableConfig, AIMessage, ToolMessage
- `pydantic` — schema validation
- `typing-extensions` — TypedDict enhancements

**Optional (checkpointing):**
- `aiosqlite` — async SQLite
- `asyncpg` / `psycopg` — PostgreSQL

**LangSmith (optional tracing):**
- Auto-detects `LANGSMITH_API_KEY`

---

## 7. Performance Characteristics

- **Node parallelism:** Yes, independent nodes run concurrently (asyncio)
- **Memory footprint:** Minimal; state stored in checkpoint backend
- **Throughput:** Not designed for high-frequency trading; suitable for research agent orchestration at call frequency of seconds/minutes
- **Overhead:** ~5–20ms per node transition (Python overhead + serde)
- **Scale:** Designed for 1–100s of concurrent agent threads, not thousands

---

## 8. Observability

- LangSmith tracing (auto via `LANGSMITH_API_KEY`)
- Debug streaming: `stream_mode="debug"` returns all internal state changes
- Node-level retry policies
- Named step callbacks

---

## 9. What Should ArthaAI Reuse?

| Component | Decision | Rationale |
|-----------|----------|-----------|
| StateGraph | DIRECT_DEPENDENCY | Core agent orchestration backbone |
| Pregel execution model | DIRECT_DEPENDENCY | Handles parallel analysts + conditional routing |
| Checkpointing (SqliteSaver) | DIRECT_DEPENDENCY | Free crash recovery |
| ToolNode | DIRECT_DEPENDENCY | Simplifies tool call integration |
| MessagesState / add_messages | DIRECT_DEPENDENCY | Standard message accumulation |
| Send / Command | DIRECT_DEPENDENCY | Dynamic fan-out for parallel research |
| BaseCheckpointSaver | WRAPPER | ArthaAI may want PostgreSQL for production |
| BaseStore | WRAPPER | Wrap with ArthaAI RAGEngine interface |
| stream_mode="messages" | DIRECT_DEPENDENCY | Real-time dashboard streaming |

## 10. What Should ArthaAI Avoid?

| Component | Reason |
|-----------|--------|
| LangGraph Cloud / hosted APIs | Vendor lock-in; ArthaAI should self-host |
| LangGraph CLI (server mode) | Deploy ArthaAI with own server stack |
| langgraph-sdk | Only needed for remote graph clients |

## 11. What Dependencies Would It Introduce?

- `langchain-core` (lightweight)
- `pydantic`
- Checkpoint backend of choice (sqlite/postgres)
- LangSmith (optional, for tracing)

## 12. License

**MIT** — most permissive. No restrictions on commercial use, modification, or redistribution.

## 13. Maintenance Risks

- Actively maintained by LangChain, Inc. (major releases every few months)
- API surface changes frequently (v0.x → v0.4+ had breaking changes)
- langchain-core is a hard dep; ArthaAI should pin versions carefully
- Large community; good long-term viability
