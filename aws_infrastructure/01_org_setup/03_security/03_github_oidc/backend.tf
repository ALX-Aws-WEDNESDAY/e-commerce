# ============================================================
# security/github_oidc/backend.tf
#
# State lives in the management account bucket under its own
# key, isolated from all other workspaces.
# ============================================================

terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt"
    key          = "github-oidc/terraform.tfstate"
    region       = "af-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
