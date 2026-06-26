# ============================================================
# security/04_idc/backend.tf
# State stored in the management account bucket under a
# dedicated key for IDC resources.
# ============================================================

terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt"
    key          = "idc/terraform.tfstate"
    region       = "af-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
