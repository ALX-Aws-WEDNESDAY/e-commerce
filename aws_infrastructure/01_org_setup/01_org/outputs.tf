# ============================================================
# org/outputs.tf
#
# These outputs are the "published contract" between this
# workspace and any downstream Terraform workspace (e.g. one
# that sets up CloudTrail, GuardDuty, or IAM Identity Center).
#
# Downstream workspaces read them via:
#   data "terraform_remote_state" "org" {
#     backend = "s3"
#     config  = {
#       bucket = "ecommerce-tf-state-mgmt"
#       key    = "org/terraform.tfstate"
#       region = "af-south-1"
#     }
#   }
#   then reference: data.terraform_remote_state.org.outputs.log_archive_account_id
# ============================================================

# ---- Organisation ------------------------------------------------------------------------------------------

output "org_id" {
  description = "The AWS Organisations ID (o-xxxxxxxxxx)."
  value       = aws_organizations_organization.this.id
}

output "root_id" {
  description = "The Organisations root ID (r-xxxx). Used as source-parent when moving accounts."
  value       = aws_organizations_organization.this.roots[0].id
}

output "master_account_id" {
  description = "Account ID of the management (master) account."
  value       = aws_organizations_organization.this.master_account_id
}

# ---- OU IDs ------------------------------------------------------------------------------------------------------

output "security_ou_id" {
  description = "Security OU ID."
  value       = aws_organizations_organizational_unit.security.id
}

output "infrastructure_ou_id" {
  description = "Infrastructure OU ID."
  value       = aws_organizations_organizational_unit.infrastructure.id
}

output "sandbox_ou_id" {
  description = "Sandbox OU ID."
  value       = aws_organizations_organizational_unit.sandbox.id
}

output "workloads_ou_id" {
  description = "Workloads OU ID."
  value       = aws_organizations_organizational_unit.workloads.id
}

# ---- Member account IDs ------------------------------------------------------------------------------

output "log_archive_account_id" {
  description = "Account ID for ecommerce-log-archive."
  value       = aws_organizations_account.log_archive.id
}

output "security_tooling_account_id" {
  description = "Account ID for ecommerce-security-tooling."
  value       = aws_organizations_account.security_tooling.id
}

output "shared_services_account_id" {
  description = "Account ID for ecommerce-shared-services."
  value       = aws_organizations_account.shared_services.id
}

# ---- Convenience map ------------------------------------------------------------------------------------
# Useful when a downstream module needs to iterate over all
# backbone accounts.

output "backbone_account_ids" {
  description = "Map of backbone account logical names to account IDs."
  value = {
    log_archive      = aws_organizations_account.log_archive.id
    security_tooling = aws_organizations_account.security_tooling.id
    shared_services  = aws_organizations_account.shared_services.id
  }
}
