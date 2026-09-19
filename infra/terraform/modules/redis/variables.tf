variable "name_prefix" {
  description = "Prefix for resource names, e.g. \"stockflow-staging\"."
  type        = string
}

variable "vpc_id" {
  description = "VPC the cluster lives in."
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets for the cache subnet group."
  type        = list(string)
}

variable "client_security_group_ids" {
  description = "Security groups allowed to reach Redis. Normally just the ECS tasks."
  type        = list(string)
}

variable "engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

variable "node_type" {
  description = "Node size. cache.t4g.* is Graviton and cheaper than the x86 equivalent."
  type        = string
  default     = "cache.t4g.micro"
}

variable "replica_count" {
  description = <<-EOT
    Read replicas in the replication group.

    Zero means a single node with no failover: losing it drops every session
    and empties the cache, which this app survives - it degrades to uncached
    reads and forces a re-login. One replica buys automatic failover.
  EOT
  type        = number
  default     = 0
}

variable "automatic_failover" {
  description = "Promote a replica automatically. Requires replica_count >= 1."
  type        = bool
  default     = false
}

variable "multi_az" {
  description = "Place the replica in a second AZ. Requires automatic_failover."
  type        = bool
  default     = false
}

variable "maxmemory_policy" {
  description = <<-EOT
    Eviction policy when the node is full.

    allkeys-lru is right here: everything stored is either a cache entry or a
    refresh token, and evicting the least recently used token merely forces a
    re-login. Idempotency keys deliberately live in Postgres, not here, so
    eviction can never cause a double write.
  EOT
  type        = string
  default     = "allkeys-lru"
}

variable "snapshot_retention_days" {
  description = "Daily snapshot retention. Zero disables snapshots."
  type        = number
  default     = 0
}

variable "apply_immediately" {
  description = "Apply changes at once rather than in the maintenance window."
  type        = bool
  default     = false
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
