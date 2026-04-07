# `00_bootstrap` — Notes

## Introduction

Before Terraform can manage any infrastructure remotely, it needs somewhere to store its **state file**. A state file is a record of everything it has created and how those resources relate to each other. That storage location is typically an S3 bucket, but here lies the classic chicken-and-egg problem: you cannot use Terraform to create the S3 bucket if Terraform has nowhere to store state yet.

The `00_bootstrap` directory exists specifically to break that deadlock. It is a small, self-contained Terraform workspace whose only job is to create the S3 bucket that every other workspace in this project will use for remote state storage and state locking. Unlike every other workspace in this project, bootstrap intentionally uses **local state** — meaning Terraform writes its state file to your local disk rather than to S3. So this should be viewed as a designed as opposed to an oversight given that the bucket cannot store its own creation record, so local state is the only sensible choice here.

This workspace is meant to be run **once**, from the management account, before anything else in the project. Once the bucket exists, you move on and never need to touch this directory again — unless something catastrophic happens to the bucket itself.

## Files in this directory

There are two Terraform files in this workspace, and they run as a single unit when you execute `terraform apply`. The order in which Terraform internally processes them is determined by resource dependencies, but from a reading perspective it helps to understand `variables.tf` first since it defines the inputs that `main.tf` depends on.

### 1. `variables.tf`

This file declares the two input variables that the rest of the workspace depends on. Terraform reads this file before evaluating any resources, so it is effectively the starting point of the configuration.

```go
variable "aws_region" {
  description = "Primary AWS region for the management account and state bucket."
  type        = string
  default     = "af-south-1"
}

variable "state_bucket_name" {
  description = "Globally unique S3 bucket name for Terraform remote state."
  type        = string
  default     = "ecommerce-tf-state-mgmt"
}
```

The `aws_region` variable sets the AWS region where the S3 bucket will be created, defaulting to `af-south-1` (Africa — Cape Town). The `state_bucket_name` variable holds the globally unique name for the bucket. S3 bucket names are globally unique across all AWS accounts worldwide, so if the default name `ecommerce-tf-state-mgmt` is already taken by another account, you will need to add a short unique suffix such as `ecommerce-tf-state-mgmt-a3f9` before applying.

Neither variable requires you to supply a value explicitly — the defaults are ready to use as-is, though you should verify the bucket name is available before running `terraform apply`.

### 2. `main.tf`

This is the core of the bootstrap workspace. It contains the Terraform version and provider requirements, the AWS provider configuration, all four S3 bucket resources, and the two outputs you will need after apply. Here is a walkthrough in the order Terraform will create things.

#### Terraform block

```go
terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
  # Bootstrap intentionally uses LOCAL state.
}
```

The `terraform` block pins the minimum Terraform CLI version to `1.10.0` and locks the AWS provider to any `6.x` release. The version constraint `~> 6.0` means Terraform will accept `6.0`, `6.1`, `6.38`, and so on, but will reject `7.0` if it is ever released — protecting you from breaking changes in a future major version. Crucially, there is no `backend` block here. The absence of a backend block is what tells Terraform to use local state, which is exactly what is needed at this stage.

#### Provider block

```go
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
```

The provider block configures the AWS provider to operate in the region defined by `var.aws_region`. The `default_tags` block is a convenience feature that automatically applies the three listed tags to every AWS resource created by this provider, without having to repeat them on each individual resource. This ensures consistent tagging across the project from the very first resource created.

#### Resource: `aws_s3_bucket.tf_state`

```go
resource ."aws_s3_bucket" "tf_state" {
  bucket = var.state_bucket_name

  lifecycle {
    prevent_destroy = true
  }
}
```

This is the primary resource — the S3 bucket itself. The `lifecycle` block with `prevent_destroy = true` is a Terraform-level safeguard that causes `terraform destroy` to fail with an error if it ever tries to delete this bucket. This is intentional because losing the state bucket would mean losing the state files for every workspace in the project, which would require manually re-importing every resource back into Terraform. The `prevent_destroy` flag makes that scenario impossible to trigger accidentally.

#### Resource: `aws_s3_bucket_versioning.tf_state`

```go
resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

Versioning is enabled on the bucket so that every time Terraform writes a new state file, the previous version is preserved rather than overwritten. This means if a `terraform apply` produces a bad state — for example, due to a partial failure or a misconfiguration — you can recover the previous state by restoring an earlier version of the object from S3. Without versioning, a corrupted or overwritten state file would be unrecoverable.

#### Resource: `aws_s3_bucket_server_side_encryption_configuration.tf_state`

```go
resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

This resource enables server-side encryption on the bucket using AES-256, which is AWS's S3-managed encryption (SSE-S3). Every object written to the bucket — including state files and `.tflock` lock files — will be encrypted at rest automatically. AES-256 is chosen here over KMS-based encryption (`aws:kms`) to keep the setup simple and avoid the additional cost and complexity of managing a KMS key at this foundational stage.

#### Resource: `aws_s3_bucket_public_access_block.tf_state`

```go
resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

All four public access block settings are enabled, which collectively ensure the bucket can never be made publicly accessible — not through ACLs, not through bucket policies, and not through any future configuration change. Terraform state files contain sensitive information including resource IDs, ARNs, and sometimes values that were marked sensitive in the configuration. Blocking all public access is a non-negotiable baseline for a state bucket.

#### Outputs

```go
output "state_bucket_name" {
  value       = aws_s3_bucket.tf_state.id
  description = "Paste into org/backend.tf → bucket"
}

output "aws_region" {
  value       = var.aws_region
  description = "Paste into org/backend.tf → region"
}
```

After `terraform apply` completes, Terraform prints these two values to the terminal. They are the only two pieces of information you need to carry forward into the next workspace. You will paste `state_bucket_name` into the `bucket` argument and `aws_region` into the `region` argument of `01_org/backend.tf` before initialising that workspace.

## Running the bootstrap

The commands for this workspace are intentionally simple. Navigate into the directory and run the following in order:

```bash
cd 01_org_setup/00_bootstrap/
terraform init
terraform apply
```

`terraform init` downloads the AWS provider plugin (version `~> 6.0`) and prepares the working directory. Because there is no remote backend configured, it initialises with local state and creates a `terraform.tfstate` file in the current directory.

`terraform apply` shows you a plan of the four resources it intends to create and prompts for confirmation. Type `yes` to proceed. Once complete, the two output values are printed to the terminal — copy them before moving on.

There is no `terraform plan` step listed separately here because `terraform apply` always shows the plan and asks for confirmation before making any changes. Running `terraform plan` first is a good habit in larger workspaces, but in a workspace this small it adds no meaningful value.

> **Important:** Do not run `terraform destroy` in this directory at any point. The `prevent_destroy` lifecycle rule will block it, but more importantly, destroying the state bucket after other workspaces have started using it would orphan all of their state files.

## Conclusion

The bootstrap workspace is the smallest piece of this project but arguably the most consequential. Every other workspace — the organisation setup, the SCPs, the CloudTrail configuration, the IAM hardening — depends on the S3 bucket created here to store and lock its state. Getting this right means the rest of the project has a stable, versioned, encrypted, and private foundation to build on. The deliberate use of local state here is not a limitation; it is the correct architectural decision for infrastructure that must exist before remote state is possible. Once this apply is done and the outputs are noted, this directory can be left alone indefinitely.
