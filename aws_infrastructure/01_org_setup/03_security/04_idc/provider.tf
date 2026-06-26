# ============================================================
# security/04_idc/provider.tf
#
# IAM Identity Center is a global service — its API endpoint
# lives in us-east-1 regardless of the home region selected
# during setup. All sso-admin and identitystore API calls
# must target us-east-1.
# ============================================================

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      "account:project"    = "ecommerce"
      "account:owner"      = "cloudops-team"
      "account:managed-by" = "terraform"
    }
  }
}
