/**
 * One internet-facing load balancer, two target groups, path-based routing.
 *
 * Single ALB rather than one per service on purpose: WAF attaches per load
 * balancer, so a second one doubles both the ALB hourly charge and the web ACL
 * charge for no security benefit - the API is already unreachable except from
 * this security group. One hostname also means no CORS and no cookie-domain
 * juggling between the frontend and the API.
 */

data "aws_caller_identity" "current" {}
data "aws_elb_service_account" "current" {}

locals {
  https_enabled = var.certificate_arn != null
}

# --- Security group --------------------------------------------------------

resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb"
  description = "Public ingress to the ${var.name_prefix} load balancer"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-alb" })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.alb.id
  description       = local.https_enabled ? "HTTP, redirected to HTTPS" : "HTTP"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  count = local.https_enabled ? 1 : 0

  security_group_id = aws_security_group.alb.id
  description       = "HTTPS"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = var.tags
}

# Egress is scoped to the task ports rather than left wide open, so a
# compromised load balancer cannot be used to reach arbitrary internal hosts.
resource "aws_vpc_security_group_egress_rule" "to_web" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward to the web tasks"
  from_port                    = var.web_port
  to_port                      = var.web_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.targets.id

  tags = var.tags
}

resource "aws_vpc_security_group_egress_rule" "to_api" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward to the api tasks"
  from_port                    = var.api_port
  to_port                      = var.api_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.targets.id

  tags = var.tags
}

/**
 * Security group for the ECS tasks behind this load balancer.
 *
 * It lives here rather than in the ECS module because the ALB rules reference
 * it and the ECS rules reference the ALB - defining both in one place avoids a
 * cycle between the two modules.
 */
resource "aws_security_group" "targets" {
  name        = "${var.name_prefix}-tasks"
  description = "ECS tasks behind the ${var.name_prefix} load balancer"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-tasks" })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "web_from_alb" {
  security_group_id            = aws_security_group.targets.id
  description                  = "Web traffic from the load balancer only"
  from_port                    = var.web_port
  to_port                      = var.web_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id

  tags = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "api_from_alb" {
  security_group_id            = aws_security_group.targets.id
  description                  = "API traffic from the load balancer only"
  from_port                    = var.api_port
  to_port                      = var.api_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id

  tags = var.tags
}

# The web tasks call the API server-side over the container network.
resource "aws_vpc_security_group_ingress_rule" "api_from_tasks" {
  security_group_id            = aws_security_group.targets.id
  description                  = "Server-side rendering calls from the web tasks"
  from_port                    = var.api_port
  to_port                      = var.api_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.targets.id

  tags = var.tags
}

resource "aws_vpc_security_group_egress_rule" "tasks_all" {
  security_group_id = aws_security_group.targets.id
  description       = "Outbound to AWS APIs, ECR, RDS and Redis"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"

  tags = var.tags
}

# --- Load balancer ---------------------------------------------------------

resource "aws_lb" "this" {
  name               = "${var.name_prefix}-alb"
  load_balancer_type = "application"
  internal           = false
  subnets            = var.public_subnet_ids
  security_groups    = [aws_security_group.alb.id]

  idle_timeout               = var.idle_timeout
  enable_deletion_protection = var.enable_deletion_protection
  drop_invalid_header_fields = true
  enable_http2               = true

  dynamic "access_logs" {
    for_each = var.enable_access_logs ? [1] : []

    content {
      bucket  = aws_s3_bucket.access_logs[0].id
      prefix  = "alb"
      enabled = true
    }
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-alb" })
}

# --- Target groups ---------------------------------------------------------
# target_type = "ip" because Fargate tasks use awsvpc networking and get their
# own ENI; there is no instance to register.

resource "aws_lb_target_group" "web" {
  name        = "${var.name_prefix}-web"
  port        = var.web_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  deregistration_delay = var.deregistration_delay

  health_check {
    enabled             = true
    path                = "/login"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-web" })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_target_group" "api" {
  name        = "${var.name_prefix}-api"
  port        = var.api_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  deregistration_delay = var.deregistration_delay

  /**
   * /health/live deliberately checks nothing downstream.
   *
   * If it pinged Postgres, a database blip would fail every task's health
   * check at once and the load balancer would pull the whole service out of
   * rotation - turning a slow database into a total outage. Readiness
   * (/health/ready) does check dependencies and is used by deployments, not by
   * this.
   */
  health_check {
    enabled             = true
    path                = "/health/live"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-api" })

  lifecycle {
    create_before_destroy = true
  }
}

# --- Listeners -------------------------------------------------------------

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  # With a certificate, :80 exists only to redirect. Without one, it serves.
  dynamic "default_action" {
    for_each = local.https_enabled ? [1] : []

    content {
      type = "redirect"

      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = local.https_enabled ? [] : [1]

    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.web.arn
    }
  }

  tags = var.tags
}

resource "aws_lb_listener" "https" {
  count = local.https_enabled ? 1 : 0

  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }

  tags = var.tags
}

# --- Routing ---------------------------------------------------------------
# Anything matching an API path goes to the backend; the default action on the
# listener sends everything else to the frontend.

resource "aws_lb_listener_rule" "api" {
  listener_arn = local.https_enabled ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = var.api_path_patterns
    }
  }

  tags = var.tags
}

# --- Access logs -----------------------------------------------------------

resource "aws_s3_bucket" "access_logs" {
  count = var.enable_access_logs ? 1 : 0

  bucket        = "${var.name_prefix}-alb-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-alb-logs" })
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  count = var.enable_access_logs ? 1 : 0

  bucket = aws_s3_bucket.access_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "access_logs" {
  count = var.enable_access_logs ? 1 : 0

  bucket = aws_s3_bucket.access_logs[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "access_logs" {
  count = var.enable_access_logs ? 1 : 0

  bucket = aws_s3_bucket.access_logs[0].id

  depends_on = [aws_s3_bucket_versioning.access_logs]

  rule {
    id     = "expire"
    status = "Enabled"

    filter {}

    expiration {
      days = var.access_logs_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# In eu-central-1 the load balancer writes logs as a regional AWS account
# principal, not a service principal.
data "aws_iam_policy_document" "access_logs" {
  count = var.enable_access_logs ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["s3:PutObject"]

    principals {
      type        = "AWS"
      identifiers = [data.aws_elb_service_account.current.arn]
    }

    resources = ["${aws_s3_bucket.access_logs[0].arn}/alb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"]
  }
}

resource "aws_s3_bucket_policy" "access_logs" {
  count = var.enable_access_logs ? 1 : 0

  bucket = aws_s3_bucket.access_logs[0].id
  policy = data.aws_iam_policy_document.access_logs[0].json

  depends_on = [aws_s3_bucket_public_access_block.access_logs]
}

# --- Alarms ----------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "unhealthy_web" {
  alarm_name          = "${var.name_prefix}-web-unhealthy-targets"
  alarm_description   = "One or more web tasks are failing their health check"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  statistic           = "Maximum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  period              = 60
  evaluation_periods  = 3
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.this.arn_suffix
    TargetGroup  = aws_lb_target_group.web.arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "unhealthy_api" {
  alarm_name          = "${var.name_prefix}-api-unhealthy-targets"
  alarm_description   = "One or more api tasks are failing their health check"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  statistic           = "Maximum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  period              = 60
  evaluation_periods  = 3
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.this.arn_suffix
    TargetGroup  = aws_lb_target_group.api.arn_suffix
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "http_5xx" {
  alarm_name          = "${var.name_prefix}-alb-5xx"
  alarm_description   = "The load balancer itself is returning 5xx, i.e. no healthy target"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  statistic           = "Sum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 10
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.this.arn_suffix
  }

  alarm_actions = var.alarm_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "target_latency" {
  alarm_name          = "${var.name_prefix}-alb-latency"
  alarm_description   = "p95 response time above two seconds"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "TargetResponseTime"
  extended_statistic  = "p95"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 2
  period              = 300
  evaluation_periods  = 3
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.this.arn_suffix
  }

  alarm_actions = var.alarm_actions

  tags = var.tags
}
