# CREATING AN AWS ORGANIZATION

## Introduction

<details>

<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', Courier, monospace; font-size: 0.750em;">

```txt
aws_infrastructure
└── 01_org_setup
  ├── 00_bootstrap                  # Run once to create the S3 state bucket
    │   ├── main.tf
    │   └── variables.tf
    ├── 01_org                      # AWS Organization, OUs, and backbone accounts
    │   ├── backend.tf
    │   ├── delegated_admins.tf
    │   ├── main.tf
    │   ├── outputs.tf
    │   ├── provider.tf
    │   ├── variables.tf
    │   └── versions.tf
    ├── 02_identity
    │   └── scps                    # Root-level SCPs
    │       ├── backend.tf
    │       ├── main.tf
    │       ├── provider.tf
    │       ├── variables.tf
    │       └── versions.tf
    ├── 03_security
    │   ├── 01_management_iam       # Management account IAM hardening
    │   │   ├── backend.tf
    │   │   ├── main.tf
    │   │   ├── provider.tf
    │   │   ├── variables.tf
    │   │   └── versions.tf
    │   ├── 02_cloudtrail           # Org-wide CloudTrail trail
    │   │   ├── backend.tf
    │   │   ├── main.tf
    │   │   ├── provider.tf
    │   │   ├── variables.tf
    │   │   └── versions.tf
    │   └── 03_github_oidc         # GitHub OpenID Connect
    │       ├── backend.tf
    │       ├── main.tf
    │       ├── outputs.tf
    │       ├── provider.tf
    │       ├── variables.tf
    │       └── versions.tf
    └── README.md
```

</details>

---

## Step 0: Prerequisites

This project uses `aws login` for authentication — not long-term access keys. This approach generates temporary credentials automatically refreshed for up to 12 hours, with no credentials stored on disk in plain text.

> ***Important:*** *The steps provided below assumes you have a paid AWS account. Using them in a free-tier account might require you to convert your free-tier account to paid account given that we'll be using AWS Organizations*

### 0a. Install requirements

- AWS CLI version **2.32.0 or higher** (required for `aws login`)
- Terraform **>= 1.10.0**
- Ensure that the IAM user running these commands is not root. To avoid bottleneck during the creation process, we can create an IAM user with **Administrator Access** on the management account. Better practices requires that this access should be limited to only required services and resources.

### 0b. Log in and configure credentials

Since we'll be using `aws login` command in the AWS CLI, we'll have to use a two-profile AWS configuration setup because Terraform and older AWS SDKs cannot consume `aws login` session credentials directly. We'll configure a `signin` profile for the browser login, then a `process` profile that Terraform uses to read those credentials on demand.

> **Note:** The names `signin` and `process` below are examples — use any names that make sense to you. Just be consistent between the config file and the export.

**Step 1 — Log in with your browser:**

```bash
aws login --profile signin
```

Follow the browser prompt and select your management account credentials with the `aws sts` command below:

```bash
aws sts get-caller-identity --profile signin
```

You should see your management user ID, account ID and the IAM user ARN (not root) as follows:

```json
{
    "UserId": "AIDA...",
    "Account": "12345...",
    "Arn": "arn:aws:iam::<your-account-id>:user/<your-iam-user-name>"
}
```

**Step 2 — Open your AWS config file:**

Now open your AWS config file with the command below (use `sudo` for elevated privilege if need be):

```bash
nano ~/.aws/config
```

This command opens a text editor with the profile created above under the `[profile signin]` block that looks like this:

```ini
[profile signin]
login_session = arn:aws:iam::<account-id>:user/<your-iam-user-name>
region = <your-region>
```

**Step 3 — Add the `process` profile directly below it:**

Now add the following profile below it changing the value of `region` to your preferred AWS region and then save and close the file.

<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', Courier, monospace; font-size: 0.85em;">
[profile process]
credential_process = aws configure export-credentials --profile signin --format process
region = &lt;your-region&gt;
</pre>

This `process` profile tells Terraform to call the AWS CLI to fetch fresh temporary credentials from your `signin` session whenever it needs them. Note that while this profile name can be your preferred choice, the value `process` provided to the `--format` in the `credential_process` argument has to remain as it is. This is because the `credential_process` mechanism expects credentials in a specific JSON format that AWS SDKs and Terraform understand. The `process` format produces exactly that structure. Using any other value — including your profile name will produce the following error:

> <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', Courier, monospace; font-size: 0.85em;">
> aws: [ERROR]: An error occurred (ParamValidation): argument --format: Found invalid choice '&lt;incorrect-value&gt;'
></pre>

**Important:** The `process` profile is not a login profile — it is a credential relay profile. If you attempt to log in directly using the following command:

```bash
aws login --profile process
```

You will get an error similar to this:

> <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', Courier, monospace; font-size: 0.85em;">
> aws: [ERROR]: An error occurred (Configuration): Profile 'process' is already configured with Credential Process credentials.
>You may run 'aws login --profile new-profile-name' to create
> a new profile with the specified name.
> </pre>

The `process` profile is only ever referenced in the `export AWS_PROFILE=process` statement — never used directly with `aws login`. Therefore, always use `aws login --profile signin` (your login profile) to authenticate.

**Session expiry:** The session is valid for up to 12 hours. Therefore, if you run any `aws` command and see the error below, your session has expired and you must log in again using your `signin` profile — not the `process` profile:

> <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', Courier, monospace; font-size: 0.85em;">
> aws: [ERROR]: Error when retrieving credentials from process:
> aws: [ERROR]: Your session has expired. Please reauthenticate using 'aws login'.
> </pre>

Both errors mean the same thing — your session has expired. The fix is the same in both cases: re-run `aws login --profile signin` and then try again.

**Step 4 — Load credentials into your terminal session:**

For workspaces that only use the default provider (such as `00_bootstrap` and `01_org`), exporting the process profile is sufficient:

```bash
export AWS_PROFILE=process
```

### 0c. Common credential errors

**Error: ExpiredToken**

<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', Courier, monospace; font-size: 0.85em;">
Error: validating provider credentials: retrieving caller identity from STS: operation error STS: GetCallerIdentity, https response error StatusCode: 403, RequestID: ..., api error ExpiredToken: The security token included in the request is expired
</pre>

This means the temporary credentials from your `aws login` session have expired. Sessions are valid for up to 12 hours. Fix: re-run `aws login --profile signin` and then try again. If the error persist use a new profile name when runing the `aws login` command. This will also mean that you adjust your `~/.aws/config` file accordingly.

**Error: No valid credential sources found**

```txt
Error: No valid credential sources found
```

This means Terraform could not find any credentials at all — the session was never loaded in the current terminal. Fix it by login in and exporting your profile.

**Error: Stale state lock (PreconditionFailed)**

<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', Courier, monospace; font-size: 0.85em;">
Error: Error acquiring the state lock

Error message: operation error S3: PutObject, https response error StatusCode: 412, api error PreconditionFailed: At least one of the pre-conditions you specified did not hold
Lock Info:
  ID:        &lt;lock-id&gt;
  Path:      ecommerce-tf-state-mgmt/&lt;workspace&gt;/terraform.tfstate
  Operation: OperationTypePlan
  Who:       &lt;user&gt;@&lt;machine&gt;
  ...
</pre>

This means a previous `terraform plan` or `terraform apply` was interrupted before it could release the lock file it wrote to S3. Terraform uses this lock to prevent two operators from writing state simultaneously. Fix: run the following command using the lock ID shown in the error output:

```bash
terraform force-unlock -force <lock-id>
```

Only run this if you are certain no other Terraform process is actively running against the same workspace. If another operator is mid-apply, force-unlocking would remove their protection and risk a corrupted state file.

### 0d. S3 permissions required

The creation of the state bucket requires that the IAM user has the following permissions on the state bucket.

| Action | Resource |
| --- | --- |
| `s3:ListBucket` | `arn:aws:s3:::ecommerce-tf-state-mgmt` |
| `s3:GetObject`, `s3:PutObject` | `arn:aws:s3:::ecommerce-tf-state-mgmt/org/terraform.tfstate` |
| `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` | `arn:aws:s3:::ecommerce-tf-state-mgmt/org/terraform.tfstate.tflock` |

These permission need to be in place on the IAM user or an attached IAM policy before running any Terraform commands in `org/`. Since in our case the IAM user has Administrator Access on the management account, these permissions are already covered. Therefore, this table will come in handy as a reference for least-privilege setups in future environments.

Note that the `.tflock` file requires `s3:DeleteObject` in addition to Get/Put because Terraform creates it at the start of a `plan` or `apply` and deletes it on completion. `s3:DeleteObject` is **not** required on the state file itself.

---

## Terraform File Isolation Strategy

The Terraform documentation recommends that infrastructure used *by* Terraform (the state bucket) should exist *outside* the infrastructure that Terraform manages. This creates a chicken-and-egg problem: you cannot store state in S3 before the S3 bucket exists, and you cannot use Terraform to create the bucket if Terraform has nowhere to store state yet.

The two-folder approach solves this cleanly:

- **`00_bootstrap/`** uses **local state** intentionally. It creates the single S3 bucket that everything else depends on. It is run once, manually, and never touched again.
- **`01_org/`** uses **remote state** in that S3 bucket. All real infrastructure lives here. This separation also means the state bucket itself can never be accidentally destroyed by a `terraform destroy` in `org/` — it is managed by a completely separate state file.

As the project grew beyond the initial two folders, the same isolation principle was extended to every workspace. Each of the five workspaces — `00_bootstrap`, `01_org`, `02_identity/scps`, `03_security/01_management_iam`, and `03_security/02_cloudtrail` — has its own state file stored under a unique key in the same S3 bucket. This means a `terraform destroy` in any one workspace can only affect the resources that workspace manages. No workspace can reach into another workspace's state. The full mapping of workspaces to state keys is in the S3 state file permissions table at the bottom of this
document.

## Step 1: Bootstrap (run once, ever)

To create the S3 state bucket, run the following commands:

```bash
cd 01_org_setup/00_bootstrap/
terraform init
terraform apply
```

Note the two output values as you will paste them into `org/backend.tf`:

- `state_bucket_name`
- `aws_region`

## Step 2: Populate org/backend.tf

Open `org/backend.tf` and replace the two placeholder values with the bootstrap outputs:

```go
bucket = "<state_bucket_name output>"
region = "<aws_region output>"
```

Leave `use_lockfile = true` and `encrypt = true` exactly as they are.

## Step 3: Edit org/terraform.tfvars

The repository ships with a file called `example.tfvars` as a placeholder — a safe, committed reference showing which values need to be set. Before running any commands in `org/`, rename it to `terraform.tfvars` with the command below:

```bash
mv example.tfvars terraform.tfvars
```

This file, `terraform.tfvars`, will contain your real email addresses and region, which should not be committed. You can then choose to remove `example.tfvars` or let it stay in your repository as the reference template.

With this done, open `terraform.tfvars` and set your `email_user`, `email_domain`, and `aws_region`.

Ensure these two values remain set to **false** at this stage:

```go
security_delegations_ready = false
idc_delegation_ready       = false
```

These gates must stay `false` until Steps 5 and 6 respectively. Setting either to `true` before their prerequisites are met will cause Terraform to attempt delegated administrator registration against services that are not yet configured — resulting in API errors. The gates are flipped to `true` only when you are explicitly instructed to do so in the steps below.

## Step 4: Creating org, OUs, and backbone accounts

Use the commands below to change into the `org` directory and initiate Terraform:

```bash
cd ../01_org/
terraform init
```

Before proceeding, confirm that `terraform.tfvars` has both gate variables set to `false` as noted in Step 3 because running `terraform apply` with either gate set to `true` at this stage will fail.

Now run the command:

```bash
terraform apply --auto-approve
```

If you get an error that the resources already exists, then proceed to following steps:

### 4a. Import the existing organization (if already in one)

Terraform's `aws_organizations_organization` resource calls `CreateOrganization` every time it is absent from state. If your AWS account is already a member of an organization, the API rejects this with:

<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', Courier, monospace; font-size: 0.85em;">
AlreadyInOrganizationException: The AWS account is already a member of an organization.
</pre>

The fix is to import the existing organization into Terraform state. But first, get both your root ID and your org ID — you need the **org ID** (`o-` prefix) for the import, not the root ID:

```bash
aws organizations list-roots \
  --profile process \
  --query 'Roots[0].Arn' \
  --output text
```

The output looks like this where the both the org and root ID are embedded in the ARN:

<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', Courier, monospace; font-size: 0.85em;">
arn:aws:organizations::953146140973:root/o-a97mb32jve/r-4upk
</pre>

Extract the org ID from the ARN (the segment starting with `o-`), then import:

```bash
terraform import \
  aws_organizations_organization.this o-a97mb32jve
```

### 4b. Import existing OUs (if already created)

If you have already created your OUs manually or in a previous run, Terraform will error with `DuplicateOrganizationalUnitException` for each one that already exists. List your existing OUs to get their IDs — use the root ID from the output above:

```bash
aws organizations list-organizational-units-for-parent \
  --parent-id r-4upk \
  --profile process
```

Then import each OU using the `ou-` ID from the output:

```bash
terraform import \
  aws_organizations_organizational_unit.security \
  ou-xxxx-xxxxxxxx

terraform import \
  aws_organizations_organizational_unit.infrastructure \
  ou-xxxx-xxxxxxxx

terraform import \
  aws_organizations_organizational_unit.sandbox \
  ou-xxxx-xxxxxxxx

terraform import \
  aws_organizations_organizational_unit.workloads \
  ou-xxxx-xxxxxxxx
```

### 4c. Apply

With these imported, run the following commands to see the intended build and then apply if satisfied:

```bash
terraform plan
terraform apply
```

This creates:

- The AWS Organization (all features mode)
- Four OUs: Security, Infrastructure, Sandbox, Workloads
- Three member accounts placed directly into their correct OUs

Account creation is asynchronous. Terraform waits automatically. If you get any error, fix the issue and proceed.

## Step 5: Enable security delegations

Verify all three accounts are ACTIVE:

```bash
aws organizations describe-account \
  --account-id <log-archive-id>

aws organizations describe-account \
  --account-id <security-tooling-id>

aws organizations describe-account \
  --account-id <shared-services-id>

```

Once all show `"Status": "ACTIVE"`, go to the `terraform.tfvars` file and change the value below from `false` to `true`:

```go
security_delegations_ready = true
```

## Step 6: Enable IAM Identity Center delegation

**This step requires a manual console action first.**

1. Sign into the management account console
2. Navigate to **IAM Identity Center**
3. Click **Enable** — you will be prompted to confirm the region where IAM Identity Center will be created. Read this carefully: AWS recommends creating your IdC instance in the region geographically closest to your workforce for lower latency. This is a one-time decision — IdC cannot be moved to a different region after it is enabled. Confirm you are in the correct region before proceeding (for this project: Africa (Cape Town) `af-south-1`).
4. Accept the prompt and wait for the service to finish enabling (< 2 minutes)

Then go to the `terraform.tfvars` file and change the value below from `false` to `true`:

```go
idc_delegation_ready = true
```

Then:

```bash
terraform apply
```

This will do two things:

1. Registers the security-tooling account as delegated admin for GuardDuty, Security Hub, and AWS Config.
2. Registers the shared-services account as the IAM Identity Center delegated administrator.

### How Member Account Access Works

When you created the three backbone accounts using Terraform, AWS Organizations automatically created a role named `OrganizationAccountAccessRole` in each of them. This role trusts the management account — meaning any IAM user or role in the management account with `sts:AssumeRole` permission can step into any member account as a full administrator.

There are two ways to use this:

- **Console:** Switch role in the browser (covered below)
- **Terraform:** The `assume_role` block in `provider.tf` (used by the CloudTrail workspace automatically — no manual steps needed there)

## Step 7: Apply Root-Level SCPs

Before diving deep into this step, let's highlight out something first. The three backbone accounts created previously by AWS Organizations have **no root user password set**. Luckily, you do not need a root password for day-to-day operations because the cross-account role is the primary access method. However, setting a root password now gives you a break-glass option if the cross-account role is ever misconfigured. Doing so involves manual console steps that cannot be automated.

### Setting Root Account Password

Repeat the following steps for each of the three accounts created so far:

1. Go to [https://signin.aws.amazon.com](https://signin.aws.amazon.com)
2. Choose **Root user**
3. Enter the account email address used when creating the account:
   - Log archive: `cloudops+ecommerce-log-archive@yourorg.com`
   - Security tooling: `cloudops+ecommerce-security-tooling@yourorg.com`
   - Shared services: `cloudops+ecommerce-shared-services@yourorg.com`
4. Click **Next**, then click **Forgot password?**
5. Complete the CAPTCHA — AWS sends a password reset link to that email address
6. Follow the link and set a strong password
7. Sign in with the new password
8. Immediately enable MFA on the root user:
   - Navigate to the account menu (top right) → **Security credentials**
   - Under **Multi-factor authentication (MFA)** → **Assign MFA device**
   - Follow the prompts to register a virtual MFA device
9. Sign out of the root user session

With this done, we can now look at the steps for creating and attaching root-level SCPs at the Organization root. For this, we have to navigate to the `02_identity/scps/` directory and ensure that we use the management account credentials.

Run the commands below to achieve this:

```bash
cd 02_identity/scps/
export AWS_PROFILE=process
```

> Ensure that you've logged in with your management IAM user credential to avoid session expiry error message.

Now let's run the following Terraform commands to initialize Terraform, check infrastructure and approve the infrastructure build if everything is okay:

```bash
terraform init
terraform plan
terraform apply
```

This will create and attach these three SCPs at the Organization root:

- **`DenyLeaveOrganization`** — no member account can detach from the org
- **`DenyNonAllowedRegions`** — all AWS service usage is locked to `af-south-1` (global services such as IAM, STS, CloudFront, and Route 53 are exempted)
- **`DenyRootUserActions`** — root user in any member account is blocked from taking any action.

Here are a few things to note about the `DenyRootUserActions` SCP:
    - SCPs do not apply to the management account, so the management account root user is not affected by this SCP.
    - While this SCP blocks root user actions inside member accounts **after sign-in**. It does not block the password reset flow itself given that AWS's sign-in service handles that before the SCP is evaluated. Therefore, you can safely set root passwords before or after this step.

### Verifying the Attached SCPs

To verify that the SCPs are attached run the command below:

```bash
aws organizations list-policies-for-target \
  --target-id r-xxxx \
  --filter SERVICE_CONTROL_POLICY \
  --profile process
```

> Replace `r-xxxx` with your root ID (visible in the `org/` workspace outputs).

## Step 8: Apply Management Account IAM Hardening

Now that we've attached the SCPs, let's implement the least privilege principle to the management's IAM user that we've been using .

> **Ensure that you read this section fully before running `terraform apply`.**

Navigate to the security workspace directory and ensure that you have the management account profile exported in your console:

```bash
cd ../../03_security/01_management_iam/
export AWS_PROFILE=process
```

This workspace:

- Implements two of the three security layers on the management account IAM user.
- Creates an IAM group `EcommerceCloudOpsAdmins` in the management account.
- Creates a policy `EcommerceAssumeBackboneAccounts` that allows `sts:AssumeRole` into `OrganizationAccountAccessRole` in all three backbone accounts
- Attaches that policy to the group
- Adds your IAM user to the group

### The 3-Layer Security

**Layer 1 — SCP `DenyRootUserActions`** (already applied in Step 7)
Blocks root user actions in all member accounts. The management account is not affected by SCPs by design.

**Layer 2 — Narrow operational policy (`EcommerceTerraformOps`)**
Replaces AdministratorAccess with only what the user needs to run Terraform. These include :

- `organizations:*`, `sts:AssumeRole` into the three backbone accounts,
- `s3:*` on the state bucket, and
- `iam:*` on itself only.

> The AWS documentation recommends granting `AssumeRole` to a group rather than directly to the user as it makes adding future CloudOps members straightforward without touching the policy itself. When new accounts are provisioned later (sandbox accounts, workload accounts), we'll have to add their `OrganizationAccountAccessRole` ARNs to the `assume_backbone_accounts` policy in `01_management_iam/main.tf` and run `terraform apply` again. The comment in that file marks exactly where to add them.

**Layer 3 — Explicit deny policy (`EcommerceDenyDestructiveOrgActions`)**
Regardless of any other policy grant, the following actions are permanently denied: `DeleteOrganization`, `DeleteOrganizationalUnit`, `CloseAccount`, `RemoveAccountFromOrganization`, and `DeleteBucket` on the state bucket. A deny always beats an allow — this is the safety net.

### Before Applying

Make sure you have an alternative way into the management account in case something goes wrong — the root user. In case you don't have a root user password for the management account, set it now following the same password reset flow described in Step 7. In this case, use the management account's root email address.

### Apply

Run the following commands to apply the changes:

> When you run the `terraform plan` command, ensure you read the diff carefully — verify only additions, no deletions

```bash
terraform init
terraform plan
terraform apply
```

### Remove AdministratorAccess First (console step)

Terraform can attach new policies but cannot remove an existing `AdministratorAccess` attachment that it did not create. Therefore, you have to detach it manually by following these steps:

1. Sign into the management account console as your IAM user
2. Navigate to **IAM → Users → `<your-admin-username>`**
3. Click the **Permissions** tab
4. Find `AdministratorAccess` → click **Remove**
5. Confirm removal

> **Do not close the console tab yet.** Keep the session open until you have confirmed Terraform applies successfully below.

### Verify

If you run the command below, you should see `EcommerceTerraformOps` and `EcommerceDenyDestructiveOrgActions` attached, `AdministratorAccess` absent, and the user listed as a member of `EcommerceCloudOpsAdmins`.

```bash
aws sts get-caller-identity --profile process

aws iam list-attached-user-policies \
  --user-name mid_projects_admin \
  --profile process

aws iam list-groups-for-user \
  --user-name mid_projects_admin \
  --profile process
```

## Step 9: Verify Console Role Switch into Member Accounts

Once the `01_management_iam` Terraform has been applied, verify that the console role switch works:

1. Sign into the management account console as your IAM user
2. Click your account name (top-right corner) → **Switch role**
3. Fill in the fields:
   - **Account ID:** paste the log archive account ID (run `terraform output log_archive_account_id` to get it)
   - **IAM role name:** `OrganizationAccountAccessRole`
   - **Display name:** `log-archive` (any label you find useful)
   - **Colour:** pick one to distinguish it visually from your management account
4. Click **Switch Role**

You are now operating inside the log archive account. The account name in the top-right corner will show your chosen display name. To return to the management account, click the display name → **Back to `<your-iam-user-name>`**.

Repeat for security tooling and shared services to confirm all three work.

## Step 10: Apply org-wide CloudTrail

Ensure that you are in the `03_security/02_cloudtrail` workspace directory and have the management account profile exported in your console:

```bash
cd ../02_cloudtrail/
export AWS_PROFILE=process
```

This workspace creates two resources:

- An S3 bucket **in the log archive account** that receives all trail logs. The bucket has versioning, AES256 encryption, public access blocked, and a 90-day lifecycle expiry to keep credit costs low.
- An **Organization-wide CloudTrail trail** in the management account that covers all regions and all member accounts automatically.

The trail uses a two-provider pattern:

- the default provider creates the trail in the management account;
- the `log_archive` provider assumes `OrganizationAccountAccessRole` in the log archive account to create the bucket there. This works because Step 8 already granted `sts:AssumeRole` for that account. Both resources are created in a single `terraform apply`.

```bash
terraform init
terraform plan
terraform apply
```

Verify the trail is active:

```bash
aws cloudtrail describe-trails \
  --include-shadow-trails \
  --profile process
```

You should see `"IsOrganizationTrail": true` and `"IsMultiRegionTrail": true` in the output.

---

## S3 state file permissions — summary

Each workspace has its own state file. The table below shows which state file lives where and what S3 permissions the management account IAM user needs.

After the `01_management_iam` workspace is applied (Step 8), the user's permissions are scoped to the state bucket only — `s3:*` on `ecommerce-tf-state-mgmt/*`. All state files below are covered by that single grant.

| Workspace | State key | Who runs it |
| --- | --- | --- |
| `00_bootstrap/` | local only | management account |
| `01_org/` | `org/terraform.tfstate` | management account |
| `02_identity/scps/` | `scps/terraform.tfstate` | management account |
| `03_security/01_management_iam/` | `01_management_iam/terraform.tfstate` | management account |
| `03_security/02_cloudtrail/` | `02_cloudtrail/terraform.tfstate` | management account |

The `.tflock` file for each workspace follows the same path with a `.tflock` suffix. `s3:DeleteObject` is required on lock files — already covered by `s3:*` in the narrow policy.

## CI/CD pipeline

The workspaces in this project are currently run manually from a local terminal. In a later phase, the same Terraform workspaces will be executed from a GitHub Actions pipeline so that infrastructure changes go through a review and approval process before being applied.

In that pipeline, the `aws login` browser flow is replaced entirely. GitHub acts as an identity provider using OpenID Connect (OIDC), and AWS issues short-lived temporary credentials automatically at the start of each pipeline run — no browser, no `aws-env.sh`, and no credentials stored in GitHub at all. The pipeline assumes a dedicated IAM role in the management account that has the same narrow permissions as the `EcommerceTerraformOps` policy used locally.

The `endpoints` and `sts_region` configuration already present in the aliased provider blocks of `01_management_iam/provider.tf` and `02_cloudtrail/provider.tf` applies in the pipeline exactly as it does locally. The pipeline runner is also outside `af-south-1`, so the same opt-in region STS routing fix is required there too — no changes to the Terraform files are needed when the pipeline is introduced.
