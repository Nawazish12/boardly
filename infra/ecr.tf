# Container registry for the BACKEND image.
# (The frontend is a static SPA on S3 — it has no image and needs no ECR repo.)
# One repo, shared across environments: we build once and promote the SAME image
# digest from staging to prod (DEPLOYMENT.md §7).
resource "aws_ecr_repository" "backend" {
  name = "${var.project}-backend"

  # Tags can't be moved once pushed — guarantees an image reference is immutable.
  image_tag_mutability = "IMMUTABLE"

  # Free basic vulnerability scan on every push.
  image_scanning_configuration {
    scan_on_push = true
  }
}

# Keep the repo under the 500 MB free-tier limit by expiring old untagged images.
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}
