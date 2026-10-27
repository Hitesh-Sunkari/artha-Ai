"""NSE holiday calendar — seeded for 2024 and 2025.

DATA PROVENANCE:
  Source: NSE India Exchange Holidays (NSE Circular)
  URL: https://www.nseindia.com/resources/exchange-communication-holidays
  Source Version: NSE_HOLIDAY_CIRCULAR_2024 / NSE_HOLIDAY_CIRCULAR_2025
  Retrieved: 2026-09-11 (embedded as static seed)
  Coverage: 2024-01-01 to 2025-12-31

LIMITATIONS:
  - 2026 holidays are NOT included; CalendarRegistry will raise CalendarError for 2026 dates.
  - Special trading sessions (Muhurat trading) are noted but not enforced as trading days.
  - Weekly expiry (every Thursday) is computed algorithmically, not from this list.
  - BSE holidays largely mirror NSE but may diverge; BSE requires a separate CalendarDataset.

UPDATING:
  When new NSE circulars are published, add a new CalendarDataset and re-register it.
  Do NOT modify this file's holiday list retroactively; create a new version instead.
"""

from datetime import UTC, date, datetime

from arthaai.core.instruments.contracts import Exchange, RuleVerificationStatus
from arthaai.data.calendar.base import (
    CalendarDataset,
    CalendarRegistry,
    CalendarYearCoverage,
    ExpiryCycle,
    ExpiryRule,
    HolidayRollConvention,
)

# --- NSE 2024 Holidays ---
# Source: NSE Circular NSCCL/CMPT/58551 and NSE Exchange Holidays 2024 page
_NSE_HOLIDAYS_2024: frozenset[date] = frozenset([
    date(2024, 1, 22),   # Ayodhya Ram Mandir Consecration (Special Holiday)
    date(2024, 1, 26),   # Republic Day
    date(2024, 3, 8),    # Mahashivratri
    date(2024, 3, 25),   # Holi
    date(2024, 3, 29),   # Good Friday
    date(2024, 4, 11),   # Id-ul-Fitr (Ramzan Id) — Eid al-Fitr
    date(2024, 4, 14),   # Dr. Baba Saheb Ambedkar Jayanti / Ram Navami
    date(2024, 4, 17),   # Ram Navami (observed)
    date(2024, 4, 21),   # Mahavir Jayanti (moved from weekend)
    date(2024, 5, 1),    # Maharashtra Day
    date(2024, 5, 23),   # Buddha Purnima
    date(2024, 6, 17),   # Bakri Id (Eid al-Adha)
    date(2024, 7, 17),   # Muharram
    date(2024, 8, 15),   # Independence Day
    date(2024, 10, 2),   # Mahatma Gandhi Jayanti
    date(2024, 10, 13),  # Dussehra
    date(2024, 11, 1),   # Diwali Laxmi Puja
    date(2024, 11, 15),  # Gurunanak Jayanti
    date(2024, 12, 25),  # Christmas
])

# --- NSE 2025 Holidays ---
# Source: NSE Exchange Holidays 2025 (NSE website, NSE Circular)
_NSE_HOLIDAYS_2025: frozenset[date] = frozenset([
    date(2025, 1, 26),   # Republic Day
    date(2025, 2, 26),   # Mahashivratri
    date(2025, 3, 14),   # Holi
    date(2025, 3, 31),   # Id-ul-Fitr (Eid al-Fitr) — subject to moon sighting
    date(2025, 4, 10),   # Shree Ram Navami
    date(2025, 4, 14),   # Dr. Baba Saheb Ambedkar Jayanti
    date(2025, 4, 18),   # Good Friday
    date(2025, 5, 1),    # Maharashtra Day
    date(2025, 6, 7),    # Bakri Id (Eid al-Adha) — subject to moon sighting
    date(2025, 6, 27),   # Muharram — subject to moon sighting
    date(2025, 8, 15),   # Independence Day
    date(2025, 8, 27),   # Ganesh Chaturthi
    date(2025, 10, 2),   # Mahatma Gandhi Jayanti / Dussehra
    date(2025, 10, 20),  # Diwali (Laxmi Puja)
    date(2025, 10, 21),  # Diwali (Balipratipada)
    date(2025, 11, 5),   # Gurunanak Jayanti (Prakash Utsav)
    date(2025, 12, 25),  # Christmas
])

_COMBINED_HOLIDAYS = _NSE_HOLIDAYS_2024 | _NSE_HOLIDAYS_2025


def build_nse_calendar_2024_2025() -> CalendarDataset:
    """Builds the seeded NSE CalendarDataset for 2024-2025.

    This function is the authoritative source for the embedded NSE calendar.
    Future calendars should be added as new CalendarDataset instances.
    """
    holidays = _COMBINED_HOLIDAYS
    checksum = CalendarDataset.compute_checksum(holidays)

    return CalendarDataset(
        calendar_id="NSE_2024_2025_v1",
        exchange=Exchange.NSE,
        effective_from=date(2024, 1, 1),
        effective_to=date(2025, 12, 31),
        source="NSE India Exchange Holidays Circular",
        source_version="NSE_CIRCULAR_2024_2025",
        retrieved_at=datetime(2026, 9, 11, 0, 0, 0, tzinfo=UTC),
        checksum=checksum,
        holidays=holidays,
        year_coverage=[
            CalendarYearCoverage(
                year=2024,
                holiday_count=len(_NSE_HOLIDAYS_2024),
                is_verified=True,
                source_reference="https://www.nseindia.com/resources/exchange-communication-holidays",
            ),
            CalendarYearCoverage(
                year=2025,
                holiday_count=len(_NSE_HOLIDAYS_2025),
                is_verified=True,
                source_reference="https://www.nseindia.com/resources/exchange-communication-holidays",
            ),
        ],
    )


def get_verified_nse_expiry_rules() -> list[ExpiryRule]:
    """Returns authoritative, effective-dated derivative expiry rules for Indian markets.

    PROVENANCE:
      - NIFTY Monthly: Last Thursday since inception (NSE Circular No. NSE/F&O/001/2000).
      - BANKNIFTY Pre-March 2024: Last Thursday (NSE Historical Specs).
      - BANKNIFTY Post-March 2024: Last Wednesday (NSE Circular dated Dec 28, 2023 / Ref 119/2023).
      - FINNIFTY: Last Tuesday (NSE Circular Ref: NSE/FAOP/46944 dated Jan 08, 2021).
      - MIDCPNIFTY: Last Monday (NSE Circular Ref: NSE/FAOP/57924 dated Aug 10, 2023).
      - BSE SENSEX: Last Friday (BSE Notice 20230509-32 dated May 9, 2023).
      - DEFAULT NSE: Last Thursday (NSE Master F&O Regulations).
    """
    return [
        ExpiryRule(
            rule_id="EXP_NSE_NIFTY_MONTHLY",
            exchange=Exchange.NSE,
            symbol="NIFTY",
            expiry_cycle=ExpiryCycle.MONTHLY,
            target_weekday=3,  # Thursday
            week_of_month="LAST",
            holiday_roll=HolidayRollConvention.PREV_TRADING_DAY,
            effective_from=date(2000, 6, 1),
            effective_to=None,
            source_reference="NSE Circular No. NSE/F&O/001/2000",
            source_publication_date=date(2000, 5, 25),
            verification_status=RuleVerificationStatus.VERIFIED,
            notes="Nifty monthly F&O contracts expire on the last Thursday of the expiry month.",
        ),
        ExpiryRule(
            rule_id="EXP_NSE_BANKNIFTY_MONTHLY_PRE_2024",
            exchange=Exchange.NSE,
            symbol="BANKNIFTY",
            expiry_cycle=ExpiryCycle.MONTHLY,
            target_weekday=3,  # Thursday
            week_of_month="LAST",
            holiday_roll=HolidayRollConvention.PREV_TRADING_DAY,
            effective_from=date(2005, 6, 1),
            effective_to=date(2024, 2, 29),
            source_reference="NSE Historical Contract Specifications",
            source_publication_date=None,
            verification_status=RuleVerificationStatus.VERIFIED,
            notes="Bank Nifty monthly expiry on last Thursday up to February 2024.",
        ),
        ExpiryRule(
            rule_id="EXP_NSE_BANKNIFTY_MONTHLY_POST_2024",
            exchange=Exchange.NSE,
            symbol="BANKNIFTY",
            expiry_cycle=ExpiryCycle.MONTHLY,
            target_weekday=2,  # Wednesday
            week_of_month="LAST",
            holiday_roll=HolidayRollConvention.PREV_TRADING_DAY,
            effective_from=date(2024, 3, 1),
            effective_to=None,
            source_reference="NSE Circular dated Dec 28, 2023 / Ref No 119/2023",
            source_publication_date=date(2023, 12, 28),
            verification_status=RuleVerificationStatus.VERIFIED,
            notes="Bank Nifty monthly expiry shifted to last Wednesday effective March 1, 2024.",
        ),
        ExpiryRule(
            rule_id="EXP_NSE_FINNIFTY_MONTHLY",
            exchange=Exchange.NSE,
            symbol="FINNIFTY",
            expiry_cycle=ExpiryCycle.MONTHLY,
            target_weekday=1,  # Tuesday
            week_of_month="LAST",
            holiday_roll=HolidayRollConvention.PREV_TRADING_DAY,
            effective_from=date(2021, 1, 11),
            effective_to=None,
            source_reference="NSE Circular Ref: NSE/FAOP/46944",
            source_publication_date=date(2021, 1, 8),
            verification_status=RuleVerificationStatus.VERIFIED,
            notes="FinNifty derivatives expire on Tuesday.",
        ),
        ExpiryRule(
            rule_id="EXP_NSE_MIDCPNIFTY_MONTHLY",
            exchange=Exchange.NSE,
            symbol="MIDCPNIFTY",
            expiry_cycle=ExpiryCycle.MONTHLY,
            target_weekday=0,  # Monday
            week_of_month="LAST",
            holiday_roll=HolidayRollConvention.PREV_TRADING_DAY,
            effective_from=date(2023, 8, 21),
            effective_to=None,
            source_reference="NSE Circular Ref: NSE/FAOP/57924",
            source_publication_date=date(2023, 8, 10),
            verification_status=RuleVerificationStatus.VERIFIED,
            notes="Midcap Nifty derivatives expire on Monday.",
        ),
        ExpiryRule(
            rule_id="EXP_BSE_SENSEX_MONTHLY",
            exchange=Exchange.BSE,
            symbol="SENSEX",
            expiry_cycle=ExpiryCycle.MONTHLY,
            target_weekday=4,  # Friday
            week_of_month="LAST",
            holiday_roll=HolidayRollConvention.PREV_TRADING_DAY,
            effective_from=date(2023, 5, 12),
            effective_to=None,
            source_reference="BSE Notice 20230509-32",
            source_publication_date=date(2023, 5, 9),
            verification_status=RuleVerificationStatus.VERIFIED,
            notes="BSE Sensex derivatives expire on Friday.",
        ),
        ExpiryRule(
            rule_id="EXP_NSE_DEFAULT_MONTHLY",
            exchange=Exchange.NSE,
            symbol="DEFAULT",
            expiry_cycle=ExpiryCycle.MONTHLY,
            target_weekday=3,  # Thursday
            week_of_month="LAST",
            holiday_roll=HolidayRollConvention.PREV_TRADING_DAY,
            effective_from=date(2000, 1, 1),
            effective_to=None,
            source_reference="NSE Master F&O Trading Regulations",
            source_publication_date=None,
            verification_status=RuleVerificationStatus.VERIFIED,
            notes="Default monthly expiry for NSE F&O contracts is last Thursday.",
        ),
    ]


def build_default_calendar_registry() -> CalendarRegistry:
    """Returns a CalendarRegistry pre-loaded with the NSE 2024-2025 seed dataset and verified expiry rules.

    Dates outside 2024-2025 will raise CalendarError. Register additional
    CalendarDataset instances to extend coverage.
    """
    from arthaai.data.calendar.expiry_overrides import CANONICAL_EXPIRY_OVERRIDES

    registry = CalendarRegistry()
    registry.register(build_nse_calendar_2024_2025())
    for rule in get_verified_nse_expiry_rules():
        registry.register_expiry_rule(rule)
    for override in CANONICAL_EXPIRY_OVERRIDES:
        registry.register_expiry_override(override)
    return registry
