from collections.abc import Sequence
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, model_validator

from arthaai.core.clock.timezone import enforce_utc
from arthaai.core.errors import PointInTimeError


class PointInTimeEvent(BaseModel):
    """Base contract for any information object requiring strict point-in-time causality."""
    model_config = ConfigDict(frozen=True)

    event_id: str
    event_time: datetime = Field(..., description="Timestamp when event occurred at source (UTC)")
    availability_time: datetime = Field(..., description="Timestamp when event became visible to strategies (UTC)")

    @model_validator(mode="before")
    @classmethod
    def validate_pit_timestamps(cls, data: dict) -> dict:
        if isinstance(data, dict):
            if "event_time" in data and isinstance(data["event_time"], datetime):
                data["event_time"] = enforce_utc(data["event_time"])
            if "availability_time" in data and isinstance(data["availability_time"], datetime):
                data["availability_time"] = enforce_utc(data["availability_time"])
            if "event_time" in data and "availability_time" in data:
                if data["availability_time"] < data["event_time"]:
                    raise PointInTimeError(
                        f"Point-in-time violation: availability_time ({data['availability_time']}) "
                        f"cannot precede event_time ({data['event_time']})."
                    )
        return data

T = TypeVar("T", bound=PointInTimeEvent)

class PointInTimeDataset(Generic[T]):
    """Container of point-in-time events guaranteeing zero future information leakage."""

    def __init__(self, items: Sequence[T] | None = None):
        self._items: list[T] = []
        if items:
            for item in items:
                self.add(item)

    def add(self, item: T) -> None:
        """Adds an item, maintaining chronologically sorted order by availability_time."""
        self._items.append(item)
        # Keep sorted by availability_time to allow efficient point-in-time slicing
        self._items.sort(key=lambda x: x.availability_time)

    def as_of(self, query_time: datetime) -> list[T]:
        """Returns only items that were visible at or before query_time.

        Guarantees that an earnings announcement at 16:05 is strictly invisible at 15:59.
        """
        query_utc = enforce_utc(query_time)
        return [item for item in self._items if item.availability_time <= query_utc]

    def has_future_leakage(self, query_time: datetime) -> bool:
        """Sanity check verifying no item available in the future is returned."""
        visible = self.as_of(query_time)
        query_utc = enforce_utc(query_time)
        return any(item.availability_time > query_utc for item in visible)

    def __len__(self) -> int:
        return len(self._items)
