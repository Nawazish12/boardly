output "ecr_backend_repository_url" {
  description = "URL to push/pull the backend image (used later by CI and ECS)."
  value       = aws_ecr_repository.backend.repository_url
}
