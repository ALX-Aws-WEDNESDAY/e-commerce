# `03_security/01_management_iam` — Notes

## Introduction

Up to this point, the management account IAM user running all these Terraform workspaces has had broad permissions — likely `AdministratorAccess` — because that was the simplest way to get everything provisioned without hitting permission errors. That was acceptable as a bootstrapping convenience, but leaving it in place permanently would mean the account used for day-to-day Terraform operations has the ability to delete the organisation, close member accounts, spin up arbitrary compute resources, and do essentially anything in the management account without restriction. That is a significant risk surface.

The `03_security/01_management_iam` workspace addresses this directly. Its purpose is to harden the management account IAM user by replacing the broad `AdministratorAccess` policy with a narrow, purpose-built set of permissions that covers exactly what is needed to run the Terraform workspaces in this project — nothing more. It also creates an IAM group for the CloudOps team and establishes the cross-account role access pattern that operators will use to work inside member accounts going forward.

This workspace is also the most consequential one to apply carelessly. Unlike the previous workspaces, which created new resources without touching anything that already existed, this one modifies the permissions of the IAM user that is actively running Terraform. Applying it without reading the plan carefully, or without having a fallback access method ready, could leave you locked out of the management account. The notes below call out exactly where those risks sit and what to do about them.

The security model implemented here is described as three layers, though only two of them are implemented in this workspace. Layer 1 — the `DenyRootUserActions` SCP — was already applied in the `02_identity/scps` workspace. Layers 2 and 3 are IAM policies created here.

## Files in this directory

There are five Terraform files in this workspace. As with previous workspaces, the order below follows the sequence in which Terraform logically depends on each file.

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

The version constraints `~> 6.0` pins the provider to the `6.x` release line and prevents a future major version from being picked up automatically, which is the safer and more consistent choice across workspaces.

### 2. `variables.tf`

```go
variable "aws_region"      { ... }
variable "state_bucket"    { ... }
variable "iam_user_name"   { ... }
variable "iam_group_name"  { ... }
```

This workspace introduces two variables that have not appeared before. The `iam_user_name` variable holds the name of the management account IAM user to be hardened — it has no default value, which means Terraform will error if it is not supplied in `terraform.tfvars`. This is intentional: the user name is specific to your environment and there is no safe generic default to fall back on. The `iam_group_name` variable names the IAM group that will be created for the CloudOps team, defaulting to `EcommerceCloudOpsAdmins`. Both values are consumed in `main.tf` to look up the existing IAM user and to name the new group.

### 3. `backend.tf`

```go
terraform {
  backend "s3" {
    bucket       = "ecommerce-tf-state-mgmt"
    key          = "management-iam/terraform.tfstate"
    region       = "af-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
```

The backend follows the same pattern as all previous workspaces — remote state in the shared S3 bucket with S3-native locking and encryption. The key `management-iam/terraform.tfstate` isolates this workspace's state from all others in the bucket. IAM resources in the management account can only be managed from the management account itself, so this state file will always live here.

### 4. `provider.tf`

This file is the most structurally interesting in the workspace because it configures two AWS providers rather than one, and it introduces two data sources that are used throughout `main.tf`.

```go
provider "aws" {
  region = var.aws_region

  default_tags {...}
}

provider "aws" {
  alias  = "log_archive"
  region = var.aws_region

  assume_role {
    role_arn = "arn:aws:iam::<account-id>:role/OrganizationAccountAccessRole"
  }

  sts_region = "us-east-1"

  endpoints {
    sts = "https://sts.amazonaws.com"
  }

  default_tags {...}
}

data "aws_caller_identity" "source" {}

data "terraform_remote_state" "org" {
  backend = "s3"
  config = {...}
}
```

The default provider operates in the management account and it is responsible for all the IAM policies, the IAM group, and the policy attachments that target the management account user. The aliased `log_archive` operates in the log archive account and it is responsible for creating the `OrganizationAccountAccessRole` trust policy and role in that account.

The reason a second provider is needed here is that the log archive account was created by AWS Organizations in the `01_org` workspace, but the `OrganizationAccountAccessRole` that AWS auto-creates in new member accounts needs to be explicitly managed by Terraform so that its trust policy is correct and its attachment to `AdministratorAccess` is tracked in state. Without managing it here, Terraform has no record of that role and cannot reason about it in future plans.

The `assume_role` block is the instruction that tells Terraform to call `sts:AssumeRole` on `OrganizationAccountAccessRole` in the log archive account using the management account credentials. Rather than hard-coding the management account ID, the trust policy is constructed as `arn:aws:iam::${data.aws_caller_identity.source.account_id}:root`, which will always be correct regardless of which account the Terraform operator is running from.

`sts_region = "us-east-1"` is required because `af-south-1` is an opt-in region and the Terraform AWS provider v6 defaults to the regional STS endpoint, which rejects cross-account `AssumeRole` calls. Setting `sts_region = "us-east-1"` tells the provider to use the global STS endpoint signed with `us-east-1` as the signing region, which is how the AWS CLI resolves this automatically and what the global endpoint expects.

The `endpoints { sts = "https://sts.amazonaws.com" }` block explicitly directs the `AssumeRole` call to the global endpoint URL. It is optional — `sts_region = "us-east-1"` alone is sufficient to make the call succeed because setting the signing region implicitly causes the provider to resolve the global endpoint. However, the reverse is not true: including `endpoints { sts = "https://sts.amazonaws.com" }` without `sts_region = "us-east-1"` will still fail because the call reaches the global endpoint but is signed with the wrong region. The `sts_region` argument is therefore the load-bearing fix — the `endpoints` block can be omitted, but `sts_region` cannot.

The `aws_caller_identity` data source resolves the management account ID dynamically at runtime. This is used to build the trust policy principal for the `OrganizationAccountAccessRole` in the log archive account.

The `terraform_remote_state` data source reads the `01_org` workspace outputs to obtain the account IDs for all three backbone accounts. These IDs are used in `main.tf` to build the `sts:AssumeRole` resource ARNs in the narrow operational policy.

### 5. `terraform.tfvars`

```go
aws_region     = "af-south-1"
state_bucket   = "ecommerce-tf-state-mgmt"
iam_user_name  = "mid_projects_admin"
iam_group_name = "EcommerceCloudOpsAdmins"
```

The only value here that is specific to your environment is `iam_user_name`. Replace `mid_projects_admin` with the actual username of the IAM user in your management account before running `terraform plan`. Getting this wrong would cause Terraform to look up a non-existent user and fail during the plan phase, which is a safe failure — but it is better to have it correct from the start.

### 6. `main.tf`

This is the largest and most consequential file in the workspace. It is organised into three logical sections: the cross-account role setup in the log archive account, the Layer 2 narrow operational policy, and the Layer 3 explicit deny policy. Below, each section is covered in the order Terraform will process it.

#### Locals

```go
locals {
  state_bucket_arn    = "arn:aws:s3:::${var.state_bucket}"
  org_account_id      = data.terraform_remote_state.org.outputs.master_account_id
  log_archive_id      = data.terraform_remote_state.org.outputs.log_archive_account_id
  security_tooling_id = data.terraform_remote_state.org.outputs.security_tooling_account_id
  shared_services_id  = data.terraform_remote_state.org.outputs.shared_services_account_id
}
```

The `locals` block assembles the values that are referenced repeatedly throughout the file. All four account IDs come from the `01_org` remote state, and the state bucket ARN is constructed from the variable rather than hard-coded. This means none of the resource definitions below contain any hard-coded account IDs or ARNs — they all reference these locals, which in turn reference live state.

#### Cross-account role in the log archive account

```go
data "aws_iam_policy_document" "assume_role" {
  provider = aws.log_archive
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.source.account_id}:root"]
    }
  }
}
```

The policy document defines the trust policy for the cross-account role. It uses `provider = aws.log_archive`, meaning this document is evaluated in the context of the log archive account. The trust policy grants `sts:AssumeRole` to the management account root principal specified as an ARN in the principals identifiers. Using `:root` here does not mean the literal root user — in AWS IAM, `:root` means any principal in that account that has been explicitly granted `sts:AssumeRole` permission. This is the standard trust pattern for cross-account access: the trust policy on the role opens the door from the member account side, and the `AssumeRoleInMemberAccounts` statement in `EcommerceTerraformOps` is what opens it from the management account side. Both must be in place for the assume role to succeed.

```go
resource "aws_iam_role" "org_account_access" {
  provider           = aws.log_archive
  name               = "OrganizationAccountAccessRole"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [name]
  }
}
```

A cross-account role is then created in the log archive account using `provider = aws.log_archive`. The role is named `OrganizationAccountAccessRole`, which is the same name AWS uses for the role it automatically creates in member accounts provisioned through Organizations. Using the same name keeps the behaviour consistent and predictable — any documentation or tooling that references this role name by convention will work without modification. The `prevent_destroy = true` lifecycle block ensures this role cannot be accidentally deleted, which is important because removing it would immediately break all Terraform cross-account operations targeting the log archive account. The `ignore_changes = [name]` is present because the AWS API does not return the role name in a way that Terraform can reliably read back after creation, which would otherwise cause a perpetual diff on every subsequent plan.

```go
resource "aws_iam_role_policy_attachment" "org_account_access_admin" {
  provider   = aws.log_archive
  role       = aws_iam_role.org_account_access.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

The policy attachement attaches `AdministratorAccess` to the role in the log archive account. This gives any principal that successfully assumes the role full administrative access to the log archive account, which is what the cloudtrail workspace needs — it creates an S3 bucket, applies a bucket policy, and configures lifecycle rules in that account, all of which require broad permissions. Attaching `AdministratorAccess` here follows the same pattern AWS uses for the auto-created `OrganizationAccountAccessRole` in member accounts, and it is appropriate at this stage because the only principals that can assume this role are those in the management account who already have `sts:AssumeRole` granted explicitly. As the project matures, this attachment can be replaced with a narrower custom policy scoped to only the S3 and KMS actions the cloudtrail workspace actually needs.

#### Data source: existing IAM user

```go
data "aws_iam_user" "admin" {
  user_name = var.iam_user_name
}
```

Rather than creating a new IAM user, this data source looks up the existing management account IAM user by name. This is the correct approach when Terraform needs to reference a resource it did not create — using a data source reads the resource's attributes from AWS without taking ownership of it. The user's ARN, retrieved from this data source, is used as the `Resource` target in several statements of the Layer 2 policy.

#### Layer 2: `EcommerceTerraformOps`

```go
resource "aws_iam_policy" "mgmt_terraform_ops" {
  name = "EcommerceTerraformOps"
  description = "..."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Sid = "OrganizationsManagement", Action = "...", ... },
      { Sid = "AssumeRoleInMemberAccounts", Action = "...", Resource = [...] },
      { Sid = "StateBucketAccess", Action = [...] },
      { Sid = "StateFileAccess", Action = [...] },
      { Sid = "StateLockFileAccess", Action = [...] },
      { Sid = "SelfUserManagement", Action = [...] },
      { Sid = "IAMPolicyManagement", ... },
      { Sid = "IAMGroupManagement", ... },
      { Sid = "IAMPolicyAttachment", ... },
      { Sid = "IAMGroupMembership", ... },
      { Sid = "IAMReadOnlyForDiscovery", ... },
      { Sid = "CloudTrailManagement", ... },
    ]
  })

  lifecycle { prevent_destroy = true }
}
```

This policy is the direct replacement for `AdministratorAccess`. Where `AdministratorAccess` is a single line — `Action: "*", Resource: "*"` — this policy is the opposite: every statement names the exact actions allowed and, wherever possible, the exact resource those actions apply to. The goal is that if these credentials are ever compromised, the blast radius is limited to what the policy explicitly permits. Here is a break down of the statements in the policy.

**`OrganizationsManagement`**:
Allows all `organizations:*` actions against all resources. This is the widest statement in the policy and it is intentionally so — the management account's primary job is to govern the organisation, and that requires the full Organizations API surface: creating OUs, moving accounts, enabling service access principals, registering delegated administrators, attaching and detaching SCPs, and reading the organisation tree. Scoping this to specific resources is not practical because Organizations resources (OUs, accounts, policies) are identified by IDs that are not known until they exist. Without this statement, every Terraform workspace that touches the organisation structure would fail. If you want to narrow this further after the infrastructure stabilises, replace `organizations:*` with an explicit list of only the actions your workspaces actually call — the CloudTrail logs for the management account will show you exactly which `organizations:` API calls Terraform makes, which is the right way to build that list.

**`AssumeRoleInMemberAccounts`**:
Allows `sts:AssumeRole` on the `OrganizationAccountAccessRole` in the three backbone accounts only — log archive, security tooling, and shared services. Each ARN is hardcoded by account ID, meaning the operator cannot assume roles in any other AWS account, including accounts outside the organisation. This explicit scoping is important because an unrestricted `sts:AssumeRole` on `"*"` would allow stepping into any role in any account that trusts this principal — a significant privilege escalation risk. Every time a new account is provisioned, its `OrganizationAccountAccessRole` ARN must be added to this list and the workspace re-applied. The comment in the source marks the exact line to add them.
Here is the corrected paragraph:

**`StateBucketAccess`**, **`StateFileAccess`**, and **`StateLockFileAccess`**:
Together, these three statements cover everything Terraform needs to manage remote state. This split is deliberate in order to apply the minimum necessary permissions to each resource path.

- The actions in `StateBucketAccess` statement include `s3:ListBucket` and `s3:GetBucketPolicy` which apply to the bucket ARN itself because listing and reading a bucket policy are bucket-level operations, not object-level ones.
- In the `StateFileAccess` statement, we have `s3:GetObject` and `s3:PutObject` which apply to `.tfstate` files — Terraform reads and writes state but never deletes it, so `s3:DeleteObject` is intentionally absent on this path.
- Finally in the actions in the `StateLockFileAccess` statement are `s3:GetObject`,`s3:PutObject`, and`s3:DeleteObject` which apply to `.tflock` files because Terraform creates the lock at the start of a `plan` or `apply` and deletes it on completion — the delete permission is required here and only here.

This separation means the operator cannot delete state files, cannot access objects outside the state bucket, and cannot perform any other S3 operations anywhere in the account.

**`SelfUserManagement`**:
Allows the operator to manage their own credentials — read their own user record, change their console password, and create, delete, list, and update their own access keys. The `Resource` is scoped to the operator's own ARN, so these actions cannot be performed on any other IAM user in the account. Without this statement, rotating access keys — a routine security task — would require temporary elevation to a broader policy every time. Note that this statement does not grant MFA management (`iam:CreateVirtualMFADevice`, `iam:EnableMFADevice`), which is intentional — MFA configuration should be performed through the console or a dedicated break-glass process, not through automated tooling.

**`IAMPolicyManagement`**
Allows creating, deleting, reading, and listing versions of IAM policies scoped to resources whose names start with `Ecommerce*`. This means the operator can manage only the policies that belong to this project. They cannot touch AWS-managed policies, policies created by other projects, or sensitive policies like `AdministratorAccess` itself. This scope prevents a common privilege escalation path where an operator creates a new overly-permissive policy and attaches it to themselves.

**`IAMGroupManagement`**:
Allows creating, deleting, reading, and updating IAM groups scoped to names starting with `Ecommerce*`. The operator can manage the groups created by this project but cannot touch any other group in the account, including any pre-existing administrator groups.

**`IAMPolicyAttachment`**
Allows attaching and detaching policies to users and groups, and creating and deleting policy versions — scoped to the operator's own ARN, `Ecommerce*` groups, and `Ecommerce*` policies. This is what allows Terraform to wire the policies to the group and the user in this workspace. The scope is important: the operator can only attach `Ecommerce*` policies to `Ecommerce*` groups or to themselves — they cannot attach `AdministratorAccess` or any other AWS-managed policy to themselves or anyone else, which closes the most direct privilege escalation path in any IAM setup.

**`IAMGroupMembership`**
Allows adding and removing users from groups scoped to the operator's own ARN and `Ecommerce*` groups. This is what allows Terraform to add the management user to `EcommerceCloudOpsAdmins`. The operator cannot add themselves or others to any group outside the `Ecommerce*` namespace, preventing lateral movement into existing privileged groups.

**`IAMReadOnlyForDiscovery`**
Allows read-only listing and describing of IAM users, roles, policies, groups, and group memberships across all resources (`Resource: "*"`). This is the widest resource scope in the IAM section and it exists because Terraform data sources — such as `data "aws_iam_user"` — need to call read APIs against ARNs that are not known in advance. The broad resource scope here is acceptable because all actions in this statement are read-only and carry no ability to modify anything. `iam:SimulatePrincipalPolicy` is included because it is useful for verifying that the deployed permissions behave as expected — it lets you test whether a given principal would be allowed or denied a particular action without actually performing it. It can be removed once the infrastructure is stable if you want to tighten further.

**`CloudTrailManagement`**
Allows creating, updating, deleting, starting, stopping, and reading CloudTrail trails. This statement is required because the `cloudtrail` workspace creates and manages the organisation-wide trail from the management account — without it, every Terraform command in that workspace would fail with `AccessDenied` after `AdministratorAccess` is removed. Since the trail name will fixed as `ecommerce-org-trail`, the account ID is known from `local.org_account_id`, and the region is fixed to `af-south-1`, the resource is scoped to an ARN which contain all these three components.

**Lifecycle: `prevent_destroy = true`** on the policy itself means Terraform will refuse to delete this policy even if `terraform destroy` is run in this workspace. Because this policy is the only thing granting the operator access to run Terraform at all, deleting it would lock the operator out of every workspace immediately. Removing the policy requires first deleting this lifecycle block, re-applying, and then destroying — a deliberate two-step process that makes accidental deletion impossible.

**Evolving this policy over time.** This policy is a starting point, not a permanent fixture, and it will need to change as the infrastructure grows. Two categories of change should be expected. The first is additions — each new Terraform workspace that runs in the management account will likely need actions that are not yet covered here. The pattern to follow is: run `terraform plan` in the new workspace, read the first `AccessDenied` error, identify the missing action, add it to the appropriate statement here with the tightest resource scope that still works, re-apply this workspace, then retry the other workspace. Repeating this process keeps the policy honest — you only add what you actually need. The second category is restrictions — once the set of workspaces is stable, the remaining `"*"` resource scopes (`OrganizationsManagement`, `IAMReadOnlyForDiscovery`) can be reviewed. For `OrganizationsManagement`, the CloudTrail logs will show exactly which API calls Terraform makes and you can replace the wildcard action with an explicit list. For `IAMReadOnlyForDiscovery`, the broad resource scope is harder to avoid because data sources resolve ARNs dynamically, but the actions are all read-only so the risk is low. Treat any change to this policy as a deliberate infrastructure change — run `terraform plan`, review the diff, and apply only when the changes match your intent.

#### Layer 3: `EcommerceDenyDestructiveOrgActions`

```go
resource "aws_iam_policy" "mgmt_deny_destructive" {
  name = "EcommerceDenyDestructiveOrgActions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyOrgDeletion"
        Effect = "Deny"
        Action = [
          "organizations:DeleteOrganization",
          "organizations:DeleteOrganizationalUnit",
          "organizations:CloseAccount",
          "organizations:RemoveAccountFromOrganization"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyStateBucketDeletion"
        Effect = "Deny"
        Action = ["s3:DeleteBucket", "s3:DeleteBucketPolicy"]
        Resource = local.state_bucket_arn
      }
    ]
  })

  lifecycle { prevent_destroy = true }
}
```

Layer 3 is an explicit deny policy, and the distinction between an explicit deny and the absence of an allow is critical to understand. The Layer 2 policy grants `organizations:*`, which technically includes `organizations:DeleteOrganization`. Layer 3 explicitly denies the most destructive subset of those actions. In AWS IAM, an explicit deny always overrides any allow — so even if Layer 2 is accidentally widened in the future to grant broader permissions, the Layer 3 deny will still block these specific actions. This is the safety net that makes the permission model resilient to future mistakes.

The `DenyStateBucketDeletion` statement adds a second line of defence for the state bucket, complementing the `prevent_destroy = true` lifecycle rule in `00_bootstrap`. The lifecycle rule prevents Terraform itself from deleting the bucket, while this IAM deny prevents the management account user from deleting it through the AWS CLI or console, regardless of what other policies might allow.

#### Policy attachments and IAM group

```go
resource "aws_iam_user_policy_attachment" "terraform_ops"    { ... }
resource "aws_iam_user_policy_attachment" "deny_destructive" { ... }

resource "aws_iam_group" "cloudops_admins" {
  name = var.iam_group_name
}

resource "aws_iam_policy" "assume_backbone_accounts"              { ... }
resource "aws_iam_group_policy_attachment" "cloudops_assume_backbone"   { ... }
resource "aws_iam_group_policy_attachment" "cloudops_signin_local_dev"  { ... }
resource "aws_iam_user_group_membership" "admin_cloudops"               { ... }
```

Both Layer 2 and Layer 3 policies are attached directly to the management account IAM user via `aws_iam_user_policy_attachment`. These attachments take effect immediately upon apply.

The IAM group `EcommerceCloudOpsAdmins` is created as the long-term home for cross-account access permissions. The `EcommerceAssumeBackboneAccounts` policy — which grants `sts:AssumeRole` into `OrganizationAccountAccessRole` in all three backbone accounts — is attached to the group rather than directly to the user. This follows the AWS recommendation of granting role assumption permissions at the group level, making it straightforward to add future CloudOps team members without touching the policy itself. The `SignInLocalDevelopmentAccess` managed policy is also attached to the group, allowing all group members to use `aws login` for CLI authentication. Finally, the existing admin user is added to the group via `aws_iam_user_group_membership`, giving them immediate cross-account access through the group policy.

## Running this workspace

> **Before running `terraform apply`, ensure you have an alternative way into the management account — specifically, the root user credentials and MFA. Once this workspace is applied, the IAM user's permissions are immediately restricted. If something goes wrong, root access is your recovery path.**

With that in mind, navigate to the workspace directory and ensure your management account credentials are active:

```bash
cd 03_security/01_management_iam/
terraform init
terraform plan
```

Read the plan output carefully before proceeding. You should see only additions — new policies, a new group, new attachments, and a new group membership. There should be no deletions or replacements of existing resources. If you see anything unexpected, stop and investigate before applying.

Once satisfied with the plan, apply:

```bash
terraform apply
```

### Remove AdministratorAccess manually after apply

Terraform can attach new policies but cannot remove the existing `AdministratorAccess` attachment that it did not create. After `terraform apply` completes successfully, you must detach it manually through the console:

1. Sign into the management account console as your IAM user
2. Navigate to **IAM → Users → `<your-iam-username>`**
3. Click the **Permissions** tab
4. Find `AdministratorAccess` → click **Remove**
5. Confirm the removal

Do not close the console session until you have verified the commands below succeed, confirming the new policies are in place and the user can still operate normally.

### Verify

```bash
aws sts get-caller-identity --profile <your-profile>

aws iam list-attached-user-policies \
  --user-name <your-iam-username> \
  --profile <your-profile>

aws iam list-groups-for-user \
  --user-name <your-iam-username> \
  --profile <your-profile>
```

The first command confirms your credentials are still valid. The second should show `EcommerceTerraformOps` and `EcommerceDenyDestructiveOrgActions` attached, with `AdministratorAccess` absent. The third should show the user as a member of `EcommerceCloudOpsAdmins`.

## Conclusion

This workspace marks the point at which the management account transitions from a broadly permissive bootstrapping state into a properly hardened operational state. The IAM user that runs Terraform now has exactly the permissions needed to manage this project's infrastructure — no more, no less. The three-layer model is deliberate: the SCP from the previous workspace blocks root user actions in member accounts, the narrow operational policy replaces the broad grant with scoped allows, and the explicit deny policy acts as a permanent safety net that no future policy change can override. The IAM group pattern ensures that as the CloudOps team grows, new members can be granted the same access by simply adding them to the group rather than duplicating policy attachments. Together, these controls mean the management account is no longer a single point of unlimited access — it is a tightly scoped operator account that can manage the organisation without being able to accidentally destroy it.
