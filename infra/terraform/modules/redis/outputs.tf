output "primary_endpoint" {
  description = "Primary endpoint host for writes."
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint. Same as primary when there are no replicas."
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "Redis port."
  value       = aws_elasticache_replication_group.this.port
}

output "auth_token_secret_arn" {
  description = "Secrets Manager secret holding the AUTH token."
  value       = aws_secretsmanager_secret.auth_token.arn
}

output "security_group_id" {
  description = "Security group in front of the cluster."
  value       = aws_security_group.this.id
}

output "replication_group_id" {
  description = "Replication group id, for CloudWatch dimensions."
  value       = aws_elasticache_replication_group.this.id
}
