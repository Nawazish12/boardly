# Production GitHub Actions deploy role — assumable from main branch + version tags.
data "aws_iam_policy_document" "github_assume_prod" {
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
    # Production workflow uses GitHub Environment protection. OIDC `sub`
    # becomes environment-based for those jobs. Keep ref patterns too.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo}:environment:production",
        "repo:${var.github_repo}:ref:refs/heads/main",
        "repo:${var.github_repo}:ref:refs/tags/v*",
      ]
    }
  }
}

resource "aws_iam_role" "github_deploy_prod" {
  name               = "${var.project}-prod-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume_prod.json
}

data "aws_iam_policy_document" "github_deploy_prod" {
  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage",
      "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage"
    ]
    resources = [aws_ecr_repository.backend.arn]
  }
  statement {
    actions   = ["ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"]
    resources = ["*"]
  }
  statement {
    actions   = ["ecs:UpdateService", "ecs:DescribeServices"]
    resources = [aws_ecs_service.prod.id]
  }
  statement {
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.prod_task_execution.arn, aws_iam_role.prod_task.arn]
  }
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.prod_web.arn]
  }
  statement {
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.prod_web.arn}/*"]
  }
  statement {
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.prod.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy_prod" {
  name   = "${var.project}-prod-deploy"
  role   = aws_iam_role.github_deploy_prod.id
  policy = data.aws_iam_policy_document.github_deploy_prod.json
}
