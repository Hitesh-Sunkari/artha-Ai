"""ArthaAI Canonical Data Schemas.

All schemas are pure Pydantic models with no third-party data-provider
dependencies. Provider-specific fields are normalized at the adapter boundary
before reaching these schemas.
"""

from arthaai.data.schemas.corporate_actions import CorporateAction, CorporateActionType
from arthaai.data.schemas.derived_order_flow import DerivedOrderFlowRecord
from arthaai.data.schemas.economic import EconomicEvent, EconomicEventImpact
from arthaai.data.schemas.instrument_record import DerivativeContractIdentity, InstrumentRecord
from arthaai.data.schemas.news import NewsArticle
from arthaai.data.schemas.ohlcv import BarFrequency, OHLCVBar
from arthaai.data.schemas.options import OptionChainSnapshot, OptionContract, OptionType
from arthaai.data.schemas.orderbook import OrderBookLevel, OrderBookSnapshot, OrderBookUpdate
from arthaai.data.schemas.provenance import FieldProvenance, ProvenanceMetadata
from arthaai.data.schemas.quote import L1Quote, Quote
from arthaai.data.schemas.raw_record import DataMode, RawDataRecord
from arthaai.data.schemas.trade import Trade, TradeSide

__all__ = [
    "DataMode",
    "RawDataRecord",
    "InstrumentRecord",
    "DerivativeContractIdentity",
    "OHLCVBar",
    "BarFrequency",
    "Trade",
    "TradeSide",
    "Quote",
    "L1Quote",
    "OrderBookLevel",
    "OrderBookSnapshot",
    "OrderBookUpdate",
    "OptionContract",
    "OptionChainSnapshot",
    "OptionType",
    "CorporateAction",
    "CorporateActionType",
    "NewsArticle",
    "EconomicEvent",
    "EconomicEventImpact",
    "FieldProvenance",
    "ProvenanceMetadata",
    "DerivedOrderFlowRecord",
]
