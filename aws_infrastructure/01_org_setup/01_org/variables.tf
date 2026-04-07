# ============================================================
# org/variables.tf
# ============================================================

# ---- Provider / global --------------------------------------------------------------------------------

variable "aws_region" {
  description = "Primary AWS region."
  type        = string
  default     = "af-south-1"
}

variable "project" {
  description = "Project identifier stamped on all resources as account:project tag."
  type        = string
  default     = "ecommerce"
}

variable "owner" {
  description = "Team owning all org-level resources."
  type        = string
  default     = "cloudops-team"
}

# ---- Email base ----------------------------------------------------------------------------------------------
# Only the alias (the part after +) changes per account.
# Full address is assembled as: email_user + "+" + alias + "@" + email_domain

variable "email_user" {
  description = "The mailbox name before the + in your email address."
  type        = string
  default     = "cloudops"
}

variable "email_domain" {
  description = "Your organisation email domain."
  type        = string
  default     = "yourorg.com"
}

# ---- IAM role created in every member account ----------------------------------

variable "org_access_role_name" {
  description = "IAM role name auto-created in each member account granting management account admin access."
  type        = string
  default     = "OrganizationAccountAccessRole"
}

# ---- Shared tag values --------------------------------------------------------------------------------

variable "deletion_protection" {
  description = "Value for the account:deletion-protection tag on protected accounts."
  type        = string
  default     = "true"
}
