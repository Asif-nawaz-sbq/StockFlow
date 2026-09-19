variable "project" {
  description = "Project slug used as a prefix for every resource name."
  type        = string
  default     = "stockflow"
}

variable "region" {
  description = "Region the state bucket and lock table live in."
  type        = string
  default     = "eu-central-1"
}

variable "owner" {
  description = "Value for the Owner tag."
  type        = string
  default     = "Asad"
}
