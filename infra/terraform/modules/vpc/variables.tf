variable "name_prefix" {
  description = "Prefix for resource names, e.g. \"stockflow-staging\"."
  type        = string
}

variable "cidr_block" {
  description = "IPv4 CIDR for the VPC. /16 leaves room for a /20 per subnet."
  type        = string

  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "cidr_block must be a valid IPv4 CIDR, for example 10.20.0.0/16."
  }
}

variable "az_count" {
  description = "How many availability zones to spread subnets across."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "az_count must be 2 or 3. RDS Multi-AZ needs at least two."
  }
}

variable "enable_nat_gateway" {
  description = <<-EOT
    Create NAT gateways so private subnets reach the internet.

    Off by default because a NAT gateway is the single most expensive thing in
    this stack (roughly EUR 32/month each plus data processing) and the VPC
    itself is free. Turn it on when the ECS tasks actually need to pull images
    or reach AWS APIs that have no VPC endpoint.
  EOT
  type        = bool
  default     = false
}

variable "single_nat_gateway" {
  description = <<-EOT
    Route every private subnet through one NAT gateway instead of one per AZ.

    One gateway halves the cost and introduces a cross-AZ dependency: if that
    AZ fails, private subnets in the other AZ lose outbound access. Inbound
    traffic and the database are unaffected. Deliberate trade-off for a
    portfolio build - see the README.
  EOT
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Send VPC flow logs to CloudWatch. Costs scale with traffic."
  type        = bool
  default     = false
}

variable "flow_log_retention_days" {
  description = "Retention for the flow log group."
  type        = number
  default     = 14
}

variable "tags" {
  description = "Extra tags merged onto every resource in this module."
  type        = map(string)
  default     = {}
}
