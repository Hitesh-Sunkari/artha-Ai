from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator

from arthaai.core.orders.order import ExecutionReport, OrderIntent


class ExecutionEngine(ABC):
    @abstractmethod
    async def submit_order(self, intent: OrderIntent) -> ExecutionReport:
        """Submits an order intent and returns an execution report."""
        pass

    @abstractmethod
    async def cancel_order(self, order_intent_id: str) -> bool:
        """Cancels a pending order."""
        pass

    @abstractmethod
    def stream_reports(self) -> AsyncGenerator[ExecutionReport, None]:
        """Streams execution reports and fills."""
        pass

class SimulatedExecutionEngine(ExecutionEngine):
    """Execution engine for backtesting simulations with synthetic fill models."""
    def __init__(self, latency_ms: float = 5.0, slippage_model: str | None = "FIXED"):
        self.latency_ms = latency_ms
        self.slippage_model = slippage_model

    async def submit_order(self, intent: OrderIntent) -> ExecutionReport:
        raise NotImplementedError("Contract definition only: execution logic disabled in Step 0.7")

    async def cancel_order(self, order_intent_id: str) -> bool:
        raise NotImplementedError("Contract definition only: execution logic disabled in Step 0.7")

    async def stream_reports(self) -> AsyncGenerator[ExecutionReport, None]:
        if False:
            yield

class PaperExecutionEngine(ExecutionEngine):
    """Execution engine for live market data paper trading with simulated matching."""
    def __init__(self, initial_cash: float = 1_000_000.0):
        self.initial_cash = initial_cash

    async def submit_order(self, intent: OrderIntent) -> ExecutionReport:
        raise NotImplementedError("Contract definition only: execution logic disabled in Step 0.7")

    async def cancel_order(self, order_intent_id: str) -> bool:
        raise NotImplementedError("Contract definition only: execution logic disabled in Step 0.7")

    async def stream_reports(self) -> AsyncGenerator[ExecutionReport, None]:
        if False:
            yield
