# ============================================================
# identity/scps/provider.tf
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

# ── Read OU and root IDs from the org workspace state ─────
# This avoids hard-coding IDs — any ID needed for attaching
# SCPs comes from here.

data "terraform_remote_state" "org" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "org/terraform.tfstate"
    region = var.aws_region
  }
}
