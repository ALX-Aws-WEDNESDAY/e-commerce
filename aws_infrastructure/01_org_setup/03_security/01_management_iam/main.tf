# ============================================================
# security/management-iam/main.tf
#
# PURPOSE: Implements the three-layer security hardening for
# the management account IAM user after Phase 1 is complete.
#
# LAYER 1 — Documented via SCPs (in identity/scps/).
#   The DenyRootUserActions SCP blocks root user in all member
#   accounts. That SCP is managed separately because SCPs are
#   org-level resources, not IAM resources.
#
# LAYER 2 — IAM policy: strips AdministratorAccess and replaces
#   it with a narrow policy that allows only:
#     - organizations:* (org management via Terraform)
#     - sts:AssumeRole into specific roles
#     - s3:* on the state bucket only
#     - iam:* on itself only (so it can still rotate its own keys)
#
# LAYER 3 — IAM policy: explicitly denies the most dangerous
#   destructive org actions regardless of other grants.
#   A deny always wins. This is the "break-glass" safety net.
#
#
#
# IMPORTANT — READ BEFORE APPLYING
# ------------------------------------------------------------------
# Applying this WILL immediately restrict your management
# account IAM user. Test with `terraform plan` first and read
# the diff carefully. Ensure you have console access as root
# or another admin as a fallback before applying.
#
# Once applied, the user can no longer:
#   - Create EC2 instances or any compute resources directly
#   - Create RDS, Lambda, or any service resources
#   - Delete the organisation, OUs, or close accounts
#   - Modify any resource outside of Terraform state bucket
#
# The user CAN still:
#   - Run all Terraform org/ workspace commands
#   - Run all Terraform identity/scps/ workspace commands
#   - Run all Terraform security/ workspace commands
#   - Assume OrganizationAccountAccessRole in member accounts
# ============================================================

locals {
  state_bucket_arn    = "arn:aws:s3:::${var.state_bucket}"
  org_account_id      = data.terraform_remote_state.org.outputs.master_account_id
  log_archive_id      = data.terraform_remote_state.org.outputs.log_archive_account_id
  security_tooling_id = data.terraform_remote_state.org.outputs.security_tooling_account_id
  shared_services_id  = data.terraform_remote_state.org.outputs.shared_services_account_id
}

# ---- Trust policy: allows management account to assume OrganizationAccountAccessRole
# in the log archive account. Uses the destination (ecommerce-logs) provider.
# aws_caller_identity.source dynamically resolves the management account ID
# so no account ID is hard-coded here.

data "aws_iam_policy_document" "assume_role" {
  provider = aws.log_archive

  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.source.account_id}:root"]
    }
  }
}

resource "aws_iam_role" "org_account_access" {
  provider           = aws.log_archive
  name               = "OrganizationAccountAccessRole"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [name]
  }
}

resource "aws_iam_role_policy_attachment" "org_account_access_admin" {
  provider   = aws.log_archive
  role       = aws_iam_role.org_account_access.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# ---- Data: look up the existing IAM user --------------------------------------------

data "aws_iam_user" "admin" {
  user_name = var.iam_user_name
}

# ---- Layer 2: Narrow operational policy ----------------------------------------------
# Replaces AdministratorAccess with only what is needed to
# run Terraform and assume roles into member accounts.

resource "aws_iam_policy" "mgmt_terraform_ops" {
  name        = "EcommerceTerraformOps"
  description = "Narrow policy for the Terraform operator in the management account."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "OrganizationsManagement"
        Effect   = "Allow"
        Action   = "organizations:*"
        Resource = "*"
      },
      {
        Sid    = "AssumeRoleInMemberAccounts"
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Resource = [
          "arn:aws:iam::${local.log_archive_id}:role/OrganizationAccountAccessRole",
          "arn:aws:iam::${local.security_tooling_id}:role/OrganizationAccountAccessRole",
          "arn:aws:iam::${local.shared_services_id}:role/OrganizationAccountAccessRole",
          # Add new account ARNs here as you provision workload and sandbox accounts
        ]
      },
      {
        Sid    = "StateBucketAccess"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketPolicy"
        ]
        Resource = local.state_bucket_arn # the bucket itself
      },
      {
        Sid    = "StateFileAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${local.state_bucket_arn}/*.tfstate" # state files only
      },
      {
        Sid    = "StateLockFileAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${local.state_bucket_arn}/*.tflock" # lock files only
      },
      {
        Sid    = "SelfUserManagement"
        Effect = "Allow"
        Action = [
          "iam:GetUser",
          "iam:ChangePassword",
          "iam:CreateAccessKey",
          "iam:DeleteAccessKey",
          "iam:ListAccessKeys",
          "iam:UpdateAccessKey"
        ]
        Resource = data.aws_iam_user.admin.arn
      },
      {
        Sid    = "IAMPolicyManagement"
        Effect = "Allow"
        Action = [
          "iam:CreatePolicy",
          "iam:DeletePolicy",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:ListPolicyVersions"
        ]
        Resource = [
          "arn:aws:iam::${local.org_account_id}:policy/Ecommerce*"
        ]
      },
      {
        Sid    = "IAMGroupManagement"
        Effect = "Allow"
        Action = [
          "iam:CreateGroup",
          "iam:DeleteGroup",
          "iam:GetGroup",
          "iam:UpdateGroup"
        ]
        Resource = [
          "arn:aws:iam::${local.org_account_id}:group/Ecommerce*"
        ]
      },
      {
        Sid    = "IAMPolicyAttachment"
        Effect = "Allow"
        Action = [
          "iam:AttachUserPolicy",
          "iam:DetachUserPolicy",
          "iam:AttachGroupPolicy",
          "iam:DetachGroupPolicy",
          "iam:ListAttachedGroupPolicies",
          "iam:ListAttachedUserPolicies",
          "iam:CreatePolicyVersion",
          "iam:DeletePolicyVersion",
          "access-analyzer:ValidatePolicy"
        ]
        Resource = [
          data.aws_iam_user.admin.arn,
          "arn:aws:iam::${local.org_account_id}:group/Ecommerce*",
          "arn:aws:iam::${local.org_account_id}:policy/Ecommerce*"
        ]
      },
      {
        Sid    = "IAMGroupMembership"
        Effect = "Allow"
        Action = [
          "iam:AddUserToGroup",
          "iam:RemoveUserFromGroup"
        ]
        Resource = [
          data.aws_iam_user.admin.arn,
          "arn:aws:iam::${local.org_account_id}:group/Ecommerce*"
        ]
      },
      {
        Sid    = "IAMReadOnlyForDiscovery"
        Effect = "Allow"
        Action = [
          "iam:ListUsers",
          "iam:ListRoles",
          "iam:ListPolicies",
          "iam:ListGroupsForUser",
          "iam:ListGroups",
          "iam:GetUser",
          "iam:GetRole",
          "iam:ListUserPolicies",
          "iam:ListGroupPolicies",
          "iam:GetGroup",
          "iam:GetPolicy",
          "iam:SimulatePrincipalPolicy"
        ]
        Resource = "*"
      },
      {
        Sid    = "GitHubOIDCManagement"
        Effect = "Allow"
        Action = [
          "iam:CreateOpenIDConnectProvider",
          "iam:DeleteOpenIDConnectProvider",
          "iam:GetOpenIDConnectProvider",
          "iam:ListOpenIDConnectProviders",
          "iam:TagOpenIDConnectProvider",
          "iam:UntagOpenIDConnectProvider",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:UpdateRole",
          "iam:UpdateRoleDescription",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:ListAttachedRolePolicies",
          "iam:ListRolePolicies",
          "iam:UpdateAssumeRolePolicy"
        ]
        Resource = [
          "arn:aws:iam::${local.org_account_id}:oidc-provider/token.actions.githubusercontent.com",
          "arn:aws:iam::${local.org_account_id}:role/Ecommerce*"
        ]
      },
      {
        Sid    = "CloudTrailManagement"
        Effect = "Allow"
        Action = [
          "cloudtrail:CreateTrail",
          "cloudtrail:UpdateTrail",
          "cloudtrail:DeleteTrail",
          "cloudtrail:StartLogging",
          "cloudtrail:StopLogging",
          "cloudtrail:PutEventSelectors",
          "cloudtrail:Get*",
          "cloudtrail:Describe*",
          "cloudtrail:List*"
        ]
        Resource = [
          "arn:aws:cloudtrail:${var.aws_region}:${local.org_account_id}:trail/ecommerce-*"
        ]
      },
      {
        Sid    = "AWSMCPGrant"
        Effect = "Allow"
        Action = [
          "aws-mcp:InvokeMcp",
          "aws-mcp:CallReadOnlyTool",
          "aws-mcp:CallReadWriteTool"
        ]
        Resource = "*"
      },
      {
        Sid    = "AccountGrant"
        Effect = "Allow"
        Action = [
          "account:ListRegions",
          "account:GetRegionOptStatus",
          "account:EnableRegion"
        ]
        Resource = "*"
      }
    ]
  })

  lifecycle {
    prevent_destroy = true
  }
}

# ---- Layer 3: Explicit deny on destructive org actions ----------------
# Deny always beats allow — even if Layer 2 is accidentally
# widened, these actions remain blocked.

resource "aws_iam_policy" "mgmt_deny_destructive" {
  name        = "EcommerceDenyDestructiveOrgActions"
  description = "Explicitly denies destructive organisation actions from the management account user."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyOrgDeletion"
        Effect = "Deny"
        Action = [
          "organizations:DeleteOrganization",
          "organizations:DeleteOrganizationalUnit",
          "organizations:CloseAccount",
          "organizations:RemoveAccountFromOrganization"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyStateBucketDeletion"
        Effect = "Deny"
        Action = [
          "s3:DeleteBucket",
          "s3:DeleteBucketPolicy"
        ]
        Resource = local.state_bucket_arn
      }
    ]
  })

  lifecycle {
    prevent_destroy = true
  }
}

# ---- Attach both policies to the management user ----------------------------

resource "aws_iam_user_policy_attachment" "terraform_ops" {
  user       = data.aws_iam_user.admin.user_name
  policy_arn = aws_iam_policy.mgmt_terraform_ops.arn
}

resource "aws_iam_user_policy_attachment" "deny_destructive" {
  user       = data.aws_iam_user.admin.user_name
  policy_arn = aws_iam_policy.mgmt_deny_destructive.arn
}

# ---- Remove AdministratorAccess (managed policy detachment) ------
# AWS does not let Terraform "remove" an existing attachment
# without importing it first. The steps are documented in the
# README under the management-iam apply instructions.

# ---- IAM group for cross-account role access ------------------------------------
# The AWS documentation recommends granting AssumeRole
# permissions to a group rather than directly to a user.
# This makes it easy to add other CloudOps users later without
# touching the policy.

resource "aws_iam_group" "cloudops_admins" {
  name = var.iam_group_name
}

# Grant the group permission to assume OrganizationAccountAccessRole
# in all three backbone accounts.  When new accounts are added
# (sandbox, workload), add their ARNs to this list and re-apply.

resource "aws_iam_policy" "assume_backbone_accounts" {
  name        = "EcommerceAssumeBackboneAccounts"
  description = "Allows CloudOps admins to assume OrganizationAccountAccessRole in backbone accounts."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AssumeOrgAccessRole"
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Resource = [
          "arn:aws:iam::${local.log_archive_id}:role/OrganizationAccountAccessRole",
          "arn:aws:iam::${local.security_tooling_id}:role/OrganizationAccountAccessRole",
          "arn:aws:iam::${local.shared_services_id}:role/OrganizationAccountAccessRole",
          # Add new account ARNs here as sandbox and workload accounts are provisioned
        ]
      }
    ]
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_group_policy_attachment" "cloudops_assume_backbone" {
  group      = aws_iam_group.cloudops_admins.name
  policy_arn = aws_iam_policy.assume_backbone_accounts.arn
}

# Allows all CloudOps users to run `aws login` to get console
# credentials for the CLI and local developer tools.
# Attaching at the group level means every future user added to
# EcommerceCloudOpsAdmins inherits this automatically.
resource "aws_iam_group_policy_attachment" "cloudops_signin_local_dev" {
  group      = aws_iam_group.cloudops_admins.name
  policy_arn = "arn:aws:iam::aws:policy/SignInLocalDevelopmentAccess"
}

# Add the existing admin IAM user to the group.
# This gives them immediate cross-account access via the group policy.

resource "aws_iam_user_group_membership" "admin_cloudops" {
  user   = data.aws_iam_user.admin.user_name
  groups = [aws_iam_group.cloudops_admins.name]
}
