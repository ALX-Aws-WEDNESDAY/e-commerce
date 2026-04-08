# ============================================================
# security/github_oidc/outputs.tf
#
# The role ARN is the only value needed by the CI workflow.
# Copy it into the role-to-assume argument of the
# aws-actions/configure-aws-credentials step in ci.yml.
# ============================================================

output "github_actions_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions. Paste into ci.yml → role-to-assume."
  value       = aws_iam_role.github_actions.arn
}

output "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC identity provider registered in IAM."
  value       = aws_iam_openid_connect_provider.github.arn
}
