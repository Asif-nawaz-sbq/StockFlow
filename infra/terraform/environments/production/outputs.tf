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
  value = {
    api = data.aws_ecr_repository.api.repository_url
    web = data.aws_ecr_repository.web.repository_url
  }
}

output "application_url" {
  description = "Base URL the application is reachable on."
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
  value = var.deploy_application ? module.rds[0].endpoint : "not deployed"
}

output "db_secret_arn" {
  value = var.deploy_application ? module.rds[0].master_secret_arn : "not deployed"
}

output "redis_endpoint" {
  value = var.deploy_application ? module.redis[0].primary_endpoint : "not deployed"
}

output "waf_web_acl_arn" {
  value = var.deploy_application ? module.waf[0].web_acl_arn : "not deployed"
}
