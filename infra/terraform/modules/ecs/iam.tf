/**
 * Two roles per convention, and the distinction matters.
 *
 * The execution role belongs to the ECS agent: it pulls the image, writes logs
 * and resolves secrets before the container starts. The task role belongs to
 * the running application. Application code never needs to pull from ECR, and
 * the agent never needs to call the app's AWS APIs.
 */

data "aws_iam_policy_document" "task_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# --- Execution role --------------------------------------------------------

resource "aws_iam_role" "execution" {
  name               = "${var.name_prefix}-ecs-execution"
  description        = "Pulls images, writes logs and resolves secrets for ${var.name_prefix}"
  assume_role_policy = data.aws_iam_policy_document.task_assume.json

  tags = merge(var.tags, { Name = "${var.name_prefix}-ecs-execution" })
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

/**
 * Secret resolution.
 *
 * Scoped to exactly the secrets these tasks use rather than "*". If a task
 * definition ever references a secret not in this list the deployment fails
 * loudly, which is the correct outcome.
 */
locals {
  secret_arns = distinct(concat(
    [var.db_secret_arn, var.redis_auth_secret_arn],
    values(var.app_secret_arns),
  ))
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid       = "ReadTaskSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = local.secret_arns
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "read-task-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# --- Task role -------------------------------------------------------------

resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-ecs-task"
  description        = "Runtime identity for the ${var.name_prefix} containers"
  assume_role_policy = data.aws_iam_policy_document.task_assume.json

  tags = merge(var.tags, { Name = "${var.name_prefix}-ecs-task" })
}

/**
 * ECS Exec needs these on the task role, not the execution role: the SSM
 * channel is opened by the running container. This is how migrations are run
 * and how you get a shell without a bastion host.
 */
data "aws_iam_policy_document" "task_exec" {
  count = var.enable_execute_command ? 1 : 0

  statement {
    sid = "SsmMessagesForEcsExec"
    actions = [
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "task_exec" {
  count = var.enable_execute_command ? 1 : 0

  name   = "ecs-exec"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task_exec[0].json
}
