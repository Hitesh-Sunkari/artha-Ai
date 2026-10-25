# INDIAN MARKET RULES STATUS & PROVENANCE SPECIFICATION

**System:** ArthaAI Indian Market Data Foundation  
**Version:** 1.0.0  
**Updated:** 2026-09-11  

---

## 1. Provenance Taxonomy for Market Rules

To ensure historical research is immune to retroactive distortions or unverified assumptions, every rule in ArthaAI carries an explicit `RuleVerificationStatus`:

| Status | Meaning | System Behavior |
|--------|---------|-----------------|
| `VERIFIED` | Verified against primary exchange circular, SEBI notification, or gazette. | Active; used automatically in production and historical backtesting. |
| `UNVERIFIED` | Present in folklore, informal summaries, or blogs, but lacks primary citation. | Stored for reference; **strictly blocked** from automatic resolution. |
| `UNKNOWN` | Historical period where regulatory records are missing or unindexed. | Explicit marker; **raises MarketRuleError** immediately upon query. |
| `MODEL_ASSUMPTION` | A theoretical assumption adopted for simulation purposes. | Blocked by default; requires explicit opt-in flag in research datasets. |

---

## 2. Derivative Lot Size History

Registered in `src/arthaai/control_plane/market_rules/lot_sizes.py`.

### NIFTY 50 Index Options & Futures
| Effective From | Effective To | Lot Size | Status | Primary Source Reference | Notes |
|----------------|--------------|----------|--------|--------------------------|-------|
| 2024-11-20 | Open-ended | 25 | `VERIFIED` | SEBI Circular SEBI/HO/MRD/MRD-PoD-2/P/CIR/2024/136 | Index derivative framework rationalization |
| 2021-07-01 | 2024-11-19 | 50 | `VERIFIED` | NSE Circular Ref: 44/2021 (NSE/FAOP/48788) | Revision of market lot for index derivatives |
| 2015-10-30 | 2021-06-30 | 75 | `VERIFIED` | SEBI Circular CIR/MRD/DP/14/2015 / NSE 78/2015 | Lot size expansion |
| Earliest | 2015-10-29 | — | `UNKNOWN` | Pre-2015 SEBI records unindexed online | Resolving pre-2015 NIFTY raises `MarketRuleError` |

### BANKNIFTY Index Options & Futures
| Effective From | Effective To | Lot Size | Status | Primary Source Reference | Notes |
|----------------|--------------|----------|--------|--------------------------|-------|
| 2024-11-20 | Open-ended | 15 | `VERIFIED` | SEBI Circular SEBI/HO/MRD/MRD-PoD-2/P/CIR/2024/136 | Regulatory lot size minimum revision |
| 2023-07-01 | 2024-11-19 | 15 | `VERIFIED` | NSE Circular Ref: 33/2023 (NSE/FAOP/57134) | Revised from 25 to 15 |
| 2020-07-01 | 2023-06-30 | 25 | `VERIFIED` | NSE Circular Ref: 44/2020 (NSE/FAOP/44820) | Revised from 20 to 25 |
| 2015-10-30 | 2020-06-30 | 20 | `VERIFIED` | SEBI Circular CIR/MRD/DP/14/2015 | Post-2015 revision |
| Earliest | 2015-10-29 | — | `UNKNOWN` | Pre-2015 records missing | Resolving pre-2015 BANKNIFTY raises `MarketRuleError` |

### FINNIFTY (Nifty Financial Services)
| Effective From | Effective To | Lot Size | Status | Primary Source Reference | Notes |
|----------------|--------------|----------|--------|--------------------------|-------|
| 2024-11-20 | Open-ended | 25 | `VERIFIED` | SEBI Circular SEBI/HO/MRD/MRD-PoD-2/P/CIR/2024/136 | Rationalization |
| 2021-01-11 | 2024-11-19 | 40 | `VERIFIED` | NSE Circular Ref: 03/2021 (NSE/FAOP/46944) | Launch contract specification |

### MIDCPNIFTY (Nifty Midcap Select)
| Effective From | Effective To | Lot Size | Status | Primary Source Reference | Notes |
|----------------|--------------|----------|--------|--------------------------|-------|
| 2024-11-20 | Open-ended | 50 | `VERIFIED` | SEBI Circular SEBI/HO/MRD/MRD-PoD-2/P/CIR/2024/136 | Rationalization |
| 2022-01-24 | 2024-11-19 | 75 | `VERIFIED` | NSE Circular Ref: 08/2022 (NSE/FAOP/51034) | Launch contract specification |

### SENSEX (BSE 30)
| Effective From | Effective To | Lot Size | Status | Primary Source Reference | Notes |
|----------------|--------------|----------|--------|--------------------------|-------|
| 2024-11-20 | Open-ended | 10 | `VERIFIED` | BSE Notice No: 20241018-45 | Rationalization |
| 2023-05-12 | 2024-11-19 | 10 | `VERIFIED` | BSE Notice No: 20230509-32 | Relaunch contract specification |

### BANKEX (BSE Bank Index)
| Effective From | Effective To | Lot Size | Status | Primary Source Reference | Notes |
|----------------|--------------|----------|--------|--------------------------|-------|
| 2024-11-20 | Open-ended | 15 | `VERIFIED` | BSE Notice No: 20241018-45 | Rationalization |
| 2023-10-16 | 2024-11-19 | 15 | `VERIFIED` | BSE Notice No: 20230922-48 | Reintroduction specification |

---

## 3. Tick Size History

Registered in `src/arthaai/control_plane/market_rules/tick_sizes.py`.

### National Stock Exchange (NSE)
- **Equity Cash Market:** Standard tick size is **₹0.05** (5 paise) across all price bands. (Source: NSE Master Circular / Capital Market Segment).
- **Equity Derivatives Market:** Standard tick size is **₹0.05** (5 paise) for all futures and options contracts. (Source: NSE F&O Master Circular).

### Bombay Stock Exchange (BSE)
- **Sub-₹100 Equity Cash Tick Size:** Effective **2023-03-05**, BSE introduced a **₹0.01** (1 paisa) tick size for equity shares priced strictly below ₹100.00.
  - *Source:* BSE Notice No: 20230220-41 (Dated: 2023-02-20).
  - *Verification Status:* `VERIFIED`.
- **Shares ≥ ₹100.00:** Standard **₹0.05** tick size.
- **BSE Equity Derivatives:** Standard **₹0.05** tick size.

---

## 4. Settlement Conventions

Registered in `src/arthaai/control_plane/market_rules/registry.py`.

### Cash Equities (NSE / BSE)
| Effective From | Effective To | Settlement Cycle | Type | Primary Source Reference |
|----------------|--------------|------------------|------|--------------------------|
| 2023-01-27 | Open-ended | `T+1` | CASH | SEBI Circular SEBI/HO/MRD2/DCAP/P/CIR/2021/628 (Final T+1 transition batch) |
| 2003-04-01 | 2023-01-26 | `T+2` | CASH | SEBI Circular SMD/POLICY/CIR-14/2003 (T+2 rollout) |

### Equity Derivatives (Stock Futures & Stock Options)
| Effective From | Effective To | Settlement Cycle | Type | Primary Source Reference |
|----------------|--------------|------------------|------|--------------------------|
| 2019-10-01 | Open-ended | `T+1` | `PHYSICAL` | SEBI Circular SEBI/HO/MRD/DP/CIR/P/2018/67 (Compulsory physical settlement of stock derivatives) |
| Inception | 2019-09-30 | `T+1` | `CASH` | Historical cash settlement convention |

### Index Derivatives (NIFTY, BANKNIFTY, SENSEX)
- Strictly **CASH** settled on `T+1` across all historical periods.

---

## 5. Expiry Conventions & Historical Overrides

### Canonical Expiry Days
- **NSE Monthly Equity & Index Derivatives:** Last **Thursday** of the contract month (NSE/F&O/001/2000).
- **NSE BANKNIFTY Monthly Derivatives:**
  - Inception to 2024-02-29: Last **Thursday** of the month.
  - Effective 2024-03-01: Shifted to last **Wednesday** of the month (NSE Circular Ref 119/2023).
- **NSE FINNIFTY Monthly Derivatives:** Last **Tuesday** of the contract month (NSE/FAOP/46944).
- **NSE MIDCPNIFTY Monthly Derivatives:** Last **Monday** of the contract month (NSE/FAOP/57924).
- **BSE SENSEX Monthly Derivatives:** Last **Friday** of the contract month (BSE Notice 20230509-32).

### Expiry Date Overrides (Special Exchange Notifications)
When a regulatory circular designates a specific non-standard expiry date (or unexpected holiday shift), it is registered in `src/arthaai/data/calendar/expiry_overrides.py`:
1. **Ayodhya Ram Mandir Consecration Holiday (2024-01-22):**
   - *Target Contract:* MIDCPNIFTY Jan 2024 Expiry.
   - *Standard Candidate:* 2024-01-22.
   - *Override Expiry:* **2024-01-20** (Special trading session held Saturday, Jan 20, 2024).
   - *Circular Reference:* NSE Circular Ref: 07/2024 (NSE/MSD/60350).
2. **Maharashtra Assembly General Elections (2024-11-20):**
   - *Target Contract:* BANKNIFTY Nov 2024 Expiry.
   - *Standard Candidate:* 2024-11-20.
   - *Override Expiry:* **2024-11-19** (Shifted to preceding Tuesday).
   - *Circular Reference:* NSE Circular Ref: 104/2024.

---

## 6. Verification and Cryptographic Integrity

To guarantee auditability across research runs:
- `MarketRuleRegistry.compute_registry_hash()` computes a SHA-256 digest of all active rules, effective dates, and verification statuses.
- The hash is recorded in `DatasetManifest.market_rule_registry_hash` and `ExperimentManifest.market_rule_hash`.
- Any historical query attempting to resolve specifications during unverified or unknown date windows raises an explicit `MarketRuleError` or `CalendarError`.
