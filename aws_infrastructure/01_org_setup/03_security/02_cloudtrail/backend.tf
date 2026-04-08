# ============================================================
# security/cloudtrail/backend.tf
#
# State lives in the management account bucket.
# CloudTrail org trails can only be created from the
# management account — this workspace always runs there.
# ============================================================

terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt"
    key          = "cloudtrail/terraform.tfstate"
    region       = "af-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
