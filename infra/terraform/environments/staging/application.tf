/**
 * The billable half of the environment.
 *
 * Everything here is gated on var.deploy_application because the VPC, ECR and
 * IAM layer is free and this is not: the load balancer bills hourly from
 * creation, and RDS and ElastiCache bill per instance-hour whether or not
 * anything is talking to them.
 *
 * Module ordering is a real dependency chain rather than an arbitrary one:
 * the ALB module owns the task security group (so ALB and ECS rules can
 * reference each other without a cycle), RDS and Redis take that group as
 * their only permitted client, and ECS needs all three before it can start.
 */

locals {
  deploy = var.deploy_application ? 1 : 0

  # The ALB's own DNS name until a domain exists.
  app_url = var.deploy_application ? module.alb[0].url : ""
}

# --- Alarm destination -----------------------------------------------------

resource "aws_sns_topic" "alarms" {
  count = local.deploy

  name = "${local.name_prefix}-alarms"

  tags = { Name = "${local.name_prefix}-alarms" }
}

resource "aws_sns_topic_subscription" "alarms_email" {
  count = var.deploy_application && var.alarm_email != null ? 1 : 0

  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# --- Application secrets ---------------------------------------------------

/**
 * JWT signing keys.
 *
 * Generated here rather than supplied, so no human ever sees them and they are
 * not in a tfvars file. They do land in Terraform state, which is why the
 * state bucket is encrypted, versioned and private - the alternative is
 * creating empty secrets and populating them out of band, which reliably
 * results in a staging environment nobody can log into.
 */
resource "random_password" "jwt_access" {
  count = local.deploy

  length  = 64
  special = false
}

resource "random_password" "jwt_refresh" {
  count = local.deploy

  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt_access" {
  count = local.deploy

  name_prefix             = "${local.name_prefix}/jwt/access-"
  description             = "Access token signing key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt_access" {
  count = local.deploy

  secret_id     = aws_secretsmanager_secret.jwt_access[0].id
  secret_string = random_password.jwt_access[0].result
}

resource "aws_secretsmanager_secret" "jwt_refresh" {
  count = local.deploy

  name_prefix             = "${local.name_prefix}/jwt/refresh-"
  description             = "Refresh token signing key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt_refresh" {
  count = local.deploy

  secret_id     = aws_secretsmanager_secret.jwt_refresh[0].id
  secret_string = random_password.jwt_refresh[0].result
}

# --- Load balancer ---------------------------------------------------------

module "alb" {
  count  = local.deploy
  source = "../../modules/alb"

  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = var.certificate_arn

  alarm_actions = [aws_sns_topic.alarms[0].arn]
}

# --- Data stores -----------------------------------------------------------

module "rds" {
  count  = local.deploy
  source = "../../modules/rds"

  name_prefix               = local.name_prefix
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  client_security_group_ids = [module.alb[0].task_security_group_id]

  instance_class        = var.db_instance_class
  multi_az              = var.db_multi_az
  backup_retention_days = 1
  deletion_protection   = false
  skip_final_snapshot   = true

  alarm_actions = [aws_sns_topic.alarms[0].arn]
}

module "redis" {
  count  = local.deploy
  source = "../../modules/redis"

  name_prefix               = local.name_prefix
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  client_security_group_ids = [module.alb[0].task_security_group_id]

  node_type          = var.redis_node_type
  replica_count      = var.redis_replica_count
  automatic_failover = var.redis_replica_count > 0
  multi_az           = var.redis_replica_count > 0

  alarm_actions = [aws_sns_topic.alarms[0].arn]
}

# --- Compute ---------------------------------------------------------------

module "ecs" {
  count  = local.deploy
  source = "../../modules/ecs"

  name_prefix            = local.name_prefix
  environment            = var.environment
  private_subnet_ids     = module.vpc.private_subnet_ids
  task_security_group_id = module.alb[0].task_security_group_id

  api_image = "${module.ecr.repository_urls["api"]}:${var.api_image_tag}"
  web_image = "${module.ecr.repository_urls["web"]}:${var.web_image_tag}"

  api_target_group_arn = module.alb[0].api_target_group_arn
  web_target_group_arn = module.alb[0].web_target_group_arn

  api_cpu           = var.api_cpu
  api_memory        = var.api_memory
  web_cpu           = var.web_cpu
  web_memory        = var.web_memory
  api_desired_count = var.service_desired_count
  web_desired_count = var.service_desired_count
  autoscaling_min   = var.autoscaling_min
  autoscaling_max   = var.autoscaling_max

  # One hostname for browser and server-side calls; the ALB routes /api/* to
  # the backend target group.
  public_api_url = local.app_url
  cors_origins   = local.app_url
  cookie_domain  = trimprefix(trimprefix(local.app_url, "https://"), "http://")
  cookie_secure  = var.certificate_arn != null

  db_secret_arn = module.rds[0].master_secret_arn
  db_host       = module.rds[0].endpoint
  db_port       = module.rds[0].port
  db_name       = module.rds[0].database_name

  redis_host            = module.redis[0].primary_endpoint
  redis_port            = module.redis[0].port
  redis_auth_secret_arn = module.redis[0].auth_token_secret_arn

  app_secret_arns = {
    JWT_ACCESS_SECRET  = aws_secretsmanager_secret.jwt_access[0].arn
    JWT_REFRESH_SECRET = aws_secretsmanager_secret.jwt_refresh[0].arn
  }

  alarm_actions = [aws_sns_topic.alarms[0].arn]
}

# --- Edge ------------------------------------------------------------------

module "waf" {
  count  = local.deploy
  source = "../../modules/waf"

  name_prefix = local.name_prefix
  alb_arn     = module.alb[0].alb_arn

  alarm_actions = [aws_sns_topic.alarms[0].arn]
}
