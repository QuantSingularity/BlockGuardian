"""
User management API routes for BlockGuardian Backend
Implements user profile, settings, and account management
"""

from typing import Any
from flask import Blueprint, g, jsonify, request
from src.models.base import db_manager
from src.models.user import User
from src.security.audit import audit_logger
from src.security.auth import jwt_required
from src.security.rate_limiting import RateLimitScope, rate_limit
from src.security.validation import ValidationError, security_validator

user_bp = Blueprint("user", __name__)


@user_bp.route("/me", methods=["GET"])
@jwt_required
def get_current_user() -> Any:
    """Get current user profile"""
    try:
        session = db_manager.get_session()
        try:
            user = session.query(User).get(g.current_user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            return jsonify({"user": user.to_dict(include_sensitive=False)}), 200
        finally:
            session.close()
    except Exception:
        return jsonify({"error": "Failed to get user profile"}), 500


@user_bp.route("/me", methods=["PUT"])
@jwt_required
@rate_limit(limit=10, window=3600, scope=RateLimitScope.PER_USER)
def update_current_user() -> Any:
    """Update current user profile"""
    try:
        data = security_validator.validate_json_input(request.get_json())

        session = db_manager.get_session()
        try:
            user = session.query(User).get(g.current_user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            # Update allowed fields
            allowed_fields = [
                "first_name",
                "last_name",
                "country",
                "city",
                "postal_code",
                "phone_number",
                "risk_tolerance",
                "investment_experience",
                "annual_income",
            ]

            updated_fields = []
            for field in allowed_fields:
                if field in data:
                    if field in user._encrypted_fields:
                        user.set_encrypted_field(field, data[field], "pii")
                    else:
                        setattr(user, field, data[field])
                    updated_fields.append(field)

            session.commit()

            audit_logger.log_data_access(
                action="update",
                resource="user_profile",
                user_id=user.id,
                details={"updated_fields": updated_fields},
            )

            return (
                jsonify(
                    {
                        "message": "Profile updated successfully",
                        "user": user.to_dict(include_sensitive=False),
                    }
                ),
                200,
            )
        finally:
            session.close()
    except ValidationError as e:
        return jsonify({"error": e.message, "field": e.field}), 400
    except Exception:
        return jsonify({"error": "Failed to update user profile"}), 500


@user_bp.route("/me/settings", methods=["GET"])
@jwt_required
def get_user_settings() -> None:
    """Get user settings"""
    try:
        session = db_manager.get_session()
        try:
            user = session.query(User).get(g.current_user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            settings = {
                "mfa_enabled": user.mfa_enabled,
                "risk_tolerance": user.risk_tolerance,
                "investment_experience": user.investment_experience,
                "max_sessions": user.max_sessions,
            }

            return jsonify({"settings": settings}), 200
        finally:
            session.close()
    except Exception:
        return jsonify({"error": "Failed to get settings"}), 500


@user_bp.route("/me/settings", methods=["PUT"])
@jwt_required
@rate_limit(limit=10, window=3600, scope=RateLimitScope.PER_USER)
def update_user_settings() -> None:
    """Update user settings"""
    try:
        data = security_validator.validate_json_input(request.get_json())

        session = db_manager.get_session()
        try:
            user = session.query(User).get(g.current_user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            # Update allowed settings
            allowed_settings = [
                "risk_tolerance",
                "investment_experience",
                "max_sessions",
            ]

            for setting in allowed_settings:
                if setting in data:
                    setattr(user, setting, data[setting])

            session.commit()

            return jsonify({"message": "Settings updated successfully"}), 200
        finally:
            session.close()
    except ValidationError as e:
        return jsonify({"error": e.message, "field": e.field}), 400
    except Exception:
        return jsonify({"error": "Failed to update settings"}), 500


@user_bp.route("/me/stats", methods=["GET"])
@jwt_required
def get_user_stats() -> Any:
    """Get user statistics"""
    try:
        session = db_manager.get_session()
        try:
            from src.models.portfolio import Portfolio

            user = session.query(User).get(g.current_user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            # Get portfolio count
            portfolio_count = (
                session.query(Portfolio)
                .filter(Portfolio.owner_id == user.id, Portfolio.is_active)
                .count()
            )

            # Get total portfolio value
            portfolios = (
                session.query(Portfolio)
                .filter(Portfolio.owner_id == user.id, Portfolio.is_active)
                .all()
            )

            total_value = sum(float(p.total_value) for p in portfolios)
            total_invested = sum(float(p.invested_amount) for p in portfolios)
            total_pnl = sum(
                float(p.realized_pnl + p.unrealized_pnl) for p in portfolios
            )

            stats = {
                "portfolio_count": portfolio_count,
                "total_value": total_value,
                "total_invested": total_invested,
                "total_pnl": total_pnl,
                "total_return_percent": (
                    (total_pnl / total_invested * 100) if total_invested > 0 else 0
                ),
                "account_age_days": (
                    (user.created_at - user.created_at).days if user.created_at else 0
                ),
                "kyc_status": user.kyc_status.value,
                "mfa_enabled": user.mfa_enabled,
            }

            return jsonify({"stats": stats}), 200
        finally:
            session.close()
    except Exception as e:
        return jsonify({"error": "Failed to get user stats", "details": str(e)}), 500
