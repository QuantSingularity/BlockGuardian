"""
User model for the BlockGuardian application.
Includes authentication, authorization, and compliance fields.
"""

import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from enum import Enum
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import pyotp
import qrcode
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON, Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from werkzeug.security import check_password_hash, generate_password_hash

from .base import db_manager

# Initialize SQLAlchemy for Flask-SQLAlchemy integration
db = SQLAlchemy()


class UserRole(Enum):
    """User role enumeration"""

    USER = "user"
    PREMIUM = "premium"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class UserStatus(Enum):
    """User account status"""

    PENDING = "pending"
    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    CLOSED = "closed"


class KYCStatus(Enum):
    """Know Your Customer (KYC) status"""

    NOT_STARTED = "not_started"
    PENDING_REVIEW = "pending_review"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class AMLRiskLevel(Enum):
    """Anti-Money Laundering (AML) risk level"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    PROHIBITED = "prohibited"


class User(db_manager.Base):
    """User model"""

    __tablename__ = "users"
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    salt = Column(String(32), nullable=False)
    first_name = Column(String(50))
    last_name = Column(String(50))
    date_of_birth = Column(DateTime)
    country = Column(String(50))
    address_line1 = Column(String(100))
    city = Column(String(50))
    postal_code = Column(String(20))
    phone_number = Column(String(20))
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False, index=True)
    status = Column(
        SQLEnum(UserStatus),
        default=UserStatus.PENDING_VERIFICATION,
        nullable=False,
        index=True,
    )
    kyc_status = Column(
        SQLEnum(KYCStatus), default=KYCStatus.NOT_STARTED, nullable=False, index=True
    )
    aml_risk_level = Column(
        SQLEnum(AMLRiskLevel), default=AMLRiskLevel.LOW, nullable=False, index=True
    )
    aml_score = Column(Integer, default=0)
    kyc_approved_at = Column(DateTime(timezone=True))
    kyc_expires_at = Column(DateTime(timezone=True))
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(64))
    backup_codes = Column(Text)
    annual_income = Column(String(50))
    risk_tolerance = Column(String(50))
    investment_experience = Column(String(50))
    created_at = Column(
        DateTime(timezone=True), default=datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.now(timezone.utc),
        onupdate=datetime.now(timezone.utc),
        nullable=False,
    )
    last_login_at = Column(DateTime(timezone=True))
    password_changed_at = Column(DateTime(timezone=True))
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True))
    max_sessions = Column(Integer, default=5)
    user_metadata = Column(JSON)

    # Encrypted fields
    _encrypted_fields = ["phone_number"]

    # Relationships
    transactions = relationship(
        "Transaction", foreign_keys="Transaction.user_id", back_populates="user"
    )
    portfolios = relationship("Portfolio", back_populates="owner")

    def __init__(
        self, username: str, email: str, password: Optional[str] = None, **kwargs
    ) -> None:
        self.username = username
        self.email = email
        if password:
            self.set_password(password)
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)

    def set_password(self, password: str) -> None:
        """Hashes the password and stores the hash and salt."""
        self.salt = os.urandom(16).hex()
        self.password_hash = generate_password_hash(
            password, method="pbkdf2:sha256:260000"
        )
        self.password_changed_at = datetime.now(timezone.utc)

    def check_password(self, password: str) -> bool:
        """Checks if the provided password matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    def verify_password(self, password: str) -> bool:
        """Alias for check_password for compatibility"""
        return self.check_password(password)

    def _hash_password(self, password: str, salt: str) -> str:
        """Internal method to hash a password using SHA-256."""
        hashed = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
        return hashed

    def is_active(self) -> bool:
        """Check if the user account is active."""
        return self.status == UserStatus.ACTIVE

    def is_kyc_approved(self) -> bool:
        """Check if the user has an approved and non-expired KYC status."""
        if self.kyc_status != KYCStatus.APPROVED:
            return False
        if self.kyc_expires_at and self.kyc_expires_at < datetime.now(timezone.utc):
            return False
        return True

    def get_full_name(self) -> str:
        """Returns the user's full name."""
        return f"{self.first_name or ''} {self.last_name or ''}".strip()

    def is_locked(self) -> bool:
        """Check if the user account is locked"""
        if self.locked_until and self.locked_until > datetime.now(timezone.utc):
            return True
        return False

    def increment_login_attempts(self) -> None:
        """Increment failed login attempts and lock account if necessary"""
        self.login_attempts += 1
        if self.login_attempts >= 5:
            self.locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)

    def successful_login(self) -> None:
        """Reset login attempts and update last login time"""
        self.login_attempts = 0
        self.locked_until = None
        self.last_login_at = datetime.now(timezone.utc)

    def record_login_attempt(
        self,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """Record login attempt in user_metadata"""
        if not self.user_metadata:
            self.user_metadata = {}
        if "login_history" not in self.user_metadata:
            self.user_metadata["login_history"] = []

        self.user_metadata["login_history"].append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "success": success,
                "ip_address": ip_address,
                "user_agent": user_agent,
            }
        )

        # Keep only last 50 entries
        if len(self.user_metadata["login_history"]) > 50:
            self.user_metadata["login_history"] = self.user_metadata["login_history"][
                -50:
            ]

        if success:
            self.successful_login()
        else:
            self.increment_login_attempts()

    def setup_mfa(self) -> Tuple[str, str, List[str]]:
        """Setup MFA for the user and return secret, QR code, and backup codes"""
        secret = pyotp.random_base32()
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=self.email, issuer_name="BlockGuardian"
        )

        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        qr_image = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        qr_buffer = BytesIO()
        qr_image.save(qr_buffer, format="PNG")
        qr_code_base64 = base64.b64encode(qr_buffer.getvalue()).decode()

        # Generate backup codes
        backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]

        self.mfa_secret = secret
        self.backup_codes = json.dumps(backup_codes)

        return secret, qr_code_base64, backup_codes

    def enable_mfa(self, token: str) -> bool:
        """Enable MFA after verifying the token"""
        if not self.mfa_secret:
            return False

        if self.verify_mfa_token(token):
            self.mfa_enabled = True
            return True
        return False

    def disable_mfa(self) -> None:
        """Disable MFA"""
        self.mfa_enabled = False
        self.mfa_secret = None
        self.backup_codes = None

    def verify_mfa_token(self, token: str) -> bool:
        """Verify MFA token (TOTP or backup code)"""
        if not self.mfa_secret:
            return False

        # Verify TOTP
        totp = pyotp.TOTP(self.mfa_secret)
        if totp.verify(token, valid_window=1):
            return True

        # Check backup codes
        if self.backup_codes:
            try:
                backup_codes = json.loads(self.backup_codes)
                if token.upper() in backup_codes:
                    backup_codes.remove(token.upper())
                    self.backup_codes = json.dumps(backup_codes)
                    return True
            except (json.JSONDecodeError, ValueError):
                pass

        return False

    def can_trade(self) -> Tuple[bool, str]:
        """Check if user can execute trades"""
        if self.status != UserStatus.ACTIVE:
            return False, f"Account is {self.status.value}"

        if not self.is_kyc_approved():
            return False, "KYC verification required"

        if self.is_locked():
            return False, "Account is locked"

        return True, "OK"

    def set_encrypted_field(
        self, field_name: str, value: str, field_type: str = "pii"
    ) -> None:
        """Set an encrypted field value"""
        from ..security.encryption import encryption_manager

        if field_name in self._encrypted_fields:
            encrypted_value = encryption_manager.encrypt_field(value, field_type)
            setattr(self, field_name, encrypted_value)
        else:
            setattr(self, field_name, value)

    def get_encrypted_field(self, field_name: str) -> Optional[str]:
        """Get a decrypted field value"""
        from ..security.encryption import encryption_manager

        if field_name in self._encrypted_fields:
            encrypted_value = getattr(self, field_name)
            if encrypted_value:
                return encryption_manager.decrypt_field(encrypted_value)
        return getattr(self, field_name)

    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Convert user to dictionary"""
        result = {
            "id": self.id,
            "username": self.username,
            "email": self.email if include_sensitive else self.email[:3] + "***",
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": self.get_full_name(),
            "country": self.country,
            "city": self.city,
            "role": self.role.value,
            "status": self.status.value,
            "kyc_status": self.kyc_status.value,
            "aml_risk_level": self.aml_risk_level.value,
            "mfa_enabled": self.mfa_enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login_at": (
                self.last_login_at.isoformat() if self.last_login_at else None
            ),
        }

        if include_sensitive:
            result["phone_number"] = self.get_encrypted_field("phone_number")
            result["date_of_birth"] = (
                self.date_of_birth.isoformat() if self.date_of_birth else None
            )
            result["address_line1"] = self.address_line1
            result["postal_code"] = self.postal_code

        return result

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}', status='{self.status.value}')>"


class UserSession(db_manager.Base):
    """User session model for tracking active sessions"""

    __tablename__ = "user_sessions"
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(
        DateTime(timezone=True), default=datetime.now(timezone.utc), nullable=False
    )
    last_activity = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship(
        "User",
        foreign_keys="UserSession.user_id",
        primaryjoin="UserSession.user_id == User.id",
    )

    def is_expired(self) -> bool:
        """Check if session is expired"""
        return self.expires_at < datetime.now(timezone.utc)

    def extend_session(self, hours: int = 8) -> None:
        """Extend session expiration"""
        self.expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
        self.last_activity = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat(),
            "last_activity": (
                self.last_activity.isoformat() if self.last_activity else None
            ),
            "expires_at": self.expires_at.isoformat(),
            "is_active": self.is_active,
        }
