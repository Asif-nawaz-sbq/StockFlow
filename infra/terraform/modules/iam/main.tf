/**
 * GitHub Actions access, via OIDC. No static AWS keys anywhere.
 *
 * Three roles rather than one:
 *   plan  - read-only, assumable from pull requests
 *   apply - infrastructure changes, branches only
 *   push  - ECR only, for the image build workflow
 *
 * The split matters. A pull request from a fork can run workflow code, so the
 * only credential it may ever hold is one that cannot change anything.
 */

data "aws_partition" "current" {}

locals {
  oidc_url  = "https://token.actions.githubusercontent.com"
  oidc_host = "token.actions.githubusercontent.com"

  provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : var.existing_oidc_provider_arn

  repo = "${var.github_owner}/${var.github_repo}"

  /**
   * GitHub emits two shapes of subject claim depending on how the repository
   * is configured:
   *
   *   repo:owner/name:environment:staging
   *   repo:owner@116044678/name@1342492614:environment:staging
   *
   * The second embeds numeric owner and repository IDs so a trust policy keeps
   * pointing at the same repository across a rename or transfer. This account
   * emits the second form. Matching both with StringLike keeps the policy
   * working either way; the wildcards cover only the numeric IDs, so the owner
   * and repository names still have to match exactly.
   */
  repo_patterns = [
    "${var.github_owner}/${var.github_repo}",
    "${var.github_owner}@*/${var.github_repo}@*",
  ]

  plan_subjects = flatten([
    for r in local.repo_patterns : [for s in var.plan_refs : "repo:${r}:${s}"]
  ])
  apply_subjects = flatten([
    for r in local.repo_patterns : [for s in var.apply_subjects : "repo:${r}:${s}"]
  ])
  ecr_push_subjects = flatten([
    for r in local.repo_patterns : [for s in var.ecr_push_refs : "repo:${r}:${s}"]
  ])
}

# AWS stopped requiring an accurate thumbprint for this provider in 2023, but
# the argument is still mandatory. Reading it from the live certificate chain
# beats pasting a hex string that silently rots.
data "tls_certificate" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url = local.oidc_url
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url             = local.oidc_url
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github[0].certificates[0].sha1_fingerprint]

  tags = merge(var.tags, { Name = "${var.name_prefix}-github-oidc" })
}

# --- Trust policies --------------------------------------------------------

data "aws_iam_policy_document" "plan_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [local.provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Scoped to this repository and these refs. A wildcard here would let any
    # repository in the world assume the role.
    condition {
      test     = "StringLike"
      variable = "${local.oidc_host}:sub"
      values   = local.plan_subjects
    }
  }
}

data "aws_iam_policy_document" "apply_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [local.provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "${local.oidc_host}:sub"
      values   = local.apply_subjects
    }
  }
}

# --- Plan role -------------------------------------------------------------

resource "aws_iam_role" "plan" {
  name                 = "${var.name_prefix}-gha-plan"
  description          = "Read-only Terraform plan role for GitHub Actions"
  assume_role_policy   = data.aws_iam_policy_document.plan_assume.json
  max_session_duration = 3600

  tags = merge(var.tags, { Name = "${var.name_prefix}-gha-plan" })
}

resource "aws_iam_role_policy_attachment" "plan_readonly" {
  role       = aws_iam_role.plan.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/ReadOnlyAccess"
}

# A plan still has to read and lock state, and ReadOnlyAccess cannot write the
# lock. This is the smallest write grant that makes `terraform plan` work.
data "aws_iam_policy_document" "state_access" {
  statement {
    sid       = "ListStateBucket"
    actions   = ["s3:ListBucket", "s3:GetBucketVersioning"]
    resources = [var.state_bucket_arn]
  }

  # Covers both the state object and the .tflock object the S3-native lock
  # writes next to it - the lock is just another object in this bucket.
  statement {
    sid = "ReadWriteStateAndLockObjects"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${var.state_bucket_arn}/*"]
  }
}

resource "aws_iam_policy" "state_access" {
  name        = "${var.name_prefix}-terraform-state-access"
  description = "Read, write and lock Terraform remote state"
  policy      = data.aws_iam_policy_document.state_access.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "plan_state" {
  role       = aws_iam_role.plan.name
  policy_arn = aws_iam_policy.state_access.arn
}

# --- Apply role ------------------------------------------------------------

resource "aws_iam_role" "apply" {
  name                 = "${var.name_prefix}-gha-apply"
  description          = "Terraform apply role for GitHub Actions, branch-scoped"
  assume_role_policy   = data.aws_iam_policy_document.apply_assume.json
  max_session_duration = 3600

  tags = merge(var.tags, { Name = "${var.name_prefix}-gha-apply" })
}

/**
 * PowerUserAccess plus a narrow slice of IAM.
 *
 * Terraform has to create the task execution role, the task role and their
 * policies, which PowerUserAccess alone cannot do. Granting full
 * AdministratorAccess to a role that a branch push can assume is a bigger
 * blast radius than this project needs; the IAM actions below are the ones
 * the stack actually uses.
 */
resource "aws_iam_role_policy_attachment" "apply_poweruser" {
  role       = aws_iam_role.apply.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/PowerUserAccess"
}

data "aws_iam_policy_document" "apply_iam" {
  statement {
    sid = "ManageServiceRoles"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:GetRole",
      "iam:UpdateRole",
      "iam:UpdateRoleDescription",
      "iam:ListRoles",
      "iam:ListInstanceProfilesForRole",
      "iam:PassRole",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:ListRoleTags",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:GetRolePolicy",
      "iam:ListRolePolicies",
      "iam:CreatePolicy",
      "iam:DeletePolicy",
      "iam:GetPolicy",
      "iam:GetPolicyVersion",
      "iam:ListPolicyVersions",
      "iam:CreatePolicyVersion",
      "iam:DeletePolicyVersion",
      "iam:CreateServiceLinkedRole",
    ]
    resources = ["*"]
  }

  /**
   * The stack manages the OIDC provider, so a plan has to be able to read it.
   * PowerUserAccess covers no IAM at all, which is why this is spelled out.
   */
  statement {
    sid = "ManageOidcProvider"
    actions = [
      "iam:GetOpenIDConnectProvider",
      "iam:ListOpenIDConnectProviders",
      "iam:ListOpenIDConnectProviderTags",
      "iam:CreateOpenIDConnectProvider",
      "iam:UpdateOpenIDConnectProviderThumbprint",
      "iam:AddClientIDToOpenIDConnectProvider",
      "iam:RemoveClientIDFromOpenIDConnectProvider",
      "iam:TagOpenIDConnectProvider",
      "iam:UntagOpenIDConnectProvider",
    ]
    resources = ["*"]
  }

  /**
   * Deleting the provider would revoke the very credential this workflow is
   * running on. Terraform can read and update it; removing it is a deliberate
   * local operation.
   */
  statement {
    sid       = "ProtectOidcProvider"
    effect    = "Deny"
    actions   = ["iam:DeleteOpenIDConnectProvider"]
    resources = ["*"]
  }

  # The CI roles must not be able to rewrite their own permissions.
  statement {
    sid    = "ProtectCiRoles"
    effect = "Deny"
    actions = [
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:DeleteRole",
      "iam:UpdateAssumeRolePolicy",
    ]
    resources = [
      aws_iam_role.plan.arn,
      aws_iam_role.apply.arn,
    ]
  }
}

resource "aws_iam_role_policy" "apply_iam" {
  name   = "manage-service-roles"
  role   = aws_iam_role.apply.id
  policy = data.aws_iam_policy_document.apply_iam.json
}

resource "aws_iam_role_policy_attachment" "apply_state" {
  role       = aws_iam_role.apply.name
  policy_arn = aws_iam_policy.state_access.arn
}

# --- Image push role -------------------------------------------------------

data "aws_iam_policy_document" "ecr_push_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [local.provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "${local.oidc_host}:sub"
      values   = local.ecr_push_subjects
    }
  }
}

resource "aws_iam_role" "ecr_push" {
  name                 = "${var.name_prefix}-gha-ecr-push"
  description          = "Build and push container images to ECR"
  assume_role_policy   = data.aws_iam_policy_document.ecr_push_assume.json
  max_session_duration = 3600

  tags = merge(var.tags, { Name = "${var.name_prefix}-gha-ecr-push" })
}

data "aws_iam_policy_document" "ecr_push" {
  statement {
    sid       = "AuthToRegistry"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  dynamic "statement" {
    for_each = length(var.ecr_repository_arns) > 0 ? [1] : []

    content {
      sid = "PushImages"
      actions = [
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories",
      ]
      resources = var.ecr_repository_arns
    }
  }
}

resource "aws_iam_role_policy" "ecr_push" {
  name   = "push-images"
  role   = aws_iam_role.ecr_push.id
  policy = data.aws_iam_policy_document.ecr_push.json
}
