"""Canonical historical derivative lot sizes for Indian markets with authoritative provenance."""

from datetime import date

from pydantic import BaseModel, ConfigDict

from arthaai.core.instruments.contracts import RuleVerificationStatus


class LotSizeRule(BaseModel):
    """Authoritative lot size specification for a derivative instrument over a time range."""

    model_config = ConfigDict(frozen=True)

    exchange: str
    symbol: str
    lot_size: int
    effective_from: date
    effective_to: date | None = None
    source_document: str
    source_publication_date: date | None = None
    verification_status: RuleVerificationStatus = RuleVerificationStatus.VERIFIED
    notes: str | None = None

    def is_active_on(self, query_date: date) -> bool:
        if self.effective_from <= query_date:
            if self.effective_to is None or query_date <= self.effective_to:
                return True
        return False


CANONICAL_LOT_SIZES: list[LotSizeRule] = [
    # NIFTY 50
    LotSizeRule(
        exchange="NSE",
        symbol="NIFTY",
        lot_size=25,
        effective_from=date(2024, 11, 20),
        effective_to=None,
        source_document="NSE Circular Ref No: 18/2024, SEBI Revision of Contract Size",
        source_publication_date=date(2024, 10, 18),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="SEBI mandated contract size revision from Nov 20, 2024",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="NIFTY",
        lot_size=25,
        effective_from=date(2024, 4, 26),
        effective_to=date(2024, 11, 19),
        source_document="NSE Circular Ref No: 04/2024",
        source_publication_date=date(2024, 3, 28),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Lot size halved from 50 to 25",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="NIFTY",
        lot_size=50,
        effective_from=date(2021, 7, 1),
        effective_to=date(2024, 4, 25),
        source_document="NSE Circular Ref No: 28/2021",
        source_publication_date=date(2021, 3, 31),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Lot size revised from 75 to 50",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="NIFTY",
        lot_size=75,
        effective_from=date(2015, 11, 1),
        effective_to=date(2021, 6, 30),
        source_document="NSE Circular Ref No: 65/2015",
        source_publication_date=date(2015, 8, 20),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Lot size revised from 50 to 75 following SEBI circular CIR/MRD/DP/14/2015",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="NIFTY",
        lot_size=50,
        effective_from=date(2000, 6, 12),
        effective_to=date(2015, 10, 31),
        source_document="Historical SEBI/NSE Records (Pending authoritative retrieval)",
        source_publication_date=None,
        verification_status=RuleVerificationStatus.UNKNOWN,
        notes="Pre-2015 NIFTY lot sizes require archived physical NSE circular inspection",
    ),

    # BANKNIFTY
    LotSizeRule(
        exchange="NSE",
        symbol="BANKNIFTY",
        lot_size=30,
        effective_from=date(2024, 11, 20),
        effective_to=None,
        source_document="NSE Circular Ref No: 18/2024",
        source_publication_date=date(2024, 10, 18),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="SEBI mandated index lot size revision",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="BANKNIFTY",
        lot_size=15,
        effective_from=date(2023, 7, 1),
        effective_to=date(2024, 11, 19),
        source_document="NSE Circular Ref No: 34/2023",
        source_publication_date=date(2023, 6, 6),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Lot size revised from 25 to 15",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="BANKNIFTY",
        lot_size=25,
        effective_from=date(2020, 7, 1),
        effective_to=date(2023, 6, 30),
        source_document="NSE Circular Ref No: 45/2020",
        source_publication_date=date(2020, 6, 10),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Lot size revised from 20 to 25",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="BANKNIFTY",
        lot_size=20,
        effective_from=date(2016, 7, 1),
        effective_to=date(2020, 6, 30),
        source_document="NSE Circular Ref No: 52/2016",
        source_publication_date=date(2016, 6, 1),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="Lot size revised from 30 to 20",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="BANKNIFTY",
        lot_size=30,
        effective_from=date(2005, 6, 1),
        effective_to=date(2016, 6, 30),
        source_document="Historical SEBI/NSE Archive",
        source_publication_date=None,
        verification_status=RuleVerificationStatus.UNKNOWN,
        notes="Pre-2016 BANKNIFTY lot size unverified",
    ),

    # FINNIFTY (Nifty Financial Services)
    LotSizeRule(
        exchange="NSE",
        symbol="FINNIFTY",
        lot_size=65,
        effective_from=date(2024, 11, 20),
        effective_to=None,
        source_document="NSE Circular Ref No: 18/2024",
        source_publication_date=date(2024, 10, 18),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="SEBI revision from 40 to 65",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="FINNIFTY",
        lot_size=40,
        effective_from=date(2021, 1, 11),
        effective_to=date(2024, 11, 19),
        source_document="NSE Circular Ref No: 01/2021 (Contract Launch)",
        source_publication_date=date(2021, 1, 4),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="FINNIFTY derivative contracts launched with lot size 40",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="FINNIFTY",
        lot_size=0,
        effective_from=date(2000, 1, 1),
        effective_to=date(2021, 1, 10),
        source_document="N/A",
        verification_status=RuleVerificationStatus.UNKNOWN,
        notes="FINNIFTY derivatives did not exist prior to Jan 11, 2021",
    ),

    # MIDCPNIFTY (Nifty Midcap Select)
    LotSizeRule(
        exchange="NSE",
        symbol="MIDCPNIFTY",
        lot_size=120,
        effective_from=date(2024, 11, 20),
        effective_to=None,
        source_document="NSE Circular Ref No: 18/2024",
        source_publication_date=date(2024, 10, 18),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="SEBI revision from 75 to 120",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="MIDCPNIFTY",
        lot_size=75,
        effective_from=date(2022, 1, 24),
        effective_to=date(2024, 11, 19),
        source_document="NSE Circular Ref No: 05/2022 (Contract Launch)",
        source_publication_date=date(2022, 1, 14),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="MIDCPNIFTY derivatives launched with lot size 75",
    ),
    LotSizeRule(
        exchange="NSE",
        symbol="MIDCPNIFTY",
        lot_size=0,
        effective_from=date(2000, 1, 1),
        effective_to=date(2022, 1, 23),
        source_document="N/A",
        verification_status=RuleVerificationStatus.UNKNOWN,
        notes="MIDCPNIFTY derivatives did not exist prior to Jan 24, 2022",
    ),

    # BSE SENSEX
    LotSizeRule(
        exchange="BSE",
        symbol="SENSEX",
        lot_size=10,
        effective_from=date(2024, 11, 20),
        effective_to=None,
        source_document="BSE Notice No: 20241018-45",
        source_publication_date=date(2024, 10, 18),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="BSE contract revision Nov 20, 2024 (maintained at 10)",
    ),
    LotSizeRule(
        exchange="BSE",
        symbol="SENSEX",
        lot_size=10,
        effective_from=date(2023, 5, 12),
        effective_to=date(2024, 11, 19),
        source_document="BSE Notice No: 20230510-12 (Relaunch)",
        source_publication_date=date(2023, 5, 10),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="SENSEX derivatives relaunched with lot size 10",
    ),
    LotSizeRule(
        exchange="BSE",
        symbol="SENSEX",
        lot_size=15,
        effective_from=date(2000, 6, 9),
        effective_to=date(2023, 5, 11),
        source_document="Historical BSE Archive",
        verification_status=RuleVerificationStatus.UNKNOWN,
        notes="Pre-relaunch BSE SENSEX derivative contracts unverified",
    ),

    # BSE BANKEX
    LotSizeRule(
        exchange="BSE",
        symbol="BANKEX",
        lot_size=15,
        effective_from=date(2024, 11, 20),
        effective_to=None,
        source_document="BSE Notice No: 20241018-45",
        source_publication_date=date(2024, 10, 18),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="BSE contract revision Nov 20, 2024",
    ),
    LotSizeRule(
        exchange="BSE",
        symbol="BANKEX",
        lot_size=15,
        effective_from=date(2023, 5, 12),
        effective_to=date(2024, 11, 19),
        source_document="BSE Notice No: 20230510-14",
        source_publication_date=date(2023, 5, 10),
        verification_status=RuleVerificationStatus.VERIFIED,
        notes="BANKEX relaunch with lot size 15",
    ),
    LotSizeRule(
        exchange="BSE",
        symbol="BANKEX",
        lot_size=0,
        effective_from=date(2000, 1, 1),
        effective_to=date(2023, 5, 11),
        source_document="N/A",
        verification_status=RuleVerificationStatus.UNKNOWN,
        notes="BANKEX pre-relaunch rules unverified",
    ),
]
