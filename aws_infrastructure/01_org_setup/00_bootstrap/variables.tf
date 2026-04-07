# ============================================================
# bootstrap/variables.tf
# ============================================================

variable "aws_region" {
  description = "Primary AWS region for the management account and state bucket."
  type        = string
  default     = "af-south-1"
}

variable "state_bucket_name" {
  description = "Globally unique S3 bucket name for Terraform remote state."
  type        = string
  default     = "ecommerce-tf-state-mgmt"
  # If this name is taken, add a short unique suffix e.g. "ecommerce-tf-state-mgmt-a3f9"
}
