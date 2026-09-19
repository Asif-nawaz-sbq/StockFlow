output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  value = module.vpc.private_subnet_ids
}

output "nat_gateway_enabled" {
  value = module.vpc.nat_gateway_enabled
}

output "ecr_repository_urls" {
  value = module.ecr.repository_urls
}

output "gha_plan_role_arn" {
  description = "Set as AWS_PLAN_ROLE_ARN in GitHub repository variables."
  value       = module.iam.plan_role_arn
}

output "gha_apply_role_arn" {
  description = "Set as AWS_APPLY_ROLE_ARN in GitHub repository variables."
  value       = module.iam.apply_role_arn
}

output "gha_ecr_push_role_arn" {
  description = "Set as AWS_ECR_PUSH_ROLE_ARN in GitHub repository variables."
  value       = module.iam.ecr_push_role_arn
}

output "application_url" {
  description = "Base URL the application is reachable on. Empty until deploy_application is true."
  value       = var.deploy_application ? module.alb[0].url : "not deployed"
}

output "ecs_cluster_name" {
  value = var.deploy_application ? module.ecs[0].cluster_name : "not deployed"
}

output "api_service_name" {
  value = var.deploy_application ? module.ecs[0].api_service_name : "not deployed"
}

output "web_service_name" {
  value = var.deploy_application ? module.ecs[0].web_service_name : "not deployed"
}

output "db_endpoint" {
  description = "Postgres host. Reachable only from inside the VPC."
  value       = var.deploy_application ? module.rds[0].endpoint : "not deployed"
}

output "db_secret_arn" {
  description = "Secrets Manager ARN holding the database master credentials."
  value       = var.deploy_application ? module.rds[0].master_secret_arn : "not deployed"
}

output "redis_endpoint" {
  value = var.deploy_application ? module.redis[0].primary_endpoint : "not deployed"
}

output "waf_web_acl_arn" {
  value = var.deploy_application ? module.waf[0].web_acl_arn : "not deployed"
}
