# ============================================================
# org/delegated_admins.tf
#
# PURPOSE: Registers delegated administrators for:
#   - GuardDuty       → security-tooling account
#   - Security Hub    → security-tooling account
#   - AWS Config      → security-tooling account
#   - AWS Config (multiaccountsetup) → security-tooling account
#   - IAM Identity Center → shared-services account
#
# --------------------------------------------------------------------------------------------------------------------
# IMPORTANT — READ BEFORE APPLYING
# --------------------------------------------------------------------------------------------------------------------
# This file is controlled by the variable:
#   delegated_admins_ready (default = false)
#
# You MUST set it to true only after:
#
#   For security-tooling delegations (GuardDuty, Security Hub,
#   Config): These CAN be applied now — no prerequisites beyond
#   the accounts existing. Set security_delegations_ready = true
#   after main.tf has been applied and accounts are active.
#
#   For IAM Identity Center delegation (shared-services):
#   IAM Identity Center must be MANUALLY enabled in the
#   management account console FIRST. It cannot be enabled via
#   Terraform in the management account — AWS requires the first
#   enable to be done through the console or via the
#   aws sso-admin CLI. Only then set idc_delegation_ready = true.
#
# Step-by-step order:
#   1. terraform apply  (main.tf — org, OUs, accounts)
#   2. Wait for all three accounts to reach ACTIVE state
#   3. Set security_delegations_ready = true  → terraform apply
#   4. Open AWS Console → IAM Identity Center → Enable
#   5. Set idc_delegation_ready = true        → terraform apply
# ============================================================

variable "security_delegations_ready" {
  description = <<-EOT
    Set to true after the three backbone accounts are ACTIVE
    (check via: aws organizations describe-account --acount-id <account-id>).
    Enables GuardDuty, Security Hub, and Config delegations
    to the security-tooling account.
  EOT
  type        = bool
  default     = false
}

variable "idc_delegation_ready" {
  description = <<-EOT
    Set to true ONLY after IAM Identity Center has been manually
    enabled in the management account console.
    Enables the IAM Identity Center delegation to shared-services.
  EOT
  type        = bool
  default     = false
}


# ---- Security-tooling delegations ----------------------------------------------------------
# GuardDuty, Security Hub, Config — no IdC dependency.

resource "aws_organizations_delegated_administrator" "guardduty" {
  count = var.security_delegations_ready ? 1 : 0

  account_id        = aws_organizations_account.security_tooling.id
  service_principal = "guardduty.amazonaws.com"
}

resource "aws_organizations_delegated_administrator" "securityhub" {
  count = var.security_delegations_ready ? 1 : 0

  account_id        = aws_organizations_account.security_tooling.id
  service_principal = "securityhub.amazonaws.com"
}

resource "aws_organizations_delegated_administrator" "config" {
  count = var.security_delegations_ready ? 1 : 0

  account_id        = aws_organizations_account.security_tooling.id
  service_principal = "config.amazonaws.com"
}

resource "aws_organizations_delegated_administrator" "config_multiaccountsetup" {
  count = var.security_delegations_ready ? 1 : 0

  account_id        = aws_organizations_account.security_tooling.id
  service_principal = "config-multiaccountsetup.amazonaws.com"
}


# ---- IAM Identity Center delegation ------------------------------------------------------
# Requires IAM Identity Center to already be enabled in the
# management account.  Gated by idc_delegation_ready.

resource "aws_organizations_delegated_administrator" "idc" {
  count = var.idc_delegation_ready ? 1 : 0

  account_id        = aws_organizations_account.shared_services.id
  service_principal = "sso.amazonaws.com"
}
