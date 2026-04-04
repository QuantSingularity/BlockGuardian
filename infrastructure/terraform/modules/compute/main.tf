# Compute Module for Financial Standards Compliance
# This module implements secure compute infrastructure with hardened instances, monitoring, and compliance features

# Data source for latest hardened AMI
data "aws_ami" "hardened_ami" {
  most_recent = true
  owners      = var.ami_owners

  filter {
    name   = "name"
    values = var.ami_name_filters
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# User data script for instance hardening
locals {
  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment         = var.environment
    app_name            = var.app_name
    cloudwatch_config   = var.enable_cloudwatch_agent
    secrets_manager_arn = var.secrets_manager_arn
    kms_key_id          = var.kms_key_id
    log_group_name      = var.log_group_name
    enable_ssm          = var.enable_ssm_agent
    compliance_mode     = var.compliance_mode
  }))
}

# Launch Template with security hardening
resource "aws_launch_template" "app" {
  name_prefix = "${var.app_name}-${var.environment}-"
  description = "Launch template for ${var.app_name} in ${var.environment} - Financial Grade"

  image_id      = var.custom_ami_id != null ? var.custom_ami_id : data.aws_ami.hardened_ami.id
  instance_type = var.instance_type
  key_name      = var.key_name

  # IAM instance profile for secure access
  iam_instance_profile {
    name = var.instance_profile_name
  }

  # Network interface configuration
  network_interfaces {
    associate_public_ip_address = false
    security_groups             = var.security_group_ids
    delete_on_termination       = true
    device_index                = 0
  }

  # EBS optimization and encryption
  ebs_optimized = true

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_type           = var.root_volume_type
      volume_size           = var.root_volume_size
      encrypted             = true
      kms_key_id            = var.kms_key_id
      delete_on_termination = true
      iops                  = var.root_volume_type == "gp3" ? var.root_volume_iops : null
      throughput            = var.root_volume_type == "gp3" ? var.root_volume_throughput : null
    }
  }

  # Additional data volume if specified
  dynamic "block_device_mappings" {
    for_each = var.data_volume_size > 0 ? [1] : []
    content {
      device_name = "/dev/xvdf"
      ebs {
        volume_type           = var.data_volume_type
        volume_size           = var.data_volume_size
        encrypted             = true
        kms_key_id            = var.kms_key_id
        delete_on_termination = true
        iops                  = var.data_volume_type == "gp3" ? var.data_volume_iops : null
        throughput            = var.data_volume_type == "gp3" ? var.data_volume_throughput : null
      }
    }
  }

  # Metadata options for security
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # Require IMDSv2
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  # Monitoring
  monitoring {
    enabled = var.enable_detailed_monitoring
  }

  # User data for instance initialization and hardening
  user_data = local.user_data

  # Tag specifications
  tag_specifications {
    resource_type = "instance"
    tags = merge(var.default_tags, {
      Name        = "${var.app_name}-${var.environment}"
      Environment = var.environment
      Purpose     = "Application server"
      Compliance  = "PCI-DSS,SOC2,ISO27001"
      AMI         = var.custom_ami_id != null ? var.custom_ami_id : data.aws_ami.hardened_ami.id
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(var.default_tags, {
      Name        = "${var.app_name}-${var.environment}-volume"
      Environment = var.environment
      Purpose     = "Application server volume"
      Compliance  = "PCI-DSS,SOC2,ISO27001"
    })
  }

  # Lifecycle management
  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_cloudwatch_log_group.app_logs
  ]
}

# Auto Scaling Group with enhanced configuration
resource "aws_autoscaling_group" "app" {
  name                = "${var.app_name}-${var.environment}-asg"
  vpc_zone_identifier = var.private_subnet_ids

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  health_check_type         = "ELB"
  health_check_grace_period = var.health_check_grace_period
  default_cooldown          = var.default_cooldown

  # Launch template configuration
  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Target group attachment
  target_group_arns = [aws_lb_target_group.app.arn]

  # Instance refresh for rolling updates
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = var.instance_warmup
    }
  }

  # Termination policies
  termination_policies = ["OldestInstance"]

  # Tags
  dynamic "tag" {
    for_each = merge(var.default_tags, {
      Name        = "${var.app_name}-${var.environment}-asg"
      Environment = var.environment
      Purpose     = "Auto Scaling Group"
      Compliance  = "PCI-DSS,SOC2,ISO27001"
    })
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  depends_on = [aws_lb_target_group.app]
}

# Application Load Balancer with security enhancements
resource "aws_lb" "app" {
  name               = "${var.app_name}-${var.environment}-alb"
  internal           = var.internal_load_balancer
  load_balancer_type = "application"
  security_groups    = var.alb_security_group_ids
  subnets            = var.internal_load_balancer ? var.private_subnet_ids : var.public_subnet_ids

  # Security configurations
  enable_deletion_protection       = var.enable_deletion_protection
  enable_cross_zone_load_balancing = true
  enable_http2                     = true
  enable_waf_fail_open             = false
  drop_invalid_header_fields       = true
  preserve_host_header             = true

  # Access logs
  dynamic "access_logs" {
    for_each = var.enable_access_logs ? [1] : []
    content {
      bucket  = var.access_logs_bucket
      prefix  = "${var.app_name}/${var.environment}/alb"
      enabled = true
    }
  }

  tags = merge(var.default_tags, {
    Name        = "${var.app_name}-${var.environment}-alb"
    Environment = var.environment
    Purpose     = "Application Load Balancer"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  })
}

# Target Group with health checks
resource "aws_lb_target_group" "app" {
  name     = "${var.app_name}-${var.environment}-tg"
  port     = var.app_port
  protocol = var.app_protocol
  vpc_id   = var.vpc_id

  # Health check configuration
  health_check {
    enabled             = true
    healthy_threshold   = var.healthy_threshold
    unhealthy_threshold = var.unhealthy_threshold
    timeout             = var.health_check_timeout
    interval            = var.health_check_interval
    path                = var.health_check_path
    port                = "traffic-port"
    protocol            = var.health_check_protocol
    matcher             = var.health_check_matcher
  }

  # Stickiness configuration
  dynamic "stickiness" {
    for_each = var.enable_stickiness ? [1] : []
    content {
      type            = "lb_cookie"
      cookie_duration = var.stickiness_duration
      enabled         = true
    }
  }

  tags = merge(var.default_tags, {
    Name        = "${var.app_name}-${var.environment}-tg"
    Environment = var.environment
    Purpose     = "Target Group"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  })
}

# HTTPS Listener with SSL/TLS termination
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  tags = merge(var.default_tags, {
    Name        = "${var.app_name}-${var.environment}-https-listener"
    Environment = var.environment
    Purpose     = "HTTPS Listener"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  })
}

# HTTP Listener for redirect to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.app.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = merge(var.default_tags, {
    Name        = "${var.app_name}-${var.environment}-http-redirect"
    Environment = var.environment
    Purpose     = "HTTP to HTTPS Redirect"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  })
}

# Auto Scaling Policies
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.app_name}-${var.environment}-scale-up"
  scaling_adjustment     = var.scale_up_adjustment
  adjustment_type        = "ChangeInCapacity"
  cooldown               = var.scale_up_cooldown
  autoscaling_group_name = aws_autoscaling_group.app.name
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.app_name}-${var.environment}-scale-down"
  scaling_adjustment     = var.scale_down_adjustment
  adjustment_type        = "ChangeInCapacity"
  cooldown               = var.scale_down_cooldown
  autoscaling_group_name = aws_autoscaling_group.app.name
}

# CloudWatch Alarms for Auto Scaling
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.app_name}-${var.environment}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = var.cpu_high_threshold
  alarm_description   = "This metric monitors EC2 CPU utilization"
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }

  tags = merge(var.default_tags, {
    Name        = "${var.app_name}-${var.environment}-cpu-high-alarm"
    Environment = var.environment
    Purpose     = "CPU High Alarm"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  })
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "${var.app_name}-${var.environment}-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = var.cpu_low_threshold
  alarm_description   = "This metric monitors EC2 CPU utilization"
  alarm_actions       = [aws_autoscaling_policy.scale_down.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }

  tags = merge(var.default_tags, {
    Name        = "${var.app_name}-${var.environment}-cpu-low-alarm"
    Environment = var.environment
    Purpose     = "CPU Low Alarm"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  })
}

# CloudWatch Log Group for application logs
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/ec2/${var.app_name}/${var.environment}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_id

  tags = merge(var.default_tags, {
    Name        = "${var.app_name}-${var.environment}-app-logs"
    Environment = var.environment
    Purpose     = "Application logs"
    Compliance  = "PCI-DSS,SOC2,ISO27001"
  })
}

# WAF Association (if WAF is enabled)
resource "aws_wafv2_web_acl_association" "app" {
  count        = var.waf_web_acl_arn != null ? 1 : 0
  resource_arn = aws_lb.app.arn
  web_acl_arn  = var.waf_web_acl_arn
}
