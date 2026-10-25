import json

from arthaai.core.logging import StructuredLogger, redact_sensitive_data


def test_secret_redaction():
    raw_dict = {
        "user": "trader1",
        "api_key": "SUPER_SECRET_KEY_123",
        "broker_password": "MySecretPassword!",
        "auth_token": "Bearer abcdef123456",
        "nested": {
            "secret_token": "nested_secret",
            "normal_data": 42,
        },
        "list_data": [
            {"token": "item_token", "price": 25000.0}
        ]
    }
    redacted = redact_sensitive_data(raw_dict)

    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["broker_password"] == "[REDACTED]"
    assert redacted["auth_token"] == "[REDACTED]"
    assert redacted["nested"]["secret_token"] == "[REDACTED]"
    assert redacted["nested"]["normal_data"] == 42
    assert redacted["list_data"][0]["token"] == "[REDACTED]"
    assert redacted["list_data"][0]["price"] == 25000.0

def test_structured_log_record_fields():
    logger = StructuredLogger("OrderRouter")
    record = logger.info(
        operation="SUBMIT_ORDER",
        status="SUCCESS",
        message="Order submitted to simulator",
        event_id="EVT_999",
        correlation_id="CORR_ABC",
        extra={"symbol": "NIFTY", "qty": 75, "api_key": "SECRET"}
    )

    log_dict = record.to_dict()
    assert log_dict["component"] == "OrderRouter"
    assert log_dict["operation"] == "SUBMIT_ORDER"
    assert log_dict["status"] == "SUCCESS"
    assert log_dict["event_id"] == "EVT_999"
    assert log_dict["correlation_id"] == "CORR_ABC"
    assert log_dict["extra"]["api_key"] == "[REDACTED]"
    assert log_dict["extra"]["qty"] == 75

    json_str = record.to_json()
    parsed = json.loads(json_str)
    assert parsed["operation"] == "SUBMIT_ORDER"
