# ============================================================
# org/provider.tf
# ============================================================

provider "aws" {
  region = var.aws_region

  # default_tags are stamped on every resource Terraform creates
  # in this workspace — no need to repeat them per resource.
  default_tags {
    tags = {
      "account:project"    = var.project
      "account:owner"      = var.owner
      "account:managed-by" = "terraform"
    }
  }
}

# ---- Member account providers -----------------------------------------------
# Used only for aws_account_region resources that enable opt-in
# regions in each member account immediately after creation.
# AssumeRole uses the global STS endpoint (sts_region = us-east-1)
# because the regional af-south-1 STS endpoint may not yet be
# active in a freshly created account.

provider "aws" {
  alias      = "log_archive"
  region     = var.aws_region
  sts_region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::${aws_organizations_account.log_archive.id}:role/${var.org_access_role_name}"
  }

  default_tags {
    tags = {
      "account:project"    = var.project
      "account:owner"      = var.owner
      "account:managed-by" = "terraform"
    }
  }
}

provider "aws" {
  alias      = "security_tooling"
  region     = var.aws_region
  sts_region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::${aws_organizations_account.security_tooling.id}:role/${var.org_access_role_name}"
  }

  default_tags {
    tags = {
      "account:project"    = var.project
      "account:owner"      = var.owner
      "account:managed-by" = "terraform"
    }
  }
}

provider "aws" {
  alias      = "shared_services"
  region     = var.aws_region
  sts_region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::${aws_organizations_account.shared_services.id}:role/${var.org_access_role_name}"
  }

  default_tags {
    tags = {
      "account:project"    = var.project
      "account:owner"      = var.owner
      "account:managed-by" = "terraform"
    }
  }
}
