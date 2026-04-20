# ======================================================================
# bootstrap/main.tf
#
# PURPOSE: Creates the S3 bucket that the organization workspaces use
# for remote state storage and native S3 state locking.
#
# State locking uses use_lockfile = true (S3-native .tflock
# files) — no DynamoDB table is required or created.
# This follows the Terraform S3 backend documentation which
# marks DynamoDB-based locking as deprecated.
#
# HOW TO USE:
#   cd aws_infrastructure/01_org_setup/00_bootstrap
#   terraform init      # uses local state — that is intentional
#   terraform apply
#
# Run this ONCE from the management account before anything
# else.  Never delete these resources manually.
# ======================================================================

terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
  # Bootstrap intentionally uses LOCAL state.
  # There is no remote backend yet — we are creating it here.
}

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

# ---- S3 bucket for Terraform state --------------------------------------------------------

resource "aws_s3_bucket" "tf_state" {
  bucket = var.state_bucket_name

  # Prevent accidental destruction of the state bucket.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  depends_on = [aws_s3_bucket_versioning.tf_state]

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---- Outputs ----------------------------------------------------------------------------------------------------
# Copy these values into backend.tf files after apply.

output "state_bucket_name" {
  value       = aws_s3_bucket.tf_state.id
  description = "Bucket name used in backend.tf files"
}

output "aws_region" {
  value       = var.aws_region
  description = "Region used in backend.tf files"
}
