/**
 * Container registries, one per service.
 *
 * Repositories are shared across environments rather than duplicated per
 * environment: the same image artifact should be promoted from staging to
 * production, not rebuilt. The environment is a property of the deployment,
 * not of the image.
 */

resource "aws_ecr_repository" "this" {
  for_each = toset(var.repositories)

  name                 = "${var.name_prefix}/${each.value}"
  image_tag_mutability = var.image_tag_mutability
  force_delete         = var.force_delete

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.tags, {
    Name    = "${var.name_prefix}/${each.value}"
    Service = each.value
  })
}

/**
 * Storage is billed per GB and a busy pipeline pushes an image per commit.
 *
 * Rule order matters: ECR evaluates in ascending priority and applies the
 * first match, so untagged layers are expired before the count rule looks at
 * anything.
 */
resource "aws_ecr_lifecycle_policy" "this" {
  for_each = aws_ecr_repository.this

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged layers after ${var.untagged_expiry_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_expiry_days
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep the newest ${var.keep_last_n_images} tagged images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.keep_last_n_images
        }
        action = { type = "expire" }
      },
    ]
  })
}
