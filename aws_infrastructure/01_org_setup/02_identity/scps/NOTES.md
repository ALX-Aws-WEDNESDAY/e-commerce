# `02_identity/scps` — Notes

## Introduction

Once the organisation structure is in place and the backbone accounts are active, the next priority is locking down what those accounts are allowed to do. That is the sole purpose of this workspace. The `02_identity/scps` directory creates and attaches three Service Control Policies (SCPs) at the Organisation root, which means they apply automatically to every OU and every member account in the organisation without needing to be attached individually to each one.

SCPs are not IAM policies — they do not grant permissions. Instead, they define the maximum permissions boundary within which IAM policies in member accounts can operate. Even if an IAM user in a member account has `AdministratorAccess`, an SCP that denies a particular action will still block it. This makes SCPs the most powerful guardrail available in AWS Organizations, and it is why they are applied as early as possible in the project lifecycle.

It is also worth understanding one important AWS behaviour before reading further: **SCPs do not apply to the management account**. This is an AWS design decision — the management account is always outside the reach of SCPs, regardless of where they are attached. This means the three policies created here only constrain member accounts, which is exactly the intent. The management account is hardened separately in the `03_security/management_iam` workspace.

This workspace is also the first one that reads output values from another workspace's state file at runtime, using a `terraform_remote_state` data source to pull the organisation root ID from the `01_org` workspace rather than hard-coding it.

## Files in this directory

There are five Terraform files in this workspace. The order below follows the sequence in which Terraform depends on each file, from foundational declarations through to the resources themselves.

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

This file pins the Terraform CLI to version `1.10.0` or higher and requires the AWS provider at version `6.0`. You will notice that all along the provider constraint has been `~> 6.0` and not `>= 6.0`. The practical difference is that `>= 6.0` would allow a future `7.0` release to be used, whereas `~> 6.0` would not. For a workspace this focused — creating three SCPs and three attachments — the distinction is minor, but it is worth being aware of when reviewing version constraints across workspaces for consistency.

### 2. `variables.tf`

```go
variable "aws_region" {
  type    = string
  default = "af-south-1"
}

variable "state_bucket" {
  type    = string
  default = "ecommerce-tf-state-mgmt"
}

variable "allowed_regions" {
  type    = list(string)
  default = ["af-south-1"]
}
```

This workspace declares three variables. The `aws_region` and `state_bucket` variables serve the same purpose as in previous workspaces — they configure the provider region and point to the shared S3 state bucket. The third variable, `allowed_regions`, is specific to this workspace and is the most interesting of the three.

`allowed_regions` is a list of AWS region codes that member accounts are permitted to use. It defaults to `["af-south-1"]`, meaning only the Africa (Cape Town) region is allowed. This value is consumed directly by the `DenyNonAllowedRegions` SCP in `main.tf` as the condition value — if you ever need to expand the allowed regions (for example, to add a disaster recovery region), you update this list in `terraform.tfvars` and re-apply, and the SCP policy document updates automatically without any changes to the resource definition itself.

### 3. `backend.tf`

```go
terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt"
    key          = "scps/terraform.tfstate"
    region       = "af-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
```

The backend configuration follows the same pattern established in `01_org` — remote state in the shared S3 bucket, S3-native locking via `use_lockfile = true`, and encryption at rest. The key `scps/terraform.tfstate` gives this workspace its own isolated state file within the bucket, separate from the `org/terraform.tfstate` written by the previous workspace. SCPs are organisation-level resources and must always be managed from the management account, so this state file lives in the management account bucket permanently.

### 4. `provider.tf`

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

data "terraform_remote_state" "org" {
  backend = "s3"
  config = {
    bucket = var.state_bucket
    key    = "org/terraform.tfstate"
    region = var.aws_region
  }
}
```

The provider block is straightforward, but this file also contains something new: a `terraform_remote_state` data source. This data source reads the state file produced by the `01_org` workspace and makes all of its outputs available to this workspace at runtime. The specific value consumed from it is `data.terraform_remote_state.org.outputs.root_id`, which is the organisation root ID needed to attach each SCP at the root level.

This pattern is the correct way to share values between Terraform workspaces. The alternative — hard-coding the root ID as a variable — would mean manually copying a value that Terraform already knows, and it would break silently if the root ID ever changed. By reading it from state, this workspace always has the correct value regardless of when it runs.

### 5. `terraform.tfvars`

```go
aws_region      = "af-south-1"
state_bucket    = "ecommerce-tf-state-mgmt"
allowed_regions = ["af-south-1"]
```

The `terraform.tfvars` file for this workspace is minimal — three lines that confirm the region, the state bucket name, and the single allowed region. Unlike the `01_org` workspace, there are no gate variables here and no multi-pass apply sequence. This workspace is applied once and the SCPs take effect immediately upon attachment. If you need to expand the allowed regions in the future, this is the only file you need to edit before re-applying.

### 6. `main.tf`

This file contains all six resources in the workspace — three SCP policy documents and three policy attachments, one pair per SCP. Terraform creates the policy first and then the attachment, since the attachment depends on the policy's ID. A `locals` block at the top of the file extracts the root ID from the remote state data source so it does not need to be repeated in each attachment resource.

```go
locals {
  root_id = data.terraform_remote_state.org.outputs.root_id
}
```

#### SCP 1: DenyLeaveOrganization

```go
resource "aws_organizations_policy" "deny_leave_org" {
  name    = "DenyLeaveOrganization"
  type    = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "DenyLeaveOrganization"
      Effect   = "Deny"
      Action   = "organizations:LeaveOrganization"
      Resource = "*"
    }]
  })

  lifecycle { prevent_destroy = true }
}

resource "aws_organizations_policy_attachment" "deny_leave_org_root" {
  policy_id = aws_organizations_policy.deny_leave_org.id
  target_id = local.root_id

  lifecycle { prevent_destroy = true }
}
```

This is the simplest defined SCP out of the three SCPs. It denies the single action `organizations:LeaveOrganization` across all resources. Without this policy, any sufficiently privileged IAM principal in a member account could call this API and detach the account from the organisation entirely — removing it from the OU hierarchy, stripping it of all SCP guardrails, and making it an independent account outside your control. This SCP makes that impossible regardless of what IAM permissions exist inside the member account.

Both the policy and the attachment carry `prevent_destroy = true` in their lifecycle blocks. Removing the attachment would silently re-expose every member account to the risk of leaving the organisation, so the lifecycle protection ensures that cannot happen accidentally through a `terraform destroy` or a misconfigured plan.

#### SCP 2: DenyNonAllowedRegions

```go
resource "aws_organizations_policy" "deny_region" {
  name    = "DenyNonAllowedRegions"
  type    = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "DenyNonAllowedRegions"
      Effect = "Deny"
      NotAction = [
        "iam:*",
        "sts:*",
        "route53:*",
        "cloudfront:*",
        "budgets:*",
        # ... reduced for brevity
      ]
      Resource  = "*"
      Condition = {
        StringNotEquals = {
          "aws:RequestedRegion" = var.allowed_regions
        }
      }
    }]
  })

  lifecycle { prevent_destroy = true }
}

resource "aws_organizations_policy_attachment" "deny_region_root" {
  policy_id = aws_organizations_policy.deny_region.id
  target_id = local.root_id

  lifecycle { prevent_destroy = true }
}
```

This SCP restricts all member account activity to the regions listed in `var.allowed_regions`. The policy uses a `NotAction` approach rather than an `Action` approach, which is an important distinction. Instead of listing every service action that should be denied, it lists the actions that should be **exempted** from the denial — and denies everything else that falls outside the allowed regions. This is the correct pattern for a region restriction policy because it is impossible to enumerate every AWS service action, but it is entirely feasible to enumerate the global services that have no regional endpoint.

The `NotAction` exemption list covers services like IAM, STS, Route 53, CloudFront, and AWS Budgets — services that operate globally and do not have a concept of a region in their API calls. If these were not exempted, the SCP would block console sign-in (which uses STS), IAM role assumptions, and billing access, effectively breaking the account for all users. The `Condition` block uses `StringNotEquals` against `aws:RequestedRegion`, meaning the denial fires for any API call whose requested region is not in the `allowed_regions` list.

#### SCP 3: DenyRootUserActions

```go
resource "aws_organizations_policy" "deny_root_user" {
  name    = "DenyRootUserActions"
  type    = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "DenyRootUser"
      Effect   = "Deny"
      Action   = "*"
      Resource = "*"
      Condition = {
        StringLike = {
          "aws:PrincipalArn" = "arn:aws:iam::*:root"
        }
      }
    }]
  })

  lifecycle { prevent_destroy = true }
}

resource "aws_organizations_policy_attachment" "deny_root_user_root" {
  policy_id = aws_organizations_policy.deny_root_user.id
  target_id = local.root_id

  lifecycle { prevent_destroy = true }
}
```

This SCP denies all actions (`Action = "*"`) when the principal making the request matches the pattern `arn:aws:iam::*:root`. The wildcard `*` in the account ID position means the condition matches the root user of any member account, regardless of its account number. The effect is that root users in all member accounts are blocked from taking any action after signing in.

Two important nuances are worth understanding here. First, as noted in the introduction, SCPs do not apply to the management account — so the management account root user is completely unaffected by this policy. Second, this SCP blocks root user **actions** after authentication, but it does not block the password reset flow itself. AWS's sign-in service processes password resets before SCPs are evaluated, which means you can still set or reset root passwords for member accounts even after this SCP is attached. This is intentional — it preserves the break-glass option of using root credentials to recover a misconfigured account.

## Running this workspace

This workspace has no gate variables and no multi-pass apply sequence. It is applied once, after the `01_org` workspace has been successfully applied and all three backbone accounts are active.

Ensure your management account credentials are exported in the terminal, then run:

```bash
cd ../02_identity/scps/
terraform init
terraform plan
terraform apply
```

`terraform init` connects to the S3 backend and downloads the AWS provider. During initialisation, it also reads the `terraform_remote_state` data source configuration and verifies it can reach the `org/terraform.tfstate` file in the S3 bucket — if the `01_org` workspace has not been applied yet, `terraform init` will succeed but `terraform plan` will fail when it tries to read the remote state. `terraform plan` shows the six resources that will be created — three policies and three attachments. `terraform apply` creates them and the SCPs take effect immediately upon attachment at the organisation root.

To verify the SCPs are attached after apply, run the following command using your root ID from the `01_org` outputs:

```bash
aws organizations list-policies-for-target \
  --target-id <root-id> \
  --filter SERVICE_CONTROL_POLICY \
  --profile <your-profile>
```

You should see all three policies — `DenyLeaveOrganization`, `DenyNonAllowedRegions`, and `DenyRootUserActions` — listed in the response.

## Conclusion

The three SCPs created in this workspace form the non-negotiable floor of security for the entire organisation. They are not compensating controls or nice-to-haves — they are the baseline that makes every other security decision in the project meaningful. Without `DenyLeaveOrganization`, any compromised member account could escape the guardrails entirely. Without `DenyNonAllowedRegions`, a misconfigured or compromised account could spin up resources in any of the dozens of AWS regions, making cost control and audit coverage impossible. Without `DenyRootUserActions`, the root user in any member account remains a standing privilege escalation path that bypasses all IAM controls. Attaching all three at the organisation root, rather than at individual OUs, ensures there are no gaps — every account that joins the organisation inherits these guardrails automatically, including any future sandbox or workload accounts that have not been created yet.
