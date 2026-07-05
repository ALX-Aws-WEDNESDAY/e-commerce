# Infrastructure Integration Guide

This document explains how the e-commerce application consumes AWS infrastructure
provisioned by the [`aws-org-infra`](https://github.com/ALX-Aws-WEDNESDAY/aws-org-infra)
repository.

## Architecture

All AWS infrastructure (Organization structure, accounts, IAM roles, networking,
security controls) is managed in the standalone `aws-org-infra` repository. This
e-commerce repo is a **pure application repository** — it contains no Terraform
code and does not manage any AWS resources directly.

Org-level outputs (account IDs, role ARNs, etc.) are published to **AWS Systems
Manager Parameter Store** by the `05_ssm_outputs` workspace in `aws-org-infra`.

## SSM Parameter Store Convention

All org-level parameters follow the path hierarchy:

```
/org/<category>/<resource>
/org/projects/<project-name>/<resource>
```

### Available Parameters

| Parameter Path                         | Description                              |
|----------------------------------------|------------------------------------------|
| `/org/accounts/management`             | Management account ID                    |
| `/org/accounts/log-archive`            | Log Archive account ID                   |
| `/org/accounts/security-tooling`       | Security Tooling account ID              |
| `/org/accounts/shared-services`        | Shared Services account ID               |
| `/org/organization/org-id`             | AWS Organizations ID                     |
| `/org/organization/root-id`            | Organizations root ID                    |
| `/org/roles/github-actions-oidc-arn`   | GitHub Actions OIDC IAM role ARN         |
| `/org/roles/org-account-access`        | Cross-account access role name           |

### Project-Specific Parameters (Future)

When project-specific resources are provisioned (ECS clusters, RDS endpoints,
VPC IDs), they will appear under:

```
/org/projects/e-commerce/<resource-name>
```

## Reading Parameters

### AWS CLI

```bash
# Single parameter
aws ssm get-parameter --name "/org/accounts/management" --query "Parameter.Value" --output text

# All parameters under a path
aws ssm get-parameters-by-path --path "/org/accounts" --query "Parameters[*].[Name,Value]" --output table
```

### Terraform (if app-level IaC is ever needed)

```hcl
data "aws_ssm_parameter" "management_account_id" {
  name = "/org/accounts/management"
}

# Use the value
locals {
  management_account_id = data.aws_ssm_parameter.management_account_id.value
}
```

### Python (boto3)

```python
import boto3

ssm = boto3.client("ssm", region_name="af-south-1")

response = ssm.get_parameter(Name="/org/accounts/management")
account_id = response["Parameter"]["Value"]
```

### In CI/CD (GitHub Actions)

```yaml
- name: Get management account ID
  run: |
    MGMT_ACCOUNT=$(aws ssm get-parameter \
      --name "/org/accounts/management" \
      --query "Parameter.Value" \
      --output text)
    echo "MGMT_ACCOUNT_ID=$MGMT_ACCOUNT" >> $GITHUB_ENV
```

## Requesting New Infrastructure

If the e-commerce application requires new AWS resources (a new ECS cluster,
RDS instance, S3 bucket, etc.):

1. Open an issue or PR in the `aws-org-infra` repository
2. The `org-admins` team provisions the resource via a new Terraform workspace
3. Relevant outputs are published to SSM under `/org/projects/e-commerce/`
4. This application consumes the output via one of the methods above

**Do not add `.tf` files to this repository.** All infrastructure is centrally
managed in `aws-org-infra`.
