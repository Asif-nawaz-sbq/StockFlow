variable "name_prefix" {
  description = "Prefix for resource names, e.g. \"stockflow-staging\"."
  type        = string
}

variable "alb_arn" {
  description = "ARN of the load balancer to associate the web ACL with."
  type        = string
}

variable "managed_rule_groups" {
  description = <<-EOT
    AWS managed rule groups, in evaluation order.

    `count_only` puts a group in count mode: it records matches without
    blocking, which is how you find out what a rule would have broken before
    you let it break it.
  EOT
  type = list(object({
    name       = string
    vendor     = optional(string, "AWS")
    priority   = number
    count_only = optional(bool, false)
    excluded   = optional(list(string), [])
  }))

  default = [
    {
      name     = "AWSManagedRulesAmazonIpReputationList"
      priority = 10
    },
    {
      name     = "AWSManagedRulesKnownBadInputsRuleSet"
      priority = 20
    },
    {
      name     = "AWSManagedRulesCommonRuleSet"
      priority = 30
      # The API accepts JSON bodies well over 8 KB on a multi-line order, and
      # this rule flags any body that large regardless of content.
      excluded = ["SizeRestrictions_BODY"]
    },
    {
      name     = "AWSManagedRulesSQLiRuleSet"
      priority = 40
    },
  ]
}

variable "rate_limit_per_5min" {
  description = "Requests from one IP per five minutes before it is blocked."
  type        = number
  default     = 2000
}

variable "login_rate_limit_per_5min" {
  description = <<-EOT
    Tighter limit for the auth endpoints.

    The API already throttles login, but that costs a request that reaches the
    tasks. Blocking at the edge keeps a credential-stuffing run off the
    application entirely.
  EOT
  type        = number
  default     = 100
}

variable "enable_logging" {
  description = "Send WAF logs to CloudWatch. Adds ingestion cost."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "alarm_actions" {
  description = "SNS topic ARNs notified when an alarm fires."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Extra tags merged onto every resource in this module."
  type        = map(string)
  default     = {}
}
