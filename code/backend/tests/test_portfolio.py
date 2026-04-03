"""
Portfolio management tests for BlockGuardian Backend
Tests portfolio creation, asset management, and trading functionality
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
from decimal import Decimal
from typing import Any

import pytest
from src.main import create_app
from src.models.portfolio import (
    Asset,
    AssetType,
    Portfolio,
    PortfolioHolding,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from src.models.user import db


@pytest.fixture
def app() -> Any:
    """Create test Flask application"""
    app = create_app("testing")
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["WTF_CSRF_ENABLED"] = False
    with app.app_context():
        db.create_all()
        test_assets = [
            Asset(
                symbol="AAPL",
                name="Apple Inc.",
                asset_type=AssetType.STOCK,
                current_price=Decimal("150.00"),
                currency="USD",
                is_tradeable=True,
            ),
            Asset(
                symbol="BTC",
                name="Bitcoin",
                asset_type=AssetType.CRYPTOCURRENCY,
                current_price=Decimal("45000.00"),
                currency="USD",
                is_tradeable=True,
            ),
            Asset(
                symbol="SPY",
                name="SPDR S&P 500 ETF",
                asset_type=AssetType.ETF,
                current_price=Decimal("400.00"),
                currency="USD",
                is_tradeable=True,
            ),
        ]
        for asset in test_assets:
            db.session.add(asset)
        db.session.commit()
        yield app
        db.drop_all()


@pytest.fixture
def client(app: Any) -> Any:
    """Create test client"""
    return app.test_client()


@pytest.fixture
def authenticated_user(app: Any, client: Any) -> Any:
    """Create and authenticate a test user"""
    with app.app_context():
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "TestPassword123!",
            "first_name": "Test",
            "last_name": "User",
            "country": "US",
        }
        response = client.post(
            "/api/auth/register",
            data=json.dumps(user_data),
            content_type="application/json",
        )
        assert response.status_code == 201
        login_data = {"email": user_data["email"], "password": user_data["password"]}
        response = client.post(
            "/api/auth/login",
            data=json.dumps(login_data),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        return {"token": data["tokens"]["access_token"], "user_id": data["user"]["id"]}


@pytest.fixture
def sample_portfolio_data() -> Any:
    """Sample portfolio creation data"""
    return {
        "name": "Test Portfolio",
        "description": "A test portfolio for unit testing",
        "portfolio_type": "personal",
        "base_currency": "USD",
        "risk_level": "moderate",
        "investment_objective": "Long-term growth",
    }


class TestPortfolioCreation:
    """Test portfolio creation functionality"""

    def test_create_portfolio_success(
        self, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test successful portfolio creation"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert "portfolio" in data
        assert data["portfolio"]["name"] == sample_portfolio_data["name"]
        assert data["portfolio"]["owner_id"] == authenticated_user["user_id"]
        assert data["portfolio"]["is_active"] is True

    def test_create_portfolio_missing_fields(
        self, client: Any, authenticated_user: Any
    ) -> Any:
        """Test portfolio creation with missing required fields"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        incomplete_data = {"name": "Test Portfolio"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(incomplete_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data

    def test_create_portfolio_unauthorized(
        self, client: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test portfolio creation without authentication"""
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_create_portfolio_invalid_type(
        self, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test portfolio creation with invalid type"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        sample_portfolio_data["portfolio_type"] = "invalid_type"
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data


class TestPortfolioManagement:
    """Test portfolio management functionality"""

    def test_get_portfolios(
        self, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test getting user portfolios"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        response = client.get("/api/portfolios", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "portfolios" in data
        assert len(data["portfolios"]) == 1
        assert data["portfolios"][0]["name"] == sample_portfolio_data["name"]

    def test_get_portfolio_by_id(
        self, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test getting specific portfolio by ID"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        response = client.get(f"/api/portfolios/{portfolio_id}", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "portfolio" in data
        assert data["portfolio"]["id"] == portfolio_id

    def test_get_portfolio_unauthorized(
        self, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test getting portfolio without proper authorization"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        response = client.get(f"/api/portfolios/{portfolio_id}")
        assert response.status_code == 401

    def test_update_portfolio(
        self, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test updating portfolio information"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        update_data = {
            "name": "Updated Portfolio Name",
            "description": "Updated description",
            "risk_level": "aggressive",
        }
        response = client.put(
            f"/api/portfolios/{portfolio_id}",
            data=json.dumps(update_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["portfolio"]["name"] == update_data["name"]
        assert data["portfolio"]["description"] == update_data["description"]

    def test_delete_portfolio(
        self, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test deleting portfolio"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        response = client.delete(f"/api/portfolios/{portfolio_id}", headers=headers)
        assert response.status_code == 200
        response = client.get(f"/api/portfolios/{portfolio_id}", headers=headers)
        data = json.loads(response.data)
        assert data["portfolio"]["is_active"] is False


class TestAssetManagement:
    """Test asset management functionality"""

    def test_get_available_assets(self, client: Any, authenticated_user: Any) -> Any:
        """Test getting available assets for trading"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.get("/api/portfolios/assets", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "assets" in data
        assert len(data["assets"]) >= 3
        asset = data["assets"][0]
        assert "symbol" in asset
        assert "name" in asset
        assert "asset_type" in asset
        assert "current_price" in asset
        assert "is_tradeable" in asset

    def test_search_assets(self, client: Any, authenticated_user: Any) -> Any:
        """Test searching for assets"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.get("/api/portfolios/assets?search=AAPL", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "assets" in data
        assert len(data["assets"]) == 1
        assert data["assets"][0]["symbol"] == "AAPL"

    def test_filter_assets_by_type(self, client: Any, authenticated_user: Any) -> Any:
        """Test filtering assets by type"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.get(
            "/api/portfolios/assets?asset_type=stock", headers=headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "assets" in data
        for asset in data["assets"]:
            assert asset["asset_type"] == "stock"


class TestPortfolioHoldings:
    """Test portfolio holdings functionality"""

    def test_get_portfolio_holdings(
        self, app: Any, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test getting portfolio holdings"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        with app.app_context():
            db.session.query(Portfolio).get(portfolio_id)
            asset = db.session.query(Asset).filter(Asset.symbol == "AAPL").first()
            holding = PortfolioHolding(
                portfolio_id=portfolio_id,
                asset_id=asset.id,
                quantity=Decimal("10"),
                average_cost=Decimal("145.00"),
                current_value=Decimal("1500.00"),
            )
            db.session.add(holding)
            db.session.commit()
        response = client.get(
            f"/api/portfolios/{portfolio_id}/holdings", headers=headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "holdings" in data
        assert len(data["holdings"]) == 1
        holding = data["holdings"][0]
        assert holding["asset"]["symbol"] == "AAPL"
        assert float(holding["quantity"]) == 10.0

    def test_get_portfolio_performance(
        self, app: Any, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test getting portfolio performance metrics"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        response = client.get(
            f"/api/portfolios/{portfolio_id}/performance", headers=headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "performance" in data
        assert "total_value" in data["performance"]
        assert "total_return" in data["performance"]
        assert "total_return_percent" in data["performance"]


class TestTransactions:
    """Test transaction functionality"""

    def test_create_buy_transaction(
        self, app: Any, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test creating a buy transaction"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        with app.app_context():
            asset = db.session.query(Asset).filter(Asset.symbol == "AAPL").first()
            asset_id = asset.id
        transaction_data = {
            "transaction_type": "buy",
            "asset_id": asset_id,
            "quantity": 10,
            "price": 150.0,
        }
        response = client.post(
            f"/api/portfolios/{portfolio_id}/transactions",
            data=json.dumps(transaction_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert "transaction" in data
        assert data["transaction"]["transaction_type"] == "buy"
        assert float(data["transaction"]["quantity"]) == 10.0
        assert float(data["transaction"]["price"]) == 150.0

    def test_create_sell_transaction_insufficient_holdings(
        self, app: Any, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test creating a sell transaction with insufficient holdings"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        with app.app_context():
            asset = db.session.query(Asset).filter(Asset.symbol == "AAPL").first()
            asset_id = asset.id
        transaction_data = {
            "transaction_type": "sell",
            "asset_id": asset_id,
            "quantity": 10,
            "price": 150.0,
        }
        response = client.post(
            f"/api/portfolios/{portfolio_id}/transactions",
            data=json.dumps(transaction_data),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert "error" in data
        assert "insufficient" in data["error"].lower()

    def test_get_transaction_history(
        self, app: Any, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test getting transaction history"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        with app.app_context():
            asset = db.session.query(Asset).filter(Asset.symbol == "AAPL").first()
            transaction = Transaction(
                user_id=authenticated_user["user_id"],
                portfolio_id=portfolio_id,
                asset_id=asset.id,
                transaction_type=TransactionType.BUY,
                quantity=Decimal("10"),
                price=Decimal("150.00"),
                amount=Decimal("1500.00"),
                status=TransactionStatus.COMPLETED,
            )
            db.session.add(transaction)
            db.session.commit()
        response = client.get(
            f"/api/portfolios/{portfolio_id}/transactions", headers=headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "transactions" in data
        assert len(data["transactions"]) == 1
        transaction = data["transactions"][0]
        assert transaction["transaction_type"] == "buy"
        assert float(transaction["quantity"]) == 10.0

    def test_cancel_pending_transaction(
        self, app: Any, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test canceling a pending transaction"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        with app.app_context():
            asset = db.session.query(Asset).filter(Asset.symbol == "AAPL").first()
            transaction = Transaction(
                user_id=authenticated_user["user_id"],
                portfolio_id=portfolio_id,
                asset_id=asset.id,
                transaction_type=TransactionType.BUY,
                quantity=Decimal("10"),
                price=Decimal("150.00"),
                amount=Decimal("1500.00"),
                status=TransactionStatus.PENDING,
            )
            db.session.add(transaction)
            db.session.commit()
            transaction_id = transaction.id
        response = client.post(
            f"/api/portfolios/{portfolio_id}/transactions/{transaction_id}/cancel",
            headers=headers,
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "message" in data
        assert "cancelled" in data["message"].lower()


class TestPortfolioAnalytics:
    """Test portfolio analytics functionality"""

    def test_portfolio_allocation(
        self, app: Any, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test getting portfolio asset allocation"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        response = client.get(
            f"/api/portfolios/{portfolio_id}/allocation", headers=headers
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "allocation" in data
        assert "by_asset_type" in data["allocation"]
        assert "by_asset" in data["allocation"]

    def test_portfolio_risk_metrics(
        self, client: Any, authenticated_user: Any, sample_portfolio_data: Any
    ) -> Any:
        """Test getting portfolio risk metrics"""
        headers = {"Authorization": f"Bearer {authenticated_user['token']}"}
        response = client.post(
            "/api/portfolios",
            data=json.dumps(sample_portfolio_data),
            content_type="application/json",
            headers=headers,
        )
        portfolio_data = json.loads(response.data)
        portfolio_id = portfolio_data["portfolio"]["id"]
        response = client.get(f"/api/portfolios/{portfolio_id}/risk", headers=headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "risk_metrics" in data
        assert "risk_score" in data["risk_metrics"]
        assert "volatility" in data["risk_metrics"]


if __name__ == "__main__":
    pytest.main([__file__])
