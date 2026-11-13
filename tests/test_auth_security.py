"""ArthaAI End-to-End Authentication & Authorization Security Test Suite.

Validates:
1. Privileged admin endpoints reject unauthenticated requests with HTTP 401.
2. Privileged admin endpoints reject invalid / malformed session tokens with HTTP 401.
3. Privileged admin endpoints reject expired session tokens with HTTP 401.
4. Google ID token verification rejects missing or invalid tokens with HTTP 401.
5. Google authentication rejects unauthorized Google email addresses with HTTP 403 Forbidden.
6. Google authentication permits authorized Super-Administrator with HTTP 200 and issues session.
7. Authorized Super-Administrator can access protected admin APIs with HTTP 200.
8. Authenticated regular user (non-admin) receives HTTP 403 Forbidden when calling admin APIs.
9. Direct logout invalidates the session token; subsequent requests receive HTTP 401.
10. Attempting to spoof Super-Administrator email without cryptographic token is rejected (HTTP 401).
11. CORS preflight OPTIONS requests return appropriate headers for Vercel origins.
"""

import time
import pytest
from fastapi.testclient import TestClient

from arthaai.api.admin_telemetry import (
    telemetry_engine,
    get_super_admin_emails,
    is_super_admin_email,
    SUPER_ADMIN_EMAIL,
)
from arthaai.api.research_api import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as tc:
        yield tc


# -----------------------------------------------------------------------------
# Phase 4 — Admin API Security Tests
# -----------------------------------------------------------------------------

@pytest.mark.parametrize("path", [
    "/admin/traffic",
    "/admin/users",
    "/admin/investments",
    "/admin/errors",
    "/admin/benchmark/report",
    "/admin/evaluation/runs",
])
def test_admin_api_no_credentials_returns_401(client, path):
    """Direct unauthenticated request to privileged admin endpoint must return 401."""
    resp = client.get(path)
    assert resp.status_code == 401, f"Expected 401 on {path}, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "Super-Admin session token required" in data.get("detail", "") or "credentials were not provided" in data.get("detail", "")


def test_admin_api_invalid_credentials_returns_401(client):
    """Request with fabricated or malformed token must return 401."""
    resp = client.get("/admin/traffic", headers={"Authorization": "Bearer fabricated_bogus_token_12345"})
    assert resp.status_code == 401
    assert "Invalid or expired session token" in resp.json().get("detail", "")


def test_admin_api_expired_credentials_returns_401(client):
    """Session tokens past expiration timestamp must be rejected with 401."""
    expired_token = "arthai_sec_expired_test_token_9999"
    # Seed an artificially expired session
    telemetry_engine._active_sessions[expired_token] = {
        "token": expired_token,
        "email": SUPER_ADMIN_EMAIL,
        "name": "Hitesh Sunkari",
        "role": "SUPER_ADMIN",
        "is_super_admin": True,
        "auth_provider": "GOOGLE",
        "created_at": time.time() - 100000,
        "expires_at": time.time() - 100,  # in the past
    }

    resp = client.get("/admin/traffic", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401
    assert "Invalid or expired session token" in resp.json().get("detail", "")


# -----------------------------------------------------------------------------
# Phase 3 — Google OAuth & ID Token Verification Tests
# -----------------------------------------------------------------------------

def test_google_verify_missing_token_returns_401(client):
    """POST /auth/google/verify without token payload must return 401."""
    resp = client.post("/auth/google/verify", json={})
    assert resp.status_code == 401
    assert "Google authentication token" in resp.json().get("detail", "")


def test_google_verify_invalid_token_returns_401(client):
    """POST /auth/google/verify with malformed token must return 401."""
    resp = client.post("/auth/google/verify", json={"id_token": "malformed.jwt.token"})
    assert resp.status_code == 401


def test_google_verify_unauthorized_google_account_returns_403(client, monkeypatch):
    """A valid Google account with an email NOT in allowlist must be rejected with 403."""
    unauthorized_email = "attacker.intruder@gmail.com"

    # Mock Google authority returning verified claims for non-admin user
    def mock_verify_google(self, token_str):
        return {
            "email": unauthorized_email,
            "name": "Unauthorized Intruder",
            "picture": None,
            "sub": "google-sub-12345",
            "auth_provider": "GOOGLE_ID_TOKEN",
        }

    monkeypatch.setattr(telemetry_engine.__class__, "verify_google_token", mock_verify_google)

    resp = client.post("/auth/google/verify", json={"id_token": "valid_google_token_for_unauthorized_account"})
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    detail = resp.json().get("detail", "")
    assert "ACCESS FORBIDDEN" in detail or "not authorized" in detail
    assert unauthorized_email in detail


def test_google_verify_authorized_super_admin_returns_200_and_session(client, monkeypatch):
    """A valid Google account with Super-Admin email must receive HTTP 200 with session token."""
    admin_email = SUPER_ADMIN_EMAIL

    def mock_verify_google(self, token_str):
        return {
            "email": admin_email,
            "name": "Hitesh Sunkari",
            "picture": "https://example.com/photo.jpg",
            "sub": "google-sub-admin-001",
            "auth_provider": "GOOGLE_ID_TOKEN",
        }

    monkeypatch.setattr(telemetry_engine.__class__, "verify_google_token", mock_verify_google)

    resp = client.post("/auth/google/verify", json={"id_token": "valid_google_token_for_super_admin"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data.get("email") == admin_email
    assert data.get("role") == "SUPER_ADMIN"
    assert data.get("is_super_admin") is True
    assert data.get("token", "").startswith("arthai_sec_")


def test_admin_api_valid_super_admin_token_permitted(client, monkeypatch):
    """An authorized Super-Admin token grants full access to privileged admin endpoints."""
    admin_email = SUPER_ADMIN_EMAIL

    def mock_verify_google(self, token_str):
        return {
            "email": admin_email,
            "name": "Hitesh Sunkari",
            "picture": None,
            "sub": "google-sub-admin-001",
            "auth_provider": "GOOGLE_ID_TOKEN",
        }

    monkeypatch.setattr(telemetry_engine.__class__, "verify_google_token", mock_verify_google)

    auth_resp = client.post("/auth/google/verify", json={"id_token": "admin_jwt"})
    assert auth_resp.status_code == 200
    token = auth_resp.json()["token"]

    # Verify protected endpoints accept the token
    for path in ["/admin/traffic", "/admin/users", "/admin/investments", "/auth/me"]:
        r = client.get(path, headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200, f"Expected 200 on {path} with valid admin token, got {r.status_code}"


def test_admin_api_valid_user_token_returns_403(client):
    """A valid regular user token must be denied access to admin endpoints with HTTP 403."""
    user_claims = {
        "email": "regular.trader@institution.in",
        "name": "Regular Trader",
        "picture": None,
        "sub": "user-sub-123",
    }
    user_session = telemetry_engine.create_verified_session(
        user_claims,
        auth_provider="GOOGLE",
        require_super_admin=False,
    )
    user_token = user_session["token"]
    assert user_session["is_super_admin"] is False

    # Calling admin endpoint with user token must be forbidden (403)
    resp = client.get("/admin/traffic", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    assert "Access forbidden" in resp.json().get("detail", "")


def test_logout_invalidates_session(client, monkeypatch):
    """POST /auth/logout must revoke the active session; subsequent requests must receive 401."""
    admin_email = SUPER_ADMIN_EMAIL

    def mock_verify_google(self, token_str):
        return {
            "email": admin_email,
            "name": "Hitesh Sunkari",
            "picture": None,
            "sub": "google-sub-admin-logout",
            "auth_provider": "GOOGLE_ID_TOKEN",
        }

    monkeypatch.setattr(telemetry_engine.__class__, "verify_google_token", mock_verify_google)

    auth_resp = client.post("/auth/google/verify", json={"id_token": "token_for_logout_test"})
    token = auth_resp.json()["token"]

    # First verify token works
    r1 = client.get("/admin/traffic", headers={"Authorization": f"Bearer {token}"})
    assert r1.status_code == 200

    # Call logout
    logout_resp = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_resp.status_code == 200
    assert logout_resp.json().get("status") == "SUCCESS"

    # Subsequent request with same token must fail with 401
    r2 = client.get("/admin/traffic", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 401
    assert "Invalid or expired session token" in r2.json().get("detail", "")


def test_modified_frontend_email_does_not_bypass(client):
    """Sending plain email 'hitesh.sunkari.23cse@bmu.edu.in' without token must fail with 401."""
    resp = client.post("/auth/google", json={"email": SUPER_ADMIN_EMAIL})
    assert resp.status_code == 401
    detail = resp.json().get("detail", "").lower()
    assert "token" in detail and "required" in detail



def test_cors_preflight_options(client):
    """CORS preflight OPTIONS requests for Vercel origins must succeed with 200 and expose headers."""
    resp = client.options(
        "/admin/traffic",
        headers={
            "Origin": "https://artha-ai-admin.vercel.app",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
    )
    assert resp.status_code == 200
    assert "access-control-allow-origin" in resp.headers
    assert "access-control-allow-methods" in resp.headers
