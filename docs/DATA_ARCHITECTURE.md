# ArthaAI Data Platform Architecture

## 1. Executive Summary & Core Principle

**ArthaAI strictly forbids strategy logic, alpha models, backtesting engines, ML pipelines, or LLM agents from directly consuming raw, provider-specific data.**

All market, fundamental, corporate action, and sentiment data must flow through the canonical ArthaAI data pipeline:

```
Provider (Live / Historical / Fixture)
   │
   ▼
Raw Storage (Append-only JSONL, write-time SHA-256 checksum, partition by provider/asset_class/date)
   │
   ▼
Normalization Engine (Pure deterministic transforms, UTC timestamps, schema/transform versioning)
   │
   ▼
Data Quality Engine (14 automated checks, ERROR/WARNING/INFO classification, strict validation)
   │
   ▼
Parquet Storage (Snappy compressed, partitioned by exchange/asset_class/year/month, embedded metadata)
   │
   ▼
Dataset Registry (Immutable manifests, lineage tracking, raw checksum link)
   │
   ▼
DuckDB Research Query Layer (Zero-copy PyArrow tables, in-process analytical SQL)
```

---

## 2. Layer-by-Layer Architecture

### 2.1 Provider Abstraction Layer (`arthaai.data.providers`)
External providers implement framework-neutral protocols:
- `HistoricalDataProvider`
- `QuoteProvider`
- `TradeProvider`
- `OrderBookProvider`
- `OptionChainProvider`
- `NewsProvider`
- `CorporateActionProvider`
- `InstrumentProvider`

Each provider declares its explicit metadata via `ProviderMetadata`, stating:
- Supported `DataMode`s: `LIVE`, `HISTORICAL`, `MOCK`, `FIXTURE`, `UNAVAILABLE`
- `ProviderCapability` flags
- Licensing terms and rate limits
- Required environment credentials

### 2.2 Raw Storage Layer (`arthaai.data.raw`)
- **Immutability Invariant**: No update or delete methods exist on `RawDataStore`. Files are append-only.
- **Integrity**: Every payload is serialized and hashed with SHA-256 upon receipt. If payload bytes change, reading will fail with a `StorageError`.
- **Partitioning**: Structured as `{data_root}/raw/{provider}/{asset_class}/{YYYY-MM-DD}.jsonl`.

### 2.3 Normalization Engine (`arthaai.data.normalization`)
- **Purity**: Normalizers are pure functions mapping raw dictionary payloads to typed Pydantic models.
- **Timezone Invariant**: All timestamps are validated for explicit timezone awareness and converted to UTC (`Asia/Kolkata` is converted to UTC with zero ambiguity).
- **Lineage Metadata**: Normalizers attach `transform_version` and `source_schema` to every record.

### 2.4 Data Quality Engine (`arthaai.data.quality`)
Automated quality validation rules:
1. **OHLC Consistency**: $H \ge O, H \ge C, L \le O, L \le C, H \ge L$ (`ERROR`).
2. **Negative Price**: Rejects prices $\le 0$ (`ERROR`).
3. **Zero Volume**: Flags zero volume bars (`WARNING`).
4. **Timestamp Monotonicity**: Verifies ascending order per symbol (`ERROR`).
5. **Duplicate Timestamp**: Rejects identical timestamps for the same symbol (`ERROR`).
6. **Stale Quote**: Flags frozen prices across consecutive bars (`WARNING`).
7. **Missing Bar**: Detects gaps exceeding expected interval (`WARNING`).
8. **Session Gaps**: Flags intraday bars outside official NSE session (09:15–15:30 IST) (`WARNING`).
9. **Crossed Book**: Detects best bid $\ge$ best ask (`ERROR`).
10. **Sequence Gaps**: Detects missing packets in tick/L2 feeds (`ERROR`).
11. **Price Discontinuities**: Flags large unexplained day-over-day price jumps (`WARNING`).

### 2.5 Storage Layer (`arthaai.data.storage`)
- **Parquet Format**: High-throughput columnar storage using PyArrow with Snappy compression.
- **Directory Layout**: `{data_root}/parquet/{dataset_type}/exchange={EX}/asset_class={AC}/year={YYYY}/month={MM}/data.parquet`.
- **Metadata Embedding**: Parquet file metadata contains embedded `schema_version`, `dataset_type`, and `written_at`.

### 2.6 Research Query Layer (`arthaai.data.research`)
- **In-process DuckDB**: Fast analytical SQL over partitioned Parquet files.
- **Zero-Copy Arrow**: Results returned directly as `pyarrow.Table` without intermediate Python object overhead.

### 2.7 Control Plane Dataset Registry (`arthaai.control_plane.datasets`)
- Tracks `DatasetManifest` records.
- Records dataset ID, symbols, time bounds, record counts, raw checksum, Parquet file path, quality validation report, and full lineage.
