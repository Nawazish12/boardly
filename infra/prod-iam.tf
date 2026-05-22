# Production IAM roles (reuse the generic assume-role policy docs from iam.tf).

# EC2 instance role
resource "aws_iam_role" "prod_ec2" {
  name               = "${var.project}-prod-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}
resource "aws_iam_role_policy_attachment" "prod_ec2_ecs" {
  role       = aws_iam_role.prod_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}
resource "aws_iam_role_policy_attachment" "prod_ec2_ssm" {
  role       = aws_iam_role.prod_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_iam_instance_profile" "prod_ec2" {
  name = "${var.project}-prod-ec2-profile"
  role = aws_iam_role.prod_ec2.name
}

# ECS task execution role — SSM read scoped to /prod/* (per-env boundary)
resource "aws_iam_role" "prod_task_execution" {
  name               = "${var.project}-prod-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}
resource "aws_iam_role_policy_attachment" "prod_task_execution_managed" {
  role       = aws_iam_role.prod_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
data "aws_iam_policy_document" "prod_ssm_read" {
  statement {
    sid       = "ReadProdParams"
    actions   = ["ssm:GetParameters", "ssm:GetParameter", "ssm:GetParametersByPath"]
    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/prod/*"]
  }
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
resource "aws_iam_role_policy" "prod_task_execution_ssm" {
  name   = "${var.project}-prod-ssm-read"
  role   = aws_iam_role.prod_task_execution.id
  policy = data.aws_iam_policy_document.prod_ssm_read.json
}

# ECS task role (app's own AWS perms — none needed)
resource "aws_iam_role" "prod_task" {
  name               = "${var.project}-prod-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}
