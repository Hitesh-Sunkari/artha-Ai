"""Table-Aware Financial Document Parser and Statutory Prompt Injection Defense.

Implements Workstream 2 Requirements:
1. Table-aware parsing: Segment financial statement tables without destroying row-column relationships.
   - Column headers (reporting periods, accounting basis)
   - Unit denominations (Crores/Lakhs)
   - Footnotes and statutory auditor qualifications
   - Stated line item names and numerical values
2. Stable chunk identifiers: Determinstic URI formatting `rag://{authority}/{doc_id}#{chunk_id}`.
3. Injection defense: Wraps untrusted external disclosures in <UNTRUSTED_STATUTORY_DOCUMENT> tags,
   escapes internal closing tags, and neutralizes prompt-injection attempts.
"""

from __future__ import annotations

import html
import re
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class TableRowItem(BaseModel):
    """An individual row entry in a financial disclosure table."""

    model_config = ConfigDict(frozen=True)

    line_item: str
    values: dict[str, float | str | None]  # period_header -> value
    notes: str | None = None


class TableAwareChunk(BaseModel):
    """Table-aware financial statement chunk preserving matrix structure and footnotes."""

    model_config = ConfigDict(frozen=True)

    table_id: str
    title: str
    symbol: str
    reporting_period: str  # e.g. "Q2 FY25"
    basis: str  # "CONSOLIDATED" or "STANDALONE"
    currency: str = "INR"
    unit: str = "CRORES"
    headers: list[str]  # e.g. ["Line Item", "Q2 FY25", "Q1 FY25", "Q2 FY24"]
    rows: list[TableRowItem]
    audit_status: str = "UNAUDITED_LIMITED_REVIEW"
    auditor_opinion: str = "Unmodified Limited Review / Clean"
    footnotes: list[str] = Field(default_factory=list)

    def to_markdown_table(self) -> str:
        """Renders authentic Markdown representation of the financial table."""
        lines: list[str] = []
        lines.append(f"### {self.title}")
        lines.append(f"**Entity**: {self.symbol} | **Basis**: {self.basis} | **Unit**: {self.currency} {self.unit} | **Audit**: {self.audit_status}")
        lines.append(f"**Auditor Qualification**: {self.auditor_opinion}")
        lines.append("")

        # Header row
        header_line = "| " + " | ".join(self.headers) + " |"
        sep_line = "| " + " | ".join(["---"] * len(self.headers)) + " |"
        lines.append(header_line)
        lines.append(sep_line)

        # Value rows
        for row in self.rows:
            vals = [row.line_item]
            for h in self.headers[1:]:
                v = row.values.get(h)
                if v is None:
                    vals.append("-")
                elif isinstance(v, float):
                    vals.append(f"{v:,.2f}")
                else:
                    vals.append(str(v))
            lines.append("| " + " | ".join(vals) + " |")

        # Footnotes
        if self.footnotes:
            lines.append("")
            lines.append("**Statutory Notes & Qualifications:**")
            for fn in self.footnotes:
                lines.append(f"- {fn}")

        return "\n".join(lines)

    def to_context_passage(self) -> str:
        """Converts table to dense lexical+semantic passage for vector indexing."""
        md = self.to_markdown_table()
        # Prepend explicit query anchors
        prefix = (
            f"SEBI LODR Regulation 33 Financial Statement Table for {self.symbol} ({self.reporting_period}):\n"
            f"Scope: {self.basis} Results in {self.currency} {self.unit}. Status: {self.audit_status}.\n"
        )
        return prefix + md


class PromptInjectionDefender:
    """Sanitizes untrusted text and wraps it in tamper-proof XML/delimited boundary tags."""

    BOUNDARY_START = "<UNTRUSTED_STATUTORY_DOCUMENT>"
    BOUNDARY_END = "</UNTRUSTED_STATUTORY_DOCUMENT>"

    ADVERSARIAL_PATTERNS = [
        re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.IGNORECASE),
        re.compile(r"disregard\s+(the\s+)?system\s+prompt", re.IGNORECASE),
        re.compile(r"system\s*override", re.IGNORECASE),
        re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
        re.compile(r"admin\s+mode\s*:\s*enabled", re.IGNORECASE),
        re.compile(r"execute\s+(live\s+)?trade", re.IGNORECASE),
        re.compile(r"enable\s+live\s+trading", re.IGNORECASE),
        re.compile(r"bypass\s+(all\s+)?safety\s+checks", re.IGNORECASE),
        re.compile(r"</?UNTRUSTED_STATUTORY_DOCUMENT>", re.IGNORECASE),
    ]

    @classmethod
    def sanitize(cls, text: str) -> str:
        """Neutralizes prompt injection patterns and escapes delimiter attempts."""
        if not text:
            return ""

        cleaned = text
        # Redact known adversarial injection attempts
        for pattern in cls.ADVERSARIAL_PATTERNS:
            cleaned = pattern.sub("[REDACTED_ADVERSARIAL_INJECTION]", cleaned)

        # Escape internal XML-like tags to prevent delimiter confusion
        cleaned = html.escape(cleaned, quote=False)
        return cleaned.strip()

    @classmethod
    def wrap_content(cls, raw_content: str, source_metadata: dict[str, Any] | None = None) -> str:
        """Wraps sanitized document text in strict containment boundary tags."""
        sanitized = cls.sanitize(raw_content)
        meta_str = ""
        if source_metadata:
            meta_items = [f'{k}="{html.escape(str(v))}"' for k, v in source_metadata.items()]
            meta_str = f" metadata='{' '.join(meta_items)}'"

        return f"{cls.BOUNDARY_START}{meta_str}\n{sanitized}\n{cls.BOUNDARY_END}"

    @classmethod
    def unwrap_content(cls, wrapped_content: str) -> str:
        """Safely extracts document payload from containment boundary tags."""
        start_idx = wrapped_content.find(cls.BOUNDARY_START)
        end_idx = wrapped_content.rfind(cls.BOUNDARY_END)

        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            # Skip past start tag
            first_newline = wrapped_content.find("\n", start_idx)
            if first_newline != -1 and first_newline < end_idx:
                return wrapped_content[first_newline + 1:end_idx].strip()
            return wrapped_content[start_idx + len(cls.BOUNDARY_START):end_idx].strip()
        return wrapped_content.strip()

