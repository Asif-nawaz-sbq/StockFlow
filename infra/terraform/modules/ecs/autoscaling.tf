/**
 * Target tracking on CPU and memory for both services.
 *
 * Target tracking rather than step scaling: it needs one number per metric and
 * it handles scale-in for you. The scale-in cooldown is deliberately longer
 * than scale-out - adding a task during a spike should be quick, removing one
 * should not be, or the service flaps.
 */

locals {
  services = {
    api = {
      resource_id  = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.api.name}"
      service_name = aws_ecs_service.api.name
    }
    web = {
      resource_id  = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.web.name}"
      service_name = aws_ecs_service.web.name
    }
  }
}

resource "aws_appautoscaling_target" "this" {
  for_each = local.services

  service_namespace  = "ecs"
  resource_id        = each.value.resource_id
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.autoscaling_min
  max_capacity       = var.autoscaling_max

  tags = var.tags
}

resource "aws_appautoscaling_policy" "cpu" {
  for_each = aws_appautoscaling_target.this

  name               = "${var.name_prefix}-${each.key}-cpu"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = each.value.service_namespace
  resource_id        = each.value.resource_id
  scalable_dimension = each.value.scalable_dimension

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = var.cpu_target_percent
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "memory" {
  for_each = aws_appautoscaling_target.this

  name               = "${var.name_prefix}-${each.key}-memory"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = each.value.service_namespace
  resource_id        = each.value.resource_id
  scalable_dimension = each.value.scalable_dimension

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = var.memory_target_percent
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# --- Alarms ----------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  for_each = local.services

  alarm_name          = "${var.name_prefix}-${each.key}-cpu-high"
  alarm_description   = "${each.key} service CPU above 85 percent, so autoscaling is not keeping up"
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 85
  period              = 300
  evaluation_periods  = 2
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.this.name
    ServiceName = each.value.service_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  for_each = local.services

  alarm_name          = "${var.name_prefix}-${each.key}-memory-high"
  alarm_description   = "${each.key} service memory above 90 percent, so tasks are close to being killed"
  namespace           = "AWS/ECS"
  metric_name         = "MemoryUtilization"
  statistic           = "Average"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 90
  period              = 300
  evaluation_periods  = 2
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.this.name
    ServiceName = each.value.service_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}

/**
 * Running task count at the floor.
 *
 * Autoscaling reports healthy while it is pinned at max and still saturated,
 * and equally while it has scaled to zero because every task is crash-looping.
 * This catches the second case.
 */
resource "aws_cloudwatch_metric_alarm" "no_running_tasks" {
  for_each = local.services

  alarm_name          = "${var.name_prefix}-${each.key}-no-running-tasks"
  alarm_description   = "${each.key} service has fewer running tasks than its scaling floor"
  namespace           = "ECS/ContainerInsights"
  metric_name         = "RunningTaskCount"
  statistic           = "Minimum"
  comparison_operator = "LessThanThreshold"
  threshold           = var.autoscaling_min
  period              = 60
  evaluation_periods  = 5
  treat_missing_data  = "breaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.this.name
    ServiceName = each.value.service_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions

  tags = var.tags
}
