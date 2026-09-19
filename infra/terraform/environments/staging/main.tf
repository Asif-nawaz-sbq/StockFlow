/**
 * Staging environment.
 *
 * Shared, account-wide resources (ECR repositories, the GitHub OIDC provider
 * and the CI roles) are owned by this stack rather than duplicated per
 * environment - there is only one GitHub repository and images are promoted
 * between environments rather than rebuilt. Production consumes them by data
 * lookup, so applying production never mutates them.
 */

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.owner
    }
  }
}

locals {
  name_prefix = "${var.project}-${var.environment}"
}

data "aws_caller_identity" "current" {}

module "vpc" {
  source = "../../modules/vpc"

  name_prefix        = local.name_prefix
  cidr_block         = var.vpc_cidr
  az_count           = var.az_count
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway
  enable_flow_logs   = var.enable_flow_logs
}

module "ecr" {
  source = "../../modules/ecr"

  name_prefix  = var.project
  repositories = ["api", "web"]

  # Staging pushes often and keeps less history.
  keep_last_n_images = 20
}

module "iam" {
  source = "../../modules/iam"

  name_prefix  = var.project
  github_owner = var.github_owner
  github_repo  = var.github_repo

  state_bucket_arn    = "arn:aws:s3:::${var.project}-tfstate-${data.aws_caller_identity.current.account_id}"
  ecr_repository_arns = values(module.ecr.repository_arns)
}
