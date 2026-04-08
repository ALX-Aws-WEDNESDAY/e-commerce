# ============================================================
# org/backend.tf
#
# PURPOSE: Tells Terraform where to store and lock state for
# the org/ workspace.
#
# State locking uses use_lockfile = true — Terraform writes a
# <key>.tflock object to S3 alongside the state file.
# This is the current recommended approach per the Terraform
# S3 backend documentation. DynamoDB-based locking is
# deprecated and not used here.
#
# CREDENTIALS: Do NOT add access_key / secret_key here.
# Supply credentials via environment variables or the shared
# AWS credentials file (~/.aws/credentials) as recommended
# by the Terraform documentation:
#   export AWS_PROFILE=your-management-profile
#   or
#   export AWS_ACCESS_KEY_ID=...
#   export AWS_SECRET_ACCESS_KEY=...
#
# HOW TO POPULATE:
#   After running `terraform apply` in bootstrap/, copy the
#   output values here:
#
#     state_bucket_name  → bucket
#     aws_region         → region
#
# After editing, run `terraform init` in org/ to initialise
# the remote backend.
# ============================================================

terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt" # from bootstrap output: state_bucket_name
    key          = "org/terraform.tfstate"   # logical path in the bucket
    region       = "af-south-1"              # from bootstrap output: aws_region
    use_lockfile = true                      # S3-native locking via .tflock file
    encrypt      = true                      # server-side encryption for state + lock files
  }
}
