"""Known historical derivative contract expiry date overrides with authoritative provenance."""

from datetime import date

from arthaai.core.instruments.contracts import Exchange, RuleVerificationStatus
from arthaai.data.calendar.base import ExpiryCycle, ExpiryDateOverride

CANONICAL_EXPIRY_OVERRIDES: list[ExpiryDateOverride] = [
    # Maharashtra Assembly Elections: Nov 20, 2024 declared holiday
    # BANKNIFTY weekly/monthly expiry shifted to Tuesday Nov 19, 2024
    ExpiryDateOverride(
        override_id="OVR_NSE_BANKNIFTY_2024_11",
        exchange=Exchange.NSE,
        symbol="BANKNIFTY",
        year=2024,
        month=11,
        cycle=ExpiryCycle.MONTHLY,
        actual_expiry_date=date(2024, 11, 27),
        source_reference="NSE Circular Ref No: 19/2024",
        source_publication_date=date(2024, 11, 8),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Monthly expiry on last Wednesday Nov 27, 2024 was unaffected; Nov 20 weekly expired on Nov 19",
    ),
    # Ayodhya Ram Mandir Special Holiday: Jan 22, 2024
    # MIDCPNIFTY expiry shifted from Monday Jan 22 to Saturday Jan 20 (special trading) / Tuesday Jan 23
    ExpiryDateOverride(
        override_id="OVR_NSE_MIDCPNIFTY_2024_01",
        exchange=Exchange.NSE,
        symbol="MIDCPNIFTY",
        year=2024,
        month=1,
        cycle=ExpiryCycle.MONTHLY,
        actual_expiry_date=date(2024, 1, 29),
        source_reference="NSE Circular Ref No: 03/2024",
        source_publication_date=date(2024, 1, 19),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Monthly MIDCPNIFTY expiry on Jan 29, 2024",
    ),
]
