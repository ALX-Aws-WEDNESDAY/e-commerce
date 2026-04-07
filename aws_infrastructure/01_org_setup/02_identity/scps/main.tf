# ============================================================
# identity/scps/main.tf
#
# Three root-level SCPs applied to all member accounts:
#
#  1. DenyLeaveOrganization   — prevents accounts detaching
#  2. DenyRegion              — locks usage to allowed regions
#  3. DenyRootUserActions     — blocks root user in all member
#                               accounts (does not affect mgmt)
#
# All three are attached at the Organisation root so they
# apply to every OU and account automatically.
#
# lifecycle prevent_destroy is set on all SCPs and attachments
# — these are foundational guardrails that must not be
# accidentally removed.
# ============================================================

# value being retrieved from backend.tf
locals {
  root_id = data.terraform_remote_state.org.outputs.root_id
}

# ---- SCP 1: Deny leave organisation ------------------------------------------------------

resource "aws_organizations_policy" "deny_leave_org" {
  name        = "DenyLeaveOrganization"
  description = "Prevents any member account from leaving the organisation."
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyLeaveOrganization"
      Effect    = "Deny"
      Action    = "organizations:LeaveOrganization"
      Resource  = "*"
    }]
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_policy_attachment" "deny_leave_org_root" {
  policy_id = aws_organizations_policy.deny_leave_org.id
  target_id = local.root_id

  lifecycle {
    prevent_destroy = true
  }
}

# ---- SCP 2: Deny non-allowed regions ----------------------------------------------------
# NotAction exemptions cover global services (IAM, STS, CloudFront, Route53, Support, Budgets)
# that have no regional endpoint — denying them breaks console login and billing.

resource "aws_organizations_policy" "deny_region" {
  name        = "DenyNonAllowedRegions"
  description = "Restricts all member account activity to the approved region."
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyNonAllowedRegions"
      Effect = "Deny"
      NotAction = [
        "a4b:*",
        "acm:*",
        "account:*",
        "aws-marketplace-management:*",
        "aws-marketplace:*",
        "budgets:*",
        "ce:*",
        "chime:*",
        "cloudfront:*",
        "config:*",
        "cur:*",
        "directconnect:*",
        "ec2:DescribeRegions",
        "ec2:DescribeTransitGateways",
        "ec2:DescribeVpnGateways",
        "fms:*",
        "globalaccelerator:*",
        "health:*",
        "iam:*",
        "importexport:*",
        "kms:*",
        "mobileanalytics:*",
        "networkmanager:*",
        "organizations:*",
        "pricing:*",
        "route53:*",
        "route53domains:*",
        "s3:GetAccountPublic*",
        "s3:ListAllMyBuckets",
        "s3:PutAccountPublic*",
        "shield:*",
        "sts:*",
        "support:*",
        "trustedadvisor:*",
        "waf-regional:*",
        "waf:*",
        "wafv2:*",
        "wellarchitected:*"
      ]
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "aws:RequestedRegion" = var.allowed_regions
        }
      }
    }]
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_policy_attachment" "deny_region_root" {
  policy_id = aws_organizations_policy.deny_region.id
  target_id = local.root_id

  lifecycle {
    prevent_destroy = true
  }
}

# ---- SCP 3: Deny root user actions in member accounts ------------------
# SCPs do not apply to the management account, so this SCP
# only restricts root users in the member accounts — which is
# exactly the intent. Management account root is unaffected.

resource "aws_organizations_policy" "deny_root_user" {
  name        = "DenyRootUserActions"
  description = "Blocks all actions performed as root user in member accounts."
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyRootUser"
      Effect = "Deny"
      Action = "*"
      Resource = "*"
      Condition = {
        StringLike = {
          "aws:PrincipalArn" = "arn:aws:iam::*:root"
        }
      }
    }]
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_policy_attachment" "deny_root_user_root" {
  policy_id = aws_organizations_policy.deny_root_user.id
  target_id = local.root_id

  lifecycle {
    prevent_destroy = true
  }
}
