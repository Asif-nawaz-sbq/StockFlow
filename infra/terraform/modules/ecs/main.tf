/**
 * ECS Fargate cluster and the two services that make up the application.
 *
 * Both run in private subnets with no public IP. Inbound is the load balancer
 * only; outbound goes through the NAT gateway, except S3 (and therefore ECR
 * image layers), which takes the free gateway endpoint.
 */

data "aws_region" "current" {}

locals {
  api_name = "${var.name_prefix}-api"
  web_name = "${var.name_prefix}-web"

  # Every task gets the same credential wiring; only the app-specific vars differ.
  common_secrets = [
    {
      name      = "DATABASE_PASSWORD"
      valueFrom = "${var.db_secret_arn}:password::"
    },
    {
      name      = "DATABASE_USER"
      valueFrom = "${var.db_secret_arn}:username::"
    },
    {
      name      = "REDIS_AUTH_TOKEN"
      valueFrom = var.redis_auth_secret_arn
    },
  ]

  app_secrets = [
    for env_name, arn in var.app_secret_arns : {
      name      = env_name
      valueFrom = arn
    }
  ]
}

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-cluster" })
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name = aws_ecs_cluster.this.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  # Spot is available but not default. A task killed mid-request during an
  # allocation transaction is not worth the saving.
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 0
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.api_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, { Name = local.api_name })
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${local.web_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, { Name = local.web_name })
}

# --- API task --------------------------------------------------------------

resource "aws_ecs_task_definition" "api" {
  family                   = local.api_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.api_image
      essential = true

      portMappings = [
        {
          name          = "api"
          containerPort = var.api_port
          protocol      = "tcp"
          appProtocol   = "http"
        },
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment == "production" ? "production" : "staging" },
        { name = "PORT", value = tostring(var.api_port) },
        { name = "DATABASE_HOST", value = var.db_host },
        { name = "DATABASE_PORT", value = tostring(var.db_port) },
        { name = "DATABASE_NAME", value = var.db_name },
        { name = "REDIS_HOST", value = var.redis_host },
        { name = "REDIS_PORT", value = tostring(var.redis_port) },
        # ElastiCache has transit encryption on, so the client must speak TLS.
        { name = "REDIS_TLS", value = "true" },
        { name = "CORS_ORIGINS", value = var.cors_origins },
        { name = "COOKIE_DOMAIN", value = var.cookie_domain },
        { name = "COOKIE_SECURE", value = tostring(var.cookie_secure) },
        { name = "LOG_LEVEL", value = "info" },
        # RDS enforces TLS; the bundled CA chain validates it.
        { name = "DB_SSL_DISABLED", value = "false" },
      ]

      secrets = concat(local.common_secrets, local.app_secrets)

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "api"
        }
      }

      # Container-level check, independent of the load balancer's. Catches a
      # wedged process before the ALB has finished three intervals.
      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"require('http').get('http://127.0.0.1:${var.api_port}/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      stopTimeout = 30
    },
  ])

  tags = merge(var.tags, { Name = local.api_name })
}

# --- Web task --------------------------------------------------------------

resource "aws_ecs_task_definition" "web" {
  family                   = local.web_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.web_cpu
  memory                   = var.web_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = var.web_image
      essential = true

      portMappings = [
        {
          name          = "web"
          containerPort = var.web_port
          protocol      = "tcp"
          appProtocol   = "http"
        },
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = tostring(var.web_port) },
        { name = "HOSTNAME", value = "0.0.0.0" },
        # Server-side rendering calls the API through the load balancer rather
        # than a container IP, because Fargate tasks have no stable address and
        # there is no service discovery namespace in this stack.
        { name = "API_INTERNAL_URL", value = var.public_api_url },
        { name = "NEXT_PUBLIC_API_URL", value = var.public_api_url },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.web.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "web"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"require('http').get('http://127.0.0.1:${var.web_port}/login',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      stopTimeout = 30
    },
  ])

  tags = merge(var.tags, { Name = local.web_name })
}

# --- Services --------------------------------------------------------------

resource "aws_ecs_service" "api" {
  name            = local.api_name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  enable_execute_command = var.enable_execute_command
  propagate_tags         = "SERVICE"

  # Rolling deploy with room for one extra task, and circuit breaker on so a
  # broken image rolls itself back instead of retrying forever.
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.task_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.api_target_group_arn
    container_name   = "api"
    container_port   = var.api_port
  }

  # Long enough for migrations plus Nest boot before the ALB starts counting.
  health_check_grace_period_seconds = 60

  lifecycle {
    # CI deploys by registering a new task definition revision. Terraform must
    # not drag the service back to the revision it last knew about.
    ignore_changes = [task_definition, desired_count]
  }

  tags = merge(var.tags, { Name = local.api_name })
}

resource "aws_ecs_service" "web" {
  name            = local.web_name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = var.web_desired_count
  launch_type     = "FARGATE"

  enable_execute_command = var.enable_execute_command
  propagate_tags         = "SERVICE"

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.task_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.web_target_group_arn
    container_name   = "web"
    container_port   = var.web_port
  }

  health_check_grace_period_seconds = 45

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  tags = merge(var.tags, { Name = local.web_name })
}
