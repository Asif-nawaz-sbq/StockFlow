output "web_acl_arn" {
  description = "ARN of the web ACL."
  value       = aws_wafv2_web_acl.this.arn
}

output "web_acl_id" {
  description = "Id of the web ACL."
  value       = aws_wafv2_web_acl.this.id
}

output "web_acl_name" {
  description = "Name of the web ACL, for CloudWatch dimensions."
  value       = aws_wafv2_web_acl.this.name
}
