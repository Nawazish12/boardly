data "aws_caller_identity" "current" {}

# ===========================================================================
# EC2 instance role — for the ECS container instance (the t3.micro box)
# ===========================================================================
data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "staging_ec2" {
  name               = "${var.project}-staging-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Lets the instance register with ECS and pull images from ECR.
resource "aws_iam_role_policy_attachment" "ec2_ecs" {
  role       = aws_iam_role.staging_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

# SSM Session Manager — shell access without opening SSH (DEPLOYMENT.md §4).
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.staging_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "staging_ec2" {
  name = "${var.project}-staging-ec2-profile"
  role = aws_iam_role.staging_ec2.name
}

# ===========================================================================
# ECS task EXECUTION role — used by ECS itself at container launch to pull the
# image and inject SSM secrets (DEPLOYMENT.md §6). SSM read scoped to /staging/*.
# ===========================================================================
data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "staging_task_execution" {
  name               = "${var.project}-staging-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "task_execution_managed" {
  role       = aws_iam_role.staging_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Read ONLY this environment's secrets — the per-env IAM boundary from §6.
data "aws_iam_policy_document" "staging_ssm_read" {
  statement {
    sid       = "ReadStagingParams"
    actions   = ["ssm:GetParameters", "ssm:GetParameter", "ssm:GetParametersByPath"]
    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/staging/*"]
  }
  # Decrypt SecureString params (AWS-managed SSM key).
  statement {
    sid       = "DecryptSsm"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "staging_task_execution_ssm" {
  name   = "${var.project}-staging-ssm-read"
  role   = aws_iam_role.staging_task_execution.id
  policy = data.aws_iam_policy_document.staging_ssm_read.json
}

# ===========================================================================
# ECS TASK role — the app's own AWS permissions at runtime. The backend talks
# to Mongo/Redis/Resend, not AWS APIs, so this role stays empty for now.
# ===========================================================================
resource "aws_iam_role" "staging_task" {
  name               = "${var.project}-staging-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}
