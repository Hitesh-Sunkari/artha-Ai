# Market Rule Provenance

ArthaAI enforces explicit source verification for every historical market rule
(expiry conventions, lot sizes, tick sizes, circuit breaker parameters, etc.).

Only rules with erification_status = VERIFIED may be used automatically
by production calendar / contract-resolution logic.

UNVERIFIED and UNKNOWN rules must NOT silently become production truth.

---

## Verification Status Definitions

| Status | Meaning | Production Use |
|--------|---------|----------------|
| VERIFIED | Rule is backed by a traceable exchange circular or official document | ALLOWED |
| UNVERIFIED | Rule is believed to be correct but primary source not yet confirmed | BLOCKED — raises error if used as production truth |
| UNKNOWN | Source is unavailable or rule has not been researched | BLOCKED |

---

## Registered Rules — Expiry Conventions

### NIFTY 50 Index Futures & Options

| Field | Value |
|-------|-------|
| Exchange | NSE |
| Family | NIFTY |
| Rule | Monthly expiry on last THURSDAY of month |
| Effective From | 2001-06-12 |
| Effective To | — (current) |
| Source | NSE circular — standard FO contract specification |
| Verification Status | VERIFIED |
| Notes | Weekly expiry introduced in 2019 (separate rule, not yet registered) |

### BANKNIFTY Index Futures & Options (pre-COVID)

| Field | Value |
|-------|-------|
| Exchange | NSE |
| Family | BANKNIFTY |
| Rule | Monthly expiry on last THURSDAY of month |
| Effective From | 2010-01-01 |
| Effective To | 2020-04-01 |
| Source | NSE historical records |
| Verification Status | VERIFIED |

### BANKNIFTY Index Futures & Options (post-COVID restructure)

| Field | Value |
|-------|-------|
| Exchange | NSE |
| Family | BANKNIFTY |
| Rule | Monthly expiry on last WEDNESDAY of month |
| Effective From | 2020-04-01 |
| Effective To | — (current) |
| Source | NSE circular — COVID market restructure |
| Verification Status | VERIFIED |
| Notes | Change effective for contracts expiring from April 2020 onwards |

### FINNIFTY (Financial Services Index)

| Field | Value |
|-------|-------|
| Exchange | NSE |
| Family | FINNIFTY |
| Rule | Monthly expiry on last TUESDAY of month |
| Effective From | 2021-01-19 |
| Effective To | — (current) |
| Source | NSE circular 20210119 |
| Verification Status | VERIFIED |

### MIDCPNIFTY (Midcap Select Index)

| Field | Value |
|-------|-------|
| Exchange | NSE |
| Family | MIDCPNIFTY |
| Rule | Monthly expiry on last MONDAY of month |
| Effective From | 2023-05-18 |
| Effective To | — (current) |
| Source | NSE circular 20230518 |
| Verification Status | VERIFIED |

### BSE SENSEX Futures & Options

| Field | Value |
|-------|-------|
| Exchange | BSE |
| Family | SENSEX |
| Rule | Monthly expiry on last FRIDAY of month |
| Effective From | 2023-05-19 |
| Effective To | — (current) |
| Source | BSE circular 20230519 |
| Verification Status | VERIFIED |

---

## Registered Rules — Lot Size Changes

### NIFTY Lot Size Increase (2015)

| Field | Value |
|-------|-------|
| Exchange | NSE |
| Family | NIFTY |
| Rule | Lot size changed from 50 to 75 |
| Effective From | 2015-10-30 |
| Source | SEBI circular SEBI/HO/MRD1/DF2/CIR/P/2019/046 |
| Verification Status | VERIFIED |

### BANKNIFTY Lot Size Increase (2015)

| Field | Value |
|-------|-------|
| Exchange | NSE |
| Family | BANKNIFTY |
| Rule | Lot size changed from 20 to 25 |
| Effective From | 2015-10-30 |
| Source | SEBI circular SEBI/HO/MRD1/DF2/CIR/P/2019/046 |
| Verification Status | VERIFIED |

---

## Rules That Are NOT Registered (Gaps)

The following are known historical market rules that have NOT yet been registered
because primary source verification is pending:

| Rule | Status | Reason |
|------|--------|--------|
| NIFTY lot size prior to 2015 (was 50; pre-2010 may have been different) | UNKNOWN | No primary source verified for pre-2010 lot size |
| BANKNIFTY lot size prior to 2015 (was 20; what before 2010?) | UNKNOWN | No primary source verified |
| NSE weekly expiry introduction (NIFTY weekly, 2019) | UNVERIFIED | Need specific circular reference |
| BANKEX (BSE) expiry conventions | UNKNOWN | Not researched |
| MIDCPNIFTY lot size | UNKNOWN | Not researched |
| FINNIFTY lot size | UNKNOWN | Not researched |
| Pre-T+1 settlement vs T+2 for equity | UNVERIFIED | SEBI circular research pending |

> **Policy:** Until a primary source is found and the erification_status
> is updated to VERIFIED, these rules MUST NOT be used in any production
> backtest, strategy evaluation, or dataset construction that depends on
> historical contract specifications.

---

## How to Add a New Verified Rule

`python
from arthaai.control_plane.market_rules.registry import MarketRuleRegistry, IndianMarketRule
from arthaai.core.instruments.contracts import RuleVerificationStatus

registry = MarketRuleRegistry()
registry.register(IndianMarketRule(
    exchange="NSE",
    family="NIFTY",
    rule_name="weekly_expiry_thursday",
    effective_from=date(2019, 2, 11),
    effective_to=None,
    source_document="NSE circular: Introduction of weekly index options, Ref: NSE/FAOP/38999",
    source_pub_date=date(2019, 2, 1),
    verification_status=RuleVerificationStatus.VERIFIED,
    notes="Weekly NIFTY options introduced; expire every Thursday",
))
`

Setting erification_status=RuleVerificationStatus.UNVERIFIED will cause the
rule to be stored but blocked from automatic production use. It will appear in
audit logs and provenance reports with a BLOCKED flag.
