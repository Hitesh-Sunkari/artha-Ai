"""InstrumentMaster — point-in-time safe instrument master store.

KEY INVARIANT:
  Never use today's instrument record when querying historical data.
  Always supply an as_of date to retrieve the record that was authoritative
  at that exact point in time.

This master is in-memory. A future step will persist it to PostgreSQL.
"""

from datetime import date

from arthaai.core.errors import InstrumentError
from arthaai.core.instruments.contracts import AssetClass, Exchange
from arthaai.data.instrument_master.universe import UniverseRegistry, UniverseSnapshot
from arthaai.data.schemas.instrument_record import InstrumentRecord

# Lookup key: (symbol, exchange)
_LookupKey = tuple[str, str]


class InstrumentMaster:
    """Point-in-time safe instrument master.

    Multiple versions of an instrument record can coexist.
    get_instrument() returns the version valid on the requested date.

    Example usage:
        master = InstrumentMaster()
        master.register(record)
        rec = master.get_instrument("RELIANCE", Exchange.NSE, as_of=date(2024, 1, 15))
    """

    def __init__(self) -> None:
        # Maps (symbol, exchange) -> list of InstrumentRecord ordered by valid_from ascending
        self._store: dict[_LookupKey, list[InstrumentRecord]] = {}

    def register(self, record: InstrumentRecord) -> None:
        """Registers a new instrument record version.

        If a record with overlapping validity already exists, raises InstrumentError.
        """
        key: _LookupKey = (record.symbol, record.exchange.value)
        if key not in self._store:
            self._store[key] = []

        # Check for overlapping validity windows
        for existing in self._store[key]:
            if self._overlaps(existing, record):
                raise InstrumentError(
                    f"Overlapping validity window for {record.symbol} ({record.exchange}): "
                    f"existing [{existing.valid_from} - {existing.valid_to}] overlaps "
                    f"new [{record.valid_from} - {record.valid_to}]"
                )

        self._store[key].append(record)
        self._store[key].sort(key=lambda r: r.valid_from or date.min)

    def get_instrument(self, symbol: str, exchange: Exchange, as_of: date) -> InstrumentRecord:
        """Returns the InstrumentRecord valid on as_of date.

        Raises InstrumentError if no record is found for the given date.
        """
        key: _LookupKey = (symbol, exchange.value)
        records = self._store.get(key, [])
        for record in records:
            if record.is_valid_on(as_of):
                return record
        raise InstrumentError(
            f"No instrument record found for {symbol} ({exchange}) on {as_of}. "
            "Check if the instrument was listed, active, or if the date falls within a coverage gap."
        )

    def get_instrument_or_none(
        self, symbol: str, exchange: Exchange, as_of: date
    ) -> InstrumentRecord | None:
        """Returns the InstrumentRecord valid on as_of date, or None if not found."""
        try:
            return self.get_instrument(symbol, exchange, as_of)
        except InstrumentError:
            return None

    def history_for(self, symbol: str, exchange: Exchange) -> list[InstrumentRecord]:
        """Returns all historical versions of an instrument, sorted by valid_from."""
        key: _LookupKey = (symbol, exchange.value)
        return list(self._store.get(key, []))

    def retire(self, symbol: str, exchange: Exchange, valid_to: date) -> None:
        """Sets valid_to on the current active record (marks instrument as delisted/retired)."""
        key: _LookupKey = (symbol, exchange.value)
        records = self._store.get(key, [])
        updated = []
        found = False
        for record in records:
            if record.valid_to is None:
                # Rebuild frozen model with updated valid_to
                record = record.model_copy(update={"valid_to": valid_to})
                found = True
            updated.append(record)
        if not found:
            raise InstrumentError(
                f"No active (open-ended) record found for {symbol} ({exchange}) to retire."
            )
        self._store[key] = updated

    def list_symbols(self, exchange: Exchange | None = None, asset_class: AssetClass | None = None) -> list[str]:
        """Returns distinct symbols, optionally filtered by exchange and asset class."""
        result = set()
        for (symbol, exch_val), records in self._store.items():
            if exchange is not None and exch_val != exchange.value:
                continue
            for rec in records:
                if asset_class is not None and rec.asset_class != asset_class:
                    continue
                result.add(symbol)
        return sorted(result)

    def __len__(self) -> int:
        return sum(len(v) for v in self._store.values())

    def universe_at(
        self,
        index_name: str,
        as_of: date,
        universe_registry: UniverseRegistry | None = None,
        require_verified: bool = True,
    ) -> UniverseSnapshot:
        """Resolves the point-in-time universe snapshot for index_name valid on as_of date.

        Guarantees that survivorship-biased 'today's constituents' cannot be used for historical research.
        """
        registry = universe_registry or UniverseRegistry.get_canonical_registry()
        return registry.get_universe_at(index_name, as_of, require_verified=require_verified)

    @staticmethod
    def _overlaps(a: InstrumentRecord, b: InstrumentRecord) -> bool:
        """Returns True if two records have overlapping validity windows."""
        a_from = a.valid_from or date.min
        a_to = a.valid_to or date.max
        b_from = b.valid_from or date.min
        b_to = b.valid_to or date.max
        return a_from < b_to and b_from < a_to
