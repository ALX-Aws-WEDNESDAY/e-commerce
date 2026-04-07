# ============================================================
# security/management-iam/backend.tf
#
# State lives in the management account bucket.
# IAM resources in the management account can only be managed
# from the management account itself.
# ============================================================

terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt"
    key          = "management-iam/terraform.tfstate"
    region       = "af-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
