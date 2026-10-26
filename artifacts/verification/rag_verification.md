# ArthaAI — Persistent ChromaDB RAG Ingestion & Retrieval Verification

This document provides complete evidence of the local ChromaDB persistent vector database, ingested authoritative source manifest, zero-download embedding architecture, and retrieval accuracy.

---

## 1. Vector Store Configuration
- **Implementation**: `src/arthaai/rag/chroma_store.py`
- **Database Engine**: `chromadb.PersistentClient(path="data/chroma_db")` located permanently on the local `E:` drive.
- **Collection Name**: `arthaai_regulatory_evidence`
- **Embedding Function**: `DeterministicLexicalEmbeddingFunction` (384-dimensional dense projection).
  - *Engineering Rationale*: Avoids external downloads to `C:\Users\hites\.cache` which fail due to C: drive storage limitations. Runs 100% locally and deterministically with sub-millisecond latency.
- **Total Indexed Chunks**: 13
- **Authoritative Source Documents**: 10
- **Ingestion Status**: `OPERATIONAL`

---

## 2. Ingested Manifest Sources

| Doc ID | Title | Authority / Regulator | Doc Type | Effective Date | Symbol | Chunks |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SEBI-LODR-REG30-MATERIALITY` | SEBI LODR Regulation 30: Material Events | SEBI | STATUTORY | 2015-12-01 | Global | 1 |
| `SEBI-LODR-REG33-FINANCIALS` | SEBI LODR Regulation 33: Financial Results | SEBI | STATUTORY | 2015-12-01 | Global | 1 |
| `FINANCE-ACT-2024-STT` | Finance (No. 2) Act 2024: STT Rates | Ministry of Finance | STATUTORY | 2024-10-01 | Global | 1 |
| `FINANCE-ACT-2024-CGT` | Finance (No. 2) Act 2024: Capital Gains Tax | Ministry of Finance | STATUTORY | 2024-07-23 | Global | 1 |
| `RBI-MPC-REPO-RATE-FRAMEWORK` | RBI Monetary Policy Operating Corridor | Reserve Bank of India | POLICY | 2024-02-08 | Global | 1 |
| `NSE-SURVEILLANCE-ASM-GSM` | NSE Surveillance Measures (ASM / GSM) | NSE / BSE | SURVEILLANCE | 2018-03-26 | Global | 1 |
| `FILING-RELIANCE-Q2FY25` | Reliance Industries Q2-FY25 Disclosures | NSE / BSE | FILING | 2024-10-14 | RELIANCE | 2 |
| `FILING-TCS-Q2FY25` | Tata Consultancy Services Q2-FY25 Disclosures | NSE / BSE | FILING | 2024-10-10 | TCS | 2 |
| `FILING-INFY-Q2FY25` | Infosys Limited Q2-FY25 Disclosures | NSE / BSE | FILING | 2024-10-17 | INFY | 1 |
| `FILING-HDFCBANK-Q2FY25` | HDFC Bank Limited Q2-FY25 Disclosures | NSE / BSE | FILING | 2024-10-19 | HDFCBANK | 2 |

---

## 3. Retrieval Verification Results

### Test Query 1: `"SEBI LODR Regulation 30 disclosure timelines for material events"`
- **HTTP Endpoint**: `POST /rag/search`
- **Top Match**: `SEBI-LODR-REG30-MATERIALITY`
- **Source Authority**: Securities and Exchange Board of India (SEBI)
- **Effective Date**: 2015-12-01
- **Relevance Score**: 0.2233
- **Citation URI**: `rag://regulatory/sebi_lodr#SEBI-LODR-REG30-MATERIALITY`
- **Sanitized Snippet**:
  ```xml
  <UNTRUSTED_STATUTORY_DOCUMENT id="SEBI-LODR-REG30-MATERIALITY" authority="Securities and Exchange Board of India (SEBI)" date="2015-12-01">
  SEBI (Listing Obligations and Disclosure Requirements) Regulations, 2015 — Regulation 30:
  Listed entities must disclose events deemed material within 30 minutes of board meeting closure or 24 hours of occurrence...
  </UNTRUSTED_STATUTORY_DOCUMENT>
  ```

### Test Query 2: `"Finance Act 2024 LTCG STCG capital gains tax rates"`
- **HTTP Endpoint**: `POST /rag/search`
- **Top Match**: `FINANCE-ACT-2024-CGT`
- **Source Authority**: Ministry of Finance, Government of India
- **Effective Date**: 2024-07-23
- **Citation URI**: `rag://statutory/finance_act_2024#FINANCE-ACT-2024-CGT`
- **Verified Statutory Data**: Long-Term Capital Gains (LTCG) 12.5%, Short-Term Capital Gains (STCG) 20.0%, Annual LTCG Exemption Limit ₹1.25 Lakh.

---

## 4. Security & Prompt Injection Defenses
All retrieved chunks are sanitized before being passed into LLM prompt contexts:
1. Chunks are wrapped in explicit `<UNTRUSTED_STATUTORY_DOCUMENT>` boundary tags.
2. System instruction overrides (e.g. `"ignore previous instructions"`, `"system:"`, `"<script>"`) are stripped or neutralized.
3. Strict point-in-time filtering ensures documents effective *after* the request `as_of_time` are rejected to eliminate lookahead bias.
