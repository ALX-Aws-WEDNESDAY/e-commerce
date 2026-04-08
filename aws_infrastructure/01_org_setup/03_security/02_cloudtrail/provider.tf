# ============================================================
# security/cloudtrail/provider.tf
#
# Two providers are needed:
#   - Default provider: management account (creates the trail)
#   - log_archive provider: log archive account (creates the
#     S3 bucket that receives trail logs)
#
# The log_archive provider assumes OrganizationAccountAccessRole
# in the log archive account using the management account
# credentials already active in the terminal session.
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

provider "aws" {
  alias  = "log_archive"
  region = var.aws_region

  assume_role {
    role_arn = "arn:aws:iam::${data.terraform_remote_state.org.outputs.log_archive_account_id}:role/OrganizationAccountAccessRole"
  }

  default_tags {
    tags = {
      "account:project"    = "ecommerce"
      "account:owner"      = "cloudops-team"
      "account:managed-by" = "terraform"
    }
  }
}

# ---- Remote state — reads account IDs from org workspace ------------

data "terraform_remote_state" "org" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "org/terraform.tfstate"
    region = var.aws_region
  }
}
