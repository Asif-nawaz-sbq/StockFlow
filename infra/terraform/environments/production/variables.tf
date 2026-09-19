variable "project" {
  type    = string
  default = "stockflow"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "owner" {
  type    = string
  default = "Asad"
}

variable "vpc_cidr" {
  description = "Must not overlap staging, in case the two are ever peered."
  type        = string
  default     = "10.30.0.0/16"
}

variable "az_count" {
  type    = number
  default = 2
}

variable "enable_nat_gateway" {
  description = "Costs roughly EUR 32/month per gateway. Left off until the ECS services need it."
  type        = bool
  default     = false
}

variable "single_nat_gateway" {
  description = <<-EOT
    One NAT gateway for the whole environment rather than one per AZ.

    Textbook production runs one per AZ so a zone failure cannot take out
    outbound access for the surviving zone. This build uses one and accepts the
    cross-AZ dependency, because the environment is torn down after
    verification and the second gateway would double that line item for no
    demonstrable benefit. Flip to false for a real production deployment.
  EOT
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  type    = bool
  default = true
}

variable "deploy_application" {
  description = <<-EOT
    Create the application layer: ALB, ECS, RDS, ElastiCache and WAF.

    False by default. The VPC above this line is free; everything below it is
    not. Flip on together with enable_nat_gateway once images exist.
  EOT
  type        = bool
  default     = false
}

variable "api_image_tag" {
  description = "Image tag to deploy. Promoted from a tag already verified in staging."
  type        = string
  default     = "latest"
}

variable "web_image_tag" {
  type    = string
  default = "latest"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "db_multi_az" {
  description = "On in production. Roughly doubles the instance cost and is the point of Multi-AZ."
  type        = bool
  default     = true
}

variable "db_deletion_protection" {
  description = "False only because this environment is destroyed after verification."
  type        = bool
  default     = false
}

variable "db_skip_final_snapshot" {
  type    = bool
  default = true
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "redis_replica_count" {
  description = "One replica buys automatic failover."
  type        = number
  default     = 1
}

variable "api_cpu" {
  type    = number
  default = 512
}

variable "api_memory" {
  type    = number
  default = 1024
}

variable "web_cpu" {
  type    = number
  default = 512
}

variable "web_memory" {
  type    = number
  default = 1024
}

variable "service_desired_count" {
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

variable "certificate_arn" {
  description = "ACM certificate for HTTPS. Null means the ALB serves HTTP on its AWS DNS name."
  type        = string
  default     = null
}

variable "alarm_email" {
  description = "Address subscribed to the alarm topic."
  type        = string
  default     = null
}
