/**
 * WAF in front of the load balancer.
 *
 * REGIONAL scope, because the target is an ALB rather than CloudFront. Rules
 * are evaluated by ascending priority and the first terminating action wins,
 * so the cheap IP-reputation check runs before the expensive body inspection.
 */

resource "aws_wafv2_web_acl" "this" {
  name        = "${var.name_prefix}-waf"
  description = "Edge protection for ${var.name_prefix}"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # --- Managed rule groups -------------------------------------------------

  dynamic "rule" {
    for_each = { for g in var.managed_rule_groups : g.name => g }

    content {
      name     = rule.value.name
      priority = rule.value.priority

      # A managed group decides for itself whether to block, unless the whole
      # group is put into count mode here.
      dynamic "override_action" {
        for_each = rule.value.count_only ? [1] : []
        content {
          count {}
        }
      }

      dynamic "override_action" {
        for_each = rule.value.count_only ? [] : [1]
        content {
          none {}
        }
      }

      statement {
        managed_rule_group_statement {
          name        = rule.value.name
          vendor_name = rule.value.vendor

          dynamic "rule_action_override" {
            for_each = toset(rule.value.excluded)

            content {
              name = rule_action_override.value
              action_to_use {
                count {}
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = replace(rule.value.name, "AWSManagedRules", "")
        sampled_requests_enabled   = true
      }
    }
  }

  # --- Rate limiting -------------------------------------------------------

  rule {
    name     = "auth-endpoint-rate-limit"
    priority = 100

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.login_rate_limit_per_5min
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/v1/auth/"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AuthRateLimit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "global-rate-limit"
    priority = 110

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_per_5min
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GlobalRateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = replace("${var.name_prefix}-waf", "-", "")
    sampled_requests_enabled   = true
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-waf" })
}

resource "aws_wafv2_web_acl_association" "this" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.this.arn
}

# --- Logging ---------------------------------------------------------------
# The log group name has to start with aws-waf-logs- or the API rejects it.

resource "aws_cloudwatch_log_group" "waf" {
  count = var.enable_logging ? 1 : 0

  name              = "aws-waf-logs-${var.name_prefix}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_wafv2_web_acl_logging_configuration" "this" {
  count = var.enable_logging ? 1 : 0

  resource_arn            = aws_wafv2_web_acl.this.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf[0].arn]

  # Auth request bodies carry passwords. Never write them to a log group.
  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
}

# --- Alarms ----------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "blocked_spike" {
  alarm_name          = "${var.name_prefix}-waf-blocked-spike"
  alarm_description   = "WAF is blocking an unusual volume of requests"
  namespace           = "AWS/WAFV2"
  metric_name         = "BlockedRequests"
  statistic           = "Sum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 500
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = aws_wafv2_web_acl.this.name
    Region = data.aws_region.current.name
    Rule   = "ALL"
  }

  alarm_actions = var.alarm_actions

  tags = var.tags
}

data "aws_region" "current" {}
