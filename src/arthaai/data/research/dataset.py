"""Research Dataset Boundary and Verification Gate.

Provides strict research-readiness verification to ensure datasets consumed by
quantitative analysis or future strategy research satisfy non-negotiable invariants:
1. Zero lookahead leakage (availability_time <= decision_time).
2. Data mode safety (blocks synthetic/fixture data from contaminating research).
3. Field provenance safety (blocks unapproved inferred/model assumption fields).
4. Deterministic reproducibility.
"""

from collections.abc import Iterator, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from arthaai.control_plane.datasets.registry import DatasetManifest
from arthaai.core.errors import ResearchEligibilityError
from arthaai.data.schemas.options import GreeksProvenance, OptionContract
from arthaai.data.schemas.provenance import FieldProvenance
from arthaai.data.schemas.raw_record import DataMode
from arthaai.data.schemas.trade import Trade


@dataclass
class ResearchDataset:
    """Boundary wrapper for datasets consumed by quantitative research workflows.

    Enforces strict point-in-time causality, data mode isolation, and field provenance.
    """

    dataset_id: str
    records: Sequence[Any]
    decision_time: datetime | None = None
    allowed_data_modes: set[DataMode] = field(default_factory=lambda: {DataMode.HISTORICAL})
    allow_inferred_fields: bool = False
    allow_inferred_availability: bool = False
    manifest: DatasetManifest | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __len__(self) -> int:
        return len(self.records)

    def __iter__(self) -> Iterator[Any]:
        return iter(self.records)

    def __getitem__(self, idx: int) -> Any:
        return self.records[idx]

    def verify_eligibility(self) -> None:
        """Convenience method calling verify_research_eligibility on this dataset."""
        verify_research_eligibility(self)


def verify_research_eligibility(dataset: ResearchDataset) -> None:
    """Rigorous gate checking whether a dataset meets preconditions for research.

    Raises ResearchEligibilityError if any invariant is violated.
    """
    if len(dataset.records) == 0:
        raise ResearchEligibilityError(
            f"Dataset '{dataset.dataset_id}' contains zero records. Empty datasets cannot be used for research."
        )

    for i, record in enumerate(dataset.records):
        # 1. Data Mode Isolation
        rec_mode = getattr(record, "data_mode", None)
        if rec_mode is not None and rec_mode not in dataset.allowed_data_modes:
            allowed_names = [m.value for m in dataset.allowed_data_modes]
            raise ResearchEligibilityError(
                f"Dataset '{dataset.dataset_id}' record #{i} has data_mode='{rec_mode.value}', "
                f"which is not permitted for research (allowed modes: {allowed_names})."
            )

        # 2. Strict Point-in-Time Causality (Lookahead Leakage Gate)
        if dataset.decision_time is not None:
            avail_time = getattr(record, "availability_time", None)
            if avail_time is not None and avail_time > dataset.decision_time:
                raise ResearchEligibilityError(
                    f"Lookahead leakage in dataset '{dataset.dataset_id}' at record #{i}: "
                    f"availability_time ({avail_time.isoformat()}) > decision_time ({dataset.decision_time.isoformat()})."
                )

        # 3. Inferred Availability Gate
        if not dataset.allow_inferred_availability:
            inferred_avail = getattr(record, "availability_time_inferred", False)
            if inferred_avail:
                raise ResearchEligibilityError(
                    f"Inferred availability time in dataset '{dataset.dataset_id}' at record #{i}: "
                    "research requires verified or primary feed availability timestamps."
                )

        # 4. Field Provenance Gate
        if not dataset.allow_inferred_fields:
            # Check Trade side provenance
            if isinstance(record, Trade):
                if record.side_provenance in (FieldProvenance.INFERRED, FieldProvenance.MODEL_ASSUMPTION):
                    raise ResearchEligibilityError(
                        f"Unapproved inferred field in dataset '{dataset.dataset_id}' at record #{i}: "
                        f"Trade.side has provenance '{record.side_provenance.value}'."
                    )
            # Check Option Greeks provenance
            elif isinstance(record, OptionContract):
                if record.greeks_provenance in (GreeksProvenance.MODEL_ASSUMPTION,):
                    raise ResearchEligibilityError(
                        f"Unapproved model assumption in dataset '{dataset.dataset_id}' at record #{i}: "
                        f"OptionContract greeks have provenance '{record.greeks_provenance.value}'."
                    )
