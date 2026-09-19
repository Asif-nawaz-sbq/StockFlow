variable "name_prefix" {
  description = "Prefix for role names, e.g. \"stockflow\"."
  type        = string
}

variable "github_owner" {
  description = "GitHub user or organisation that owns the repository."
  type        = string
}

variable "github_repo" {
  description = "Repository name, without the owner."
  type        = string
}

variable "plan_refs" {
  description = <<-EOT
    Trust-policy subjects allowed to assume the read-only plan role.

    Pull requests are included so a plan can be posted as a PR comment. They
    deliberately are not allowed to assume the apply role - a fork PR must
    never be able to change infrastructure.
  EOT
  type        = list(string)
  default     = ["pull_request", "ref:refs/heads/main", "ref:refs/heads/staging"]
}

variable "apply_subjects" {
  description = <<-EOT
    Trust-policy subjects allowed to assume the apply role.

    These are `environment:` subjects, not `ref:` ones. A job that declares
    `environment:` in its YAML gets an OIDC token whose `sub` claim is
    `repo:owner/name:environment:NAME` - the ref form is replaced, not added.
    Both jobs that assume this role declare an environment, which is also what
    puts production behind the manual approval gate.
  EOT
  type        = list(string)
  default     = ["environment:staging", "environment:production"]
}

variable "ecr_push_refs" {
  description = <<-EOT
    Subjects allowed to assume the image push role.

    Ref-based, because the build job deliberately has no `environment:` - it
    pushes an artifact, which needs no approval.
  EOT
  type        = list(string)
  default     = ["ref:refs/heads/main", "ref:refs/heads/staging"]
}

variable "create_oidc_provider" {
  description = <<-EOT
    Create the GitHub OIDC provider.

    There can only be one per account, so if something else already registered
    token.actions.githubusercontent.com, set this false and pass its ARN in
    existing_oidc_provider_arn instead.
  EOT
  type        = bool
  default     = true
}

variable "existing_oidc_provider_arn" {
  description = "ARN of an existing GitHub OIDC provider, when create_oidc_provider is false."
  type        = string
  default     = null
}

variable "state_bucket_arn" {
  description = "ARN of the Terraform state bucket."
  type        = string
}

variable "ecr_repository_arns" {
  description = "ECR repository ARNs the image build workflow may push to."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Extra tags merged onto every resource in this module."
  type        = map(string)
  default     = {}
}
