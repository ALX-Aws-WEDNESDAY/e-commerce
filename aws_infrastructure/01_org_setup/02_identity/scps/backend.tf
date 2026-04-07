# ============================================================
# identity/scps/backend.tf
#
# State for SCP resources lives in the management account
# S3 bucket under a separate key from the org workspace.
# SCPs are org-level resources and must be managed from the
# management account — this state stays here permanently.
# ============================================================

terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt"
    key          = "scps/terraform.tfstate"
    region       = "af-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
