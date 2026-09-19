/**
 * Bootstrap: the remote state backend itself.
 *
 * Chicken and egg - this stack cannot store its state in the bucket it is
 * creating, so it starts with local state and is migrated into the bucket
 * afterwards with `terraform init -migrate-state`. See the README in this
 * directory.
 *
 * Nothing here is environment-specific: staging and production share one
 * bucket and one lock table, separated by state key.
 */

provider "aws" {
  region  = var.region
  profile = "CTDeploy2"

  default_tags {
    tags = {
      Project     = var.project
      Environment = "shared"
      ManagedBy   = "Terraform"
      Owner       = var.owner
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  # Bucket names are globally unique across all of AWS, so the account id is
  # the simplest thing that guarantees no collision.
  bucket_name = "${var.project}-tfstate-${data.aws_caller_identity.current.account_id}"
}

# State locking is handled by the S3 backend's native lock file
# (`use_lockfile`, Terraform 1.10+). No DynamoDB table is involved: the lock is
# an object written alongside the state, so the bucket permissions that already
# cover state also cover the lock.

resource "aws_s3_bucket" "state" {
  bucket = local.bucket_name

  # State files are the one thing in this project that must never be lost by
  # accident. Deleting them takes a deliberate two-step.
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = local.bucket_name
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Every apply writes a new version. Without expiry the bucket grows forever.
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  depends_on = [aws_s3_bucket_versioning.state]

  rule {
    id     = "expire-noncurrent-state"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      # Long enough to recover from a bad apply, short enough to stay tidy.
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Refuse any request that is not using TLS.
resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.state.arn,
          "${aws_s3_bucket.state.arn}/*",
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.state]
}
