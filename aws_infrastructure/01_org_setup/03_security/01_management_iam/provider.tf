# ============================================================
# security/management_iam/provider.tf
#
# Two providers following the AssumeRole cross-account pattern:
#   - default (source): management account — creates IAM
#     policies and groups for mid_projects_admin
#   - log_archive (destination): log archive account — creates
#     the trust policy that allows the management account to
#     assume OrganizationAccountAccessRole
#
# Both providers use the same management account credentials
# (ecommerce-profile). The log_archive provider uses
# assume_role to step into the log archive account — it does
# NOT need separate credentials for that account.
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

  # af-south-1 is an opt-in region. Terraform's AWS provider v6 defaults
  # to the regional STS endpoint which rejects cross-account AssumeRole.
  # Forcing the global endpoint signed with us-east-1 matches how the
  # AWS CLI resolves this automatically.

  sts_region = "us-east-1"

  endpoints {
    sts = "https://sts.amazonaws.com"
  }


  default_tags {
    tags = {
      "account:project"    = "ecommerce"
      "account:owner"      = "cloudops-team"
      "account:managed-by" = "terraform"
    }
  }
}

# ---- Source account ID — used to build the trust policy principal ----
data "aws_caller_identity" "source" {}

# ---- Remote state — reads account IDs from org workspace ------------
data "terraform_remote_state" "org" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "org/terraform.tfstate"
    region = var.aws_region
  }
}
