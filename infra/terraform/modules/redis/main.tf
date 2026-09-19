/**
 * ElastiCache Redis for one environment.
 *
 * Holds refresh tokens, dashboard and replenishment caches, and the rate-limit
 * counters. Private subnets only, reachable from the ECS tasks and nothing
 * else.
 *
 * Encryption in transit is on, which means the client must speak TLS - the API
 * connects with a rediss:// URL. Encryption at rest is on because a refresh
 * token in a snapshot is a credential.
 */

resource "aws_elasticache_subnet_group" "this" {
  name        = "${var.name_prefix}-redis"
  description = "Private subnets for ${var.name_prefix} Redis"
  subnet_ids  = var.private_subnet_ids

  tags = merge(var.tags, { Name = "${var.name_prefix}-redis" })
}

resource "aws_security_group" "this" {
  name        = "${var.name_prefix}-redis"
  description = "Redis access for ${var.name_prefix}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-redis" })

  lifecycle {
    create_before_destroy = true
  }
}

# count, not for_each: the client security group ids come from another module
# and are unknown at plan time, which for_each cannot handle. The list length
# is known, so count plans cleanly.
resource "aws_vpc_security_group_ingress_rule" "redis" {
  count = length(var.client_security_group_ids)

  security_group_id            = aws_security_group.this.id
  description                  = "Redis from an approved client security group"
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  referenced_security_group_id = var.client_security_group_ids[count.index]

  tags = var.tags
}

# Unlike most parameter groups this resource has no name_prefix, so a
# replacement cannot be created before the old one is destroyed.
resource "aws_elasticache_parameter_group" "this" {
  name        = "${var.name_prefix}-redis7"
  family      = "redis7"
  description = "Eviction policy for ${var.name_prefix}"

  parameter {
    name  = "maxmemory-policy"
    value = var.maxmemory_policy
  }

  tags = var.tags
}

/**
 * AUTH token.
 *
 * Encryption in transit alone gets you a private, encrypted channel to anything
 * that can reach the security group. The token means reaching the port is not
 * sufficient. Kept out of state as much as ElastiCache allows: it is generated
 * here and immediately written to Secrets Manager for the tasks to read.
 */
resource "random_password" "auth_token" {
  length  = 64
  special = false # ElastiCache rejects several punctuation characters.
}

resource "aws_secretsmanager_secret" "auth_token" {
  name_prefix             = "${var.name_prefix}/redis/auth-token-"
  description             = "ElastiCache AUTH token for ${var.name_prefix}"
  recovery_window_in_days = 0 # Throwaway environment; allows immediate re-create.

  tags = merge(var.tags, { Name = "${var.name_prefix}-redis-auth" })
}

resource "aws_secretsmanager_secret_version" "auth_token" {
  secret_id     = aws_secretsmanager_secret.auth_token.id
  secret_string = random_password.auth_token.result
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "Sessions, caches and rate limits for ${var.name_prefix}"

  engine         = "redis"
  engine_version = var.engine_version
  node_type      = var.node_type
  port           = 6379

  num_cache_clusters         = var.replica_count + 1
  automatic_failover_enabled = var.automatic_failover
  multi_az_enabled           = var.multi_az

  subnet_group_name    = aws_elasticache_subnet_group.this.name
  security_group_ids   = [aws_security_group.this.id]
  parameter_group_name = aws_elasticache_parameter_group.this.name

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.auth_token.result

  snapshot_retention_limit   = var.snapshot_retention_days
  maintenance_window         = "sun:05:00-sun:06:00"
  apply_immediately          = var.apply_immediately
  auto_minor_version_upgrade = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-redis" })

  lifecycle {
    # Rotating the token is a deliberate operation, not something a plan should
    # offer to do because the random provider re-rolled.
    ignore_changes = [auth_token]
  }
}

# --- Alarms ----------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "${var.name_prefix}-redis-cpu-high"
  alarm_description   = "Redis CPU above 75 percent"
  namespace           = "AWS/ElastiCache"
  metric_name         = "EngineCPUUtilization"
  statistic           = "Average"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 75
  period              = 300
  evaluation_periods  = 2
  treat_missing_data  = "notBreaching"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.this.id
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}

/**
 * Eviction rate.
 *
 * With allkeys-lru a full node silently starts dropping keys rather than
 * erroring, so the first visible symptom is users being logged out at random.
 * This is the alarm that explains why.
 */
resource "aws_cloudwatch_metric_alarm" "evictions" {
  alarm_name          = "${var.name_prefix}-redis-evictions"
  alarm_description   = "Redis is evicting keys, so the node is memory bound"
  namespace           = "AWS/ElastiCache"
  metric_name         = "Evictions"
  statistic           = "Sum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 100
  period              = 300
  evaluation_periods  = 2
  treat_missing_data  = "notBreaching"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.this.id
  }

  alarm_actions = var.alarm_actions

  tags = var.tags
}
