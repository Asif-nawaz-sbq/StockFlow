output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.this.name
}

output "cluster_arn" {
  description = "ECS cluster ARN."
  value       = aws_ecs_cluster.this.arn
}

output "api_service_name" {
  description = "API service name, for `aws ecs update-service` from CI."
  value       = aws_ecs_service.api.name
}

output "web_service_name" {
  description = "Frontend service name, for `aws ecs update-service` from CI."
  value       = aws_ecs_service.web.name
}

output "api_task_definition_family" {
  description = "Task family, for registering a new revision from CI."
  value       = aws_ecs_task_definition.api.family
}

output "web_task_definition_family" {
  description = "Task family, for registering a new revision from CI."
  value       = aws_ecs_task_definition.web.family
}

output "execution_role_arn" {
  description = "Role the ECS agent uses to pull images and read secrets."
  value       = aws_iam_role.execution.arn
}

output "task_role_arn" {
  description = "Runtime identity of the containers."
  value       = aws_iam_role.task.arn
}

output "api_log_group" {
  description = "CloudWatch log group for the API."
  value       = aws_cloudwatch_log_group.api.name
}

output "web_log_group" {
  description = "CloudWatch log group for the frontend."
  value       = aws_cloudwatch_log_group.web.name
}
