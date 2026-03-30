"""
Comprehensive Test Suite for Compliance Module
Tests KYC/AML compliance, regulatory reporting, and risk management features
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from unittest.mock import Mock, patch
import pytest
from flask import Flask
from flask_testing import TestCase
from src.compliance.compliance import (
    ComplianceRule,
    ComplianceStatus,
    DocumentType,
    ComplianceManager,
    RegulatoryRequirement,
    RiskLevel,
)
from src.models.transaction import SuspiciousActivity, Transaction
from src.models.user import User


class TestComplianceManager(TestCase):
    """Test cases for ComplianceManager class"""

    def create_app(self) -> Any:
        """Create test Flask application"""
        app = Flask(__name__)
        app.config["TESTING"] = True
        return app

    def setUp(self) -> Any:
        """Set up test fixtures"""
        self.compliance_manager = ComplianceManager()
        self.test_user = Mock(spec=User)
        self.test_user.id = "user_123"
        self.test_user.email = "test@example.com"
        self.test_user.first_name = "John"
        self.test_user.last_name = "Doe"
        self.test_user.country = "US"
        self.test_user.created_at = datetime.now(timezone.utc) - timedelta(days=30)
        self.test_user.kyc_status = "pending"
        self.test_user.aml_risk_level = "low"
        self.test_user.annual_income = Decimal("100000")
        self.test_user.metadata = {}
        self.test_transaction = Mock(spec=Transaction)
        self.test_transaction.id = "txn_123"
        self.test_transaction.user_id = "user_123"
        self.test_transaction.user = self.test_user
        self.test_transaction.total_amount = Decimal("5000.00")
        self.test_transaction.transaction_type = "buy"
        self.test_transaction.created_at = datetime.now(timezone.utc)
        self.mock_session = Mock()

    def tearDown(self) -> Any:
        """Clean up after tests"""

    def test_compliance_status_enum(self) -> Any:
        """Test ComplianceStatus enumeration"""
        self.assertEqual(ComplianceStatus.PENDING.value, "pending")
        self.assertEqual(ComplianceStatus.IN_PROGRESS.value, "in_progress")
        self.assertEqual(ComplianceStatus.APPROVED.value, "approved")
        self.assertEqual(ComplianceStatus.REJECTED.value, "rejected")
        self.assertEqual(ComplianceStatus.REQUIRES_REVIEW.value, "requires_review")
        self.assertEqual(ComplianceStatus.EXPIRED.value, "expired")

    def test_risk_level_enum(self) -> Any:
        """Test RiskLevel enumeration"""
        self.assertEqual(RiskLevel.LOW.value, "low")
        self.assertEqual(RiskLevel.MEDIUM.value, "medium")
        self.assertEqual(RiskLevel.HIGH.value, "high")
        self.assertEqual(RiskLevel.CRITICAL.value, "critical")

    def test_document_type_enum(self) -> Any:
        """Test DocumentType enumeration"""
        self.assertEqual(DocumentType.PASSPORT.value, "passport")
        self.assertEqual(DocumentType.DRIVERS_LICENSE.value, "drivers_license")
        self.assertEqual(DocumentType.NATIONAL_ID.value, "national_id")
        self.assertEqual(DocumentType.UTILITY_BILL.value, "utility_bill")
        self.assertEqual(DocumentType.BANK_STATEMENT.value, "bank_statement")

    def test_load_compliance_rules(self) -> Any:
        """Test loading of compliance rules"""
        rules = self.compliance_manager._load_compliance_rules()
        self.assertIsInstance(rules, list, "Rules should be a list")
        self.assertGreater(len(rules), 0, "Should load at least one rule")
        for rule in rules:
            self.assertIsInstance(
                rule, ComplianceRule, f"Rule {rule} is not a ComplianceRule instance"
            )
            self.assertIsNotNone(rule.id, "Rule ID should not be None")
            self.assertIsNotNone(rule.name, "Rule name should not be None")
            self.assertIsNotNone(rule.rule_type, "Rule type should not be None")
            self.assertIsInstance(
                rule.conditions, dict, "Rule conditions should be a dictionary"
            )
            self.assertIsInstance(rule.actions, list, "Rule actions should be a list")

    def test_load_regulatory_requirements(self) -> Any:
        """Test loading of regulatory requirements"""
        requirements = self.compliance_manager._load_regulatory_requirements()
        self.assertIsInstance(requirements, list, "Requirements should be a list")
        self.assertGreater(len(requirements), 0, "Should load at least one requirement")
        for req in requirements:
            self.assertIsInstance(
                req,
                RegulatoryRequirement,
                f"Requirement {req} is not a RegulatoryRequirement instance",
            )
            self.assertIsNotNone(req.regulation, "Regulation should not be None")
            self.assertIsNotNone(
                req.requirement_id, "Requirement ID should not be None"
            )
            self.assertIsInstance(
                req.applicable_jurisdictions, list, "Jurisdictions should be a list"
            )

    @patch("src.models.base.db_manager.get_session")
    def test_perform_kyc_verification_success(self, mock_get_session: Any) -> Any:
        """Test successful KYC verification"""
        mock_get_session.return_value = self.mock_session
        with patch.object(
            self.compliance_manager, "_verify_documents"
        ) as mock_verify_docs, patch.object(
            self.compliance_manager, "_verify_identity"
        ) as mock_verify_id, patch.object(
            self.compliance_manager, "_verify_address"
        ) as mock_verify_addr, patch.object(
            self.compliance_manager, "_screen_sanctions"
        ) as mock_screen_sanctions, patch.object(
            self.compliance_manager, "_screen_pep"
        ) as mock_screen_pep, patch.object(
            self.compliance_manager, "_calculate_kyc_risk_score"
        ) as mock_calc_risk, patch.object(
            self.compliance_manager, "_update_user_kyc_status"
        ) as mock_update_status:
            mock_verify_docs.return_value = {
                "success": True,
                "verified_documents": ["government_id"],
                "issues": [],
            }
            mock_verify_id.return_value = {
                "success": True,
                "confidence_score": 95,
                "issues": [],
            }
            mock_verify_addr.return_value = {
                "success": True,
                "confidence_score": 90,
                "issues": [],
            }
            mock_screen_sanctions.return_value = {
                "success": True,
                "matches": [],
                "lists_checked": ["ofac_sdn"],
            }
            mock_screen_pep.return_value = {
                "success": True,
                "is_pep": False,
                "pep_category": None,
                "details": [],
            }
            mock_calc_risk.return_value = 25
            documents = [
                {
                    "type": "government_id",
                    "document_number": "P123456789",
                    "expiry_date": (
                        datetime.now(timezone.utc) + timedelta(days=365)
                    ).isoformat(),
                    "file_path": "/path/to/document.pdf",
                    "name": "John Doe",
                }
            ]
            result = self.compliance_manager.perform_kyc_verification(
                self.test_user, documents
            )
            self.assertIn("user_id", result, "Result should contain user_id")
            self.assertIn(
                "verification_id", result, "Result should contain verification_id"
            )
            self.assertIn("status", result, "Result should contain status")
            self.assertIn(
                "verification_steps", result, "Result should contain verification_steps"
            )
            self.assertIn("risk_score", result, "Result should contain risk_score")
            self.assertEqual(
                result["status"],
                ComplianceStatus.APPROVED.value,
                "Status should be APPROVED",
            )
            self.assertEqual(
                result["risk_score"], 25, "Risk score should match mock value"
            )
            self.assertEqual(
                len(result["verification_steps"]), 5, "Should have 5 verification steps"
            )
            mock_verify_docs.assert_called_once()
            mock_verify_id.assert_called_once()
            mock_verify_addr.assert_called_once()
            mock_screen_sanctions.assert_called_once()
            mock_screen_pep.assert_called_once()
            mock_update_status.assert_called_once_with(self.test_user, result)
            self.mock_session.close.assert_called_once()

    @patch("src.models.base.db_manager.get_session")
    def test_perform_kyc_verification_failed_step(self, mock_get_session: Any) -> Any:
        """Test KYC verification with failed verification step"""
        mock_get_session.return_value = self.mock_session
        with patch.object(
            self.compliance_manager, "_verify_documents"
        ) as mock_verify_docs, patch.object(
            self.compliance_manager, "_verify_identity"
        ) as mock_verify_id, patch.object(
            self.compliance_manager, "_verify_address"
        ) as mock_verify_addr, patch.object(
            self.compliance_manager, "_screen_sanctions"
        ) as mock_screen_sanctions, patch.object(
            self.compliance_manager, "_screen_pep"
        ) as mock_screen_pep, patch.object(
            self.compliance_manager, "_calculate_kyc_risk_score"
        ) as mock_calc_risk, patch.object(
            self.compliance_manager, "_update_user_kyc_status"
        ):
            mock_verify_docs.return_value = {
                "success": False,
                "verified_documents": [],
                "issues": ["Missing document"],
            }
            mock_verify_id.return_value = {
                "success": True,
                "confidence_score": 95,
                "issues": [],
            }
            mock_verify_addr.return_value = {
                "success": True,
                "confidence_score": 90,
                "issues": [],
            }
            mock_screen_sanctions.return_value = {
                "success": True,
                "matches": [],
                "lists_checked": ["ofac_sdn"],
            }
            mock_screen_pep.return_value = {
                "success": True,
                "is_pep": False,
                "pep_category": None,
                "details": [],
            }
            mock_calc_risk.return_value = 50
            documents = [
                {
                    "type": "government_id",
                    "document_number": "P123456789",
                    "expiry_date": (
                        datetime.now(timezone.utc) + timedelta(days=365)
                    ).isoformat(),
                    "file_path": "/path/to/document.pdf",
                    "name": "John Doe",
                }
            ]
            result = self.compliance_manager.perform_kyc_verification(
                self.test_user, documents
            )
            self.assertEqual(
                result["status"],
                ComplianceStatus.REJECTED.value,
                "Status should be REJECTED for failed step",
            )
            self.assertTrue(
                any(
                    (
                        step["status"] == "failed"
                        for step in result["verification_steps"]
                    )
                ),
                "At least one step should have failed status",
            )
            self.mock_session.close.assert_called_once()

    @patch("src.models.base.db_manager.get_session")
    def test_perform_kyc_verification_failed_step(self, mock_get_session: Any) -> Any:
        """Test KYC verification with failed verification step"""
        mock_get_session.return_value = self.mock_session
        with patch.object(
            self.compliance_manager, "_verify_documents"
        ) as mock_verify_docs, patch.object(
            self.compliance_manager, "_verify_identity"
        ) as mock_verify_id, patch.object(
            self.compliance_manager, "_verify_address"
        ) as mock_verify_addr, patch.object(
            self.compliance_manager, "_screen_sanctions"
        ) as mock_screen_sanctions, patch.object(
            self.compliance_manager, "_screen_pep"
        ) as mock_screen_pep, patch.object(
            self.compliance_manager, "_calculate_kyc_risk_score"
        ) as mock_calc_risk, patch.object(
            self.compliance_manager, "_update_user_kyc_status"
        ):
            mock_verify_docs.return_value = {
                "success": False,
                "verified_documents": [],
                "issues": ["Missing documents"],
            }
            mock_verify_id.return_value = {
                "success": True,
                "confidence_score": 95,
                "issues": [],
            }
            mock_verify_addr.return_value = {
                "success": True,
                "confidence_score": 90,
                "issues": [],
            }
            mock_screen_sanctions.return_value = {
                "success": True,
                "matches": [],
                "lists_checked": ["ofac_sdn"],
            }
            mock_screen_pep.return_value = {
                "success": True,
                "is_pep": False,
                "pep_category": None,
                "details": [],
            }
            mock_calc_risk.return_value = 45
            documents = []
            result = self.compliance_manager.perform_kyc_verification(
                self.test_user, documents
            )
            self.assertEqual(result["status"], ComplianceStatus.REJECTED.value)

    def test_verify_documents_success(self) -> Any:
        """Test successful document verification"""
        documents = [
            {
                "type": "government_id",
                "document_number": "P123456789",
                "expiry_date": (datetime.now() + timedelta(days=365)).isoformat(),
                "file_path": "/path/to/document.pdf",
            },
            {
                "type": "proof_of_address",
                "document_number": "UTIL123",
                "expiry_date": (datetime.now() + timedelta(days=30)).isoformat(),
                "file_path": "/path/to/utility.pdf",
            },
        ]
        result = self.compliance_manager._verify_documents(documents)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["verified_documents"]), 2)
        self.assertEqual(len(result["issues"]), 0)

    def test_verify_documents_missing_required(self) -> Any:
        """Test document verification with missing required documents"""
        documents = [
            {
                "type": "government_id",
                "document_number": "P123456789",
                "expiry_date": (datetime.now() + timedelta(days=365)).isoformat(),
                "file_path": "/path/to/document.pdf",
            }
        ]
        result = self.compliance_manager._verify_documents(documents)
        self.assertFalse(result["success"])
        self.assertIn("Missing required document: proof_of_address", result["issues"])

    def test_verify_single_document_valid(self) -> Any:
        """Test single document verification with valid document"""
        document = {
            "type": "government_id",
            "document_number": "P123456789",
            "expiry_date": (datetime.now() + timedelta(days=365)).isoformat(),
            "file_path": "/path/to/document.pdf",
        }
        result = self.compliance_manager._verify_single_document(document)
        self.assertTrue(result["valid"])
        self.assertEqual(len(result["issues"]), 0)

    def test_verify_single_document_expired(self) -> Any:
        """Test single document verification with expired document"""
        document = {
            "type": "government_id",
            "document_number": "P123456789",
            "expiry_date": (datetime.now() - timedelta(days=30)).isoformat(),
            "file_path": "/path/to/document.pdf",
        }
        result = self.compliance_manager._verify_single_document(document)
        self.assertFalse(result["valid"])
        self.assertIn("Document has expired", result["issues"])

    def test_verify_single_document_missing_fields(self) -> Any:
        """Test single document verification with missing fields"""
        document = {"type": "government_id", "document_number": "P123456789"}
        result = self.compliance_manager._verify_single_document(document)
        self.assertFalse(result["valid"])
        self.assertTrue(
            any(("Missing required field" in issue for issue in result["issues"]))
        )

    def test_verify_identity_success(self) -> Any:
        """Test successful identity verification"""
        documents = [{"type": "government_id", "name": "John Doe"}]
        result = self.compliance_manager._verify_identity(self.test_user, documents)
        self.assertTrue(result["success"])
        self.assertGreater(result["confidence_score"], 0)

    def test_verify_identity_name_mismatch(self) -> Any:
        """Test identity verification with name mismatch"""
        documents = [{"type": "government_id", "name": "Jane Smith"}]
        result = self.compliance_manager._verify_identity(self.test_user, documents)
        self.assertFalse(result["success"])
        self.assertIn("Name mismatch", result["issues"])

    def test_verify_address_success(self) -> Any:
        """Test successful address verification"""
        documents = [{"type": "proof_of_address", "address": "123 Main St"}]
        result = self.compliance_manager._verify_address(self.test_user, documents)
        self.assertTrue(result["success"])
        self.assertGreater(result["confidence_score"], 0)

    def test_verify_address_missing_document(self) -> Any:
        """Test address verification with missing proof of address"""
        documents = [{"type": "government_id", "name": "John Doe"}]
        result = self.compliance_manager._verify_address(self.test_user, documents)
        self.assertFalse(result["success"])
        self.assertIn("No proof of address document provided", result["issues"])

    def test_screen_sanctions_clean(self) -> Any:
        """Test sanctions screening with clean result"""
        result = self.compliance_manager._screen_sanctions(self.test_user)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["matches"]), 0)
        self.assertIn("ofac_sdn", result["lists_checked"])

    def test_screen_pep_clean(self) -> Any:
        """Test PEP screening with clean result"""
        result = self.compliance_manager._screen_pep(self.test_user)
        self.assertTrue(result["success"])
        self.assertFalse(result["is_pep"])
        self.assertIsNone(result["pep_category"])

    def test_calculate_kyc_risk_score_low_risk(self) -> Any:
        """Test KYC risk score calculation for low risk user"""
        verification_result = {
            "verification_steps": [
                {"step": "document_verification", "status": "completed"},
                {"step": "identity_verification", "status": "completed"},
                {"step": "address_verification", "status": "completed"},
                {
                    "step": "sanctions_screening",
                    "status": "completed",
                    "details": {"success": True},
                },
                {"step": "pep_screening", "status": "completed"},
            ]
        }
        self.test_user.country = "US"
        self.test_user.created_at = datetime.now(timezone.utc) - timedelta(days=365)
        risk_score = self.compliance_manager._calculate_kyc_risk_score(
            self.test_user, verification_result
        )
        self.assertLessEqual(risk_score, 30)

    def test_calculate_kyc_risk_score_high_risk(self) -> Any:
        """Test KYC risk score calculation for high risk user"""
        verification_result = {
            "verification_steps": [
                {"step": "document_verification", "status": "failed"},
                {"step": "identity_verification", "status": "completed"},
                {"step": "address_verification", "status": "completed"},
                {
                    "step": "sanctions_screening",
                    "status": "failed",
                    "details": {"success": False},
                },
                {"step": "pep_screening", "status": "completed"},
            ]
        }
        self.test_user.country = "AF"
        self.test_user.created_at = datetime.now(timezone.utc) - timedelta(hours=12)
        risk_score = self.compliance_manager._calculate_kyc_risk_score(
            self.test_user, verification_result
        )
        self.assertGreaterEqual(risk_score, 70)

    @patch("src.models.base.db_manager.get_session")
    def test_update_user_kyc_status(self, mock_get_session: Any) -> Any:
        """Test updating user KYC status"""
        mock_get_session.return_value = self.mock_session
        verification_result = {
            "status": ComplianceStatus.APPROVED.value,
            "risk_score": 25,
        }
        self.compliance_manager._update_user_kyc_status(
            self.test_user, verification_result
        )
        self.test_user.update_kyc_status.assert_called_once()
        self.mock_session.commit.assert_called_once()

    @patch("src.models.base.db_manager.get_session")
    def test_monitor_transaction_normal(self, mock_get_session: Any) -> Any:
        """Test transaction monitoring for normal transaction"""
        mock_get_session.return_value = self.mock_session
        self.mock_session.query.return_value.filter.return_value.all.return_value = []
        self.test_transaction.total_amount = Decimal("5000.00")
        result = self.compliance_manager.monitor_transaction(self.test_transaction)
        self.assertEqual(result["status"], "approved")
        self.assertLess(result["risk_score"], 70)
        self.assertEqual(len(result["flags"]), 0)

    @patch("src.models.base.db_manager.get_session")
    def test_monitor_transaction_large_amount(self, mock_get_session: Any) -> Any:
        """Test transaction monitoring for large transaction"""
        mock_get_session.return_value = self.mock_session
        self.mock_session.query.return_value.filter.return_value.all.return_value = []
        self.test_transaction.total_amount = Decimal("15000.00")
        result = self.compliance_manager.monitor_transaction(self.test_transaction)
        self.assertGreaterEqual(result["risk_score"], 30)
        self.assertTrue(
            any((flag["type"] == "large_transaction" for flag in result["flags"]))
        )
        self.assertIn("generate_ctr", result["actions_required"])

    @patch("src.models.base.db_manager.get_session")
    def test_analyze_transaction_patterns_rapid_transactions(
        self, mock_get_session: Any
    ) -> Any:
        """Test transaction pattern analysis for rapid transactions"""
        mock_get_session.return_value = self.mock_session
        recent_transactions = []
        for i in range(6):
            txn = Mock(spec=Transaction)
            txn.created_at = datetime.now(timezone.utc) - timedelta(minutes=i * 10)
            recent_transactions.append(txn)
        self.mock_session.query.return_value.filter.return_value.all.return_value = (
            recent_transactions
        )
        result = self.compliance_manager._analyze_transaction_patterns(
            self.test_transaction
        )
        self.assertTrue(result["suspicious"])
        self.assertTrue(
            any((flag["type"] == "rapid_transactions" for flag in result["flags"]))
        )
        self.assertGreaterEqual(result["risk_score"], 20)

    @patch("src.models.base.db_manager.get_session")
    def test_analyze_transaction_patterns_round_amount(
        self, mock_get_session: Any
    ) -> Any:
        """Test transaction pattern analysis for round amount"""
        mock_get_session.return_value = self.mock_session
        self.mock_session.query.return_value.filter.return_value.all.return_value = []
        self.test_transaction.total_amount = Decimal("10000.00")
        result = self.compliance_manager._analyze_transaction_patterns(
            self.test_transaction
        )
        self.assertTrue(
            any((flag["type"] == "round_amount" for flag in result["flags"]))
        )
        self.assertGreaterEqual(result["risk_score"], 10)

    @patch("src.models.base.db_manager.get_session")
    def test_analyze_transaction_patterns_structuring(
        self, mock_get_session: Any
    ) -> Any:
        """Test transaction pattern analysis for potential structuring"""
        mock_get_session.return_value = self.mock_session
        structuring_transactions = []
        for i in range(3):
            txn = Mock(spec=Transaction)
            txn.total_amount = Decimal("9500.00")
            txn.created_at = datetime.now(timezone.utc) - timedelta(days=i)
            structuring_transactions.append(txn)
        self.mock_session.query.return_value.filter.return_value.all.return_value = (
            structuring_transactions
        )
        result = self.compliance_manager._analyze_transaction_patterns(
            self.test_transaction
        )
        self.assertTrue(result["suspicious"])
        self.assertTrue(
            any((flag["type"] == "potential_structuring" for flag in result["flags"]))
        )
        self.assertIn("generate_sar", result["actions"])
        self.assertGreaterEqual(result["risk_score"], 40)

    def test_assess_user_transaction_risk_kyc_not_approved(self) -> Any:
        """Test user transaction risk assessment for non-approved KYC"""
        self.test_user.kyc_status = "pending"
        result = self.compliance_manager._assess_user_transaction_risk(
            self.test_user, self.test_transaction
        )
        self.assertGreaterEqual(result["risk_score"], 25)
        self.assertTrue(
            any((flag["type"] == "kyc_not_approved" for flag in result["flags"]))
        )

    def test_assess_user_transaction_risk_high_aml_risk(self) -> Any:
        """Test user transaction risk assessment for high AML risk user"""
        self.test_user.aml_risk_level = "high"
        self.test_user.kyc_status = "approved"
        result = self.compliance_manager._assess_user_transaction_risk(
            self.test_user, self.test_transaction
        )
        self.assertGreaterEqual(result["risk_score"], 30)
        self.assertTrue(
            any((flag["type"] == "high_risk_user" for flag in result["flags"]))
        )

    def test_assess_user_transaction_risk_vs_income(self) -> Any:
        """Test user transaction risk assessment vs declared income"""
        self.test_user.kyc_status = "approved"
        self.test_user.aml_risk_level = "low"
        self.test_user.annual_income = Decimal("50000")
        self.test_transaction.total_amount = Decimal("10000")
        result = self.compliance_manager._assess_user_transaction_risk(
            self.test_user, self.test_transaction
        )
        self.assertGreaterEqual(result["risk_score"], 20)
        self.assertTrue(
            any((flag["type"] == "transaction_vs_income" for flag in result["flags"]))
        )

    @patch("src.models.base.db_manager.get_session")
    def test_generate_sar(self, mock_get_session: Any) -> Any:
        """Test SAR generation"""
        mock_get_session.return_value = self.mock_session
        monitoring_result = {
            "flags": [{"type": "suspicious_pattern", "description": "Test pattern"}],
            "risk_score": 85,
        }
        self.compliance_manager._generate_sar(self.test_transaction, monitoring_result)
        self.mock_session.add.assert_called_once()
        self.mock_session.commit.assert_called_once()
        sar_call = self.mock_session.add.call_args[0][0]
        self.assertIsInstance(sar_call, Mock)

    @patch("src.models.base.db_manager.get_session")
    def test_generate_compliance_report_kyc_summary(self, mock_get_session: Any) -> Any:
        """Test KYC summary report generation"""
        mock_get_session.return_value = self.mock_session
        mock_users = [Mock(spec=User) for _ in range(5)]
        mock_users[0].kyc_status = "approved"
        mock_users[1].kyc_status = "approved"
        mock_users[2].kyc_status = "pending"
        mock_users[3].kyc_status = "rejected"
        mock_users[4].kyc_status = "in_progress"
        for user in mock_users:
            user.aml_risk_level = "low"
        self.mock_session.query.return_value.filter.return_value.all.return_value = (
            mock_users
        )
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        end_date = datetime.now(timezone.utc)
        report = self.compliance_manager.generate_compliance_report(
            "kyc_summary", start_date, end_date
        )
        self.assertEqual(report["report_type"], "kyc_summary")
        self.assertIn("data", report)
        data = report["data"]
        self.assertEqual(data["total_users"], 5)
        self.assertEqual(data["kyc_approved"], 2)
        self.assertEqual(data["kyc_pending"], 2)
        self.assertEqual(data["kyc_rejected"], 1)

    @patch("src.models.base.db_manager.get_session")
    def test_generate_compliance_report_aml_activity(
        self, mock_get_session: Any
    ) -> Any:
        """Test AML activity report generation"""
        mock_get_session.return_value = self.mock_session
        mock_transactions = [Mock(spec=Transaction) for _ in range(10)]
        for i, txn in enumerate(mock_transactions):
            txn.total_amount = Decimal(str(1000 * (i + 1)))
        mock_sars = [Mock(spec=SuspiciousActivity) for _ in range(3)]
        mock_sars[0].reported_to_authorities = True
        mock_sars[1].reported_to_authorities = False
        mock_sars[2].reported_to_authorities = True
        self.mock_session.query.return_value.filter.return_value.all.side_effect = [
            mock_transactions,
            mock_sars,
        ]
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        end_date = datetime.now(timezone.utc)
        report = self.compliance_manager.generate_compliance_report(
            "aml_activity", start_date, end_date
        )
        self.assertEqual(report["report_type"], "aml_activity")
        self.assertIn("data", report)
        data = report["data"]
        self.assertEqual(data["total_transactions"], 10)
        self.assertEqual(data["suspicious_activities"], 3)
        self.assertEqual(data["sars_filed"], 2)

    def test_generate_verification_id(self) -> Any:
        """Test verification ID generation"""
        verification_id = self.compliance_manager._generate_verification_id()
        self.assertIsNotNone(verification_id)
        self.assertTrue(verification_id.startswith("KYC-"))
        self.assertEqual(len(verification_id), 25)

    def test_generate_monitoring_id(self) -> Any:
        """Test monitoring ID generation"""
        monitoring_id = self.compliance_manager._generate_monitoring_id()
        self.assertIsNotNone(monitoring_id)
        self.assertTrue(monitoring_id.startswith("AML-"))
        self.assertEqual(len(monitoring_id), 25)


class TestComplianceDataClasses(TestCase):
    """Test compliance data classes"""

    def test_compliance_rule_creation(self) -> Any:
        """Test ComplianceRule creation"""
        rule = ComplianceRule(
            id="test_rule",
            name="Test Rule",
            description="Test description",
            rule_type="kyc",
            conditions={"threshold": 1000},
            actions=["verify", "report"],
            severity="high",
        )
        self.assertEqual(rule.id, "test_rule")
        self.assertEqual(rule.name, "Test Rule")
        self.assertEqual(rule.rule_type, "kyc")
        self.assertTrue(rule.enabled)
        self.assertIsInstance(rule.conditions, dict)
        self.assertIsInstance(rule.actions, list)

    def test_regulatory_requirement_creation(self) -> Any:
        """Test RegulatoryRequirement creation"""
        requirement = RegulatoryRequirement(
            regulation="BSA",
            requirement_id="CTR_FILING",
            description="Currency Transaction Report filing",
            applicable_jurisdictions=["US"],
            compliance_deadline=None,
        )
        self.assertEqual(requirement.regulation, "BSA")
        self.assertEqual(requirement.requirement_id, "CTR_FILING")
        self.assertIsInstance(requirement.applicable_jurisdictions, list)
        self.assertTrue(requirement.mandatory)


if __name__ == "__main__":
    pytest.main([__file__])
