provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      "account:project"    = "ecommerce"
      "account:owner"      = "cloudops-team"
      "account:managed-by" = "terraform"
      "account:component"  = "kiro"
    }
  }
}

data "aws_caller_identity" "current" {}
