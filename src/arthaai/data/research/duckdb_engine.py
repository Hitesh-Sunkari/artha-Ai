"""DuckDB research query engine for zero-copy analytical queries over Parquet data."""

from datetime import date, datetime
from pathlib import Path
from typing import Any

import duckdb
import pyarrow as pa

from arthaai.core.config import DataConfig
from arthaai.core.errors import StorageError


class DuckDBEngine:
    """Analytical query engine over Parquet data using in-process DuckDB."""

    def __init__(self, data_root: str | Path | None = None, db_path: str = ":memory:") -> None:
        if data_root is None:
            self.data_root = DataConfig().parquet_dir
        else:
            self.data_root = Path(data_root)
        self.conn = duckdb.connect(db_path)
        # Free-tier memory optimization: constrain DuckDB buffer pool to 256MB and 2 worker threads
        try:
            self.conn.execute("SET max_memory = '256MB';")
            self.conn.execute("SET threads = 2;")
        except Exception:
            pass
        self._register_views()

    def _register_views(self) -> None:
        """Auto-registers views for standard datasets if their directories exist."""
        import logging
        logger = logging.getLogger(__name__)

        for ds in ("ohlcv", "trade", "quote", "options", "corporate_actions", "news", "economic_events"):
            ds_dir = self.data_root / ds
            if ds_dir.exists():
                parquet_pattern = (ds_dir / "**/*.parquet").as_posix()
                try:
                    self.conn.execute(f"CREATE OR REPLACE VIEW {ds} AS SELECT * FROM read_parquet('{parquet_pattern}')")
                except Exception as e:
                    # View creation might fail if no parquet files exist yet
                    if list(ds_dir.glob("**/*.parquet")):
                        logger.warning("Failed to create DuckDB view for %s: %s", ds, e)

    def refresh_views(self) -> None:
        """Re-scans data_root and refreshes registered views."""
        self._register_views()

    def execute_query(self, sql: str, params: list[Any] | None = None) -> pa.Table:
        """Executes a SQL query and returns results as a PyArrow Table (zero-copy)."""
        try:
            if params:
                return self.conn.execute(sql, params).to_arrow_table()
            return self.conn.execute(sql).to_arrow_table()
        except Exception as e:
            raise StorageError(f"DuckDB query execution failed: {e}") from e

    def query_ohlcv(
        self,
        symbol: str,
        start: datetime | None = None,
        end: datetime | None = None,
        frequency: str | None = None,
        interval: str | None = None,
        as_of_availability: datetime | None = None,
    ) -> pa.Table:
        """Queries OHLCV bars for symbol within time range with optional point-in-time availability filter."""
        ds_dir = self.data_root / "ohlcv"
        if not ds_dir.exists():
            raise StorageError(f"OHLCV dataset directory not found: {ds_dir}")

        pattern = (ds_dir / "**/*.parquet").as_posix()
        clauses = ["symbol = ?"]
        params: list[Any] = [symbol]

        if start is not None:
            clauses.append("event_time >= ?")
            params.append(start)
        if end is not None:
            clauses.append("event_time <= ?")
            params.append(end)
        effective_freq = frequency if frequency is not None else interval
        if effective_freq is not None:
            clauses.append("frequency = ?")
            params.append(effective_freq)
        if as_of_availability is not None:
            clauses.append("availability_time <= ?")
            params.append(as_of_availability)

        where_clause = " AND ".join(clauses)
        sql = f"SELECT * FROM read_parquet('{pattern}') WHERE {where_clause} ORDER BY event_time ASC"
        return self.execute_query(sql, params)

    def query_trades(
        self,
        symbol: str,
        start: datetime | None = None,
        end: datetime | None = None,
        as_of_availability: datetime | None = None,
    ) -> pa.Table:
        """Queries trade ticks for symbol within time range with point-in-time availability filter."""
        ds_dir = self.data_root / "trade"
        if not ds_dir.exists():
            raise StorageError(f"Trade dataset directory not found: {ds_dir}")

        pattern = (ds_dir / "**/*.parquet").as_posix()
        clauses = ["symbol = ?"]
        params: list[Any] = [symbol]

        if start is not None:
            clauses.append("event_time >= ?")
            params.append(start)
        if end is not None:
            clauses.append("event_time <= ?")
            params.append(end)
        if as_of_availability is not None:
            clauses.append("availability_time <= ?")
            params.append(as_of_availability)

        where_clause = " AND ".join(clauses)
        sql = f"SELECT * FROM read_parquet('{pattern}') WHERE {where_clause} ORDER BY event_time ASC"
        return self.execute_query(sql, params)

    def query_option_chain(
        self,
        underlying_symbol: str,
        expiry: date | None = None,
        as_of: datetime | None = None,
        as_of_availability: datetime | None = None,
    ) -> pa.Table:
        """Queries option chain for underlying symbol with optional expiry and point-in-time availability filter."""
        ds_dir = self.data_root / "options"
        if not ds_dir.exists():
            raise StorageError(f"Options dataset directory not found: {ds_dir}")

        pattern = (ds_dir / "**/*.parquet").as_posix()
        clauses = ["underlying_symbol = ?"]
        params: list[Any] = [underlying_symbol]

        if expiry is not None:
            clauses.append("expiry = ?")
            params.append(expiry)
        if as_of is not None:
            clauses.append("event_time <= ?")
            params.append(as_of)
        if as_of_availability is not None:
            clauses.append("availability_time <= ?")
            params.append(as_of_availability)

        where_clause = " AND ".join(clauses)
        sql = f"SELECT * FROM read_parquet('{pattern}') WHERE {where_clause} ORDER BY strike ASC, option_type ASC"
        return self.execute_query(sql, params)

    def query_corporate_actions(
        self,
        symbol: str | None = None,
        ex_date_start: date | None = None,
        ex_date_end: date | None = None,
        as_of_availability: datetime | None = None,
    ) -> pa.Table:
        """Queries corporate actions with optional symbol, date, and point-in-time availability filtering."""
        ds_dir = self.data_root / "corporate_actions"
        if not ds_dir.exists():
            raise StorageError(f"Corporate actions dataset directory not found: {ds_dir}")

        pattern = (ds_dir / "**/*.parquet").as_posix()
        clauses = []
        params: list[Any] = []

        if symbol is not None:
            clauses.append("symbol = ?")
            params.append(symbol)
        if ex_date_start is not None:
            clauses.append("ex_date >= ?")
            params.append(ex_date_start)
        if ex_date_end is not None:
            clauses.append("ex_date <= ?")
            params.append(ex_date_end)
        if as_of_availability is not None:
            clauses.append("availability_time <= ?")
            params.append(as_of_availability)

        where_clause = f" WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"SELECT * FROM read_parquet('{pattern}'){where_clause} ORDER BY ex_date DESC"
        return self.execute_query(sql, params if params else None)

    def query_news(
        self,
        symbol: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        as_of_availability: datetime | None = None,
    ) -> pa.Table:
        """Queries news articles with point-in-time availability filtering."""
        ds_dir = self.data_root / "news"
        if not ds_dir.exists():
            raise StorageError(f"News dataset directory not found: {ds_dir}")

        pattern = (ds_dir / "**/*.parquet").as_posix()
        clauses = []
        params: list[Any] = []

        if start is not None:
            clauses.append("published_time >= ?")
            params.append(start)
        if end is not None:
            clauses.append("published_time <= ?")
            params.append(end)
        if as_of_availability is not None:
            clauses.append("availability_time <= ?")
            params.append(as_of_availability)

        where_clause = f" WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"SELECT * FROM read_parquet('{pattern}'){where_clause} ORDER BY published_time DESC"
        table = self.execute_query(sql, params if params else None)

        if symbol is not None and len(table) > 0 and "symbols" in table.column_names:
            # In DuckDB array or pyarrow list filtering
            sql = f"SELECT * FROM read_parquet('{pattern}') WHERE list_contains(symbols, ?) ORDER BY published_time DESC"
            return self.execute_query(sql, [symbol])

        return table

    def query_quotes(
        self,
        symbol: str,
        start: datetime | None = None,
        end: datetime | None = None,
        as_of_availability: datetime | None = None,
    ) -> pa.Table:
        """Queries quote ticks for symbol within time range with point-in-time availability filter."""
        ds_dir = self.data_root / "quote"
        if not ds_dir.exists():
            raise StorageError(f"Quote dataset directory not found: {ds_dir}")

        pattern = (ds_dir / "**/*.parquet").as_posix()
        clauses = ["symbol = ?"]
        params: list[Any] = [symbol]

        if start is not None:
            clauses.append("event_time >= ?")
            params.append(start)
        if end is not None:
            clauses.append("event_time <= ?")
            params.append(end)
        if as_of_availability is not None:
            clauses.append("availability_time <= ?")
            params.append(as_of_availability)

        where_clause = " AND ".join(clauses)
        sql = f"SELECT * FROM read_parquet('{pattern}') WHERE {where_clause} ORDER BY event_time ASC"
        return self.execute_query(sql, params)

    def query_economic_events(
        self,
        country: str | None = None,
        category: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        as_of_availability: datetime | None = None,
    ) -> pa.Table:
        """Queries economic events with point-in-time availability filtering."""
        ds_dir = self.data_root / "economic_events"
        if not ds_dir.exists():
            raise StorageError(f"Economic events dataset directory not found: {ds_dir}")

        pattern = (ds_dir / "**/*.parquet").as_posix()
        clauses = []
        params: list[Any] = []

        if country is not None:
            clauses.append("country = ?")
            params.append(country)
        if category is not None:
            clauses.append("category = ?")
            params.append(category)
        if start is not None:
            clauses.append("event_time >= ?")
            params.append(start)
        if end is not None:
            clauses.append("event_time <= ?")
            params.append(end)
        if as_of_availability is not None:
            clauses.append("availability_time <= ?")
            params.append(as_of_availability)

        where_clause = f" WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"SELECT * FROM read_parquet('{pattern}'){where_clause} ORDER BY event_time ASC"
        return self.execute_query(sql, params if params else None)
