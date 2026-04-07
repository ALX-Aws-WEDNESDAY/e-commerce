variable "aws_region" {
  description = "Primary AWS region."
  type        = string
  default     = "af-south-1"
}

variable "state_bucket" {
  description = "Name of the S3 state bucket in the management account."
  type        = string
  default     = "ecommerce-tf-state-mgmt"
}

variable "log_retention_days" {
  description = "S3 lifecycle expiry for CloudTrail logs in days. 90 days preserves the audit trail while keeping credit costs low."
  type        = number
  default     = 90
}
