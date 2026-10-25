# ArthaAI Data Lineage & Provenance Architecture

## 1. Lineage Principles

In institutional quantitative trading, any anomaly in a backtest or live trading signal must be traceable back to the raw bytes received from the data provider.

ArthaAI guarantees bidirectional lineage:
- **Forward Lineage**: Provider Raw Response $\rightarrow$ Raw Storage Envelope $\rightarrow$ Normalization $\rightarrow$ Quality Report $\rightarrow$ Parquet Dataset $\rightarrow$ Registry Manifest.
- **Reverse Lineage**: Any row in a Parquet dataset or research query can be traced back to its specific `DatasetManifest`, its source `raw_file`, and its exact `RawDataRecord` SHA-256 checksum.

---

## 2. Lineage Entities & Metadata

```
┌────────────────────────────────────────────────────────┐
│ RawDataRecord                                          │
│ - record_id: UUID                                      │
│ - provider: 'openbb' | 'simulated'                     │
│ - checksum: SHA-256 of unmodified payload              │
│ - data_mode: LIVE | HISTORICAL | FIXTURE               │
│ - source_timestamp & received_timestamp (UTC)          │
└──────────────────────────┬─────────────────────────────┘
                           │ normalized by DataNormalizer
                           ▼
┌────────────────────────────────────────────────────────┐
│ Canonical Records (OHLCVBar / Trade / Quote / Option)  │
│ - schema_version: 'v1'                                 │
│ - transform_version: 'v1'                              │
│ - event_time & availability_time (UTC)                 │
└──────────────────────────┬─────────────────────────────┘
                           │ validated by QualityRunner
                           ▼
┌────────────────────────────────────────────────────────┐
│ Parquet Storage                                        │
│ - Embedded metadata: schema_version, written_at        │
│ - Partitioned by exchange, asset_class, year, month    │
└──────────────────────────┬─────────────────────────────┘
                           │ cataloged by DatasetRegistry
                           ▼
┌────────────────────────────────────────────────────────┐
│ DatasetManifest (JSONL Registry)                       │
│ - dataset_id: Unique hash/slug                         │
│ - raw_checksum: Matches RawDataRecord checksum         │
│ - lineage: {"raw_file", "raw_record_id", "normalizer"} │
│ - quality_status: PASSED | WARNING | FAILED            │
└────────────────────────────────────────────────────────┘
```

---

## 3. Auditing & Tamper Resistance

1. **Write-Time Checksum**: When raw data is captured, `RawDataRecord.compute_checksum(payload)` produces a SHA-256 digest.
2. **Read-Time Verification**: When `RawDataStore.read()` is invoked, the digest is re-computed. Any manual modification of the raw file triggers an immediate `StorageError`.
3. **Reproducibility Guarantee**: Given the same raw JSONL file and normalizer version, running `DatasetBuilder` produces bit-for-bit identical canonical outputs.
