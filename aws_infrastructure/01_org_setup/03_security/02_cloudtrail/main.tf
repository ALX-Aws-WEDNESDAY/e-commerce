# ============================================================
# security/cloudtrail/main.tf
#
# Creates:
#   1. S3 bucket in the log archive account  (provider = log_archive)
#      - versioning on
#      - server-side encryption (AES256)
#      - public access blocked
#      - 90-day lifecycle expiry
#      - bucket policy allowing CloudTrail delivery
#
#   2. Organisation CloudTrail trail         (provider = default / mgmt)
#      - multi-region: captures all regions
#      - is_organization_trail = true: covers all member accounts
#      - logs delivered to the bucket in step 1
#
# prevent_destroy is set on both — these must never be
# accidentally deleted. Losing the trail means losing the
# audit record for the entire organisation.
# ============================================================

locals {
  log_archive_account_id = data.terraform_remote_state.org.outputs.log_archive_account_id
  org_id                 = data.terraform_remote_state.org.outputs.org_id
  bucket_name            = "ecommerce-cloudtrail-logs-${local.log_archive_account_id}"
}

# ---- 1. Log bucket in the log archive account ----------------------------------

resource "aws_s3_bucket" "cloudtrail_logs" {
  provider = aws.log_archive
  bucket   = local.bucket_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "cloudtrail_logs" {
  provider = aws.log_archive
  bucket   = aws_s3_bucket.cloudtrail_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  provider = aws.log_archive
  bucket   = aws_s3_bucket.cloudtrail_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail_logs" {
  provider = aws.log_archive
  bucket   = aws_s3_bucket.cloudtrail_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "cloudtrail_logs" {
  provider = aws.log_archive
  bucket   = aws_s3_bucket.cloudtrail_logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"

    expiration {
      days = var.log_retention_days
    }
  }
}

# CloudTrail requires a specific bucket policy to allow
# delivery. It must allow the cloudtrail.amazonaws.com
# principal to PutObject and GetBucketAcl.

resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  provider = aws.log_archive
  bucket   = aws_s3_bucket.cloudtrail_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs.arn
        Condition = {
          StringEquals = {
            "aws:SourceArn" = "arn:aws:cloudtrail:${var.aws_region}:${data.terraform_remote_state.org.outputs.master_account_id}:trail/ecommerce-org-trail"
          }
        }
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs.arn}/AWSLogs/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"  = "bucket-owner-full-control"
            "aws:SourceArn" = "arn:aws:cloudtrail:${var.aws_region}:${data.terraform_remote_state.org.outputs.master_account_id}:trail/ecommerce-org-trail"
          }
        }
      }
    ]
  })
}

# ---- 2. Organisation CloudTrail trail --------------------------------------------------

resource "aws_cloudtrail" "org_trail" {
  name                          = "ecommerce-org-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  is_organization_trail         = true
  enable_log_file_validation    = true

  lifecycle {
    prevent_destroy = true
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail_logs]
}
