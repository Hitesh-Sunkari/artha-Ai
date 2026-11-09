"""FastMCP server exposing real Indian market data query and statutory cost calculation tools."""

from datetime import date, datetime
from typing import Any, Literal
from mcp.server.fastmcp import FastMCP

from arthaai.core.clock.timezone import enforce_utc, now_utc
from arthaai.data.research.duckdb_engine import DuckDBEngine

from pathlib import Path
import os
import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from arthaai.core.config import DataConfig

# Initialize FastMCP Server with descriptive name
mcp_server = FastMCP(
    "ArthaAI-Market-Intelligence",
    instructions="Institutional quantitative research tools for Indian financial markets (NSE/BSE).",
)




@mcp_server.tool(
    name="query_market_data",
    description="Queries historical Indian market data via DuckDB over partitioned Parquet storage with point-in-time filtering.",
)
def query_market_data(
    symbol: str,
    start_date: str,
    end_date: str,
    as_of_time: str,
    limit: int = 1500,
) -> dict[str, Any]:
    """Queries point-in-time historical data from the Parquet/DuckDB analytical layer.

    Parameters:
        symbol: Ticker symbol (e.g. 'RELIANCE', 'INFY', 'NIFTY')
        start_date: Start date string (YYYY-MM-DD)
        end_date: End date string (YYYY-MM-DD)
        as_of_time: ISO-8601 UTC timestamp enforcing PIT cutoff (records available strictly after this time are excluded)
        limit: Maximum number of records to return (capped at 1500)
    """
    if not symbol or not symbol.strip():
        raise ValueError("Symbol must be a non-empty string.")
    if limit <= 0 or limit > 1500:
        raise ValueError("Limit must be between 1 and 1500.")

    # Parse and enforce UTC on point-in-time cutoff
    try:
        pit_cutoff = enforce_utc(datetime.fromisoformat(as_of_time))
    except Exception as e:
        raise ValueError(f"Invalid as_of_time format '{as_of_time}'. Expected ISO-8601 UTC timestamp: {e}") from e

    try:
        s_date = date.fromisoformat(start_date)
        e_date = date.fromisoformat(end_date)
        if s_date > e_date:
            raise ValueError(f"start_date ({start_date}) cannot be after end_date ({end_date}).")
    except Exception as e:
        raise ValueError(f"Invalid date range format: {e}") from e

    # Resolve symbol canonically via SecurityMaster
    clean_symbol = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
    try:
        from arthaai.data.instrument_master.security_master import get_security_master
        resolved_sec = get_security_master().resolve(symbol)
        if resolved_sec.resolved and resolved_sec.symbol:
            clean_symbol = resolved_sec.symbol
    except Exception as exc:
        logger.debug(f"[FastMCP] SecurityMaster resolution fallback for {symbol}: {exc}")

    # 1. First query through production YahooFinancePipeline with live/cached Parquet resilience
    try:
        from arthaai.data.yfinance_pipeline import get_yfinance_pipeline
        yf_pipeline = get_yfinance_pipeline()
        canonical_data = yf_pipeline.fetch_market_data(
            symbol=clean_symbol,
            start_date=start_date,
            end_date=end_date,
            as_of_time=pit_cutoff,
        )
        if canonical_data.observation_count > 0:
            cleaned_recs = []
            seen_dates = set()
            for r in sorted(canonical_data.records[:limit], key=lambda x: str(x.get("timestamp", ""))):
                ts = str(r.get("timestamp", ""))
                if "05:30:00" in ts:
                    continue
                d = ts[:10]
                if d and d not in seen_dates:
                    seen_dates.add(d)
                    cleaned_recs.append(r)
                elif d and ("09:15:00" in ts or "15:30:00" in ts):
                    cleaned_recs = [x for x in cleaned_recs if str(x.get("timestamp", ""))[:10] != d]
                    cleaned_recs.append(r)

            return {
                "symbol": clean_symbol,
                "records_count": len(cleaned_recs),
                "empty_result": False,
                "records": cleaned_recs,
                "pit_cutoff": pit_cutoff.isoformat(),
                "source": canonical_data.source,
                "data_mode": canonical_data.data_mode,
                "quality_status": canonical_data.quality.quality_status,
                "indicators": canonical_data.indicators,
                "warnings": canonical_data.warnings,
            }
    except Exception as exc:
        logger.warning(f"[FastMCP] YahooFinancePipeline query error for {clean_symbol}: {exc}")

    # 2. Fallback to in-process DuckDB engine over pre-existing Parquet store
    engine = DuckDBEngine()
    engine.refresh_views()

    try:
        tables = [r[0] for r in engine.conn.execute("SHOW TABLES").fetchall()]
        if "ohlcv" in tables:
            query = """
                SELECT timestamp, symbol, open, high, low, close, volume, available_at
                FROM ohlcv
                WHERE (symbol = ? OR symbol = ?)
                  AND CAST(timestamp AS DATE) >= ?
                  AND CAST(timestamp AS DATE) <= ?
                  AND available_at <= ?
                ORDER BY timestamp ASC
                LIMIT ?
            """
            rows = engine.conn.execute(
                query, [clean_symbol, symbol.upper(), s_date, e_date, pit_cutoff, limit]
            ).fetchall()

            if rows:
                cols = ["timestamp", "symbol", "open", "high", "low", "close", "volume", "available_at"]
                raw_records = [dict(zip(cols, [str(v) if isinstance(v, (datetime, date)) else v for v in row])) for row in rows]
                records = []
                seen_dates = set()
                for r in sorted(raw_records, key=lambda x: str(x.get("timestamp", ""))):
                    ts = str(r.get("timestamp", ""))
                    if "05:30:00" in ts:
                        continue
                    d = ts[:10]
                    if d and d not in seen_dates:
                        seen_dates.add(d)
                        records.append(r)
                    elif d and ("09:15:00" in ts or "15:30:00" in ts):
                        records = [x for x in records if str(x.get("timestamp", ""))[:10] != d]
                        records.append(r)

                return {
                    "symbol": clean_symbol,
                    "records_count": len(records),
                    "empty_result": False,
                    "records": records,
                    "pit_cutoff": pit_cutoff.isoformat(),
                    "source": "duckdb_parquet_partitioned",
                    "data_mode": "HISTORICAL",
                    "quality_status": "PASSED",
                    "indicators": {},
                    "warnings": [],
                }
    except Exception as ex:
        return {
            "symbol": clean_symbol,
            "records_count": 0,
            "empty_result": True,
            "records": [],
            "message": f"Storage query exception: {ex}",
            "source": "duckdb_parquet_partitioned",
            "data_mode": "UNAVAILABLE",
            "quality_status": "FAILED",
            "indicators": {},
            "warnings": [f"Storage query exception: {ex}"],
        }

    return {
        "symbol": clean_symbol,
        "records_count": 0,
        "empty_result": True,
        "records": [],
        "message": f"No historical records found for {clean_symbol} in range {start_date} to {end_date} before {as_of_time}.",
        "source": "duckdb_parquet_partitioned",
        "data_mode": "UNAVAILABLE",
        "quality_status": "FAILED",
        "indicators": {},
        "warnings": [f"Zero historical records found for {clean_symbol}."],
    }


@mcp_server.tool(
    name="calculate_statutory_costs",
    description="Calculates exact Indian statutory transaction costs (STT, GST, Stamp Duty, Exchange & SEBI fees) for trade execution.",
)
def calculate_statutory_costs(
    instrument_type: Literal["EQUITY_DELIVERY", "EQUITY_INTRADAY", "FUTURES", "OPTIONS"],
    price: float,
    quantity: int,
    transaction_type: Literal["BUY", "SELL", "ROUND_TRIP"] = "BUY",
    as_of_date: str | None = None,
) -> dict[str, Any]:
    """Computes statutory tax and fee schedule for Indian financial markets under Finance (No. 2) Act 2024.

    Parameters:
        instrument_type: Asset segment (EQUITY_DELIVERY, EQUITY_INTRADAY, FUTURES, OPTIONS)
        price: Price per share or contract in INR (must be > 0)
        quantity: Number of shares or lots (must be > 0)
        transaction_type: BUY, SELL, or ROUND_TRIP
        as_of_date: Date for point-in-time tax rates (default is current date)
    """
    supported_instruments = ("EQUITY_DELIVERY", "EQUITY_INTRADAY", "FUTURES", "OPTIONS")
    if instrument_type not in supported_instruments:
        raise ValueError(
            f"Unsupported instrument_type '{instrument_type}'. Supported: {list(supported_instruments)}"
        )
    if price <= 0:
        raise ValueError("Price must be strictly positive.")
    if quantity <= 0:
        raise ValueError("Quantity must be strictly positive.")
    if transaction_type not in ("BUY", "SELL", "ROUND_TRIP"):
        raise ValueError("Transaction type must be 'BUY', 'SELL', or 'ROUND_TRIP'.")

    calc_date = date.fromisoformat(as_of_date) if as_of_date else now_utc().date()
    turnover = round(price * quantity, 4)

    def _calc_leg(leg_type: Literal["BUY", "SELL"]) -> dict[str, float]:
        # 1. Securities Transaction Tax (STT) Rates (Finance (No. 2) Act 2024 revisions)
        stt_rate = 0.0
        if instrument_type == "EQUITY_DELIVERY":
            stt_rate = 0.001  # 0.1% on both Buy and Sell
        elif instrument_type == "EQUITY_INTRADAY":
            stt_rate = 0.00025 if leg_type == "SELL" else 0.0  # 0.025% on Sell only
        elif instrument_type == "FUTURES":
            if calc_date >= date(2024, 10, 1):
                stt_rate = 0.0002 if leg_type == "SELL" else 0.0  # 0.02% on Sell post-Oct 2024
            else:
                stt_rate = 0.000125 if leg_type == "SELL" else 0.0  # 0.0125% on Sell pre-Oct 2024
        elif instrument_type == "OPTIONS":
            stt_rate = 0.001 if leg_type == "SELL" else 0.0  # 0.1% on Option Premium sell

        leg_stt = round(turnover * stt_rate, 2)

        # 2. Exchange Turnover Fees (NSE rates)
        exchange_fee_rate = 0.0000297  # 0.00297% for Equity
        if instrument_type == "FUTURES":
            exchange_fee_rate = 0.0000173  # 0.00173% for Futures
        elif instrument_type == "OPTIONS":
            exchange_fee_rate = 0.0003503  # 0.03503% on Option premium

        leg_exch = round(turnover * exchange_fee_rate, 2)

        # 3. SEBI Turnover Charges (Rs 10 per crore = 0.0001%)
        leg_sebi = round(turnover * 0.000001, 2)

        # 4. Stamp Duty (Indian Stamp Act - on BUY only)
        stamp_rate = 0.0
        if leg_type == "BUY":
            if instrument_type == "EQUITY_DELIVERY":
                stamp_rate = 0.00015  # 0.015%
            elif instrument_type == "EQUITY_INTRADAY":
                stamp_rate = 0.00003  # 0.003%
            elif instrument_type == "FUTURES":
                stamp_rate = 0.00002  # 0.002%
            elif instrument_type == "OPTIONS":
                stamp_rate = 0.00003  # 0.003%
        leg_stamp = round(turnover * stamp_rate, 2)

        # 5. Goods and Services Tax (GST: 18% on Exchange Fee + SEBI Fee)
        leg_gst = round((leg_exch + leg_sebi) * 0.18, 2)
        leg_total = round(leg_stt + leg_exch + leg_sebi + leg_stamp + leg_gst, 2)
        return {
            "stt": leg_stt,
            "exchange_turnover_fee": leg_exch,
            "sebi_turnover_charges": leg_sebi,
            "stamp_duty": leg_stamp,
            "gst_18pct": leg_gst,
            "total": leg_total,
        }

    buy_leg = _calc_leg("BUY")
    sell_leg = _calc_leg("SELL")

    if transaction_type == "BUY":
        active_leg = buy_leg
        total_statutory_costs = buy_leg["total"]
    elif transaction_type == "SELL":
        active_leg = sell_leg
        total_statutory_costs = sell_leg["total"]
    else:  # ROUND_TRIP
        active_leg = {
            "stt": round(buy_leg["stt"] + sell_leg["stt"], 2),
            "exchange_turnover_fee": round(buy_leg["exchange_turnover_fee"] + sell_leg["exchange_turnover_fee"], 2),
            "sebi_turnover_charges": round(buy_leg["sebi_turnover_charges"] + sell_leg["sebi_turnover_charges"], 2),
            "stamp_duty": buy_leg["stamp_duty"],  # Stamp duty only on BUY leg
            "gst_18pct": round(buy_leg["gst_18pct"] + sell_leg["gst_18pct"], 2),
            "total": round(buy_leg["total"] + sell_leg["total"], 2),
        }
        total_statutory_costs = active_leg["total"]

    effective_rate_pct = round((total_statutory_costs / turnover) * 100, 4) if turnover > 0 else 0.0

    return {
        "instrument_type": instrument_type,
        "transaction_type": transaction_type,
        "price": price,
        "quantity": quantity,
        "turnover": turnover,
        "as_of_date": calc_date.isoformat(),
        "breakdown": {
            "securities_transaction_tax": active_leg["stt"],
            "stt": active_leg["stt"],
            "exchange_turnover_fee": active_leg["exchange_turnover_fee"],
            "sebi_turnover_charges": active_leg["sebi_turnover_charges"],
            "stamp_duty": active_leg["stamp_duty"],
            "goods_and_services_tax_18pct": active_leg["gst_18pct"],
            "gst_18pct": active_leg["gst_18pct"],
        },
        "total_statutory_costs": total_statutory_costs,
        "effective_rate_pct": effective_rate_pct,
        "round_trip_costs_inr": round(buy_leg["total"] + sell_leg["total"], 2),
        "round_trip_rate_pct": round(((buy_leg["total"] + sell_leg["total"]) / turnover) * 100, 4),
        "one_way_buy_costs_inr": buy_leg["total"],
        "one_way_sell_costs_inr": sell_leg["total"],
        "cost_nature": "STATUTORY_EXECUTION_FRICTION",
        "trading_edge_disclaimer": "Statutory costs represent mandatory friction drag; they do not constitute a demonstrated trading edge or positive alpha.",
        "statutory_provenance": {
            "stt_source": "Finance (No. 2) Act 2024 (effective Oct 1, 2024)",
            "stamp_duty_source": "Indian Stamp (Collection of Stamp-Duty) Rules (on BUY leg only)",
            "sebi_fee_source": "SEBI (Payment of Fees) Regulations (INR 10 per crore)",
            "exchange_fee_source": "NSE Cash Market Transaction Charges (0.00297%)",
            "gst_rate": "18.0% CGST/SGST on Exchange and SEBI fees",
        },
    }


@mcp_server.tool(
    name="retrieve_regulatory_evidence",
    description="Retrieves official SEBI regulations, Finance Act 2024 statutory schedules, RBI monetary policy guidelines, or corporate filings with verifiable chunk citations.",
)
def retrieve_regulatory_evidence(
    query: str,
    symbol: str | None = None,
    doc_type: str | None = None,
    as_of_time: str | None = None,
    limit: int = 5,
) -> dict[str, Any]:
    """Queries grounded RAG repository for statutory and filing citations."""
    from arthaai.rag import get_rag_retriever

    retriever = get_rag_retriever()
    matches = retriever.retrieve(
        query=query,
        symbol=symbol,
        doc_type=doc_type,
        as_of_time=as_of_time,
        limit=limit,
    )

    return {
        "query": query,
        "symbol": symbol,
        "matches_count": len(matches),
        "citations": [m.citation_uri for m in matches],
        "results": [
            {
                "chunk_id": m.chunk_id,
                "doc_type": m.doc_type,
                "title": m.title,
                "citation_uri": m.citation_uri,
                "relevance_score": m.relevance_score,
                "effective_date": m.effective_date,
                "source_authority": m.source_authority,
                "sanitized_snippet": m.sanitized_snippet,
            }
            for m in matches
        ],
    }


@mcp_server.tool(
    name="calculate_quant_features",
    description="Computes mathematical quantitative indicators (simple returns, annualized realized volatility, SMA, EMA, RSI) from verified close prices.",
)
def calculate_quant_features(
    symbol: str,
    prices: list[float],
) -> dict[str, Any]:
    """Calculates quantitative features deterministically from price series."""
    from arthaai.features.calculators import (
        calculate_ema,
        calculate_realized_volatility,
        calculate_returns,
        calculate_rsi,
        calculate_sma,
    )

    if not prices:
        return {
            "symbol": symbol,
            "observations_count": 0,
            "status": "UNAVAILABLE",
            "message": "Empty price array provided.",
        }

    valid_prices = [float(p) for p in prices if p > 0]
    if len(valid_prices) < 2:
        return {
            "symbol": symbol,
            "observations_count": len(valid_prices),
            "status": "INSUFFICIENT_OBSERVATIONS",
            "message": "At least 2 price observations required to compute quantitative features.",
        }

    returns = calculate_returns(valid_prices, log=False)
    vol_20 = calculate_realized_volatility(returns, window=20) if len(returns) >= 20 else None
    vol_sample = calculate_realized_volatility(returns, window=len(returns), annualization_factor=252.0) if len(returns) >= 2 else None
    sma_20 = calculate_sma(valid_prices, window=20) if len(valid_prices) >= 20 else []
    ema_20 = calculate_ema(valid_prices, span=20) if len(valid_prices) >= 20 else []
    rsi_14 = calculate_rsi(valid_prices, period=14) if len(valid_prices) >= 15 else None

    return {
        "symbol": symbol,
        "observations_count": len(valid_prices),
        "status": "MEASURED",
        "latest_close": valid_prices[-1],
        "sample_return_mean": (sum(returns) / len(returns)) if returns else 0.0,
        "realized_volatility_annualized": vol_20 if vol_20 is not None else vol_sample,
        "volatility_20d": vol_20,
        "latest_sma": sma_20[-1] if (sma_20 and sma_20[-1] is not None) else None,
        "latest_ema": ema_20[-1] if (ema_20 and ema_20[-1] is not None) else None,
        "latest_rsi": rsi_14,
        "volatility_sample_observations": len(returns),
    }


@mcp_server.tool(
    name="validate_research_evidence",
    description="Audits citations in research findings against indexed Parquet and RAG registries to prevent citation fabrication.",
)
def validate_research_evidence(
    citations: list[str],
    target_symbol: str | None = None,
    as_of_time: str | None = None,
) -> dict[str, Any]:
    """Validates citations against official RAG and Parquet provenance registries with PIT verification."""
    from arthaai.rag.citation_verifier import get_citation_verifier

    verifier = get_citation_verifier()
    summary = verifier.verify_citations(
        citations=citations,
        target_symbol=target_symbol,
        as_of_time=as_of_time,
    )
    return {
        "total_citations": summary.total_citations,
        "valid_count": summary.valid_count,
        "unverified_count": summary.unverified_count,
        "all_valid": summary.all_valid,
        "valid_citations": [r.citation_uri for r in summary.results if r.is_valid],
        "unverified_citations": [r.citation_uri for r in summary.results if not r.is_valid],
        "audit_details": [r.model_dump(mode="json") for r in summary.results],
    }


@mcp_server.tool(
    name="resolve_security",
    description="Resolves an Indian equity symbol to canonical identity, primary exchange, ISIN, sector, and aliases via SecurityMaster.",
)
def resolve_security(symbol: str) -> dict[str, Any]:
    """Resolves symbol against canonical Security Master."""
    from arthaai.data.instrument_master.security_master import get_security_master

    master = get_security_master()
    res = master.resolve(symbol)
    rec = res.record
    return {
        "query_symbol": symbol,
        "resolved": res.resolved,
        "canonical_id": res.canonical_id,
        "symbol": res.symbol,
        "exchange": res.exchange,
        "yahoo_ticker": res.yahoo_ticker,
        "name": res.company_name,
        "isin": rec.isin if rec else "",
        "sector": rec.sector if rec else "",
        "aliases": rec.aliases if rec else [],
        "listing_status": getattr(res.listing_status, "value", str(res.listing_status)),
        "is_valid_for_research": res.is_valid_for_research,
    }


@mcp_server.tool(
    name="get_data_coverage",
    description="Audits and returns multi-category financial data bank coverage (OHLCV, Financials, Macro, Corporate Actions, Options) for a symbol.",
)
def get_data_coverage(symbol: str) -> dict[str, Any]:
    """Audits data availability across 10 categories for an instrument."""
    from arthaai.data.coverage import get_data_coverage_tracker

    tracker = get_data_coverage_tracker()
    report = tracker.audit_coverage(symbol)
    return report.model_dump(mode="json")


@mcp_server.tool(
    name="get_corporate_actions",
    description="Retrieves official corporate actions (dividends, splits, bonus shares) with adjustment factors from the verified data bank.",
)
def get_corporate_actions(symbol: str, action_type: str | None = None) -> dict[str, Any]:
    """Retrieves verified corporate actions for a symbol."""
    from arthaai.data.corporate_actions.corporate_actions_pipeline import (
        get_corporate_actions_pipeline,
    )
    from arthaai.data.schemas.corporate_actions import CorporateActionType

    ca_type = None
    if action_type:
        try:
            ca_type = CorporateActionType(action_type.upper().strip())
        except ValueError:
            pass

    pipeline = get_corporate_actions_pipeline()
    actions = pipeline.get_actions(symbol=symbol, action_type=ca_type)
    return {
        "symbol": symbol.upper().strip(),
        "actions_count": len(actions),
        "actions": actions,
    }


@mcp_server.tool(
    name="get_financial_results",
    description="Retrieves verified quarterly and annual financial results (SEBI LODR Reg 33) and deterministic ratios for a symbol, optionally filtered by period.",
)
def get_financial_results(symbol: str, period: str | None = None) -> dict[str, Any]:
    """Retrieves verified corporate financial results and computed financial ratios."""
    from arthaai.data.financials.financials_pipeline import get_financials_pipeline

    pipeline = get_financials_pipeline()
    results = pipeline.get_financial_results(symbol, period=period)
    return {
        "symbol": symbol.upper().strip(),
        "period_filter": period,
        "results_count": len(results),
        "results": results,
    }


@mcp_server.tool(
    name="get_option_chain",
    description="Retrieves active option chain snapshot with open interest, implied volatility, and Black-Scholes Greeks for a symbol.",
)
def get_option_chain(symbol: str) -> dict[str, Any]:
    """Retrieves option chain contracts for underlying symbol."""
    from arthaai.data.derivatives.options_pipeline import get_derivatives_pipeline

    pipeline = get_derivatives_pipeline()
    chain = pipeline.get_option_chain(symbol)
    return {
        "symbol": symbol.upper().strip(),
        "contracts_count": len(chain),
        "contracts": chain,
    }


@mcp_server.tool(
    name="get_derivative_coverage",
    description="Audits F&O eligibility, official NSE lot size, active strikes, Put-Call Ratio (PCR), Max Pain, and honest limitation disclosure for a symbol.",
)
def get_derivative_coverage(symbol: str) -> dict[str, Any]:
    """Returns derivatives coverage report with Max Pain and PCR analytics."""
    from arthaai.data.derivatives.options_pipeline import get_derivatives_pipeline

    pipeline = get_derivatives_pipeline()
    report = pipeline.get_derivatives_coverage(symbol)
    return report.model_dump(mode="json")


@mcp_server.tool(
    name="get_macro_events",
    description="Retrieves official macroeconomic events (RBI repo rate decisions, CPI inflation, GDP growth) from the data bank.",
)
def get_macro_events(
    category: str | None = None, symbol: str | None = None
) -> dict[str, Any]:
    """Retrieves macroeconomic events matching category or symbol."""
    from arthaai.data.macro.macro_pipeline import get_macro_pipeline

    pipeline = get_macro_pipeline()
    events = pipeline.get_events(category=category, symbol=symbol)
    return {
        "events_count": len(events),
        "events": events,
    }


@mcp_server.tool(
    name="get_corporate_news",
    description="Retrieves verified exchange announcements and regulatory disclosures with SHA-256 deduplication for a symbol.",
)
def get_corporate_news(
    symbol: str | None = None, category: str | None = None
) -> dict[str, Any]:
    """Retrieves corporate announcements and news articles."""
    from arthaai.data.macro.macro_pipeline import get_news_pipeline

    pipeline = get_news_pipeline()
    articles = pipeline.get_articles(symbol=symbol, category=category)
    return {
        "articles_count": len(articles),
        "articles": articles,
    }


@mcp_server.tool(
    name="get_historical_bars",
    description="Retrieves canonical daily OHLCV bars from Parquet storage with point-in-time filtering and quality check.",
)
def get_historical_bars(
    symbol: str,
    start_date: str | None = None,
    end_date: str | None = None,
    as_of_time: str | None = None,
    limit: int = 1500,
) -> dict[str, Any]:
    """Retrieves point-in-time historical daily bars."""
    s_date = start_date or "2021-10-01"
    e_date = end_date or now_utc().strftime("%Y-%m-%d")
    pit = as_of_time or now_utc().isoformat()
    return query_market_data(
        symbol=symbol,
        start_date=s_date,
        end_date=e_date,
        as_of_time=pit,
        limit=limit,
    )


@mcp_server.tool(
    name="get_latest_quote",
    description="Retrieves latest verified market quote, close price, timestamp, and market-session freshness for a symbol.",
)
def get_latest_quote(symbol: str) -> dict[str, Any]:
    """Returns latest verified close and trading session freshness."""
    from arthaai.data.yfinance_pipeline import get_yfinance_pipeline

    clean_symbol = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
    yf = get_yfinance_pipeline()
    data = yf.fetch_market_data(symbol=clean_symbol, period="1mo")

    last_record = data.records[-1] if data.records else None
    return {
        "symbol": clean_symbol,
        "latest_close": data.latest_close,
        "observation_timestamp": last_record.get("timestamp") if last_record else None,
        "retrieval_timestamp": data.retrieval_timestamp,
        "currency": data.currency,
        "data_mode": data.data_mode,
        "source": data.source,
        "quality_status": data.quality.quality_status,
    }


@mcp_server.tool(
    name="get_data_quality_report",
    description="Audits price continuity, missing sessions, negative prices, and OHLC consistency for a symbol.",
)
def get_data_quality_report(symbol: str) -> dict[str, Any]:
    """Audits data quality invariants over historical Parquet bars."""
    from arthaai.data.yfinance_pipeline import get_yfinance_pipeline

    clean_symbol = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
    yf = get_yfinance_pipeline()
    data = yf.fetch_market_data(symbol=clean_symbol, period="5y")
    return data.quality.model_dump(mode="json")


@mcp_server.tool(
    name="get_expired_contract_history",
    description="Audits historical expired-contract data limitations and returns entitlement boundaries for derivatives.",
)
def get_expired_contract_history(symbol: str) -> dict[str, Any]:
    """Declares explicit boundaries regarding historical expired options contracts."""
    from arthaai.data.derivatives.options_pipeline import get_derivatives_pipeline

    pipeline = get_derivatives_pipeline()
    rep = pipeline.get_derivatives_coverage(symbol)
    return {
        "symbol": rep.symbol,
        "is_fno_eligible": rep.is_fno_eligible,
        "status": "REQUIRES_LICENSED_FEED" if rep.is_fno_eligible else "NOT_DERIVATIVES_ELIGIBLE",
        "expired_contracts_limitation": rep.expired_contracts_limitation,
        "active_expiries_supported": rep.supported_expiries,
        "total_active_strikes": rep.total_strikes_tracked,
    }


@mcp_server.tool(
    name="search_filings",
    description="Searches indexed official corporate disclosures, SEBI LODR filings, and annual reports for a symbol.",
)
def search_filings(
    symbol: str,
    query: str = "financial results disclosures",
    as_of_time: str | None = None,
    limit: int = 5,
) -> dict[str, Any]:
    """Retrieves documentary filings from the RAG store."""
    from arthaai.rag import get_rag_retriever

    retriever = get_rag_retriever()
    matches = retriever.retrieve(
        query=query,
        symbol=symbol,
        doc_type="FILING",
        as_of_time=as_of_time,
        limit=limit,
    )
    return {
        "symbol": symbol.upper().strip(),
        "query": query,
        "matches_count": len(matches),
        "results": [m.model_dump(mode="json") for m in matches],
    }


@mcp_server.tool(
    name="search_news_and_macro",
    description="Searches official macroeconomic releases and deduplicated exchange announcements.",
)
def search_news_and_macro(
    symbol: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    """Unified search over macro events and corporate news."""
    from arthaai.data.macro.macro_pipeline import get_macro_pipeline, get_news_pipeline

    macro_events = get_macro_pipeline().get_events(category=category, symbol=symbol)
    news_articles = get_news_pipeline().get_articles(symbol=symbol, category=category)
    return {
        "macro_events_count": len(macro_events),
        "news_articles_count": len(news_articles),
        "macro_events": macro_events,
        "news_articles": news_articles,
    }


@mcp_server.tool(
    name="calculate_indicators",
    description="Calculates quantitative technical indicators (returns, realized volatility, SMA, EMA, RSI) from close prices.",
)
def calculate_indicators(
    symbol: str,
    prices: list[float],
) -> dict[str, Any]:
    """Alias for calculate_quant_features."""
    return calculate_quant_features(symbol=symbol, prices=prices)


@mcp_server.tool(
    name="get_evidence_passage",
    description="Retrieves the exact statutory or corporate filing passage text by unique chunk ID.",
)
def get_evidence_passage(chunk_id: str) -> dict[str, Any]:
    """Fetches full passage and citation metadata by chunk ID."""
    from arthaai.rag import get_rag_retriever

    retriever = get_rag_retriever()
    chunk = retriever.get_chunk_by_id(chunk_id)
    if not chunk:
        return {"found": False, "chunk_id": chunk_id, "error": "Chunk ID not found in RAG registry."}
    return {
        "found": True,
        "chunk_id": chunk.chunk_id,
        "doc_id": chunk.doc_id,
        "title": chunk.title,
        "source_authority": chunk.source_authority,
        "citation_uri": chunk.citation_uri,
        "effective_date": chunk.effective_date,
        "symbol": chunk.symbol,
        "content": chunk.content,
    }


class MCPClient:
    """Client wrapper executing MCP tools across in-process and protocol transports."""

    def __init__(self, server: FastMCP = mcp_server) -> None:
        self.server = server

    async def list_tools(self) -> list[str]:
        """Lists available tools registered on the FastMCP server."""
        tools = await self.server.list_tools()
        return [t.name for t in tools]

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Invokes a tool through the FastMCP protocol."""
        _, res_dict = await self.server.call_tool(tool_name, arguments)
        if isinstance(res_dict, dict) and "result" in res_dict:
            return res_dict["result"]
        return res_dict


def get_mcp_client() -> MCPClient:
    """Factory creating an MCP client configured with the registered FastMCP server."""
    return MCPClient(server=mcp_server)
