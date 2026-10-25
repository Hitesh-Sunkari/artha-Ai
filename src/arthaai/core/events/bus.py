import asyncio
import inspect
from abc import ABC, abstractmethod
from collections import defaultdict
from collections.abc import Callable, Coroutine
from typing import Any

from arthaai.core.errors import EventError
from arthaai.core.events.market_events import MarketEvent

# Handlers can be either async coroutine functions or regular synchronous callables
EventHandler = (
    Callable[[MarketEvent], Coroutine[Any, Any, None]]
    | Callable[[MarketEvent], None]
)

class EventBus(ABC):
    """Abstract interface for event publishing and subscription."""

    @abstractmethod
    async def publish(self, event: MarketEvent) -> None:
        """Publishes an event to all subscribed handlers."""
        pass

    @abstractmethod
    def subscribe(self, event_type: type[MarketEvent], handler: EventHandler) -> None:
        """Subscribes a handler to a specific event class (or subclasses)."""
        pass

    @abstractmethod
    def unsubscribe(self, event_type: type[MarketEvent], handler: EventHandler) -> None:
        """Unsubscribes a handler."""
        pass

class InMemoryEventBus(EventBus):
    """In-memory event bus supporting asynchronous dispatch to typed handlers."""

    def __init__(self):
        self._handlers: dict[type[MarketEvent], list[EventHandler]] = defaultdict(list)

    def subscribe(self, event_type: type[MarketEvent], handler: EventHandler) -> None:
        if not issubclass(event_type, MarketEvent):
            raise EventError(f"Subscriber event_type must inherit from MarketEvent, got: {event_type}")
        if handler not in self._handlers[event_type]:
            self._handlers[event_type].append(handler)

    def unsubscribe(self, event_type: type[MarketEvent], handler: EventHandler) -> None:
        if handler in self._handlers[event_type]:
            self._handlers[event_type].remove(handler)

    async def publish(self, event: MarketEvent) -> None:
        """Dispatches event to handlers registered for this event type or any of its base classes."""
        if not isinstance(event, MarketEvent):
            raise EventError(f"Published object must be a MarketEvent instance, got: {type(event)}")

        matching_handlers: list[EventHandler] = []
        for registered_type, handlers in self._handlers.items():
            if isinstance(event, registered_type):
                matching_handlers.extend(handlers)

        tasks = []
        for handler in matching_handlers:
            if inspect.iscoroutinefunction(handler):
                tasks.append(handler(event))
            else:
                # Synchronous callable run in thread pool or invoked directly
                try:
                    handler(event)
                except Exception as e:
                    raise EventError(f"Synchronous event handler failed: {e}") from e

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in results:
                if isinstance(res, Exception):
                    raise EventError(f"Asynchronous event handler failed: {res}") from res
