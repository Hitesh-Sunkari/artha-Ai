"""Trade, Quote, Options, News, and CorporateAction normalizers."""

from typing import Any

from arthaai.core.clock.timezone import enforce_utc
from arthaai.data.normalization.base import CURRENT_TRANSFORM_VERSION, DataNormalizer
from arthaai.data.schemas.corporate_actions import CorporateAction, CorporateActionType
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.options import GreeksProvenance, OptionContract, OptionType
from arthaai.data.schemas.quote import Quote
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade, TradeSide


class TradeNormalizer(DataNormalizer):
    @property
    def transform_version(self) -> str:
        return CURRENT_TRANSFORM_VERSION

    @property
    def source_schema(self) -> str:
        return "generic.trade.v1"

    def normalize(self, raw: dict[str, Any]) -> Trade:
        event_time = enforce_utc(raw["event_time"])
        avail_raw = raw.get("availability_time") or raw.get("received_time") or raw.get("ingested_at")
        availability_time = enforce_utc(avail_raw) if avail_raw else event_time
        availability_time_inferred = (avail_raw is None)

        side_raw = raw.get("side", TradeSide.UNKNOWN)
        side = TradeSide(side_raw) if isinstance(side_raw, str) else side_raw

        data_mode_raw = raw.get("data_mode", DataMode.HISTORICAL)
        data_mode = DataMode(data_mode_raw) if isinstance(data_mode_raw, str) else data_mode_raw

        return Trade(
            trade_id=raw.get("trade_id"),
            symbol=str(raw["symbol"]),
            exchange=str(raw["exchange"]),
            asset_class=str(raw.get("asset_class", "EQUITY")),
            event_time=event_time,
            availability_time=availability_time,
            availability_time_inferred=availability_time_inferred,
            price=float(raw["price"]),
            quantity=int(raw["quantity"]),
            side=side,
            sequence_number=int(raw["sequence_number"]) if raw.get("sequence_number") is not None else None,
            source=str(raw.get("source", "unknown")),
            data_mode=data_mode,
            transform_version=self.transform_version,
            aggressor_side_inferred=bool(raw.get("aggressor_side_inferred", False)),
            aggressor_inference_method=raw.get("aggressor_inference_method"),
        )


class QuoteNormalizer(DataNormalizer):
    @property
    def transform_version(self) -> str:
        return CURRENT_TRANSFORM_VERSION

    @property
    def source_schema(self) -> str:
        return "generic.quote.v1"

    def normalize(self, raw: dict[str, Any]) -> Quote:
        event_time = enforce_utc(raw["event_time"])
        avail_raw = raw.get("availability_time") or raw.get("received_time") or raw.get("ingested_at")
        availability_time = enforce_utc(avail_raw) if avail_raw else event_time
        availability_time_inferred = (avail_raw is None)
        data_mode = DataMode(raw.get("data_mode", DataMode.HISTORICAL))

        return Quote(
            symbol=str(raw["symbol"]),
            exchange=str(raw["exchange"]),
            asset_class=str(raw.get("asset_class", "EQUITY")),
            event_time=event_time,
            availability_time=availability_time,
            availability_time_inferred=availability_time_inferred,
            bid_price=float(raw["bid_price"]) if raw.get("bid_price") is not None else None,
            bid_size=int(raw["bid_size"]) if raw.get("bid_size") is not None else None,
            ask_price=float(raw["ask_price"]) if raw.get("ask_price") is not None else None,
            ask_size=int(raw["ask_size"]) if raw.get("ask_size") is not None else None,
            last_price=float(raw["last_price"]) if raw.get("last_price") is not None else None,
            last_size=int(raw["last_size"]) if raw.get("last_size") is not None else None,
            source=str(raw.get("source", "unknown")),
            data_mode=data_mode,
            transform_version=self.transform_version,
        )


class OptionContractNormalizer(DataNormalizer):
    @property
    def transform_version(self) -> str:
        return CURRENT_TRANSFORM_VERSION

    @property
    def source_schema(self) -> str:
        return "generic.option_contract.v1"

    def normalize(self, raw: dict[str, Any]) -> OptionContract:
        from datetime import date
        event_time = enforce_utc(raw["event_time"])
        avail_raw = raw.get("availability_time") or raw.get("received_time") or raw.get("ingested_at")
        availability_time = enforce_utc(avail_raw) if avail_raw else event_time
        availability_time_inferred = (avail_raw is None)
        data_mode = DataMode(raw.get("data_mode", DataMode.HISTORICAL))
        opt_type = OptionType(raw["option_type"])
        expiry = raw["expiry"]
        if isinstance(expiry, str):
            expiry = date.fromisoformat(expiry)

        greeks_prov_raw = raw.get("greeks_provenance")
        if greeks_prov_raw is not None:
            greeks_provenance = GreeksProvenance(greeks_prov_raw)
        elif raw.get("greeks_source") == "provider_supplied":
            greeks_provenance = GreeksProvenance.OBSERVED
        elif raw.get("greeks_source"):
            greeks_provenance = GreeksProvenance.DERIVED
        else:
            greeks_provenance = GreeksProvenance.UNAVAILABLE

        return OptionContract(
            underlying_symbol=str(raw["underlying_symbol"]),
            underlying_exchange=str(raw["underlying_exchange"]),
            contract_symbol=str(raw["contract_symbol"]),
            expiry=expiry,
            strike=float(raw["strike"]),
            option_type=opt_type,
            event_time=event_time,
            availability_time=availability_time,
            availability_time_inferred=availability_time_inferred,
            bid=float(raw["bid"]) if raw.get("bid") is not None else None,
            ask=float(raw["ask"]) if raw.get("ask") is not None else None,
            last=float(raw["last"]) if raw.get("last") is not None else None,
            volume=int(raw["volume"]) if raw.get("volume") is not None else None,
            open_interest=int(raw["open_interest"]) if raw.get("open_interest") is not None else None,
            implied_volatility=float(raw["implied_volatility"]) if raw.get("implied_volatility") else None,
            delta=float(raw["delta"]) if raw.get("delta") is not None else None,
            gamma=float(raw["gamma"]) if raw.get("gamma") is not None else None,
            theta=float(raw["theta"]) if raw.get("theta") is not None else None,
            vega=float(raw["vega"]) if raw.get("vega") is not None else None,
            greeks_provenance=greeks_provenance,
            greeks_source=raw.get("greeks_source"),
            lot_size=int(raw.get("lot_size", 50)),
            tick_size=float(raw.get("tick_size", 0.05)),
            contract_multiplier=float(raw.get("contract_multiplier", 1.0)),
            source=str(raw.get("source", "unknown")),
            data_mode=data_mode,
            transform_version=self.transform_version,
        )


class NewsNormalizer(DataNormalizer):
    @property
    def transform_version(self) -> str:
        return CURRENT_TRANSFORM_VERSION

    @property
    def source_schema(self) -> str:
        return "generic.news.v1"

    def normalize(self, raw: dict[str, Any]) -> NewsArticle:
        published_time = enforce_utc(raw["published_time"])
        avail_raw = raw.get("availability_time")
        availability_time = enforce_utc(avail_raw) if avail_raw else published_time
        availability_time_inferred = (avail_raw is None)
        data_mode = DataMode(raw.get("data_mode", DataMode.HISTORICAL))

        return NewsArticle(
            article_id=str(raw["article_id"]),
            source=str(raw["source"]),
            headline=str(raw["headline"]),
            body=raw.get("body"),
            url=raw.get("url"),
            language=str(raw.get("language", "en")),
            published_time=published_time,
            availability_time=availability_time,
            availability_time_inferred=availability_time_inferred,
            symbols=list(raw.get("symbols", [])),
            exchanges=list(raw.get("exchanges", [])),
            entities=list(raw.get("entities", [])),
            categories=list(raw.get("categories", [])),
            tags=list(raw.get("tags", [])),
            data_mode=data_mode,
            transform_version=self.transform_version,
        )


class CorporateActionNormalizer(DataNormalizer):
    @property
    def transform_version(self) -> str:
        return CURRENT_TRANSFORM_VERSION

    @property
    def source_schema(self) -> str:
        return "generic.corporate_action.v1"

    def normalize(self, raw: dict[str, Any]) -> CorporateAction:
        from datetime import date
        event_time = enforce_utc(raw["event_time"])
        avail_raw = raw.get("availability_time")
        availability_time = enforce_utc(avail_raw) if avail_raw else event_time
        availability_time_inferred = (avail_raw is None)
        data_mode = DataMode(raw.get("data_mode", DataMode.HISTORICAL))
        action_type = CorporateActionType(raw["action_type"])

        def parse_date(val: Any) -> date | None:
            if val is None:
                return None
            if isinstance(val, date):
                return val
            return date.fromisoformat(str(val))

        return CorporateAction(
            action_id=str(raw["action_id"]),
            symbol=str(raw["symbol"]),
            exchange=str(raw["exchange"]),
            isin=raw.get("isin"),
            action_type=action_type,
            announcement_date=parse_date(raw.get("announcement_date")),
            ex_date=parse_date(raw["ex_date"]),  # type: ignore[arg-type]
            record_date=parse_date(raw.get("record_date")),
            payment_date=parse_date(raw.get("payment_date")),
            ratio=raw.get("ratio"),
            dividend_amount=float(raw["dividend_amount"]) if raw.get("dividend_amount") is not None else None,
            dividend_type=raw.get("dividend_type"),
            event_time=event_time,
            availability_time=availability_time,
            availability_time_inferred=availability_time_inferred,
            source=str(raw.get("source", "unknown")),
            data_mode=data_mode,
        )
