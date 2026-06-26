terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt"
    key          = "kiro/terraform.tfstate"
    region       = "af-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
