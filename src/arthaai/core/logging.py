import json
import logging
import re
from datetime import UTC, datetime
from typing import Any

SENSITIVE_PATTERNS = [
    re.compile(r"password", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"api_?key", re.IGNORECASE),
    re.compile(r"token", re.IGNORECASE),
    re.compile(r"auth", re.IGNORECASE),
]

def redact_sensitive_data(data: Any) -> Any:
    """Recursively redacts passwords, tokens, and secrets from log dictionaries."""
    if isinstance(data, dict):
        redacted = {}
        for k, v in data.items():
            if any(pat.search(str(k)) for pat in SENSITIVE_PATTERNS):
                redacted[k] = "[REDACTED]"
            else:
                redacted[k] = redact_sensitive_data(v)
        return redacted
    elif isinstance(data, list):
        return [redact_sensitive_data(item) for item in data]
    return data

class StructuredLogRecord:
    """Immutable representation of a structured, traceable log event."""

    def __init__(
        self,
        component: str,
        operation: str,
        status: str,
        message: str,
        event_id: str | None = None,
        correlation_id: str | None = None,
        extra: dict[str, Any] | None = None,
    ):
        self.timestamp = datetime.now(UTC).isoformat()
        self.component = component
        self.operation = operation
        self.status = status
        self.message = message
        self.event_id = event_id or "N/A"
        self.correlation_id = correlation_id or "N/A"
        self.extra = redact_sensitive_data(extra or {})

    def to_dict(self) -> dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "event_id": self.event_id,
            "correlation_id": self.correlation_id,
            "component": self.component,
            "operation": self.operation,
            "status": self.status,
            "message": self.message,
            "extra": self.extra,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

class StructuredLogger:
    """Logger producing JSON-formatted, traceable operational records."""

    def __init__(self, component_name: str, logger: logging.Logger | None = None):
        self.component_name = component_name
        self.logger = logger or logging.getLogger(f"arthaai.{component_name}")

    def log(
        self,
        level: int,
        operation: str,
        status: str,
        message: str,
        event_id: str | None = None,
        correlation_id: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> StructuredLogRecord:
        record = StructuredLogRecord(
            component=self.component_name,
            operation=operation,
            status=status,
            message=message,
            event_id=event_id,
            correlation_id=correlation_id,
            extra=extra,
        )
        self.logger.log(level, record.to_json())
        return record

    def info(self, operation: str, status: str, message: str, **kwargs) -> StructuredLogRecord:
        return self.log(logging.INFO, operation, status, message, **kwargs)

    def error(self, operation: str, status: str, message: str, **kwargs) -> StructuredLogRecord:
        return self.log(logging.ERROR, operation, status, message, **kwargs)

    def warning(self, operation: str, status: str, message: str, **kwargs) -> StructuredLogRecord:
        return self.log(logging.WARNING, operation, status, message, **kwargs)
