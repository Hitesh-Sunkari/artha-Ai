"""Forensic audit tests for dataset reproducibility and deterministic identity."""

from datetime import UTC, datetime

from arthaai.control_plane.datasets.registry import DatasetManifest


def test_dataset_reproducibility_deterministic_fingerprint():
    """Verify that identical inputs and configurations produce the exact same fingerprint.

    same input + same configuration = same dataset identity/content
    """
    start = datetime(2024, 10, 1, 9, 15, tzinfo=UTC)
    end = datetime(2024, 10, 31, 15, 30, tzinfo=UTC)

    # Manifest 1
    m1 = DatasetManifest(
        dataset_id="ds_nifty_oct_2024",
        dataset_type="ohlcv",
        provider="simulated",
        source="simulated_generator_seed_42",
        symbols=["NIFTY"],
        start_time=start,
        end_time=end,
        record_count=5000,
        schema_version="v1",
        transform_version="v1",
        raw_checksum="a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
        parquet_path="/data/parquet/ohlcv/NSE/INDEX/2024/10/ds_nifty.parquet",
        quality_status="PASSED",
    )

    # Manifest 2 (constructed independently with identical parameters)
    m2 = DatasetManifest(
        dataset_id="ds_nifty_oct_2024_reproduced",
        dataset_type="ohlcv",
        provider="simulated",
        source="simulated_generator_seed_42",
        symbols=["NIFTY"],
        start_time=start,
        end_time=end,
        record_count=5000,
        schema_version="v1",
        transform_version="v1",
        raw_checksum="a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
        parquet_path="/data/parquet/ohlcv/NSE/INDEX/2024/10/ds_nifty_alt.parquet",
        quality_status="PASSED",
    )

    # Both content fingerprints must be identical
    fp1 = m1.compute_content_fingerprint()
    fp2 = m2.compute_content_fingerprint()

    assert fp1 == fp2
    assert len(fp1) == 64  # SHA-256


def test_dataset_reproducibility_divergence_detection():
    """Verify that any alteration in record count, schema version, or raw checksum alters the fingerprint."""
    start = datetime(2024, 10, 1, 9, 15, tzinfo=UTC)
    end = datetime(2024, 10, 31, 15, 30, tzinfo=UTC)

    base = DatasetManifest(
        dataset_id="ds_base",
        dataset_type="ohlcv",
        provider="simulated",
        source="simulated_generator_seed_42",
        symbols=["NIFTY"],
        start_time=start,
        end_time=end,
        record_count=5000,
        schema_version="v1",
        transform_version="v1",
        raw_checksum="1111111111111111111111111111111111111111111111111111111111111111",
        parquet_path="/tmp/1.parquet",
        quality_status="PASSED",
    )

    # Modified record count
    modified_records = base.model_copy(update={"record_count": 4999})
    assert base.compute_content_fingerprint() != modified_records.compute_content_fingerprint()

    # Modified transform version
    modified_transform = base.model_copy(update={"transform_version": "v2"})
    assert base.compute_content_fingerprint() != modified_transform.compute_content_fingerprint()

    # Modified raw checksum
    modified_checksum = base.model_copy(update={"raw_checksum": "2222222222222222222222222222222222222222222222222222222222222222"})
    assert base.compute_content_fingerprint() != modified_checksum.compute_content_fingerprint()
