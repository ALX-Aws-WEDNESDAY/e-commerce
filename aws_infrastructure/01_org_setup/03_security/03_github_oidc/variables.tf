variable "aws_region" {
  description = "Primary AWS region."
  type        = string
  default     = "af-south-1"
}

variable "state_bucket" {
  description = "Name of the S3 bucket holding Terraform state files."
  type        = string
  default     = "ecommerce-tf-state-mgmt"
}

variable "github_org" {
  description = "GitHub organisation or user name that owns the repository."
  type        = string
  default     = "ALX-Aws-WEDNESDAY"
}

variable "github_repo" {
  description = "GitHub repository name (without the org prefix)."
  type        = string
  default     = "e-commerce"
}

variable "github_actions_role_name" {
  description = "Name of the IAM role that GitHub Actions will assume."
  type        = string
  default     = "EcommerceGitHubActionsRole"
}
