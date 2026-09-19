output "alb_arn" {
  description = "Load balancer ARN, for the WAF association."
  value       = aws_lb.this.arn
}

output "alb_arn_suffix" {
  description = "ARN suffix, for CloudWatch dimensions."
  value       = aws_lb.this.arn_suffix
}

output "dns_name" {
  description = "Public DNS name of the load balancer."
  value       = aws_lb.this.dns_name
}

output "zone_id" {
  description = "Hosted zone id, for a Route 53 alias record."
  value       = aws_lb.this.zone_id
}

output "url" {
  description = "Base URL the application is reachable on."
  value       = "${var.certificate_arn != null ? "https" : "http"}://${aws_lb.this.dns_name}"
}

output "alb_security_group_id" {
  description = "Security group attached to the load balancer."
  value       = aws_security_group.alb.id
}

output "task_security_group_id" {
  description = "Security group the ECS tasks should use."
  value       = aws_security_group.targets.id
}

output "web_target_group_arn" {
  description = "Target group for the frontend service."
  value       = aws_lb_target_group.web.arn
}

output "api_target_group_arn" {
  description = "Target group for the backend service."
  value       = aws_lb_target_group.api.arn
}

output "listener_arn" {
  description = "ARN of the listener that carries the routing rules."
  value       = var.certificate_arn != null ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
}
