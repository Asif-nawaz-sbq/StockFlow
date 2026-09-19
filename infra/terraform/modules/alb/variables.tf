variable "name_prefix" {
  description = "Prefix for resource names, e.g. \"stockflow-staging\"."
  type        = string
}

variable "vpc_id" {
  description = "VPC the load balancer and target groups live in."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnets for the load balancer. At least two AZs."
  type        = list(string)
}

variable "certificate_arn" {
  description = <<-EOT
    ACM certificate for the HTTPS listener.

    Null means there is no domain yet, so the listener serves HTTP on :80
    directly. With a certificate, :80 becomes a permanent redirect to :443.
  EOT
  type        = string
  default     = null
}

variable "web_port" {
  description = "Container port the frontend listens on."
  type        = number
  default     = 3000
}

variable "api_port" {
  description = "Container port the backend listens on."
  type        = number
  default     = 3001
}

variable "api_path_patterns" {
  description = "Paths routed to the backend target group. Everything else goes to the frontend."
  type        = list(string)
  default     = ["/api/*", "/docs", "/docs/*", "/health/*"]
}

variable "deregistration_delay" {
  description = <<-EOT
    Seconds the load balancer keeps draining a task after deregistering it.

    The default of 300 makes every deploy take five minutes longer than it
    needs to. These are short HTTP requests, so 30 is ample.
  EOT
  type        = number
  default     = 30
}

variable "idle_timeout" {
  description = "Seconds an idle connection is held open."
  type        = number
  default     = 60
}

variable "enable_deletion_protection" {
  description = "Blocks `terraform destroy`. Off here because this stack is torn down deliberately."
  type        = bool
  default     = false
}

variable "enable_access_logs" {
  description = "Write ALB access logs to S3. Adds a small storage cost."
  type        = bool
  default     = false
}

variable "access_logs_retention_days" {
  description = "Lifecycle expiry for access log objects."
  type        = number
  default     = 30
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
