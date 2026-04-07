# `01_org` — Notes

## Introduction

With the S3 state bucket in place from the bootstrap step, this workspace is where the real infrastructure begins. The `01_org` directory is the central workspace of the entire project — it creates the AWS Organization itself, carves it into Organizational Units (OUs), provisions the three backbone member accounts, and registers delegated administrators for key AWS security services. Everything that comes after this workspace — the SCPs, the CloudTrail trail, the IAM hardening — depends on the IDs and account numbers that this workspace produces.

Unlike `00_bootstrap`, this workspace uses **remote state**, meaning Terraform stores its state file in the S3 bucket created in the previous step. It also introduces a `terraform.tfvars` file for the first time, which is where you supply your real email addresses and control two important feature gates that determine whether delegated administrator registrations are attempted.

This workspace is also the first one where the order of `terraform apply` runs matters in a non-trivial way. The organisation, OUs, and accounts must exist and be in an `ACTIVE` state before delegated administrators can be registered. The two **gate variables** (`security_delegations_ready` and `idc_delegation_ready`) enforce this sequencing directly in code.

## Files in this directory

There are seven Terraform files in this workspace. The order below reflects the sequence in which Terraform logically depends on each file, starting from the foundational declarations and ending with the outputs that downstream workspaces consume.

### 1. `versions.tf`

```go
terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
```

This file declares the minimum Terraform CLI version and pins the AWS provider to the `6.x` release line, identical to the constraints used in `00_bootstrap`. Keeping these consistent across workspaces ensures that both workspaces behave the same way regardless of which Terraform version is installed on the machine running them. The `~> 6.0` constraint allows patch and minor updates within the `6.x` series but blocks a future `7.0` release from being used automatically.

### 2. `variables.tf`

This file declares all input variables for the workspace. It is read before any resource is evaluated, so it is the natural starting point for understanding what values the workspace expects.

```go
variable "aws_region" { ... }
variable "project"    { ... }
variable "owner"      { ... }
variable "email_user"   { ... }
variable "email_domain" { ... }
variable "org_access_role_name" { ... }
variable "deletion_protection"  { ... }
```

The `email_user` and `email_domain` variables are worth highlighting specifically. AWS Organizations requires a **unique email address** for every member account — no two accounts in the world can share the same email. Rather than hard-coding full addresses, the workspace splits the email into two reusable parts: the mailbox name (the part before the `+`) and the domain. The per-account alias (e.g. `ecommerce-log-archive`) is then assembled in `main.tf` using string interpolation, meaning only the alias changes per account while the user and domain stay constant. This keeps the variable surface area small and the email pattern consistent.

The `org_access_role_name` variable defaults to `OrganizationAccountAccessRole`, which is the IAM role that AWS Organizations automatically creates in every new member account. This role trusts the management account, allowing any IAM principal in the management account with `sts:AssumeRole` permission to step into any member account as a full administrator. The variable exists so the name can be overridden if your organisation uses a different convention, though the default is the AWS standard.

### 3. `backend.tf`

```go
terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt"
    key          = "org/terraform.tfstate"
    region       = "af-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
```

This file tells Terraform to store the state for this workspace in the S3 bucket created by `00_bootstrap`. The `key` argument sets the logical path within the bucket — `org/terraform.tfstate` — which keeps this workspace's state file separate from every other workspace that uses the same bucket. Each workspace in the project uses a different key, so they all share one bucket without ever overwriting each other's state.

The `use_lockfile = true` argument enables S3-native state locking. When Terraform starts a `plan` or `apply`, it writes a `.tflock` file to S3 at the same path as the state file. Any concurrent Terraform run that finds that lock file will wait or fail rather than proceeding, preventing two operators from modifying the same state simultaneously. This replaces the older DynamoDB-based locking approach, which the Terraform documentation now marks as deprecated.

The `encrypt = true` argument ensures that both the state file and the lock file are encrypted at rest using the bucket's default AES-256 encryption configured in `00_bootstrap`.

> **Important:** Credentials must never be placed in this file. Terraform reads AWS credentials from the environment — either via `export AWS_PROFILE=<your-profile>` or via `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables. The backend block is committed to version control, so embedding credentials here would expose them.

### 4. `provider.tf`

```go
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      "account:project"    = var.project
      "account:owner"      = var.owner
      "account:managed-by" = "terraform"
    }
  }
}
```

The provider block configures the AWS provider for this workspace. Unlike the bootstrap provider, which used string literals for the default tags, this provider references `var.project` and `var.owner` directly — meaning the tag values are driven by `terraform.tfvars` rather than being hard-coded. This makes the tags consistent with whatever values you supply for those variables, and it means changing the project name or owner in one place updates the tags on every resource automatically.

### 5. `terraform.tfvars` and `example.tfvars`

The `example.tfvars` file is the committed reference template that ships with the repository. It contains placeholder values and both gate variables set to `false`, which is the safe default for a first apply. Before running any Terraform commands in this workspace, you rename it to `terraform.tfvars` and fill in your real values:

```go
email_user   = "your-mailbox-name"
email_domain = "yourorg.com"

security_delegations_ready = false
idc_delegation_ready       = false
```

The `terraform.tfvars` file is listed in `.gitignore` because it contains real email addresses. The `example.tfvars` file stays in the repository as the safe, shareable template. The two gate variables at the bottom of the file are the mechanism that controls whether `delegated_admins.tf` creates any resources — they must both remain `false` on the first apply and are only flipped to `true` at specific later steps described below.

### 6. `main.tf`

This is the largest file in the workspace and contains the organisation itself, the four OUs, and the three backbone member accounts. Terraform creates these resources in dependency order, so the organisation must exist before OUs can be created, and OUs must exist before accounts can be placed into them.

#### The Organisation

```go
resource "aws_organizations_organization" "this" {
  feature_set = "ALL"

  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    # ... reduced for brevity
  ]

  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
    "TAG_POLICY",
    # ... reduced for brevity
  ]

  lifecycle {
    prevent_destroy = true
  }
}
```

Setting `feature_set = "ALL"` is the most consequential decision in this block. An organisation created with `"ALL"` features enabled supports Service Control Policies, tag policies, backup policies, and trusted-access integrations with services like GuardDuty, Security Hub, and Config. An organisation created with only `"CONSOLIDATED_BILLING"` features cannot use any of these — and once created, you cannot upgrade it without disbanding and recreating the organisation. The `aws_service_access_principals` list pre-authorises the listed AWS services to operate across all accounts in the organisation, which is a prerequisite for services like CloudTrail and GuardDuty to function in organisation-wide mode. The `enabled_policy_types` list activates the policy frameworks that SCPs and tag policies rely on.

#### The four OUs

```go
locals {
  root_id = aws_organizations_organization.this.roots[0].id
}

resource "aws_organizations_organizational_unit" "security"       { ... }
resource "aws_organizations_organizational_unit" "infrastructure" { ... }
resource "aws_organizations_organizational_unit" "sandbox"        { ... }
resource "aws_organizations_organizational_unit" "workloads"      { ... }
```

A `locals` block extracts the organisation root ID from the organisation resource so it does not need to be repeated in every OU's `parent_id` argument. All four OUs are direct children of the root, meaning they sit at the top level of the OU hierarchy. Each OU carries a set of tags that describe its purpose, SCP tier, and data classification — these tags are informational at this stage but become meaningful when SCPs and cost allocation policies are applied later.

The Security OU is tagged `scp-tier: strict` and `data-classification: restricted` because it will hold the log archive and security tooling accounts, which must be the most tightly controlled accounts in the organisation. The Workloads OU is tagged `scp-tier: moderate` and carries deployment-related tags (`deployment-model`, `deployment-strategy`, `stages`) that describe how application workloads will be promoted through dev, staging, and production environments.

#### The three backbone accounts

```go
locals {
  email = {
    log_archive      = "${var.email_user}+ecommerce-log-archive@${var.email_domain}"
    security_tooling = "${var.email_user}+ecommerce-security-tooling@${var.email_domain}"
    shared_services  = "${var.email_user}+ecommerce-shared-services@${var.email_domain}"
  }
}

resource "aws_organizations_account" "log_archive"      { ... }
resource "aws_organizations_account" "security_tooling" { ... }
resource "aws_organizations_account" "shared_services"  { ... }
```

The `locals` block assembles the full email address for each account by combining the `email_user` variable, a fixed alias, and the `email_domain` variable. This means the only thing that changes between accounts is the alias string in the middle — the mailbox and domain come from `terraform.tfvars`.

All three accounts set `iam_user_access_to_billing = "DENY"`, which prevents IAM users in those accounts from viewing billing information. Billing visibility is reserved for the management account root user and any IAM principal that has been explicitly granted it — keeping member accounts lean and reducing the blast radius if a member account credential is ever compromised.

Each account's `parent_id` is set to the appropriate OU ID, which places the account directly into the correct OU at creation time. Without this, AWS would place new accounts under the root and require a manual move.

The `lifecycle` block on each account includes two directives. `prevent_destroy = true` blocks accidental deletion. `ignore_changes = [role_name]` is a practical workaround for an AWS API limitation: the `role_name` attribute cannot be read back from the API after the account is created, which would cause Terraform to perpetually detect a diff and attempt to update it on every plan. Ignoring it suppresses that false positive.

### 7. `delegated_admins.tf`

This file registers delegated administrators for five AWS services across two accounts. It is gated by two boolean variables so that it cannot create any resources until the prerequisites for each delegation are met.

```go
variable "security_delegations_ready" {
  type    = bool
  default = false
}

variable "idc_delegation_ready" {
  type    = bool
  default = false
}
```

The `count` meta-argument on each resource is set to `var.security_delegations_ready ? 1 : 0` or `var.idc_delegation_ready ? 1 : 0`. When the variable is `false`, `count = 0` means Terraform creates zero instances of that resource — it is effectively skipped. When the variable is flipped to `true`, `count = 1` tells Terraform to create exactly one instance.

The security-tooling delegations (GuardDuty, Security Hub, Config, and Config multiaccountsetup) can be enabled as soon as the three backbone accounts reach `ACTIVE` status. The IAM Identity Center delegation requires an additional manual step — IAM Identity Center must be enabled in the management account console before the delegation can be registered, because the service must exist before it can accept a delegated administrator. Attempting to register a delegated admin for a service that has not been enabled results in an API error, which is exactly what the `idc_delegation_ready` gate prevents.

### 8. `outputs.tf`

```go
output "org_id"              { ... }
output "root_id"             { ... }
output "master_account_id"   { ... }
output "security_ou_id"      { ... }
output "infrastructure_ou_id"{ ... }
output "sandbox_ou_id"       { ... }
output "workloads_ou_id"     { ... }
output "log_archive_account_id"      { ... }
output "security_tooling_account_id" { ... }
output "shared_services_account_id"  { ... }
output "backbone_account_ids"        { ... }
```

The outputs file is the published contract between this workspace and every downstream workspace. Rather than hard-coding account IDs and OU IDs in the SCPs, CloudTrail, or IAM workspaces, those workspaces read these values at runtime using a `terraform_remote_state` data source pointed at `org/terraform.tfstate` in the S3 bucket. This means if an account ID ever changes — for example, if an account is closed and recreated — updating it in one place (this workspace's state) automatically propagates to all consumers without any manual edits.

The `backbone_account_ids` output is a convenience map that groups all three account IDs under a single output, useful for any downstream module that needs to iterate over all backbone accounts rather than reference them individually.

## Running this workspace

This workspace is applied in up to three separate passes, each corresponding to a gate being opened. The commands are the same each time — only the values in `terraform.tfvars` change between passes.

**First pass — organisation, OUs, and accounts:**

Before running anything, ensure `terraform.tfvars` has both gate variables set to `false`:

```go
security_delegations_ready = false
idc_delegation_ready       = false
```

Then initialise and apply:

```bash
cd ../01_org/
terraform init
terraform plan
terraform apply
```

`terraform init` connects to the S3 backend for the first time and downloads the AWS provider. `terraform plan` shows the full set of resources that will be created — read this carefully before proceeding. `terraform apply` creates the organisation, four OUs, and three member accounts. Account creation is asynchronous; Terraform waits automatically for each account to become active before moving on.

**Second pass — security delegations:**

Verify with if all three accounts show `"Status": "ACTIVE"` using the command below:

```bash
aws organizations describe-account --account-id <id>
```

If that's the case, open `terraform.tfvars` and flip the first gate:

```go
security_delegations_ready = true
```

Then apply again:

```bash
terraform apply
```

This registers the security-tooling account as the delegated administrator for GuardDuty, Security Hub, AWS Config, and Config multiaccountsetup.

**Third pass — IAM Identity Center delegation:**

After manually enabling IAM Identity Center in the management account console, open `terraform.tfvars` and flip the second gate:

```go
idc_delegation_ready = true
```

Then apply one final time:

```bash
terraform apply
```

This registers the shared-services account as the delegated administrator for IAM Identity Center (`sso.amazonaws.com`).

## Conclusion

The `01_org` workspace does more than create an AWS Organization — it establishes the structural and operational foundation that every other workspace in this project builds on. The OU hierarchy defines the security boundaries and policy inheritance paths. The backbone accounts separate concerns cleanly: logs go to one account, security tooling runs in another, and shared services live in a third, each isolated from the others by account boundaries. The delegated administrator registrations hand off operational control of security services to the security-tooling account, which is the correct long-term home for those services rather than the management account. The outputs file ensures that none of the IDs produced here ever need to be copied and pasted manually — downstream workspaces read them directly from state, keeping the entire project self-consistent as it grows.
