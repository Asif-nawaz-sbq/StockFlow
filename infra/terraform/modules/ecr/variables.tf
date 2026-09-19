variable "name_prefix" {
  description = "Prefix for repository names, e.g. \"stockflow\"."
  type        = string
}

variable "repositories" {
  description = "Short service names. Each becomes <name_prefix>/<name>."
  type        = list(string)
  default     = ["api", "web"]
}

variable "image_tag_mutability" {
  description = <<-EOT
    IMMUTABLE means a tag can never be repointed at a different image.

    That is what makes an ECS task definition referring to a tag reproducible:
    with mutable tags, redeploying "latest" a week later can silently ship
    something else. CI pushes the commit SHA as the tag.
  EOT
  type        = string
  default     = "IMMUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "image_tag_mutability must be MUTABLE or IMMUTABLE."
  }
}

variable "scan_on_push" {
  description = "Run the free basic vulnerability scan on every push."
  type        = bool
  default     = true
}

variable "keep_last_n_images" {
  description = "How many tagged images to retain per repository."
  type        = number
  default     = 20
}

variable "untagged_expiry_days" {
  description = "Days before an untagged layer is expired."
  type        = number
  default     = 3
}

variable "force_delete" {
  description = <<-EOT
    Allow `terraform destroy` to remove a repository that still holds images.

    True here on purpose: this environment is torn down after verification, and
    a destroy that fails halfway leaves orphaned resources still costing money.
    A repository holding production images would set this to false.
  EOT
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra tags merged onto every resource in this module."
  type        = map(string)
  default     = {}
}
