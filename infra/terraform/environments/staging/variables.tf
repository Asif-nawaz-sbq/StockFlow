variable "project" {
  type    = string
  default = "stockflow"
}

variable "environment" {
  type    = string
  default = "staging"
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
  type    = string
  default = "10.20.0.0/16"
}

variable "az_count" {
  type    = number
  default = 2
}

variable "enable_nat_gateway" {
  description = "Costs roughly EUR 32/month. Left off until the ECS services need it."
  type        = bool
  default     = false
}

variable "single_nat_gateway" {
  type    = bool
  default = true
}

variable "enable_flow_logs" {
  type    = bool
  default = false
}

variable "github_owner" {
  type    = string
  default = "asadbashir7755"
}

variable "github_repo" {
  type    = string
  default = "stockflow"
}

variable "deploy_application" {
  description = <<-EOT
    Create the application layer: ALB, ECS, RDS, ElastiCache and WAF.

    False by default. Everything above this line (VPC, ECR, IAM) is free;
    everything below it is not, and the load balancer alone bills hourly from
    the moment it exists. Flip this on together with enable_nat_gateway once
    images have been pushed.
  EOT
  type        = bool
  default     = false
}

variable "api_image_tag" {
  description = "Image tag to deploy. CI overrides this with the commit SHA."
  type        = string
  default     = "latest"
}

variable "web_image_tag" {
  type    = string
  default = "latest"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_multi_az" {
  description = "Off in staging. Roughly doubles the instance cost."
  type        = bool
  default     = false
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "redis_replica_count" {
  type    = number
  default = 0
}

variable "api_cpu" {
  type    = number
  default = 256
}

variable "api_memory" {
  type    = number
  default = 512
}

variable "web_cpu" {
  type    = number
  default = 256
}

variable "web_memory" {
  type    = number
  default = 512
}

variable "service_desired_count" {
  type    = number
  default = 1
}

variable "autoscaling_min" {
  type    = number
  default = 1
}

variable "autoscaling_max" {
  type    = number
  default = 3
}

variable "certificate_arn" {
  description = "ACM certificate for HTTPS. Null means the ALB serves HTTP on its AWS DNS name."
  type        = string
  default     = null
}

variable "alarm_email" {
  description = "Address subscribed to the alarm topic. Null creates the topic with no subscription."
  type        = string
  default     = null
}
