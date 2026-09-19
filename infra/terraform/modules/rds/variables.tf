variable "name_prefix" {
  description = "Prefix for resource names, e.g. \"stockflow-staging\"."
  type        = string
}

variable "vpc_id" {
  description = "VPC the instance lives in."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets for the DB subnet group. Two AZs minimum for Multi-AZ."
  type        = list(string)
}

variable "client_security_group_ids" {
  description = "Security groups allowed to reach Postgres. Normally just the ECS tasks."
  type        = list(string)
}

variable "engine_version" {
  description = <<-EOT
    Postgres major.minor.

    AWS retires minor versions on a schedule, and a retired one fails at
    CreateDBInstance with "Cannot find version X for postgres" - a plan cannot
    catch it. Check with:

      aws rds describe-db-engine-versions --engine postgres \
        --query 'DBEngineVersions[?starts_with(EngineVersion,`16.`)].EngineVersion'
  EOT
  type        = string
  default     = "16.15"
}

variable "instance_class" {
  description = "Instance size. db.t4g.* is Graviton and cheaper than the x86 equivalent."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Initial storage in GB."
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Ceiling for storage autoscaling. Set equal to allocated_storage to disable."
  type        = number
  default     = 100
}

variable "multi_az" {
  description = <<-EOT
    Run a synchronous standby in a second AZ.

    Roughly doubles the instance cost and is the difference between a failover
    being a blip and being an outage. On in production, off in staging.
  EOT
  type        = bool
  default     = false
}

variable "database_name" {
  description = "Initial database name."
  type        = string
  default     = "stockflow"
}

variable "master_username" {
  description = "Master user. The password is generated and rotated by Secrets Manager."
  type        = string
  default     = "stockflow_admin"
}

variable "backup_retention_days" {
  description = "Automated backup retention. Zero disables backups entirely."
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Daily backup window, UTC."
  type        = string
  default     = "02:00-03:00"
}

variable "maintenance_window" {
  description = "Weekly maintenance window, UTC."
  type        = string
  default     = "sun:03:30-sun:04:30"
}

variable "deletion_protection" {
  description = "Blocks `terraform destroy`. Off here because the stack is torn down deliberately."
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip the snapshot taken on delete. True for a throwaway environment."
  type        = bool
  default     = true
}

variable "performance_insights_enabled" {
  description = "Performance Insights. Free at 7 days retention."
  type        = bool
  default     = true
}

variable "log_min_duration_ms" {
  description = "Log any statement slower than this. -1 disables."
  type        = number
  default     = 500
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
