"""Experiment manifest and registry for full computational reproducibility."""

import hashlib
import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc
from arthaai.core.errors import RegistryError


class ExperimentManifest(BaseModel):
    """Immutable manifest pinning every dependency, dataset, code version, and parameter of an experiment."""

    model_config = ConfigDict(frozen=True, protected_namespaces=())

    experiment_id: str
    created_at: datetime = Field(default_factory=now_utc)
    dataset_ids: list[str]
    dataset_fingerprints: dict[str, str]
    market_rule_hash: str
    calendar_hash: str
    schema_versions: dict[str, str]
    config: dict[str, Any]
    code_commit: str | None = None
    python_version: str | None = None
    random_seed: int | None = None
    notes: str | None = None

    def compute_experiment_fingerprint(self) -> str:
        """Computes deterministic SHA-256 fingerprint of the experiment specification."""
        payload = {
            "dataset_ids": sorted(self.dataset_ids),
            "dataset_fingerprints": {k: self.dataset_fingerprints[k] for k in sorted(self.dataset_fingerprints.keys())},
            "market_rule_hash": self.market_rule_hash,
            "calendar_hash": self.calendar_hash,
            "schema_versions": {k: self.schema_versions[k] for k in sorted(self.schema_versions.keys())},
            "config": self.config,
            "code_commit": self.code_commit,
            "random_seed": self.random_seed,
        }
        serialized = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(serialized).hexdigest()


class ExperimentRegistry:
    """Registry maintaining experiment manifests and identifying configuration diffs."""

    def __init__(self) -> None:
        self._experiments: dict[str, ExperimentManifest] = {}

    def register(self, manifest: ExperimentManifest) -> None:
        if manifest.experiment_id in self._experiments:
            raise RegistryError(f"Experiment '{manifest.experiment_id}' is already registered.")
        self._experiments[manifest.experiment_id] = manifest

    def get(self, experiment_id: str) -> ExperimentManifest:
        if experiment_id not in self._experiments:
            raise RegistryError(f"Experiment '{experiment_id}' not found.")
        return self._experiments[experiment_id]

    def compare(self, exp_id_1: str, exp_id_2: str) -> dict[str, Any]:
        """Compares two experiments and returns exact diffs."""
        e1 = self.get(exp_id_1)
        e2 = self.get(exp_id_2)

        diffs: dict[str, Any] = {}
        if e1.dataset_ids != e2.dataset_ids:
            diffs["dataset_ids"] = {"exp_1": e1.dataset_ids, "exp_2": e2.dataset_ids}
        if e1.dataset_fingerprints != e2.dataset_fingerprints:
            diffs["dataset_fingerprints"] = {"exp_1": e1.dataset_fingerprints, "exp_2": e2.dataset_fingerprints}
        if e1.market_rule_hash != e2.market_rule_hash:
            diffs["market_rule_hash"] = {"exp_1": e1.market_rule_hash, "exp_2": e2.market_rule_hash}
        if e1.calendar_hash != e2.calendar_hash:
            diffs["calendar_hash"] = {"exp_1": e1.calendar_hash, "exp_2": e2.calendar_hash}
        if e1.config != e2.config:
            diffs["config"] = {"exp_1": e1.config, "exp_2": e2.config}
        if e1.random_seed != e2.random_seed:
            diffs["random_seed"] = {"exp_1": e1.random_seed, "exp_2": e2.random_seed}
        if e1.code_commit != e2.code_commit:
            diffs["code_commit"] = {"exp_1": e1.code_commit, "exp_2": e2.code_commit}

        diffs["identical"] = len(diffs) == 0
        diffs["fingerprint_1"] = e1.compute_experiment_fingerprint()
        diffs["fingerprint_2"] = e2.compute_experiment_fingerprint()
        return diffs
