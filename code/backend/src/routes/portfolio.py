"""
Portfolio management API routes for BlockGuardian Backend
Implements comprehensive portfolio operations, asset management, and transaction processing
"""

import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any
from flask import Blueprint, g, jsonify, request
from src.models.base import db_manager, paginate_query
from src.models.portfolio import (
    Asset,
    Portfolio,
    PortfolioHolding,
    Transaction,
    TransactionType,
)
from src.models.user import User
from src.security.audit import audit_logger
from src.security.auth import Permission, jwt_required, permission_required
from src.security.rate_limiting import RateLimitScope, rate_limit
from src.security.validation import ValidationError, security_validator

portfolio_bp = Blueprint("portfolio", __name__)


@portfolio_bp.route("/", methods=["GET"])
@jwt_required
@rate_limit(limit=100, window=3600, scope=RateLimitScope.PER_USER)
def get_portfolios() -> Any:
    """Get user's portfolios"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 20, type=int), 100)
        session = db_manager.get_session()
        try:
            query = (
                session.query(Portfolio)
                .filter(
                    Portfolio.owner_id == g.current_user_id, Portfolio.is_active
                )
                .order_by(Portfolio.created_at.desc())
            )
            result = paginate_query(query, page, per_page)
            portfolios = []
            for portfolio in result["items"]:
                portfolio_dict = portfolio.to_dict()
                portfolio_dict["asset_allocation"] = portfolio.get_asset_allocation()
                portfolio_dict["risk_violations"] = portfolio.check_risk_limits()
                portfolios.append(portfolio_dict)
            result["items"] = portfolios
            return (jsonify(result), 200)
        finally:
            session.close()
    except Exception:
        return (jsonify({"error": "Failed to get portfolios"}), 500)


@portfolio_bp.route("/", methods=["POST"])
@jwt_required
@permission_required(Permission.CREATE_PORTFOLIO)
@rate_limit(limit=10, window=3600, scope=RateLimitScope.PER_USER)
def create_portfolio() -> Any:
    """Create a new portfolio"""
    try:
        data = security_validator.validate_json_input(request.get_json())
        if "name" not in data:
            return (jsonify({"error": "Portfolio name is required"}), 400)
        threats = security_validator.check_security_threats(json.dumps(data))
        if threats:
            audit_logger.log_security_alert(
                "portfolio_creation_security_threat",
                user_id=g.current_user_id,
                details={"threats": threats},
            )
            return (jsonify({"error": "Invalid input detected"}), 400)
        session = db_manager.get_session()
        try:
            user = session.query(User).get(g.current_user_id)
            if not user:
                return (jsonify({"error": "User not found"}), 404)
            can_trade, message = user.can_trade()
            if not can_trade:
                return (jsonify({"error": f"Cannot create portfolio: {message}"}), 403)
            portfolio = Portfolio(
                name=data["name"],
                description=data.get("description"),
                owner_id=g.current_user_id,
                portfolio_type=data.get("portfolio_type", "personal"),
                base_currency=data.get("base_currency", "USD"),
                risk_level=data.get("risk_level", "moderate"),
                investment_objective=data.get("investment_objective"),
            )
            if "max_position_size" in data:
                portfolio.max_position_size = float(data["max_position_size"])
            if "max_sector_allocation" in data:
                portfolio.max_sector_allocation = float(data["max_sector_allocation"])
            if "stop_loss_threshold" in data:
                portfolio.stop_loss_threshold = float(data["stop_loss_threshold"])
            session.add(portfolio)
            session.commit()
            audit_logger.log_financial_event(
                event_type=audit_logger.AuditEventType.PORTFOLIO_CREATED,
                user_id=g.current_user_id,
                details={
                    "portfolio_id": portfolio.id,
                    "portfolio_name": portfolio.name,
                    "portfolio_type": portfolio.portfolio_type.value,
                },
            )
            return (
                jsonify(
                    {
                        "message": "Portfolio created successfully",
                        "portfolio": portfolio.to_dict(),
                    }
                ),
                201,
            )
        finally:
            session.close()
    except ValidationError as e:
        return (jsonify({"error": e.message, "field": e.field}), 400)
    except Exception:
        return (jsonify({"error": "Failed to create portfolio"}), 500)


@portfolio_bp.route("/<int:portfolio_id>", methods=["GET"])
@jwt_required
@permission_required(Permission.READ_PORTFOLIO)
def get_portfolio(portfolio_id: Any) -> Any:
    """Get portfolio details"""
    try:
        session = db_manager.get_session()
        try:
            portfolio = (
                session.query(Portfolio)
                .filter(
                    Portfolio.id == portfolio_id,
                    Portfolio.owner_id == g.current_user_id,
                    Portfolio.is_active,
                )
                .first()
            )
            if not portfolio:
                return (jsonify({"error": "Portfolio not found"}), 404)
            portfolio_dict = portfolio.to_dict()
            portfolio_dict["asset_allocation"] = portfolio.get_asset_allocation()
            portfolio_dict["risk_violations"] = portfolio.check_risk_limits()
            holdings = []
            for holding in portfolio.holdings.filter_by(is_active=True):
                holding_dict = holding.to_dict()
                holding_dict["asset"] = holding.asset.to_dict()
                holdings.append(holding_dict)
            portfolio_dict["holdings"] = holdings
            return (jsonify(portfolio_dict), 200)
        finally:
            session.close()
    except Exception:
        return (jsonify({"error": "Failed to get portfolio"}), 500)


@portfolio_bp.route("/<int:portfolio_id>", methods=["PUT"])
@jwt_required
@permission_required(Permission.UPDATE_PORTFOLIO)
@rate_limit(limit=20, window=3600, scope=RateLimitScope.PER_USER)
def update_portfolio(portfolio_id: Any) -> None:
    """Update portfolio settings"""
    try:
        data = security_validator.validate_json_input(request.get_json())
        session = db_manager.get_session()
        try:
            portfolio = (
                session.query(Portfolio)
                .filter(
                    Portfolio.id == portfolio_id,
                    Portfolio.owner_id == g.current_user_id,
                    Portfolio.is_active,
                )
                .first()
            )
            if not portfolio:
                return (jsonify({"error": "Portfolio not found"}), 404)
            allowed_fields = [
                "name",
                "description",
                "investment_objective",
                "risk_level",
                "max_position_size",
                "max_sector_allocation",
                "stop_loss_threshold",
                "auto_rebalance",
                "rebalance_frequency",
            ]
            updated_fields = []
            for field in allowed_fields:
                if field in data:
                    setattr(portfolio, field, data[field])
                    updated_fields.append(field)
            session.commit()
            audit_logger.log_financial_event(
                event_type=audit_logger.AuditEventType.PORTFOLIO_UPDATED,
                user_id=g.current_user_id,
                details={
                    "portfolio_id": portfolio.id,
                    "updated_fields": updated_fields,
                },
            )
            return (
                jsonify(
                    {
                        "message": "Portfolio updated successfully",
                        "portfolio": portfolio.to_dict(),
                    }
                ),
                200,
            )
        finally:
            session.close()
    except ValidationError as e:
        return (jsonify({"error": e.message, "field": e.field}), 400)
    except Exception:
        return (jsonify({"error": "Failed to update portfolio"}), 500)


@portfolio_bp.route("/<int:portfolio_id>/transactions", methods=["GET"])
@jwt_required
@permission_required(Permission.READ_PORTFOLIO)
def get_portfolio_transactions(portfolio_id: Any) -> Any:
    """Get portfolio transaction history"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 50, type=int), 100)
        transaction_type = request.args.get("type")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        session = db_manager.get_session()
        try:
            portfolio = (
                session.query(Portfolio)
                .filter(
                    Portfolio.id == portfolio_id,
                    Portfolio.owner_id == g.current_user_id,
                )
                .first()
            )
            if not portfolio:
                return (jsonify({"error": "Portfolio not found"}), 404)
            query = (
                session.query(Transaction)
                .filter(Transaction.portfolio_id == portfolio_id)
                .order_by(Transaction.created_at.desc())
            )
            if transaction_type:
                query = query.filter(Transaction.transaction_type == transaction_type)
            if start_date:
                start_dt = datetime.fromisoformat(start_date)
                query = query.filter(Transaction.created_at >= start_dt)
            if end_date:
                end_dt = datetime.fromisoformat(end_date)
                query = query.filter(Transaction.created_at <= end_dt)
            result = paginate_query(query, page, per_page)
            transactions = []
            for transaction in result["items"]:
                transaction_dict = transaction.to_dict()
                if transaction.asset:
                    transaction_dict["asset"] = transaction.asset.to_dict()
                transactions.append(transaction_dict)
            result["items"] = transactions
            return (jsonify(result), 200)
        finally:
            session.close()
    except Exception:
        return (jsonify({"error": "Failed to get transactions"}), 500)


@portfolio_bp.route("/<int:portfolio_id>/buy", methods=["POST"])
@jwt_required
@permission_required(Permission.EXECUTE_TRADE)
@rate_limit(limit=50, window=3600, scope=RateLimitScope.PER_USER)
def buy_asset(portfolio_id: Any) -> None:
    """Buy an asset for the portfolio"""
    try:
        data = security_validator.validate_json_input(request.get_json())
        required_fields = ["asset_symbol", "quantity", "price"]
        for field in required_fields:
            if field not in data:
                return (jsonify({"error": f"{field} is required"}), 400)
        quantity = security_validator.validate_financial_amount(data["quantity"])
        price = security_validator.validate_financial_amount(data["price"])
        session = db_manager.get_session()
        try:
            portfolio = (
                session.query(Portfolio)
                .filter(
                    Portfolio.id == portfolio_id,
                    Portfolio.owner_id == g.current_user_id,
                    Portfolio.is_active,
                )
                .first()
            )
            if not portfolio:
                return (jsonify({"error": "Portfolio not found"}), 404)
            user = session.query(User).get(g.current_user_id)
            can_trade, message = user.can_trade()
            if not can_trade:
                return (jsonify({"error": f"Cannot execute trade: {message}"}), 403)
            asset = (
                session.query(Asset)
                .filter(Asset.symbol == data["asset_symbol"].upper())
                .first()
            )
            if not asset:
                return (jsonify({"error": "Asset not found"}), 404)
            if not asset.is_tradeable:
                return (jsonify({"error": "Asset is not tradeable"}), 400)
            total_amount = quantity * price
            fee = total_amount * Decimal("0.001")
            net_amount = total_amount + fee
            if portfolio.cash_balance < net_amount:
                return (jsonify({"error": "Insufficient cash balance"}), 400)
            portfolio_value = portfolio.calculate_total_value()
            if portfolio_value > 0:
                position_percentage = float(total_amount) / float(portfolio_value)
                if position_percentage > portfolio.max_position_size:
                    return (
                        jsonify(
                            {
                                "error": f"Position size exceeds limit ({portfolio.max_position_size * 100}%)"
                            }
                        ),
                        400,
                    )
            transaction = Transaction(
                transaction_type=TransactionType.BUY,
                user_id=g.current_user_id,
                portfolio_id=portfolio.id,
                asset_id=asset.id,
                quantity=quantity,
                price=price,
                amount=total_amount,
                fee=fee,
                net_amount=net_amount,
                currency=portfolio.base_currency,
            )
            transaction.execute()
            portfolio.cash_balance -= net_amount
            holding = (
                session.query(PortfolioHolding)
                .filter(
                    PortfolioHolding.portfolio_id == portfolio.id,
                    PortfolioHolding.asset_id == asset.id,
                    PortfolioHolding.is_active,
                )
                .first()
            )
            if holding:
                holding.add_shares(quantity, price)
            else:
                holding = PortfolioHolding(
                    portfolio_id=portfolio.id,
                    asset_id=asset.id,
                    quantity=quantity,
                    average_cost=price,
                    cost_basis=total_amount,
                    current_price=asset.current_price or price,
                )
                holding.update_valuation()
                session.add(holding)
            portfolio.update_portfolio_metrics()
            transaction.complete()
            session.commit()
            audit_logger.log_financial_event(
                event_type=audit_logger.AuditEventType.TRADE_EXECUTED,
                user_id=g.current_user_id,
                details={
                    "transaction_id": transaction.id,
                    "portfolio_id": portfolio.id,
                    "asset_symbol": asset.symbol,
                    "transaction_type": "buy",
                    "quantity": float(quantity),
                    "price": float(price),
                    "total_amount": float(total_amount),
                },
            )
            return (
                jsonify(
                    {
                        "message": "Buy order executed successfully",
                        "transaction": transaction.to_dict(),
                        "holding": holding.to_dict(),
                    }
                ),
                201,
            )
        finally:
            session.close()
    except ValidationError as e:
        return (jsonify({"error": e.message, "field": e.field}), 400)
    except Exception:
        return (jsonify({"error": "Failed to execute buy order"}), 500)


@portfolio_bp.route("/<int:portfolio_id>/sell", methods=["POST"])
@jwt_required
@permission_required(Permission.EXECUTE_TRADE)
@rate_limit(limit=50, window=3600, scope=RateLimitScope.PER_USER)
def sell_asset(portfolio_id: Any) -> None:
    """Sell an asset from the portfolio"""
    try:
        data = security_validator.validate_json_input(request.get_json())
        required_fields = ["asset_symbol", "quantity", "price"]
        for field in required_fields:
            if field not in data:
                return (jsonify({"error": f"{field} is required"}), 400)
        quantity = security_validator.validate_financial_amount(data["quantity"])
        price = security_validator.validate_financial_amount(data["price"])
        session = db_manager.get_session()
        try:
            portfolio = (
                session.query(Portfolio)
                .filter(
                    Portfolio.id == portfolio_id,
                    Portfolio.owner_id == g.current_user_id,
                    Portfolio.is_active,
                )
                .first()
            )
            if not portfolio:
                return (jsonify({"error": "Portfolio not found"}), 404)
            user = session.query(User).get(g.current_user_id)
            can_trade, message = user.can_trade()
            if not can_trade:
                return (jsonify({"error": f"Cannot execute trade: {message}"}), 403)
            asset = (
                session.query(Asset)
                .filter(Asset.symbol == data["asset_symbol"].upper())
                .first()
            )
            if not asset:
                return (jsonify({"error": "Asset not found"}), 404)
            holding = (
                session.query(PortfolioHolding)
                .filter(
                    PortfolioHolding.portfolio_id == portfolio.id,
                    PortfolioHolding.asset_id == asset.id,
                    PortfolioHolding.is_active,
                )
                .first()
            )
            if not holding:
                return (jsonify({"error": "No holding found for this asset"}), 404)
            if holding.quantity < quantity:
                return (jsonify({"error": "Insufficient shares to sell"}), 400)
            total_amount = quantity * price
            fee = total_amount * Decimal("0.001")
            net_amount = total_amount - fee
            transaction = Transaction(
                transaction_type=TransactionType.SELL,
                user_id=g.current_user_id,
                portfolio_id=portfolio.id,
                asset_id=asset.id,
                quantity=quantity,
                price=price,
                amount=total_amount,
                fee=fee,
                net_amount=net_amount,
                currency=portfolio.base_currency,
            )
            transaction.execute()
            realized_pnl = holding.remove_shares(quantity, price)
            portfolio.cash_balance += net_amount
            portfolio.realized_pnl += realized_pnl
            portfolio.update_portfolio_metrics()
            transaction.complete()
            session.commit()
            audit_logger.log_financial_event(
                event_type=audit_logger.AuditEventType.TRADE_EXECUTED,
                user_id=g.current_user_id,
                details={
                    "transaction_id": transaction.id,
                    "portfolio_id": portfolio.id,
                    "asset_symbol": asset.symbol,
                    "transaction_type": "sell",
                    "quantity": float(quantity),
                    "price": float(price),
                    "total_amount": float(total_amount),
                    "realized_pnl": float(realized_pnl),
                },
            )
            return (
                jsonify(
                    {
                        "message": "Sell order executed successfully",
                        "transaction": transaction.to_dict(),
                        "holding": holding.to_dict() if holding.is_active else None,
                        "realized_pnl": float(realized_pnl),
                    }
                ),
                201,
            )
        finally:
            session.close()
    except ValidationError as e:
        return (jsonify({"error": e.message, "field": e.field}), 400)
    except Exception:
        return (jsonify({"error": "Failed to execute sell order"}), 500)


@portfolio_bp.route("/<int:portfolio_id>/performance", methods=["GET"])
@jwt_required
@permission_required(Permission.READ_PORTFOLIO)
def get_portfolio_performance(portfolio_id: Any) -> Any:
    """Get portfolio performance metrics"""
    try:
        days = request.args.get("days", 30, type=int)
        session = db_manager.get_session()
        try:
            portfolio = (
                session.query(Portfolio)
                .filter(
                    Portfolio.id == portfolio_id,
                    Portfolio.owner_id == g.current_user_id,
                )
                .first()
            )
            if not portfolio:
                return (jsonify({"error": "Portfolio not found"}), 404)
            start_date = datetime.utcnow() - timedelta(days=days)
            snapshots = (
                portfolio.performance_snapshots.filter(
                    portfolio.performance_snapshots.c.snapshot_date >= start_date
                )
                .order_by(portfolio.performance_snapshots.c.snapshot_date.asc())
                .all()
            )
            current_value = float(portfolio.total_value)
            total_return = float(portfolio.realized_pnl + portfolio.unrealized_pnl)
            total_return_percent = (
                total_return / float(portfolio.invested_amount) * 100
                if portfolio.invested_amount > 0
                else 0
            )
            performance_data = []
            for snapshot in snapshots:
                performance_data.append(
                    {
                        "date": snapshot.snapshot_date.isoformat(),
                        "total_value": float(snapshot.total_value),
                        "unrealized_pnl": float(snapshot.unrealized_pnl),
                        "realized_pnl": float(snapshot.realized_pnl),
                    }
                )
            return (
                jsonify(
                    {
                        "portfolio_id": portfolio.id,
                        "current_value": current_value,
                        "invested_amount": float(portfolio.invested_amount),
                        "cash_balance": float(portfolio.cash_balance),
                        "unrealized_pnl": float(portfolio.unrealized_pnl),
                        "realized_pnl": float(portfolio.realized_pnl),
                        "total_return": total_return,
                        "total_return_percent": total_return_percent,
                        "asset_allocation": portfolio.get_asset_allocation(),
                        "risk_violations": portfolio.check_risk_limits(),
                        "performance_history": performance_data,
                    }
                ),
                200,
            )
        finally:
            session.close()
    except Exception:
        return (jsonify({"error": "Failed to get portfolio performance"}), 500)


@portfolio_bp.route("/assets/search", methods=["GET"])
@jwt_required
@permission_required(Permission.READ_MARKET_DATA)
def search_assets() -> None:
    """Search for tradeable assets"""
    try:
        query = request.args.get("q", "").strip()
        asset_type = request.args.get("type")
        limit = min(request.args.get("limit", 20, type=int), 100)
        if len(query) < 2:
            return (jsonify({"error": "Query must be at least 2 characters"}), 400)
        session = db_manager.get_session()
        try:
            search_query = session.query(Asset).filter(
                Asset.is_active, Asset.is_tradeable
            )
            search_query = search_query.filter(
                Asset.symbol.ilike(f"%{query}%") | Asset.name.ilike(f"%{query}%")
            )
            if asset_type:
                search_query = search_query.filter(Asset.asset_type == asset_type)
            assets = search_query.limit(limit).all()
            return (jsonify({"assets": [asset.to_dict() for asset in assets]}), 200)
        finally:
            session.close()
    except Exception:
        return (jsonify({"error": "Failed to search assets"}), 500)
