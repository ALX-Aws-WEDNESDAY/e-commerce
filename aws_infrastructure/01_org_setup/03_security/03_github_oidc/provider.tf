# ============================================================
# security/github_oidc/provider.tf
#
# Single default provider — all resources in this workspace
# are created in the management account.
# Credentials are supplied via environment variables set by
# source ./aws-env.sh — no profile argument needed.
# ============================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      "account:project"    = "ecommerce"
      "account:owner"      = "cloudops-team"
      "account:managed-by" = "terraform"
    }
  }
}

# ---- Remote state — reads account IDs and org outputs -------

data "terraform_remote_state" "org" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "org/terraform.tfstate"
    region = var.aws_region
  }
}
