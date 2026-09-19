/**
 * Production environment.
 *
 * Deliberately does not own ECR, the OIDC provider or the CI roles - those are
 * account-wide and belong to the staging stack. Production reads them, so
 * applying here can never modify the credentials that CI uses to apply here.
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

module "vpc" {
  source = "../../modules/vpc"

  name_prefix        = local.name_prefix
  cidr_block         = var.vpc_cidr
  az_count           = var.az_count
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway
  enable_flow_logs   = var.enable_flow_logs
}

# Shared with staging: the same image artifact is promoted, not rebuilt.
data "aws_ecr_repository" "api" {
  name = "${var.project}/api"
}

data "aws_ecr_repository" "web" {
  name = "${var.project}/web"
}
