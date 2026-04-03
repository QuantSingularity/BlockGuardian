"""
Comprehensive authentication tests for BlockGuardian Backend
Tests user registration, login, MFA, and security features
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
from typing import Any

import pytest
from src.main import create_app
from src.models.user import User, db


@pytest.fixture
def app() -> Any:
    """Create test Flask application"""
    app = create_app("testing")
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["WTF_CSRF_ENABLED"] = False
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app: Any) -> Any:
    """Create test client"""
    return app.test_client()


@pytest.fixture
def sample_user_data() -> Any:
    """Sample user registration data"""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "country": "US",
    }


@pytest.fixture
def authenticated_user(app: Any, client: Any, sample_user_data: Any) -> Any:
    """Create and authenticate a test user"""
    with app.app_context():
        response = client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        assert response.status_code == 201
        login_data = {
            "email": sample_user_data["email"],
            "password": sample_user_data["password"],
        }
        response = client.post(
            "/api/auth/login",
            data=json.dumps(login_data),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        return data["tokens"]["access_token"]


class TestUserRegistration:
    """Test user registration functionality"""

    def test_successful_registration(self, client: Any, sample_user_data: Any) -> Any:
        """Test successful user registration"""
        response = client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert "user" in data
        assert "tokens" in data
        assert data["user"]["email"] == sample_user_data["email"]
        assert data["user"]["username"] == sample_user_data["username"]
        assert "hashed_password" not in data["user"]

    def test_registration_missing_fields(self, client: Any) -> Any:
        """Test registration with missing required fields"""
        incomplete_data = {"email": "test@example.com", "username": "testuser"}
        response = client.post(
            "/api/auth/register",
            data=json.dumps(incomplete_data),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data

    def test_registration_invalid_email(
        self, client: Any, sample_user_data: Any
    ) -> Any:
        """Test registration with invalid email"""
        sample_user_data["email"] = "invalid-email"
        response = client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data
        assert "email" in data.get("field", "")

    def test_registration_weak_password(
        self, client: Any, sample_user_data: Any
    ) -> Any:
        """Test registration with weak password"""
        sample_user_data["password"] = "weak"
        response = client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data
        assert "password" in data.get("field", "")

    def test_registration_duplicate_email(
        self, client: Any, sample_user_data: Any
    ) -> Any:
        """Test registration with duplicate email"""
        response = client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        assert response.status_code == 201
        sample_user_data["username"] = "different_username"
        response = client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        assert response.status_code == 409
        data = json.loads(response.data)
        assert "error" in data
        assert "already exists" in data["error"].lower()

    def test_registration_duplicate_username(
        self, client: Any, sample_user_data: Any
    ) -> Any:
        """Test registration with duplicate username"""
        response = client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        assert response.status_code == 201
        sample_user_data["email"] = "different@example.com"
        response = client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        assert response.status_code == 409
        data = json.loads(response.data)
        assert "error" in data
        assert "already exists" in data["error"].lower()


class TestUserLogin:
    """Test user login functionality"""

    def test_successful_login(self, client: Any, sample_user_data: Any) -> Any:
        """Test successful user login"""
        client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        login_data = {
            "email": sample_user_data["email"],
            "password": sample_user_data["password"],
        }
        response = client.post(
            "/api/auth/login",
            data=json.dumps(login_data),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "user" in data
        assert "tokens" in data
        assert "access_token" in data["tokens"]
        assert "refresh_token" in data["tokens"]

    def test_login_invalid_email(self, client: Any) -> Any:
        """Test login with invalid email"""
        login_data = {"email": "nonexistent@example.com", "password": "password123"}
        response = client.post(
            "/api/auth/login",
            data=json.dumps(login_data),
            content_type="application/json",
        )
        assert response.status_code == 401
        data = json.loads(response.data)
        assert "error" in data
        assert "credentials" in data["error"].lower()

    def test_login_invalid_password(self, client: Any, sample_user_data: Any) -> Any:
        """Test login with invalid password"""
        client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        login_data = {"email": sample_user_data["email"], "password": "wrongpassword"}
        response = client.post(
            "/api/auth/login",
            data=json.dumps(login_data),
            content_type="application/json",
        )
        assert response.status_code == 401
        data = json.loads(response.data)
        assert "error" in data
        assert "credentials" in data["error"].lower()

    def test_login_missing_fields(self, client: Any) -> Any:
        """Test login with missing fields"""
        login_data = {"email": "test@example.com"}
        response = client.post(
            "/api/auth/login",
            data=json.dumps(login_data),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data

    def test_login_account_locked(
        self, app: Any, client: Any, sample_user_data: Any
    ) -> Any:
        """Test login with locked account"""
        client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        with app.app_context():
            user = (
                db.session.query(User)
                .filter(User.email == sample_user_data["email"])
                .first()
            )
            user.lock_account()
            db.session.commit()
        login_data = {
            "email": sample_user_data["email"],
            "password": sample_user_data["password"],
        }
        response = client.post(
            "/api/auth/login",
            data=json.dumps(login_data),
            content_type="application/json",
        )
        assert response.status_code == 423
        data = json.loads(response.data)
        assert "error" in data
        assert "locked" in data["error"].lower()


class TestMultiFactorAuthentication:
    """Test MFA functionality"""

    def test_setup_mfa(self, client: Any, authenticated_user: Any) -> Any:
        """Test MFA setup"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        response = client.post("/api/auth/setup-mfa", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "secret" in data
        assert "qr_code" in data
        assert "backup_codes" in data
        assert len(data["backup_codes"]) == 10

    def test_enable_mfa_invalid_token(
        self, client: Any, authenticated_user: Any
    ) -> Any:
        """Test enabling MFA with invalid token"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        client.post("/api/auth/setup-mfa", headers=headers)
        enable_data = {"token": "000000"}
        response = client.post(
            "/api/auth/enable-mfa",
            data=json.dumps(enable_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data
        assert "invalid" in data["error"].lower()

    def test_disable_mfa_invalid_password(
        self, client: Any, authenticated_user: Any, sample_user_data: Any
    ) -> Any:
        """Test disabling MFA with invalid password"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        disable_data = {"password": "wrongpassword"}
        response = client.post(
            "/api/auth/disable-mfa",
            data=json.dumps(disable_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 401
        data = json.loads(response.data)
        assert "error" in data
        assert "password" in data["error"].lower()


class TestPasswordManagement:
    """Test password management functionality"""

    def test_change_password_success(
        self, client: Any, authenticated_user: Any, sample_user_data: Any
    ) -> Any:
        """Test successful password change"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        change_data = {
            "current_password": sample_user_data["password"],
            "new_password": "NewPassword123!",
        }
        response = client.post(
            "/api/auth/change-password",
            data=json.dumps(change_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "message" in data
        assert "success" in data["message"].lower()

    def test_change_password_invalid_current(
        self, client: Any, authenticated_user: Any
    ) -> Any:
        """Test password change with invalid current password"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        change_data = {
            "current_password": "wrongpassword",
            "new_password": "NewPassword123!",
        }
        response = client.post(
            "/api/auth/change-password",
            data=json.dumps(change_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 401
        data = json.loads(response.data)
        assert "error" in data
        assert "current password" in data["error"].lower()

    def test_change_password_weak_new(
        self, client: Any, authenticated_user: Any, sample_user_data: Any
    ) -> Any:
        """Test password change with weak new password"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        change_data = {
            "current_password": sample_user_data["password"],
            "new_password": "weak",
        }
        response = client.post(
            "/api/auth/change-password",
            data=json.dumps(change_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data
        assert "password" in data.get("field", "")


class TestTokenManagement:
    """Test JWT token management"""

    def test_token_refresh(self, client: Any, sample_user_data: Any) -> Any:
        """Test token refresh functionality"""
        client.post(
            "/api/auth/register",
            data=json.dumps(sample_user_data),
            content_type="application/json",
        )
        login_data = {
            "email": sample_user_data["email"],
            "password": sample_user_data["password"],
        }
        response = client.post(
            "/api/auth/login",
            data=json.dumps(login_data),
            content_type="application/json",
        )
        login_result = json.loads(response.data)
        refresh_token = login_result["tokens"]["refresh_token"]
        refresh_data = {"refresh_token": refresh_token}
        response = client.post(
            "/api/auth/refresh",
            data=json.dumps(refresh_data),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "tokens" in data
        assert "access_token" in data["tokens"]

    def test_token_refresh_invalid(self, client: Any) -> Any:
        """Test token refresh with invalid token"""
        refresh_data = {"refresh_token": "invalid_token"}
        response = client.post(
            "/api/auth/refresh",
            data=json.dumps(refresh_data),
            content_type="application/json",
        )
        assert response.status_code == 401
        data = json.loads(response.data)
        assert "error" in data

    def test_logout(self, client: Any, authenticated_user: Any) -> Any:
        """Test user logout"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        response = client.post("/api/auth/logout", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "message" in data
        assert "success" in data["message"].lower()

    def test_verify_token_valid(self, client: Any, authenticated_user: Any) -> Any:
        """Test token verification with valid token"""
        verify_data = {"token": authenticated_user}
        response = client.post(
            "/api/auth/verify-token",
            data=json.dumps(verify_data),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["valid"] is True
        assert "user_id" in data
        assert "role" in data

    def test_verify_token_invalid(self, client: Any) -> Any:
        """Test token verification with invalid token"""
        verify_data = {"token": "invalid_token"}
        response = client.post(
            "/api/auth/verify-token",
            data=json.dumps(verify_data),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["valid"] is False


class TestProfileManagement:
    """Test user profile management"""

    def test_get_profile(self, client: Any, authenticated_user: Any) -> Any:
        """Test getting user profile"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        response = client.get("/api/auth/profile", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "user" in data
        assert "email" in data["user"]
        assert "username" in data["user"]
        assert "hashed_password" not in data["user"]

    def test_update_profile(self, client: Any, authenticated_user: Any) -> Any:
        """Test updating user profile"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "city": "New York",
            "state": "NY",
        }
        response = client.put(
            "/api/auth/profile",
            data=json.dumps(update_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "user" in data
        assert data["user"]["first_name"] == "Updated"
        assert data["user"]["last_name"] == "Name"

    def test_update_profile_unauthorized(self, client: Any) -> Any:
        """Test updating profile without authentication"""
        update_data = {"first_name": "Updated", "last_name": "Name"}
        response = client.put(
            "/api/auth/profile",
            data=json.dumps(update_data),
            content_type="application/json",
        )
        assert response.status_code == 401


class TestSecurityFeatures:
    """Test security features"""

    def test_rate_limiting(self, client: Any, sample_user_data: Any) -> Any:
        """Test rate limiting on login attempts"""
        login_data = {"email": sample_user_data["email"], "password": "wrongpassword"}
        for _ in range(12):
            response = client.post(
                "/api/auth/login",
                data=json.dumps(login_data),
                content_type="application/json",
            )
        assert response.status_code == 429

    def test_sql_injection_protection(self, client: Any) -> Any:
        """Test SQL injection protection"""
        malicious_data = {"email": "'; DROP TABLE users; --", "password": "password"}
        response = client.post(
            "/api/auth/login",
            data=json.dumps(malicious_data),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_xss_protection(self, client: Any, authenticated_user: Any) -> Any:
        """Test XSS protection"""
        headers = {"Authorization": f"Bearer {authenticated_user}"}
        malicious_data = {
            "first_name": '<script>alert("xss")</script>',
            "last_name": "Test",
        }
        response = client.put(
            "/api/auth/profile",
            data=json.dumps(malicious_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__])
