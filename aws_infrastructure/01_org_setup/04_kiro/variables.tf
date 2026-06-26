variable "aws_region" {
  description = "Primary AWS region."
  type        = string
  default     = "us-east-1"
}

variable "prompt_log_retention_days" {
  description = "Lifecycle expiry for raw prompt logs in days."
  type        = number
  default     = 90
}

variable "activity_report_retention_days" {
  description = "Lifecycle expiry for daily activity reports in days."
  type        = number
  default     = 365
}
