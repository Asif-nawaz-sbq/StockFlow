# Infrastructure

Terraform for StockFlow on AWS. Region `eu-central-1`, account `156275709542`.

Credentials come from the `CTDeploy2` profile (IAM user `stockflow-admin`, not
the account root). The environment stacks carry **no `profile` argument** — set
it in the environment instead, so the same configuration works unchanged in CI
where credentials come from an assumed role and no named profile exists:

```bash
export AWS_PROFILE=CTDeploy2
```

```
bootstrap/              state bucket                       (local state, then migrated)
modules/
  vpc/                  VPC, subnets, NAT, S3 gateway endpoint
  ecr/                  container registries + lifecycle policies
  iam/                  GitHub OIDC provider + three CI roles
  alb/                  load balancer, target groups, task security group
  rds/                  PostgreSQL, parameter group, alarms
  redis/                ElastiCache replication group, AUTH token
  ecs/                  cluster, task definitions, services, autoscaling
  waf/                  web ACL, managed rules, rate limiting
environments/
  staging/              10.20.0.0/16   state key staging/terraform.tfstate
  production/           10.30.0.0/16   state key production/terraform.tfstate
```

State locking is the **S3-native lock file** (`use_lockfile`, Terraform 1.10+),
not a DynamoDB table. The lock is an object written next to the state, so the
bucket permissions that cover state also cover the lock. `dynamodb_table` has
been deprecated since 1.11 and warns on `init`.

## Order of operations

The backend has to exist before anything can use it, so bootstrap runs once
with local state and is then migrated into the bucket it just created.

```bash
cd bootstrap
terraform init
terraform apply                       # 7 resources, all free

# Point bootstrap at its own bucket and move the state in:
cat > backend.tf <<'HCL'
terraform {
  backend "s3" {
    bucket       = "stockflow-tfstate-156275709542"
    key          = "bootstrap/terraform.tfstate"
    region       = "eu-central-1"
    profile      = "CTDeploy2"
    use_lockfile = true
    encrypt      = true
  }
}
HCL
terraform init -migrate-state
```

Then each environment:

```bash
export AWS_PROFILE=CTDeploy2
cd ../environments/staging
terraform init
terraform plan
terraform apply
```

Defaults in `variables.tf` already describe the free layer, so a plain `plan`
is correct. Pass `-var-file=staging.tfvars` once you have copied the example
and started changing sizing or turning on the paid layer.

## What costs money

The environments are split into a free layer and a billable one, gated by a
single variable. `deploy_application = false` is the default, and with it an
apply creates only the free half.

| Layer | Resources | Cost | Gate |
|---|---|---|---|
| State | S3 bucket | pennies | always |
| Network | VPC, subnets, route tables, IGW, S3 endpoint | free | always |
| Registry | ECR repositories | free (storage per GB) | always |
| Identity | IAM roles, OIDC provider | free | always |
| **NAT** | NAT gateway + EIP | **~EUR 32/mo each** | `enable_nat_gateway` |
| **Edge** | ALB, WAF web ACL | **~EUR 18 + ~EUR 6/mo** | `deploy_application` |
| **Data** | RDS, ElastiCache | **~EUR 15–55/mo** | `deploy_application` |
| **Compute** | Fargate tasks | **~EUR 10–35/mo** | `deploy_application` |

Rough figures, not quotes. Confirm against current pricing before leaving
anything running.

The VPC is perfectly valid without NAT — private subnets simply have no
outbound route, which does not matter until there are tasks in them. Turn on
`enable_nat_gateway` and `deploy_application` together.

`single_nat_gateway = true` in production too. Textbook production runs one per
AZ so a zone failure cannot cut outbound access for the surviving zone; this
build accepts the cross-AZ dependency because the environment is destroyed
after verification and the second gateway would double that line item for
nothing demonstrable. One variable to change.

## Environment sizing

| | staging | production |
|---|---|---|
| RDS | `db.t4g.micro`, single-AZ | `db.t4g.small`, **Multi-AZ** |
| Backups | 1 day | 7 days |
| Redis | `cache.t4g.micro`, no replica | `cache.t4g.micro` + 1 replica, failover |
| Fargate | 0.25 vCPU / 0.5 GB, 1 task | 0.5 vCPU / 1 GB, 2 tasks |
| Autoscale | 1 → 3 | 2 → 6 |
| Flow logs | off | on |

## Design notes

**Shared vs per-environment.** ECR repositories, the GitHub OIDC provider and
the CI roles are account-wide and owned by the staging stack. Production reads
the repositories through a data source, so applying production can never mutate
the credentials CI uses to apply production. Images are promoted between
environments, not rebuilt — the environment is a property of the deployment,
not of the artifact.

**Three CI roles, not one.**

| Role | Trust | Permissions |
|---|---|---|
| `stockflow-gha-plan` | pull requests + branches | `ReadOnlyAccess` + state read/lock |
| `stockflow-gha-apply` | branches only | `PowerUserAccess` + scoped IAM |
| `stockflow-gha-ecr-push` | branches only | ECR push to these repositories |

A pull request from a fork can execute workflow code, so the only credential it
may ever hold is one that cannot change anything. The apply role additionally
carries an explicit `Deny` on modifying the CI roles themselves, so a
compromised workflow cannot widen its own permissions.

`PowerUserAccess` rather than `AdministratorAccess`, plus the narrow slice of
IAM actions the stack actually needs to create task roles.

**Immutable image tags.** ECR is set to `IMMUTABLE`, so a tag can never be
repointed at a different image. That is what makes a task definition
referencing a tag reproducible; CI tags with the commit SHA.

**Default security group stripped.** AWS creates one per VPC that allows all
intra-group traffic. Nothing should use it, so the module removes every rule
rather than leaving a permissive group around for something to attach to by
accident.

**Gateway endpoints for S3 and DynamoDB.** Free, and they keep image-layer and
state traffic off the NAT gateway's per-GB data meter once NAT is enabled.


**Where the task security group lives.** In the `alb` module, not `ecs`. The
load balancer's egress rules reference the task group and the task group's
ingress rules reference the load balancer; defining both in one module is what
stops that being a dependency cycle between two modules.

**Secrets never pass through Terraform variables.** The database master
password is generated by RDS itself (`manage_master_user_password`) and the JWT
signing keys by the `random` provider. Both land in Secrets Manager and are
injected into the container as `secrets`, not `environment` — so they do not
appear in `aws ecs describe-task-definition` output. The JWT keys do sit in
Terraform state, which is why the state bucket is private, encrypted and
versioned.

**Health check split.** The ALB checks `/health/live`, which deliberately tests
nothing downstream. If it pinged Postgres, a database blip would fail every
task at once and the load balancer would pull the whole service out of
rotation, turning a slow database into a total outage. `/health/ready` does
check dependencies and is for deployments.

**Task definition drift is ignored.** CI deploys by registering a new task
definition revision, so the ECS services declare
`ignore_changes = [task_definition, desired_count]`. Without that, the next
`terraform apply` would drag the service back to whatever revision Terraform
last recorded and undo the deploy.

**ECS Exec is enabled**, which is how migrations get run and how you get a
shell. There is no bastion host.

## Tearing down

```bash
cd environments/production && terraform destroy -var-file=production.tfvars
cd ../staging            && terraform destroy -var-file=staging.tfvars
```

The state bucket carries `prevent_destroy`, so bootstrap will refuse to be
destroyed until that lifecycle block is removed by hand. Deliberate: losing
state is the one mistake here that is genuinely painful.

A destroy that stops halfway leaves resources still billing. If it fails, run
it again — the common cause is ECR refusing to delete a repository that still
holds images, which is why `force_delete` is on.


## GitHub Actions setup

Three workflows:

| Workflow | Trigger | Role assumed |
|---|---|---|
| `terraform-plan.yml` | PR touching `infra/**` | plan (read-only) |
| `terraform-apply.yml` | push to `staging` / `main` | apply |
| `docker-build.yml` | push touching `apps/**` | ECR push, then apply for the rollout |

After the first apply of the staging stack, read the role ARNs out of the
outputs and set them as **repository variables** (Settings → Secrets and
variables → Actions → Variables). They are ARNs, not secrets:

```bash
cd environments/staging
terraform output gha_plan_role_arn
terraform output gha_apply_role_arn
terraform output gha_ecr_push_role_arn
```

| Variable | Value |
|---|---|
| `AWS_PLAN_ROLE_ARN` | `gha_plan_role_arn` output |
| `AWS_APPLY_ROLE_ARN` | `gha_apply_role_arn` output |
| `AWS_ECR_PUSH_ROLE_ARN` | `gha_ecr_push_role_arn` output |
| `STAGING_APP_URL` | staging `application_url` output |
| `PRODUCTION_APP_URL` | production `application_url` output |

`STAGING_APP_URL` and `PRODUCTION_APP_URL` matter because `NEXT_PUBLIC_API_URL`
is inlined into the frontend bundle at build time — the web image is
environment-specific even though the API image is not.

**The production approval gate is a GitHub Environment, not workflow logic.**
Create an environment named `production` under Settings → Environments and add
yourself as a required reviewer. The apply job declares
`environment: production`, so the run pauses there until someone approves.
Nothing in the YAML enforces this; deleting the environment removes the gate.

Create a `staging` environment too, without reviewers, so both jobs report
deployment status consistently.

## Linting

```bash
terraform fmt -recursive -check
terraform validate                 # per directory
tflint --recursive
checkov -d . --framework terraform
```

## Verified

Staging has been applied end to end and torn down. The CI pipeline runs
plan on pull requests, applies on merge to `staging`, and rolls the ECS
services onto the new commit SHA.
