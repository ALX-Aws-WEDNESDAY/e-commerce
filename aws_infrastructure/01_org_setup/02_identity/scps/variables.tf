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

variable "allowed_regions" {
  description = "List of AWS regions member accounts are permitted to use."
  type        = list(string)
  default     = ["af-south-1"]
}
