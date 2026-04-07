# ============================================================
# org/main.tf
#
# Contains:
#   1. AWS Organization (enables all features)
#   2. Core OUs  (Security, Infrastructure, Sandbox, Workloads)
#   3. Three backbone member accounts
#       - ecommerce-log-archive       → Security OU
#       - ecommerce-security-tooling  → Security OU
#       - ecommerce-shared-services   → Infrastructure OU
#
# DELEGATED ADMINISTRATORS are NOT configured here.
# Reason: IAM Identity Center must be enabled manually in the
# management account FIRST, then the shared-services account
# can be registered as its delegated admin.  That step is in
# org/delegated_admins.tf and is gated by a variable so it
# cannot run before IAC Identity Center is ready.
# See: "Delegated administrator — when and how" in the README.
# ============================================================


# --- 1. Organisation ---------------------------------------------------------------

resource "aws_organizations_organization" "this" {
  # "ALL" unlocks SCPs, tag policies, and trusted-access
  # integration with services like Config and GuardDuty.
  feature_set = "ALL"

  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "config-multiaccountsetup.amazonaws.com",
    "guardduty.amazonaws.com",
    "securityhub.amazonaws.com",
    "sso.amazonaws.com",
    "tagpolicies.tag.amazonaws.com",
  ]

  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
    "RESOURCE_CONTROL_POLICY",
    "BACKUP_POLICY",
    "TAG_POLICY",
    "DECLARATIVE_POLICY_EC2",
    "S3_POLICY",
  ]

  lifecycle {
    prevent_destroy = true
  }
}


# --- 2. Core OUs ---------------------------------------------------------------------
# All OUs are children of the organisation root.

locals {
  root_id = aws_organizations_organization.this.roots[0].id
}

resource "aws_organizations_organizational_unit" "security" {
  name      = "Security"
  parent_id = local.root_id

  tags = {
    "ou:name"                = "security"
    "ou:purpose"             = "guardrails-and-logging"
    "ou:owner"               = var.owner
    "ou:scp-tier"            = "strict"
    "ou:data-classification" = "restricted"
    "ou:deletion-protection" = var.deletion_protection
    "account:project"        = var.project
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_organizational_unit" "infrastructure" {
  name      = "Infrastructure"
  parent_id = local.root_id

  tags = {
    "ou:name"         = "infrastructure"
    "ou:purpose"      = "shared-services"
    "ou:owner"        = var.owner
    "ou:scp-tier"     = "moderate"
    "ou:cost-model"   = "shared"
    "ou:shared-with"  = "all-teams"
    "account:project" = var.project
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_organizational_unit" "sandbox" {
  name      = "Sandbox"
  parent_id = local.root_id

  tags = {
    "ou:name"                = "sandbox"
    "ou:purpose"             = "team-experimentation"
    "ou:owner"               = var.owner
    "ou:scp-tier"            = "strict"
    "ou:access-duration"     = "8h"
    "ou:concurrent-versions" = "true"
    "account:project"        = var.project
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "Workloads"
  parent_id = local.root_id

  tags = {
    "ou:name"                = "workloads"
    "ou:purpose"             = "ecommerce-app"
    "ou:owner"               = var.owner
    "ou:scp-tier"            = "moderate"
    "ou:deployment-model"    = "linear"
    "ou:deployment-strategy" = "linear-incremental"
    "ou:stages"              = "dev+staging+production"
    "ou:data-classification" = "confidential"
    "ou:concurrent-versions" = "true"
    "account:project"        = var.project
  }
  lifecycle {
    prevent_destroy = true
  }
}


# --- 3. Local helpers ------------------------------------------------------------
# Assembles the full email address from its parts so the only
# thing that changes per account is the alias string.

locals {
  email = {
    log_archive      = "${var.email_user}+ecommerce-log-archive@${var.email_domain}"
    security_tooling = "${var.email_user}+ecommerce-security-tooling@${var.email_domain}"
    shared_services  = "${var.email_user}+ecommerce-shared-services@${var.email_domain}"
  }
}


# --- 4. Member account: Log archive ---------------------------------------

resource "aws_organizations_account" "log_archive" {
  name      = "ecommerce-log-archive"
  email     = local.email.log_archive
  role_name = var.org_access_role_name

  # Billing access: DENY keeps the account lean — only root
  # and CloudOps with explicit IAM grants see billing.
  iam_user_access_to_billing = "DENY"

  # parent_id moves the account into the Security OU
  # immediately on creation — no manual move required.
  parent_id = aws_organizations_organizational_unit.security.id

  tags = {
    "account:name"                = "ecommerce-log-archive"
    "account:owner"               = var.owner
    "account:project"             = var.project
    "account:environment"         = "restricted"
    "account:ou"                  = "security"
    "account:role"                = "log-archive"
    "account:data-classification" = "restricted"
    "account:retention-days"      = "90"
    "account:deletion-protection" = var.deletion_protection
  }

  lifecycle {
    # role_name cannot be read back from the API after creation.
    # Ignoring prevents a perpetual diff on every plan.
    ignore_changes = [role_name]
    prevent_destroy = true
  }
}


# --- 5. Member account: Security tooling ---------------------------------

resource "aws_organizations_account" "security_tooling" {
  name      = "ecommerce-security-tooling"
  email     = local.email.security_tooling
  role_name = var.org_access_role_name

  iam_user_access_to_billing = "DENY"
  parent_id                  = aws_organizations_organizational_unit.security.id

  tags = {
    "account:name"                = "ecommerce-security-tooling"
    "account:owner"               = var.owner
    "account:project"             = var.project
    "account:environment"         = "restricted"
    "account:ou"                  = "security"
    "account:role"                = "security-tooling"
    "account:data-classification" = "restricted"
    "account:delegated-admin"     = "guardduty+securityhub+config"
    "account:deletion-protection" = var.deletion_protection
  }

  lifecycle {
    ignore_changes = [role_name]
    prevent_destroy = true
  }
}


# --- 6. Member account: Shared services ---------------------------------

resource "aws_organizations_account" "shared_services" {
  name      = "ecommerce-shared-services"
  email     = local.email.shared_services
  role_name = var.org_access_role_name

  iam_user_access_to_billing = "DENY"
  parent_id                  = aws_organizations_organizational_unit.infrastructure.id

  tags = {
    "account:name"                = "ecommerce-shared-services"
    "account:owner"               = var.owner
    "account:project"             = var.project
    "account:environment"         = "shared"
    "account:ou"                  = "infrastructure"
    "account:role"                = "shared-services"
    "account:data-classification" = "internal"
    "account:delegated-admin"     = "idc+sso"
    "account:shared-with"         = "all-teams"
  }

  lifecycle {
    ignore_changes = [role_name]
    prevent_destroy = true
  }
}


# --- 7. Enable opt-in region in all member accounts -----------------------
# af-south-1 is an opt-in region. AWS does not enable it automatically
# in newly created accounts. Without this, the regional STS endpoint
# is inactive and cross-account Terraform providers cannot issue tokens
# valid for services in that region.
#
# These resources run once after account creation and are idempotent —
# re-applying when the region is already enabled is a no-op.
# Any future accounts added to this workspace should get the same block.

resource "aws_account_region" "log_archive_af_south_1" {
  provider   = aws.log_archive
  region_name = var.aws_region
  enabled    = true

  depends_on = [aws_organizations_account.log_archive]
}

resource "aws_account_region" "security_tooling_af_south_1" {
  provider   = aws.security_tooling
  region_name = var.aws_region
  enabled    = true

  depends_on = [aws_organizations_account.security_tooling]
}

resource "aws_account_region" "shared_services_af_south_1" {
  provider   = aws.shared_services
  region_name = var.aws_region
  enabled    = true

  depends_on = [aws_organizations_account.shared_services]
}
