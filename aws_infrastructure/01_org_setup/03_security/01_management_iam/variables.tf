variable "aws_region" {
  type    = string
  default = "af-south-1"
}

variable "state_bucket" {
  type    = string
  default = "ecommerce-tf-state-mgmt"
}

variable "iam_user_name" {
  description = "Name of the management account IAM user to harden (e.g. mid_projects_admin)."
  type        = string
}

variable "iam_group_name" {
  description = "Name for the CloudOps admins IAM group that holds cross-account AssumeRole permissions."
  type        = string
  default     = "EcommerceCloudOpsAdmins"
}
