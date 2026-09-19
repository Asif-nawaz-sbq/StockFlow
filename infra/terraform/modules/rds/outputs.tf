output "endpoint" {
  description = "Instance endpoint, host only."
  value       = aws_db_instance.this.address
}

output "port" {
  description = "Postgres port."
  value       = aws_db_instance.this.port
}

output "database_name" {
  description = "Initial database name."
  value       = aws_db_instance.this.db_name
}

output "master_username" {
  description = "Master username."
  value       = aws_db_instance.this.username
}

output "master_secret_arn" {
  description = <<-EOT
    Secrets Manager secret holding the master credentials, managed by RDS.

    The JSON has `username` and `password` keys, which is what the ECS task
    definition references so the password never passes through Terraform.
  EOT
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "security_group_id" {
  description = "Security group in front of the instance."
  value       = aws_security_group.this.id
}

output "instance_identifier" {
  description = "Instance identifier, for CloudWatch dimensions."
  value       = aws_db_instance.this.identifier
}
