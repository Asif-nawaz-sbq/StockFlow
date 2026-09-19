variable "name_prefix" {
  description = "Prefix for resource names, e.g. \"stockflow-staging\"."
  type        = string
}

variable "environment" {
  description = "Environment name, passed to the containers as NODE_ENV."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets the tasks are placed in."
  type        = list(string)
}

variable "task_security_group_id" {
  description = "Security group for the tasks. Created by the alb module to avoid a dependency cycle."
  type        = string
}

variable "api_image" {
  description = "Fully qualified image for the API, including tag."
  type        = string
}

variable "web_image" {
  description = "Fully qualified image for the frontend, including tag."
  type        = string
}

variable "api_target_group_arn" {
  description = "Target group the API service registers into."
  type        = string
}

variable "web_target_group_arn" {
  description = "Target group the frontend service registers into."
  type        = string
}

variable "api_port" {
  type    = number
  default = 3001
}

variable "web_port" {
  type    = number
  default = 3000
}

variable "api_cpu" {
  description = "CPU units for the API task. 256 = 0.25 vCPU."
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory in MiB for the API task."
  type        = number
  default     = 1024
}

variable "web_cpu" {
  type    = number
  default = 256
}

variable "web_memory" {
  type    = number
  default = 512
}

variable "api_desired_count" {
  type    = number
  default = 2
}

variable "web_desired_count" {
  type    = number
  default = 2
}

variable "autoscaling_min" {
  type    = number
  default = 2
}

variable "autoscaling_max" {
  type    = number
  default = 6
}

variable "cpu_target_percent" {
  description = "Target average CPU for the scaling policy."
  type        = number
  default     = 65
}

variable "memory_target_percent" {
  description = "Target average memory for the scaling policy."
  type        = number
  default     = 75
}

variable "public_api_url" {
  description = "Origin the browser calls the API on. Baked into the web image at build time, repeated here for SSR."
  type        = string
}

variable "cors_origins" {
  description = "Comma-separated origins the API accepts credentialed requests from."
  type        = string
}

variable "cookie_domain" {
  description = "Domain the auth cookies are scoped to."
  type        = string
}

variable "cookie_secure" {
  description = "Set the Secure flag on auth cookies. Must be false without HTTPS."
  type        = bool
  default     = false
}

variable "db_secret_arn" {
  description = "Secrets Manager ARN holding the RDS master credentials as JSON."
  type        = string
}

variable "db_host" {
  type = string
}

variable "db_port" {
  type    = number
  default = 5432
}

variable "db_name" {
  type = string
}

variable "redis_host" {
  type = string
}

variable "redis_port" {
  type    = number
  default = 6379
}

variable "redis_auth_secret_arn" {
  description = "Secrets Manager ARN holding the Redis AUTH token."
  type        = string
}

variable "app_secret_arns" {
  description = "Map of container env var name to Secrets Manager ARN, e.g. JWT_ACCESS_SECRET."
  type        = map(string)
  default     = {}
}

variable "log_retention_days" {
  description = "CloudWatch log retention."
  type        = number
  default     = 14
}

variable "enable_container_insights" {
  description = "Container Insights. Costs per metric but is the only way to see task-level CPU and memory."
  type        = bool
  default     = true
}

variable "enable_execute_command" {
  description = "Allow ECS Exec, which is how migrations get run and how you get a shell."
  type        = bool
  default     = true
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
