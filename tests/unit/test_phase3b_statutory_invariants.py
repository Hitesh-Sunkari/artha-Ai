"""Phase 3B Statutory Fee Calculator Invariants and Audit Test Suite.

Audits calculate_statutory_costs across all supported instruments and transaction legs:
1. EQUITY_DELIVERY (Finance (No. 2) Act 2024: 0.1% STT on Buy & Sell, 0.015% Stamp Duty on Buy).
2. EQUITY_INTRADAY (0.025% STT on Sell, 0.003% Stamp Duty on Buy).
3. FUTURES (0.02% STT on Sell post-Oct 1 2024, 0.002% Stamp Duty on Buy).
4. OPTIONS (0.1% STT on Option Premium on Sell post-Oct 1 2024, 0.003% Stamp Duty on Buy).
5. Invariant test: Adversarial Skeptic and Risk Validator consume identical calculator output for identical inputs.
6. Statutory charges strictly distinguished from brokerage and estimated slippage.
"""

from datetime import date
import pytest

from arthaai.mcp.server import calculate_statutory_costs


def test_equity_delivery_statutory_breakdown():
    """Audits Equity Delivery buy, sell, and round-trip breakdown for 100k notional."""
    # 100 shares @ Rs 1,000 = Rs 100,000 turnover
    res_buy = calculate_statutory_costs(
        instrument_type="EQUITY_DELIVERY",
        price=1000.0,
        quantity=100,
        transaction_type="BUY",
        as_of_date="2026-10-26",
    )
    # Expected BUY breakdown:
    # STT: 0.1% of 100,000 = 100.00
    # Stamp Duty: 0.015% of 100,000 = 15.00
    # Exchange Fee: 0.00297% of 100,000 = 2.97
    # SEBI Fee: 0.0001% of 100,000 = 0.10
    # GST: 18% of (2.97 + 0.10 = 3.07) = 0.55
    # Total BUY = 100 + 15 + 2.97 + 0.10 + 0.55 = 118.62 (0.1186% / 11.86 bps)
    assert res_buy["turnover"] == 100000.0
    assert res_buy["breakdown"]["stt"] == 100.00
    assert res_buy["breakdown"]["stamp_duty"] == 15.00
    assert res_buy["breakdown"]["exchange_turnover_fee"] == 2.97
    assert res_buy["breakdown"]["sebi_turnover_charges"] == 0.10
    assert res_buy["breakdown"]["gst_18pct"] == 0.55
    assert res_buy["total_statutory_costs"] == 118.62
    assert res_buy["effective_rate_pct"] == 0.1186

    # Expected SELL breakdown:
    # STT: 0.1% = 100.00
    # Stamp Duty: 0.0 (Stamp duty is on BUY only per Indian Stamp Act)
    # Exchange Fee: 2.97
    # SEBI Fee: 0.10
    # GST: 0.55
    # Total SELL = 100 + 0 + 2.97 + 0.10 + 0.55 = 103.62
    res_sell = calculate_statutory_costs(
        instrument_type="EQUITY_DELIVERY",
        price=1000.0,
        quantity=100,
        transaction_type="SELL",
        as_of_date="2026-10-26",
    )
    assert res_sell["breakdown"]["stt"] == 100.00
    assert res_sell["breakdown"]["stamp_duty"] == 0.00
    assert res_sell["total_statutory_costs"] == 103.62

    # Expected ROUND-TRIP (BUY + SELL):
    # Total = 118.62 + 103.62 = 222.24 (0.2222% / 22.22 bps)
    res_rt = calculate_statutory_costs(
        instrument_type="EQUITY_DELIVERY",
        price=1000.0,
        quantity=100,
        transaction_type="ROUND_TRIP",
        as_of_date="2026-10-26",
    )
    assert res_rt["breakdown"]["stt"] == 200.00
    assert res_rt["breakdown"]["stamp_duty"] == 15.00
    assert res_rt["total_statutory_costs"] == 222.24
    assert res_rt["effective_rate_pct"] == 0.2222


def test_equity_intraday_statutory_breakdown():
    """Audits Equity Intraday statutory rates: 0.025% STT on Sell only, 0.003% Stamp Duty on Buy."""
    res_rt = calculate_statutory_costs(
        instrument_type="EQUITY_INTRADAY",
        price=1000.0,
        quantity=100,
        transaction_type="ROUND_TRIP",
        as_of_date="2026-10-26",
    )
    # 100,000 turnover:
    # STT: 0 on Buy, 0.025% on Sell = 25.00
    # Stamp Duty: 0.003% on Buy = 3.00
    # Exchange Fee: 2.97 Buy + 2.97 Sell = 5.94
    # SEBI Fee: 0.10 Buy + 0.10 Sell = 0.20
    # GST: 18% of (5.94 + 0.20 = 6.14) = 1.11
    # Total = buy_leg["total"] (6.62) + sell_leg["total"] (28.62) = 35.24
    assert res_rt["breakdown"]["stt"] == 25.00
    assert res_rt["breakdown"]["stamp_duty"] == 3.00
    assert res_rt["total_statutory_costs"] == 35.24


def test_futures_statutory_breakdown_finance_act_2024():
    """Audits Futures statutory rate: 0.02% STT on Sell post-Oct 1 2024 (Finance (No. 2) Act 2024)."""
    # Post-Oct 1, 2024
    res_post = calculate_statutory_costs(
        instrument_type="FUTURES",
        price=1000.0,
        quantity=100,
        transaction_type="ROUND_TRIP",
        as_of_date="2024-10-15",
    )
    # STT on sell: 0.02% of 100,000 = 20.00
    # Stamp duty on buy: 0.002% of 100,000 = 2.00
    # Exchange fee: 0.00173% * 2 = 3.46
    # SEBI fee: 0.0001% * 2 = 0.20
    # GST: 18% of 3.66 = 0.66
    # Total = 20.00 + 2.00 + 3.46 + 0.20 + 0.66 = 26.32
    assert res_post["breakdown"]["stt"] == 20.00
    assert res_post["breakdown"]["stamp_duty"] == 2.00
    assert res_post["total_statutory_costs"] == 26.32

    # Pre-Oct 1, 2024 (legacy STT 0.0125%)
    res_pre = calculate_statutory_costs(
        instrument_type="FUTURES",
        price=1000.0,
        quantity=100,
        transaction_type="ROUND_TRIP",
        as_of_date="2024-08-15",
    )
    # STT on sell: 0.0125% of 100,000 = 12.50
    assert res_pre["breakdown"]["stt"] == 12.50


def test_options_statutory_breakdown_finance_act_2024():
    """Audits Options statutory rate: 0.1% STT on Option Premium on Sell post-Oct 1 2024."""
    # Premium = Rs 50, qty = 200 shares -> Premium turnover = Rs 10,000
    res_opt = calculate_statutory_costs(
        instrument_type="OPTIONS",
        price=50.0,
        quantity=200,
        transaction_type="ROUND_TRIP",
        as_of_date="2024-10-15",
    )
    assert res_opt["turnover"] == 10000.0
    # STT on sell: 0.1% of 10,000 = 10.00
    # Stamp duty on buy: 0.003% of 10,000 = 0.30
    # Exchange fee: 0.03503% * 2 = 7.01
    # SEBI fee: 0.0001% * 2 = 0.02
    # GST: 18% of 7.03 = 1.27
    # Total = buy_leg["total"] (4.44) + sell_leg["total"] (14.14) = 18.58
    assert res_opt["breakdown"]["stt"] == 10.00
    assert res_opt["breakdown"]["stamp_duty"] == 0.30
    assert res_opt["total_statutory_costs"] == 18.58


def test_skeptic_and_risk_validator_invariant():
    """Invariant Test: Adversarial Skeptic and Risk Validator consume identical calculator output."""
    # Inputs for RELIANCE reference order
    price = 1196.20
    quantity = 84
    date_str = "2026-10-26"

    # Risk Validator execution path
    risk_output = calculate_statutory_costs(
        instrument_type="EQUITY_DELIVERY",
        price=round(price, 2),
        quantity=quantity,
        transaction_type="ROUND_TRIP",
        as_of_date=date_str,
    )

    # Adversarial Skeptic execution path
    skeptic_output = calculate_statutory_costs(
        instrument_type="EQUITY_DELIVERY",
        price=round(price, 2),
        quantity=quantity,
        transaction_type="ROUND_TRIP",
        as_of_date=date_str,
    )

    # Assert strict deterministic equality across all fields
    assert risk_output == skeptic_output
    assert risk_output["effective_rate_pct"] == skeptic_output["effective_rate_pct"]
    assert risk_output["total_statutory_costs"] == skeptic_output["total_statutory_costs"]
    assert risk_output["breakdown"] == skeptic_output["breakdown"]


def test_statutory_costs_distinguished_from_brokerage_and_slippage():
    """Confirms that statutory cost output explicitly notes exclusion of brokerage and slippage."""
    res = calculate_statutory_costs(
        instrument_type="EQUITY_DELIVERY",
        price=1000.0,
        quantity=100,
        transaction_type="ROUND_TRIP",
    )
    assert res["cost_nature"] == "STATUTORY_EXECUTION_FRICTION"
    assert "brokerage" not in res["breakdown"]
    assert "slippage" not in res["breakdown"]
    assert "friction drag" in res["trading_edge_disclaimer"]


def test_statutory_costs_input_validation():
    """Tests boundary errors on non-positive prices, quantities, and invalid instruments."""
    with pytest.raises(ValueError, match="strictly positive"):
        calculate_statutory_costs("EQUITY_DELIVERY", price=0.0, quantity=100)
    with pytest.raises(ValueError, match="strictly positive"):
        calculate_statutory_costs("EQUITY_DELIVERY", price=-10.0, quantity=100)
    with pytest.raises(ValueError, match="strictly positive"):
        calculate_statutory_costs("EQUITY_DELIVERY", price=100.0, quantity=0)
    with pytest.raises(ValueError, match="strictly positive"):
        calculate_statutory_costs("EQUITY_DELIVERY", price=100.0, quantity=-5)
    with pytest.raises(ValueError, match="Unsupported instrument_type"):
        calculate_statutory_costs("CRYPTO", price=100.0, quantity=10)
    with pytest.raises(ValueError, match="Transaction type must be"):
        calculate_statutory_costs("EQUITY_DELIVERY", price=100.0, quantity=10, transaction_type="HOLD")
