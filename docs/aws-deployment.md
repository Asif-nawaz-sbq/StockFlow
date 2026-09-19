# AWS infrastructure

## Account setup

| | |
|---|---|
| Account | `156275709542` |
| Region | `eu-central-1` (Frankfurt) |
| CLI profile | `CTDeploy2` → IAM user `stockflow-admin` |
| GitHub repo | `asadbashir7755/stockflow` |
| Domain | none — the ALB serves HTTP on its AWS DNS name |

The CLI profile is an **IAM user**, not the account root. Root access keys were
deleted (`AccountAccessKeysPresent: 0`) and root MFA is on. Terraform running as
root would undermine the point of the exercise, and a root key cannot be scoped,
restricted or safely rotated.

Since there is no domain, there is no Route 53 zone and no ACM certificate, so
the load balancer listens on HTTP only. The ACM and DNS wiring is still written
as a module and gated behind a variable, so pointing a domain at it later is a
tfvars change rather than a rewrite.

## What was built

- Custom VPC, public and private subnets across two AZs, one NAT gateway
- ECS Fargate services for both apps, autoscaled on CPU and memory
- One public ALB, path-based routing, WAF with managed rule groups
- RDS PostgreSQL and ElastiCache Redis, private subnets only
- Secrets Manager for database credentials and app secrets
- ECR, CloudWatch Container Insights, alarms on CPU and unhealthy targets
- Terraform modules under `infra/terraform/modules`, separate state per environment
- GitHub Actions with OIDC: plan on PR, auto-apply to staging, manual approval for production

Everything is tagged `Project`, `Environment`, `ManagedBy=Terraform`, `Owner=Asad`.

**Staging was applied, verified, then torn down.** A NAT gateway, an RDS
instance and a load balancer cost money every hour they exist. The screenshots
below are what was captured while it was up.

What is left in the account is the free base layer only — VPC, subnets, empty
ECR repositories, the GitHub OIDC provider and the CI roles — so the pipeline
still runs against something real at no hourly cost. Everything billable is
behind `deploy_application` and `enable_nat_gateway`, both set to `false`.
Production is written and plans clean at 20 resources, but has never been
applied.

---

## Staging deployment

Everything in this section was taken from the live environment in
`eu-central-1`. Teardown instructions are in
[infra/terraform/README.md](../infra/terraform/README.md).

### Terraform backend

Bootstrap runs once with local state, creates the state bucket, then has its own
state migrated into it.

![Bootstrap apply](screenshots/01-bootstrap-apply.png)

Seven resources: the bucket plus versioning, encryption, public access block,
ownership controls, lifecycle rules and a TLS-only bucket policy.

![State bucket in S3](screenshots/02-state-bucket.png)

The bucket in the console. One bucket holds all three state keys —
`bootstrap/`, `staging/` and `production/`.

![terraform init against the S3 backend](screenshots/03-terraform-init-s3-backend.png)

`terraform init` in the staging directory picking up the S3 backend. No
deprecation warning here because locking uses the native `.tflock` object
rather than a DynamoDB table.

### The free layer, applied first

The environments split into a free half and a billable half, gated by
`deploy_application`. This is the first apply, with that variable still false.

![Plan of the base layer](screenshots/04-plan-base-layer.png)

31 resources: VPC, subnets, routing, ECR and the CI roles. `nat_gateway_enabled`
is `false` and every application output reads `not deployed`. Nothing here bills.

![Apply of the base layer](screenshots/05-apply-base-layer.png)

Same apply at the confirmation prompt.

### Networking

![VPC list](screenshots/10-vpc.png)

`stockflow-staging-vpc`. The count of two includes the account's default VPC,
which nothing in this project uses.

![VPC resource map](screenshots/11-vpc-resource-map.png)

Four subnets across `eu-central-1a` and `1b`, four route tables — one public and
one private per AZ — plus the internet gateway, the NAT gateway and the S3
gateway endpoint. Private route tables are per-AZ even with a single NAT so
switching to one NAT per AZ is a route change rather than a rebuild.

![Security groups](screenshots/12-security-groups.png)

Four groups doing work — `alb`, `tasks`, `db`, `redis` — and the VPC default
renamed `stockflow-staging-default-do-not-use` with every rule stripped, so
nothing can attach to a permissive group by accident. The unnamed `default`
group belongs to the account's default VPC.

### Load balancer

![Load balancer](screenshots/20-load-balancer.png)

One internet-facing ALB across both availability zones.

![Listener rules](screenshots/21-listener-rules.png)

The HTTP:80 listener. Rule 100 forwards `/health/*`, `/docs`, `/docs/*` and
`/api/*` to the API target group; the default rule sends everything else to the
frontend. This is what lets the browser call the API same-origin.

![Target groups](screenshots/22-target-groups.png)

Two target groups, both `IP` type because Fargate tasks get their own ENI and
there is no instance to register.

![API target health](screenshots/23-target-health-api.png)

![Web target health](screenshots/24-target-health-web.png)

One healthy target in each, zero unhealthy. The API group checks
`/health/live`, which deliberately touches nothing downstream — if it pinged
Postgres, a database blip would fail every task at once and pull the whole
service out of rotation.

### Compute

![ECS services](screenshots/30-ecs-services.png)

Both services active on Fargate with 1/1 tasks running, and Container Insights
enabled on the cluster.

![ECS tasks](screenshots/31-ecs-tasks.png)

The two running tasks and their health status. The task definition revisions
(`api:5`, `web:4`) were registered by the deploy workflow, not by Terraform —
the services declare `ignore_changes` on `task_definition` so an apply cannot
drag them back to an older revision.

### Data stores

![RDS instance](screenshots/40-rds-postgres.png)

`db.t4g.micro` running PostgreSQL, private subnets only, no public endpoint.
Single-AZ in staging; production sets Multi-AZ.

![ElastiCache Redis](screenshots/41-elasticache-redis.png)

Single `cache.t4g.micro` node on Redis 7.1. Encryption in transit is on, so the
API connects over `rediss://` with an AUTH token pulled from Secrets Manager.

![Resource tags](screenshots/42-resource-tags.png)

Tags on the Redis cluster, which every resource in the stack carries through the
provider's `default_tags`.

### CI/CD

![GitHub OIDC provider](screenshots/50-github-oidc-provider.png)

The OIDC identity provider in IAM. This is what removes static AWS keys from CI
entirely.

![Repository variables](screenshots/51-github-repo-variables.png)

Three role ARNs as repository variables. They are ARNs, not secrets — the trust
policy decides who may assume them.

![GitHub environments](screenshots/52-github-environments.png)

`production` carries one protection rule, which is the manual approval gate.
Nothing in the workflow YAML enforces it; deleting the environment removes the
gate.

![Plan workflow](screenshots/53-workflow-plan.png)

A pull request run: fmt, validate, tflint and checkov, then plan for both
environments in parallel. Plans run under the read-only role.

![Apply workflow](screenshots/54-workflow-apply.png)

Push to `staging` resolves the target environment and applies. The job links out
to the load balancer URL.

![Build and deploy workflow](screenshots/55-workflow-build-deploy.png)

Application changes run the API test suite against throwaway Postgres and Redis
services, build both images, push them tagged with the commit SHA, then register
new task definitions and wait for the services to stabilise.

### The application, served from the load balancer

The URL bar in these shots is the ALB's own DNS name. HTTP, not HTTPS, because
there is no certificate.

![Landing page](screenshots/60-app-landing.png)

![Sign in](screenshots/61-app-sign-in.png)

The sign-in page. The overlay is the browser offering a saved password.

![Dashboard](screenshots/62-app-dashboard.png)

Live figures from the seeded workspace: stock value, products below reorder
point, open orders, and a 14-day revenue chart.

![Products](screenshots/63-app-products.png)

Stock rolled up across warehouses, with on-hand, reserved and available as
separate columns.

![Sales orders](screenshots/64-app-orders.png)

![Order detail](screenshots/68-app-order-detail.png)

Line items with per-line reservation state, and VAT summed from pre-rounded
lines rather than re-derived from the subtotal.

![Replenishment](screenshots/65-app-replenishment.png)

Products whose available stock plus inbound purchase orders has dropped below
the reorder point, with quantities rounded up to each supplier's minimum.

![Audit log](screenshots/67-app-audit.png)

Every write recorded with actor, action and IP.

### Verified against the deployed stack

Checked through the load balancer, not locally:

- Login, RDS over verified TLS, Redis over `rediss://` with an AUTH token
- Confirming an order reserved stock without moving on-hand; shipping dropped
  on-hand and released the reservation
- Oversell rejected with a per-line shortfall
- Credit limit rejected an order above the customer's exposure
- Idempotency returned the same order number for a repeated key
- Migrations and the seeder ran as one-off Fargate tasks
- 16 CloudWatch alarms, all in OK

### Teardown

The paid layer was switched off first with `deploy_application = false` and
`enable_nat_gateway = false`, then the base layer was destroyed outright.

![Terraform destroy](screenshots/70-teardown.png)

That took everything with it, including the OIDC provider, the CI roles and the
ECR repositories — they live in this stack because they are account-wide, so
destroying it breaks the pipeline. The free base layer was reapplied afterwards
to get CI working again: the same 31 resources, none of which bill by the hour.
The role ARNs are derived from their names, so they came back identical and the
GitHub variables pointing at them never needed touching.

The state bucket survives both, because it carries `prevent_destroy` and
production still needs it. Bringing the paid layer back is one variable and one
apply, though the ALB gets a new DNS name and the images have to be pushed
again.

---

Back to the [README](../README.md).
