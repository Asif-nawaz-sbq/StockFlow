output "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider."
  value       = local.provider_arn
}

output "plan_role_arn" {
  description = "Role the PR plan workflow assumes."
  value       = aws_iam_role.plan.arn
}

output "apply_role_arn" {
  description = "Role the apply workflow assumes."
  value       = aws_iam_role.apply.arn
}

output "ecr_push_role_arn" {
  description = "Role the image build workflow assumes."
  value       = aws_iam_role.ecr_push.arn
}

output "trusted_repository" {
  description = "The owner/repo the trust policies are scoped to."
  value       = local.repo
}
