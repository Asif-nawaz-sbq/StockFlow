output "repository_urls" {
  description = "Map of service name to repository URL, for docker push and task definitions."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.repository_url }
}

output "repository_arns" {
  description = "Map of service name to repository ARN, for the CI push policy."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.arn }
}

output "repository_names" {
  description = "Map of service name to full repository name."
  value       = { for name, repo in aws_ecr_repository.this : name => repo.name }
}

output "registry_id" {
  description = "Account id that owns the registry, used for docker login."
  # Every repository in the account shares one registry id, so any element
  # will do. `one()` is wrong here - it rejects anything but a single element.
  value = values(aws_ecr_repository.this)[0].registry_id
}
