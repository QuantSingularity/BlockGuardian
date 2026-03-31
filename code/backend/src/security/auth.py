"""
Authentication System for Financial Services
Implements multi-factor authentication, session management, and advanced security features
"""

import base64
import hashlib
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from enum import Enum
from functools import wraps
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import pyotp
import qrcode
import redis
from flask import g, jsonify
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
    verify_jwt_in_request,
)
from werkzeug.security import check_password_hash, generate_password_hash

from ..models.base import db_manager
from ..models.user import User, UserSession


class SecurityLevel:
    """Security level constants"""

    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class AuthenticationError(Exception):
    """Custom authentication exception"""


class SecurityViolationError(Exception):
    """Custom security violation exception"""


class Permission(Enum):
    """Permission enumeration for role-based access control"""

    READ_PORTFOLIO = "read_portfolio"
    CREATE_PORTFOLIO = "create_portfolio"
    UPDATE_PORTFOLIO = "update_portfolio"
    DELETE_PORTFOLIO = "delete_portfolio"
    EXECUTE_TRADE = "execute_trade"
    READ_MARKET_DATA = "read_market_data"
    MANAGE_USERS = "manage_users"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    SYSTEM_ADMIN = "system_admin"


class AuthManage:
    """Authentication manager with financial-grade security"""

    def __init__(self) -> None:
        self.jwt_manager = JWTManager()
        self.redis_client = None
        self.logger = logging.getLogger(__name__)
        self.max_login_attempts = 5
        self.lockout_duration = timedelta(minutes=30)
        self.session_timeout = timedelta(hours=8)
        self.password_min_length = 12
        self.password_complexity_rules = {
            "min_uppercase": 1,
            "min_lowercase": 1,
            "min_digits": 1,
            "min_special": 1,
            "forbidden_patterns": ["123", "abc", "password", "admin"],
        }
        self.mfa_issuer = "BlockGuardian"
        self.backup_codes_count = 10
        self.device_fingerprint_fields = [
            "user_agent",
            "accept_language",
            "accept_encoding",
            "screen_resolution",
            "timezone",
            "platform",
        ]

    def init_app(self, app: Any) -> None:
        """Initialize with Flask app"""
        self.jwt_manager.init_app(app)
        try:
            redis_url = app.config.get("REDIS_URL", "redis://localhost:6379/0")
            self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
        except Exception as e:
            self.logger.warning(f"Redis connection failed: {e}")
            self.redis_client = None
        app.config["JWT_SECRET_KEY"] = app.config.get(
            "JWT_SECRET_KEY",
            os.environ.get("JWT_SECRET_KEY", secrets.token_urlsafe(32)),
        )
        app.config["JWT_ACCESS_TOKEN_EXPIRES"] = app.config.get(
            "JWT_ACCESS_TOKEN_EXPIRES", timedelta(hours=1)
        )
        app.config["JWT_REFRESH_TOKEN_EXPIRES"] = app.config.get(
            "JWT_REFRESH_TOKEN_EXPIRES", timedelta(days=30)
        )
        app.config["JWT_BLACKLIST_ENABLED"] = True
        app.config["JWT_BLACKLIST_TOKEN_CHECKS"] = ["access", "refresh"]

        @self.jwt_manager.token_in_blocklist_loader
        def check_if_token_revoked(jwt_header, jwt_payload):
            return self.is_token_revoked(jwt_payload["jti"])

        @self.jwt_manager.user_identity_loader
        def user_identity_lookup(user):
            return str(user.id) if hasattr(user, "id") else str(user)

        @self.jwt_manager.user_lookup_loader
        def user_lookup_callback(_jwt_header, jwt_data):
            identity = jwt_data["sub"]
            return self.get_user_by_id(identity)

    def hash_password(self, password: str) -> str:
        """Hash password with secure algorithm"""
        return generate_password_hash(password, method="pbkdf2:sha256:100000")

    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return check_password_hash(password_hash, password)

    def validate_password_strength(self, password: str) -> Tuple[bool, List[str]]:
        """Validate password strength according to financial industry standards"""
        errors = []
        if len(password) < self.password_min_length:
            errors.append(
                f"Password must be at least {self.password_min_length} characters long"
            )
        if (
            sum((1 for c in password if c.isupper()))
            < self.password_complexity_rules["min_uppercase"]
        ):
            errors.append("Password must contain at least 1 uppercase letter")
        if (
            sum((1 for c in password if c.islower()))
            < self.password_complexity_rules["min_lowercase"]
        ):
            errors.append("Password must contain at least 1 lowercase letter")
        if (
            sum((1 for c in password if c.isdigit()))
            < self.password_complexity_rules["min_digits"]
        ):
            errors.append("Password must contain at least 1 digit")
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if (
            sum((1 for c in password if c in special_chars))
            < self.password_complexity_rules["min_special"]
        ):
            errors.append("Password must contain at least 1 special character")
        password_lower = password.lower()
        for pattern in self.password_complexity_rules["forbidden_patterns"]:
            if pattern in password_lower:
                errors.append(f"Password cannot contain common pattern: {pattern}")
        for i in range(len(password) - 2):
            if ord(password[i]) + 1 == ord(password[i + 1]) and ord(
                password[i + 1]
            ) + 1 == ord(password[i + 2]):
                errors.append("Password cannot contain sequential characters")
                break
        return (len(errors) == 0, errors)

    def authenticate_user(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[Optional[User], Dict[str, Any]]:
        """Authenticate user with comprehensive security checks"""
        session = db_manager.get_session()
        try:
            user = session.query(User).filter_by(email=email.lower()).first()
            if not user:
                self.logger.warning(f"Login attempt with non-existent email: {email}")
                return (
                    None,
                    {"error": "Invalid credentials", "code": "INVALID_CREDENTIALS"},
                )
            if user.is_locked():
                user.record_login_attempt(False, ip_address, user_agent)
                session.commit()
                self.logger.warning(f"Login attempt on locked account: {email}")
                return (None, {"error": "Account is locked", "code": "ACCOUNT_LOCKED"})
            if not user.is_active():
                user.record_login_attempt(False, ip_address, user_agent)
                session.commit()
                self.logger.warning(f"Login attempt on inactive account: {email}")
                return (
                    None,
                    {"error": "Account is not active", "code": "ACCOUNT_INACTIVE"},
                )
            if not user.verify_password(password):
                user.record_login_attempt(False, ip_address, user_agent)
                session.commit()
                self.logger.warning(f"Failed login attempt for user: {email}")
                return (
                    None,
                    {"error": "Invalid credentials", "code": "INVALID_CREDENTIALS"},
                )
            risk_score = self.calculate_login_risk(user, ip_address, user_agent)
            user.record_login_attempt(True, ip_address, user_agent)
            session.commit()
            return (
                user,
                {
                    "success": True,
                    "risk_score": risk_score,
                    "requires_mfa": user.mfa_enabled,
                    "requires_additional_verification": risk_score > 70,
                },
            )
        except Exception as e:
            session.rollback()
            self.logger.error(f"Authentication error: {e}")
            return (None, {"error": "Authentication failed", "code": "AUTH_ERROR"})
        finally:
            session.close()

    def calculate_login_risk(
        self, user: User, ip_address: str = None, user_agent: str = None
    ) -> int:
        """Calculate login risk score (0-100)"""
        risk_score = 0
        if user.user_metadata and "login_history" in user.user_metadata:
            login_history = user.user_metadata["login_history"]
            recent_ips = [entry.get("ip_address") for entry in login_history[-5:]]
            if ip_address and ip_address not in recent_ips:
                risk_score += 30
            recent_agents = [entry.get("user_agent") for entry in login_history[-5:]]
            if user_agent and user_agent not in recent_agents:
                risk_score += 20
            if login_history:
                last_login = datetime.fromisoformat(
                    login_history[-1]["timestamp"].replace("Z", "+00:00")
                )
                time_since_last = datetime.now(timezone.utc) - last_login
                if time_since_last > timedelta(days=30):
                    risk_score += 25
        account_age = datetime.now(timezone.utc) - user.created_at
        if account_age < timedelta(days=7):
            risk_score += 15
        if user.password_changed_at:
            time_since_password_change = (
                datetime.now(timezone.utc) - user.password_changed_at
            )
            if time_since_password_change < timedelta(hours=24):
                risk_score += 10
        return min(risk_score, 100)

    def setup_mfa(self, user: User) -> Dict[str, Any]:
        """Set up multi-factor authentication for user"""
        secret = pyotp.random_base32()
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email, issuer_name=self.mfa_issuer
        )
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        qr_image = qr.make_image(fill_color="black", back_color="white")
        qr_buffer = BytesIO()
        qr_image.save(qr_buffer, format="PNG")
        qr_code_base64 = base64.b64encode(qr_buffer.getvalue()).decode()
        backup_codes = [
            secrets.token_hex(4).upper() for _ in range(self.backup_codes_count)
        ]
        user.mfa_secret = secret
        user.backup_codes = json.dumps(backup_codes)
        return {
            "secret": secret,
            "qr_code": qr_code_base64,
            "backup_codes": backup_codes,
            "totp_uri": totp_uri,
        }

    def verify_mfa_token(self, user: User, token: str) -> bool:
        """Verify MFA token (TOTP or backup code)"""
        if not user.mfa_secret:
            return False
        totp = pyotp.TOTP(user.mfa_secret)
        if totp.verify(token, valid_window=1):
            return True
        if user.backup_codes:
            try:
                backup_codes = json.loads(user.backup_codes)
                if token.upper() in backup_codes:
                    backup_codes.remove(token.upper())
                    user.backup_codes = json.dumps(backup_codes)
                    return True
            except (json.JSONDecodeError, ValueError):
                pass
        return False

    def create_session(
        self, user: User, ip_address: str = None, user_agent: str = None
    ) -> Dict[str, Any]:
        """Create authenticated session with tokens"""
        access_token = create_access_token(identity=user)
        refresh_token = create_refresh_token(identity=user)
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + self.session_timeout
        user_session = UserSession(
            user_id=user.id,
            session_token=session_token,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at,
        )
        db_session = db_manager.get_session()
        try:
            db_session.add(user_session)
            db_session.commit()
            if self.redis_client:
                session_data = {
                    "user_id": str(user.id),
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                self.redis_client.setex(
                    f"session:{session_token}",
                    int(self.session_timeout.total_seconds()),
                    json.dumps(session_data),
                )
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "user": user.to_dict(),
            }
        except Exception as e:
            db_session.rollback()
            self.logger.error(f"Session creation error: {e}")
            raise AuthenticationError("Failed to create session")
        finally:
            db_session.close()

    def validate_session(self, session_token: str) -> Optional[User]:
        """Validate session token and return user"""
        if self.redis_client:
            session_data = self.redis_client.get(f"session:{session_token}")
            if session_data:
                try:
                    data = json.loads(session_data)
                    user_id = data["user_id"]
                    return self.get_user_by_id(user_id)
                except (json.JSONDecodeError, KeyError):
                    pass
        db_session = db_manager.get_session()
        try:
            user_session = (
                db_session.query(UserSession)
                .filter_by(session_token=session_token, is_active=True)
                .first()
            )
            if user_session and (not user_session.is_expired()):
                user_session.extend_session()
                db_session.commit()
                return user_session.user
            return None
        except Exception as e:
            self.logger.error(f"Session validation error: {e}")
            return None
        finally:
            db_session.close()

    def revoke_session(self, session_token: str) -> Any:
        """Revoke session token"""
        if self.redis_client:
            self.redis_client.delete(f"session:{session_token}")
        db_session = db_manager.get_session()
        try:
            user_session = (
                db_session.query(UserSession)
                .filter_by(session_token=session_token)
                .first()
            )
            if user_session:
                user_session.is_active = False
                db_session.commit()
        except Exception as e:
            self.logger.error(f"Session revocation error: {e}")
        finally:
            db_session.close()

    def revoke_all_user_sessions(self, user_id: str) -> Any:
        """Revoke all sessions for a user"""
        db_session = db_manager.get_session()
        try:
            sessions = (
                db_session.query(UserSession)
                .filter_by(user_id=user_id, is_active=True)
                .all()
            )
            for session in sessions:
                session.is_active = False
                if self.redis_client:
                    self.redis_client.delete(f"session:{session.session_token}")
            db_session.commit()
        except Exception as e:
            self.logger.error(f"Bulk session revocation error: {e}")
        finally:
            db_session.close()

    def is_token_revoked(self, jti: str) -> bool:
        """Check if JWT token is revoked"""
        if self.redis_client:
            return self.redis_client.get(f"revoked_token:{jti}") is not None
        return False

    def revoke_token(self, jti: str, expires_in: int = None) -> Any:
        """Revoke JWT token"""
        if self.redis_client:
            if expires_in:
                self.redis_client.setex(f"revoked_token:{jti}", expires_in, "revoked")
            else:
                self.redis_client.set(f"revoked_token:{jti}", "revoked")

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        db_session = db_manager.get_session()
        try:
            return db_session.query(User).filter_by(id=user_id).first()
        except Exception as e:
            self.logger.error(f"User lookup error: {e}")
            return None
        finally:
            db_session.close()

    def generate_device_fingerprint(self, request_data: Dict[str, Any]) -> str:
        """Generate device fingerprint from request data"""
        fingerprint_data = []
        for field in self.device_fingerprint_fields:
            value = request_data.get(field, "")
            fingerprint_data.append(f"{field}:{value}")
        fingerprint_string = "|".join(fingerprint_data)
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()

    def check_security_violations(
        self, user: User, request_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Check for security violations"""
        violations = []
        if (
            hasattr(user, "active_sessions")
            and user.active_sessions > user.max_sessions
        ):
            violations.append(
                {
                    "type": "excessive_sessions",
                    "severity": "medium",
                    "message": f"User has {user.active_sessions} active sessions (max: {user.max_sessions})",
                }
            )
        ip_address = request_data.get("ip_address")
        if (
            ip_address
            and user.user_metadata
            and ("login_history" in user.user_metadata)
        ):
            recent_ips = [
                entry.get("ip_address")
                for entry in user.user_metadata["login_history"][-10:]
            ]
            unique_ips = set(filter(None, recent_ips))
            if len(unique_ips) > 5:
                violations.append(
                    {
                        "type": "multiple_ip_addresses",
                        "severity": "high",
                        "message": f"User accessed from {len(unique_ips)} different IP addresses recently",
                    }
                )
        if user.user_metadata and "login_history" in user.user_metadata:
            recent_attempts = [
                entry
                for entry in user.user_metadata["login_history"][-5:]
                if datetime.fromisoformat(entry["timestamp"].replace("Z", "+00:00"))
                > datetime.now(timezone.utc) - timedelta(minutes=5)
            ]
            if len(recent_attempts) > 3:
                violations.append(
                    {
                        "type": "rapid_login_attempts",
                        "severity": "high",
                        "message": f"{len(recent_attempts)} login attempts in the last 5 minutes",
                    }
                )
        return violations

    def generate_tokens(
        self, user_id: Any, role: str, permissions: List[str]
    ) -> Dict[str, Any]:
        """Generate access and refresh tokens for a user"""
        additional_claims = {
            "role": role,
            "permissions": permissions,
        }

        access_token = create_access_token(
            identity=str(user_id), additional_claims=additional_claims
        )
        refresh_token = create_refresh_token(
            identity=str(user_id), additional_claims=additional_claims
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
        }

    def get_user_permissions(self, role: Any) -> List[str]:
        """Get permissions for a role"""
        from ..models.user import UserRole

        role_permissions = {
            UserRole.USER: [
                Permission.READ_PORTFOLIO.value,
                Permission.CREATE_PORTFOLIO.value,
                Permission.UPDATE_PORTFOLIO.value,
                Permission.EXECUTE_TRADE.value,
                Permission.READ_MARKET_DATA.value,
            ],
            UserRole.PREMIUM: [
                Permission.READ_PORTFOLIO.value,
                Permission.CREATE_PORTFOLIO.value,
                Permission.UPDATE_PORTFOLIO.value,
                Permission.DELETE_PORTFOLIO.value,
                Permission.EXECUTE_TRADE.value,
                Permission.READ_MARKET_DATA.value,
            ],
            UserRole.ADMIN: [
                Permission.READ_PORTFOLIO.value,
                Permission.CREATE_PORTFOLIO.value,
                Permission.UPDATE_PORTFOLIO.value,
                Permission.DELETE_PORTFOLIO.value,
                Permission.EXECUTE_TRADE.value,
                Permission.READ_MARKET_DATA.value,
                Permission.MANAGE_USERS.value,
                Permission.VIEW_AUDIT_LOGS.value,
            ],
            UserRole.SUPER_ADMIN: [p.value for p in Permission],
        }

        return role_permissions.get(role, [])

    def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Refresh access token using refresh token"""
        try:
            decoded = decode_token(refresh_token)
            user_id = decoded["sub"]
            role = decoded.get("role", "user")
            permissions = decoded.get("permissions", [])

            return self.generate_tokens(user_id, role, permissions)
        except Exception as e:
            self.logger.error(f"Token refresh failed: {e}")
            return None

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify token and return payload"""
        try:
            decoded = decode_token(token)
            return decoded
        except Exception as e:
            self.logger.error(f"Token verification failed: {e}")
            return None


auth_manager = AuthManage()


def jwt_required(fn):
    """Decorator to require JWT authentication"""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            g.current_user_id = get_jwt_identity()
            g.jwt_claims = get_jwt()
            return fn(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": "Authentication required", "details": str(e)}), 401

    return wrapper


def permission_required(permission: Permission):
    """Decorator to require specific permission"""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
                permissions = claims.get("permissions", [])

                if permission.value not in permissions:
                    return jsonify({"error": "Insufficient permissions"}), 403

                return fn(*args, **kwargs)
            except Exception as e:
                return (
                    jsonify({"error": "Authorization failed", "details": str(e)}),
                    403,
                )

        return wrapper

    return decorator
