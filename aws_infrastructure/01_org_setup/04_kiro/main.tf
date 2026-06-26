# ============================================================
# 04_kiro/main.tf
#
# Creates two S3 buckets for Kiro observability:
#
#   1. kiro-prompt-logs-<account_id>
#      - Stores raw Kiro prompt payloads + metadata
#      - Organised as: prompts/YYYY/MM/DD/<uuid>.json
#      - 90-day lifecycle expiry (configurable)
#
#   2. kiro-activity-reports-<account_id>
#      - Receives daily user activity reports
#      - Organised as: reports/YYYY/MM/DD/report.json
#      - 365-day lifecycle expiry (configurable)
#
# Security best practices applied to both buckets:
#   - SSE-S3 encryption at rest
#   - All public access blocked
#   - Versioning enabled (protects against accidental overwrites)
#   - TLS-only bucket policy (denies any HTTP request)
#   - prevent_destroy lifecycle guard
# ============================================================

locals {
  account_id           = data.aws_caller_identity.current.account_id
  prompt_bucket_name   = "kiro-prompt-logs-${local.account_id}"
  activity_bucket_name = "kiro-activity-reports-${local.account_id}"
}

# ================================================================
# Shared config module — applied identically to both buckets
# ================================================================

# ---- Bucket 1: Prompt logs -----------------------------------------

resource "aws_s3_bucket" "prompt_logs" {
  bucket = local.prompt_bucket_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "prompt_logs" {
  bucket = aws_s3_bucket.prompt_logs.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "prompt_logs" {
  bucket = aws_s3_bucket.prompt_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "prompt_logs" {
  bucket                  = aws_s3_bucket.prompt_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "prompt_logs" {
  bucket = aws_s3_bucket.prompt_logs.id

  rule {
    id     = "expire-prompt-logs"
    status = "Enabled"

    filter { prefix = "prompts/" }

    expiration { days = var.prompt_log_retention_days }

    noncurrent_version_expiration { noncurrent_days = 30 }
  }
}

resource "aws_s3_bucket_policy" "prompt_logs_tls_only" {
  bucket = aws_s3_bucket.prompt_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonTLS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.prompt_logs.arn,
          "${aws_s3_bucket.prompt_logs.arn}/*"
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.prompt_logs]
}

# ---- Bucket 2: Activity reports ------------------------------------

resource "aws_s3_bucket" "activity_reports" {
  bucket = local.activity_bucket_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "activity_reports" {
  bucket = aws_s3_bucket.activity_reports.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "activity_reports" {
  bucket = aws_s3_bucket.activity_reports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "activity_reports" {
  bucket                  = aws_s3_bucket.activity_reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "activity_reports" {
  bucket = aws_s3_bucket.activity_reports.id

  rule {
    id     = "expire-activity-reports"
    status = "Enabled"

    filter { prefix = "reports/" }

    expiration { days = var.activity_report_retention_days }

    noncurrent_version_expiration { noncurrent_days = 30 }
  }
}

resource "aws_s3_bucket_policy" "activity_reports_tls_only" {
  bucket = aws_s3_bucket.activity_reports.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonTLS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.activity_reports.arn,
          "${aws_s3_bucket.activity_reports.arn}/*"
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.activity_reports]
}
