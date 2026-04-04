# Security Module for Financial Standards Compliance
# This module implements comprehensive security controls for PCI DSS, SOC 2, and ISO 27001 compliance

# KMS Key for encryption at rest
resource "aws_kms_key" "main" {
  description             = "${var.app_name}-${var.environment}-encryption-key"
  deletion_window_in_days = var.kms_key_deletion_window
  enable_key_rotation     = var.enable_key_rotation

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-${var.environment}-kms-key"
    Environment = var.environment
    Purpose     = "Encryption at rest"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.app_name}-${var.environment}-key"
  target_key_id = aws_kms_key.main.key_id
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Application Security Group with strict controls
resource "aws_security_group" "app" {
  name        = "${var.app_name}-${var.environment}-app-sg"
  description = "Enhanced security group for ${var.app_name} application in ${var.environment} - Financial Grade"
  vpc_id      = var.vpc_id

  # HTTPS only - no HTTP allowed for financial applications
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "HTTPS from allowed networks only"
  }

  # SSH access restricted to management network only
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.management_cidr_blocks
    description = "SSH from management network only"
  }

  # Application port (if different from 443)
  dynamic "ingress" {
    for_each = var.app_port != 443 ? [1] : []
    content {
      from_port   = var.app_port
      to_port     = var.app_port
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
      description = "Application port from allowed networks"
    }
  }

  # Restricted egress - only necessary outbound traffic
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS outbound"
  }

  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP outbound for package updates"
  }

  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "DNS resolution"
  }

  egress {
    from_port   = 123
    to_port     = 123
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "NTP for time synchronization"
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-app-sg"
    Environment = var.environment
    Purpose     = "Application security group"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

# Enhanced Database Security Group
resource "aws_security_group" "db" {
  name        = "${var.app_name}-${var.environment}-db-sg"
  description = "Enhanced security group for ${var.app_name} database in ${var.environment} - Financial Grade"
  vpc_id      = var.vpc_id

  # Database access only from application security group
  ingress {
    from_port       = var.db_port
    to_port         = var.db_port
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Database access from application tier only"
  }

  # Management access for database administration (restricted)
  ingress {
    from_port   = var.db_port
    to_port     = var.db_port
    protocol    = "tcp"
    cidr_blocks = var.management_cidr_blocks
    description = "Database management access"
  }

  # Minimal egress for database operations
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS for updates and monitoring"
  }

  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "DNS resolution"
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-db-sg"
    Environment = var.environment
    Purpose     = "Database security group"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

# Load Balancer Security Group
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer - Financial Grade"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "HTTPS from allowed networks"
  }

  # Redirect HTTP to HTTPS
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "HTTP for redirect to HTTPS"
  }

  egress {
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Forward to application instances"
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-alb-sg"
    Environment = var.environment
    Purpose     = "Load balancer security group"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

# Management/Bastion Security Group
resource "aws_security_group" "management" {
  name        = "${var.app_name}-${var.environment}-mgmt-sg"
  description = "Security group for management/bastion hosts - Financial Grade"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.management_cidr_blocks
    description = "SSH from authorized management networks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
    description = "Access to internal VPC resources"
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS outbound"
  }

  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "DNS resolution"
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-mgmt-sg"
    Environment = var.environment
    Purpose     = "Management security group"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

# Network ACL for additional layer of security
resource "aws_network_acl" "private" {
  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  # Inbound rules
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    from_port  = 443
    to_port    = 443
    cidr_block = var.vpc_cidr
  }

  ingress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    from_port  = var.db_port
    to_port    = var.db_port
    cidr_block = var.vpc_cidr
  }

  ingress {
    rule_no    = 120
    protocol   = "tcp"
    action     = "allow"
    from_port  = 22
    to_port    = 22
    cidr_block = var.vpc_cidr
  }

  # Ephemeral ports for return traffic
  ingress {
    rule_no    = 200
    protocol   = "tcp"
    action     = "allow"
    from_port  = 1024
    to_port    = 65535
    cidr_block = "0.0.0.0/0"
  }

  # Outbound rules
  egress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    from_port  = 443
    to_port    = 443
    cidr_block = "0.0.0.0/0"
  }

  egress {
    rule_no    = 110
    protocol   = "tcp"
    action     = "allow"
    from_port  = 80
    to_port    = 80
    cidr_block = "0.0.0.0/0"
  }

  egress {
    rule_no    = 120
    protocol   = "udp"
    action     = "allow"
    from_port  = 53
    to_port    = 53
    cidr_block = "0.0.0.0/0"
  }

  egress {
    rule_no    = 130
    protocol   = "udp"
    action     = "allow"
    from_port  = 123
    to_port    = 123
    cidr_block = "0.0.0.0/0"
  }

  # Internal VPC traffic
  egress {
    rule_no    = 200
    protocol   = "-1"
    action     = "allow"
    from_port  = 0
    to_port    = 0
    cidr_block = var.vpc_cidr
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-private-nacl"
    Environment = var.environment
    Purpose     = "Private subnet network ACL"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

# IAM Role for EC2 instances with minimal permissions
resource "aws_iam_role" "ec2_role" {
  name = "${var.app_name}-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-${var.environment}-ec2-role"
    Environment = var.environment
    Purpose     = "EC2 instance role"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

# IAM Policy for EC2 instances - minimal permissions
resource "aws_iam_role_policy" "ec2_policy" {
  name = "${var.app_name}-${var.environment}-ec2-policy"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:${var.app_name}/${var.environment}/*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.app_name}-${var.environment}-ec2-profile"
  role = aws_iam_role.ec2_role.name

  tags = {
    Name        = "${var.app_name}-${var.environment}-ec2-profile"
    Environment = var.environment
    Purpose     = "EC2 instance profile"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

# Secrets Manager for sensitive configuration
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.app_name}/${var.environment}/app-secrets"
  description             = "Application secrets for ${var.app_name} in ${var.environment}"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = var.secrets_recovery_window

  tags = {
    Name        = "${var.app_name}-${var.environment}-app-secrets"
    Environment = var.environment
    Purpose     = "Application secrets"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

# WAF for application protection
resource "aws_wafv2_web_acl" "main" {
  count = var.enable_waf ? 1 : 0
  name  = "${var.app_name}-${var.environment}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "KnownBadInputsRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-waf"
    Environment = var.environment
    Purpose     = "Web Application Firewall"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.app_name}-${var.environment}-waf"
    sampled_requests_enabled   = true
  }
}

# CloudWatch Log Group for security events
resource "aws_cloudwatch_log_group" "security_logs" {
  name              = "/aws/${var.app_name}/${var.environment}/security"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.main.arn

  tags = {
    Name        = "${var.app_name}-${var.environment}-security-logs"
    Environment = var.environment
    Purpose     = "Security event logs"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

# VPC Flow Logs for network monitoring
resource "aws_flow_log" "vpc_flow_log" {
  count           = var.enable_vpc_flow_logs ? 1 : 0
  iam_role_arn    = aws_iam_role.flow_log_role.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs[0].arn
  traffic_type    = "ALL"
  vpc_id          = var.vpc_id

  tags = {
    Name        = "${var.app_name}-${var.environment}-vpc-flow-log"
    Environment = var.environment
    Purpose     = "VPC flow logs"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  count             = var.enable_vpc_flow_logs ? 1 : 0
  name              = "/aws/${var.app_name}/${var.environment}/vpc-flow-logs"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.main.arn

  tags = {
    Name        = "${var.app_name}-${var.environment}-vpc-flow-logs"
    Environment = var.environment
    Purpose     = "VPC flow logs"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

resource "aws_iam_role" "flow_log_role" {
  name = "${var.app_name}-${var.environment}-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-${var.environment}-flow-log-role"
    Environment = var.environment
    Purpose     = "VPC flow log role"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  }
}

resource "aws_iam_role_policy" "flow_log_policy" {
  name = "${var.app_name}-${var.environment}-flow-log-policy"
  role = aws_iam_role.flow_log_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}
