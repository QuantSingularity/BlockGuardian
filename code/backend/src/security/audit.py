"""
Comprehensive Audit Logging System
Implements secure, immutable, and searchable logging for all critical system events.
"""

import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import JSON, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Index, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)


# Lazy import to avoid circular dependency
def get_db_manager():
    from ..models.base import db_manager

    return db_manager


class AuditEventType(Enum):
    """Types of auditable events"""

    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    PASSWORD_CHANGE = "password_change"
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    KYC_SUBMIT = "kyc_submit"
    KYC_APPROVE = "kyc_approve"
    KYC_REJECT = "kyc_reject"
    TRANSACTION_INIT = "transaction_init"
    TRANSACTION_COMPLETE = "transaction_complete"
    TRANSACTION_FAIL = "transaction_fail"
    ORDER_CREATE = "order_create"
    ORDER_CANCEL = "order_cancel"
    TRADE_EXECUTE = "trade_execute"
    TRADE_EXECUTED = "trade_executed"
    PORTFOLIO_CREATED = "portfolio_created"
    PORTFOLIO_UPDATED = "portfolio_updated"
    CONFIG_CHANGE = "config_change"
    POLICY_UPDATE = "policy_update"
    SYSTEM_START = "system_start"
    SYSTEM_SHUTDOWN = "system_shutdown"
    DATA_ACCESS = "data_access"
    DATA_EXPORT = "data_export"
    SECURITY_ALERT = "security_alert"


# Create a temporary base for AuditLog
class AuditLogBase(DeclarativeBase):
    pass


class AuditLog(AuditLogBase):
    """SQLAlchemy model for the Audit Log"""

    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(
        DateTime(timezone=True), default=datetime.now(timezone.utc), nullable=False
    )
    event_type: Column[AuditEventType] = Column(
        SQLEnum(AuditEventType), nullable=False, index=True
    )
    user_id = Column(Integer, index=True)
    username = Column(String(255))
    ip_address = Column(String(45))
    resource_type = Column(String(255), index=True)
    resource_id = Column(String(255), index=True)
    details = Column(JSON)
    message = Column(Text, nullable=False)
    success = Column(Integer, default=1)
    __table_args__ = (
        Index("idx_audit_user_time", "user_id", "timestamp"),
        Index("idx_audit_type_time", "event_type", "timestamp"),
    )

    def __repr__(self) -> Any:
        return f"<AuditLog(id={self.id}, event_type='{self.event_type.value}', user_id={self.user_id})>"


class AuditLogger:
    """
    Service class for logging auditable events.
    Ensures logs are immutable and stored securely in the database.
    """

    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__)
        self.app = None
        self.AuditEventType = AuditEventType

    def init_app(self, app: Any) -> None:
        """Initialize with Flask app"""
        self.app = app
        self._ensure_table_exists()

    def _ensure_table_exists(self) -> Any:
        """Creates the AuditLog table if it does not exist."""
        try:
            db_manager = get_db_manager()
            if db_manager.engine:
                AuditLogBase.metadata.create_all(db_manager.engine)
        except Exception as e:
            self.logger.error(f"Failed to ensure AuditLog table exists: {e}")

    def log_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        ip_address: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        message: str = "",
        success: bool = True,
    ) -> Optional[AuditLog]:
        """
        Logs a critical event to the audit log database.

        Args:
            event_type: The type of event that occurred.
            user_id: The ID of the user who initiated the event.
            username: The username of the user.
            ip_address: The IP address from which the event originated.
            resource_type: The type of resource affected (e.g., 'User', 'Transaction').
            resource_id: The ID of the resource affected.
            details: A dictionary of structured data about the event.
            message: A human-readable summary of the event.
            success: Boolean indicating if the operation was successful.

        Returns:
            The created AuditLog object or None on failure.
        """
        if not message:
            message = f"Event type: {event_type.value}"
        log_entry = AuditLog(
            event_type=event_type,
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            message=message,
            success=1 if success else 0,
        )
        db_manager = get_db_manager()
        session = db_manager.get_session()
        try:
            session.add(log_entry)
            session.commit()
            self.logger.info(
                f"Audit logged: {event_type.value} for user {user_id or 'N/A'}"
            )
            return log_entry
        except Exception as e:
            session.rollback()
            self.logger.error(f"Failed to write audit log entry: {e}")
            return None
        finally:
            session.close()

    def get_logs(
        self,
        event_type: Optional[AuditEventType] = None,
        user_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AuditLog]:
        """
        Retrieves audit logs based on filters.

        Args:
            event_type: Filter by event type.
            user_id: Filter by user ID.
            start_date: Filter by start date.
            end_date: Filter by end date.
            limit: Maximum number of logs to return.
            offset: Offset for pagination.

        Returns:
            A list of AuditLog objects.
        """
        db_manager = get_db_manager()
        session = db_manager.get_session()
        try:
            query = session.query(AuditLog)
            if event_type:
                query = query.filter(AuditLog.event_type == event_type)
            if user_id:
                query = query.filter(AuditLog.user_id == user_id)
            if start_date:
                query = query.filter(AuditLog.timestamp >= start_date)
            if end_date:
                query = query.filter(AuditLog.timestamp <= end_date)
            logs = (
                query.order_by(AuditLog.timestamp.desc())
                .limit(limit)
                .offset(offset)
                .all()
            )
            return logs
        except Exception as e:
            self.logger.error(f"Failed to retrieve audit logs: {e}")
            return []
        finally:
            session.close()

    def search_logs(self, search_term: str, limit: int = 100) -> List[AuditLog]:
        """
        Searches audit logs for a given term in the message or details.
        (Note: Full-text search capabilities depend on the underlying database,
        this implementation uses simple LIKE for portability).
        """
        db_manager = get_db_manager()
        session = db_manager.get_session()
        try:
            search_pattern = f"%{search_term}%"
            logs = (
                session.query(AuditLog)
                .filter(AuditLog.message.ilike(search_pattern))
                .order_by(AuditLog.timestamp.desc())
                .limit(limit)
                .all()
            )
            return logs
        except Exception as e:
            self.logger.error(f"Failed to search audit logs: {e}")
            return []
        finally:
            session.close()

    def log_authentication_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[int] = None,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None,
    ) -> Optional[AuditLog]:
        """Log authentication event"""
        from flask import request as flask_request

        return self.log_event(
            event_type=event_type,
            user_id=user_id,
            ip_address=flask_request.remote_addr if flask_request else None,
            details=details,
            message=f"Authentication event: {event_type.value}",
            success=success,
        )

    def log_security_alert(
        self,
        alert_type: str,
        user_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> Optional[AuditLog]:
        """Log security alert"""
        from flask import request as flask_request

        return self.log_event(
            event_type=AuditEventType.SECURITY_ALERT,
            user_id=user_id,
            ip_address=flask_request.remote_addr if flask_request else None,
            resource_type="security",
            details={"alert_type": alert_type, **(details or {})},
            message=f"Security alert: {alert_type}",
            success=False,
        )

    def log_data_access(
        self,
        action: str,
        resource: str,
        user_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> Optional[AuditLog]:
        """Log data access event"""
        from flask import request as flask_request

        return self.log_event(
            event_type=AuditEventType.DATA_ACCESS,
            user_id=user_id,
            ip_address=flask_request.remote_addr if flask_request else None,
            resource_type=resource,
            details={"action": action, **(details or {})},
            message=f"Data access: {action} on {resource}",
            success=True,
        )

    def log_financial_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> Optional[AuditLog]:
        """Log financial event"""
        from flask import request as flask_request

        return self.log_event(
            event_type=event_type,
            user_id=user_id,
            ip_address=flask_request.remote_addr if flask_request else None,
            resource_type="financial",
            details=details,
            message=f"Financial event: {event_type.value}",
            success=True,
        )


audit_logger = AuditLogger()
