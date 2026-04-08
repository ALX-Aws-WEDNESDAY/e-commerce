# ============================================================
# security/github_oidc/main.tf
#
# PURPOSE: Enables GitHub Actions to authenticate to AWS
# without any long-term credentials stored in GitHub.
#
# HOW IT WORKS:
#   1. An IAM OIDC identity provider is registered in the
#      management account, trusting GitHub's token endpoint.
#   2. An IAM role is created whose trust policy allows
#      GitHub Actions — scoped to this specific repository —
#      to call sts:AssumeRoleWithWebIdentity.
#   3. The EcommerceTerraformOps policy (created by the
#      management_iam workspace) is attached to the role,
#      giving the pipeline the same permissions as the local
#      operator.
#
# WHAT GITHUB ACTIONS DOES AT RUNTIME:
#   - GitHub issues a short-lived OIDC token to the runner.
#   - The aws-actions/configure-aws-credentials action
#     exchanges that token for temporary AWS credentials via
#     sts:AssumeRoleWithWebIdentity.
#   - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and
#     AWS_SESSION_TOKEN are injected into the runner — no
#     secrets stored in GitHub at all.
#
# NOTE ON THUMBPRINT:
#   thumbprint_list is omitted intentionally. AWS provider v6
#   documentation confirms that for GitHub, AWS validates
#   against its own trusted CA library and ignores any
#   configured thumbprint. Omitting it keeps the resource
#   clean and avoids future drift if GitHub rotates its cert.
# ============================================================

locals {
  org_account_id = data.terraform_remote_state.org.outputs.master_account_id
}

# ---- 1. IAM OIDC identity provider ------------------------------------------
# Registered once in the management account. Tells AWS to
# trust tokens issued by GitHub Actions.

resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  # sts.amazonaws.com is the audience GitHub Actions uses when
  # requesting tokens for AWS — this must match exactly.
  client_id_list = ["sts.amazonaws.com"]

  tags = {
    "oidc:provider" = "github"
    "oidc:purpose"  = "ci-cd"
  }
}

# ---- 2. IAM role that GitHub Actions assumes --------------------------------

resource "aws_iam_role" "github_actions" {
  name        = var.github_actions_role_name
  description = "Assumed by GitHub Actions via OIDC for Terraform CI/CD on the ecommerce org."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GitHubOIDCTrust"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            # Scoped to this repository only.
            # The * at the end allows any branch, tag, or
            # environment within the repo to assume the role.
            # Can be tightened to a specific branch (e.g. :ref:refs/heads/main)
            # once the pipeline is stable.
            # In this project this will resolve to: repo:ALX-Aws-WEDNESDAY/e-commerce:*
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"

          }
          StringEquals = {
            # Audience must match the client_id_list above.
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    "iam:purpose"     = "github-actions-ci"
    "iam:repo"        = "${var.github_org}/${var.github_repo}"
    "iam:auth-method" = "oidc"
  }
}

# ---- 3. Attach EcommerceTerraformOps to the role ----------------------------
# This policy was created by the management_iam workspace and
# grants exactly the permissions needed to run all Terraform
# workspaces in this project — no more.

resource "aws_iam_role_policy_attachment" "github_actions_terraform_ops" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::${local.org_account_id}:policy/EcommerceTerraformOps"
}
