"""Feature Lineage & Canonical Model Re-exports.

Preserves full backward compatibility with early contracts by re-exporting the
canonical FeatureDefinition and FeatureSet from arthaai.features.core.
"""

from arthaai.features.core.definition import FeatureDefinition
from arthaai.features.core.result import FeatureResult, FeatureSet

__all__ = ["FeatureDefinition", "FeatureResult", "FeatureSet"]
