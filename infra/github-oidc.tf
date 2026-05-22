# ===========================================================================
# GitHub Actions -> AWS via OIDC (no static keys). Role the staging deploy
# workflow assumes, scoped to THIS repo on the develop branch.
# ===========================================================================

variable "github_repo" {
  description = "owner/repo allowed to assume the deploy role."
  type        = string
  default     = "Nawazish12/boardly"
}

# The OIDC provider already exists in this account — reference it.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_assume_staging" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Only the develop branch of this repo may assume the staging deploy role.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/develop"]
    }
  }
}

resource "aws_iam_role" "github_deploy_staging" {
  name               = "${var.project}-staging-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume_staging.json
}

data "aws_iam_policy_document" "github_deploy_staging" {
  # ECR auth token (must be on *)
  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  # Push/pull the backend image
  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage",
      "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage"
    ]
    resources = [aws_ecr_repository.backend.arn]
  }
  # Register a new task-def revision + roll the service
  statement {
    actions   = ["ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"]
    resources = ["*"] # RegisterTaskDefinition has no resource-level support
  }
  statement {
    actions   = ["ecs:UpdateService", "ecs:DescribeServices"]
    resources = [aws_ecs_service.staging.id]
  }
  # Needed to register a task def that references these roles
  statement {
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.staging_task_execution.arn, aws_iam_role.staging_task.arn]
  }
  # Frontend: sync to S3 + invalidate CloudFront
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.staging_web.arn]
  }
  statement {
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.staging_web.arn}/*"]
  }
  statement {
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.staging.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy_staging" {
  name   = "${var.project}-staging-deploy"
  role   = aws_iam_role.github_deploy_staging.id
  policy = data.aws_iam_policy_document.github_deploy_staging.json
}
