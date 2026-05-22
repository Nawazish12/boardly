output "ecr_backend_repository_url" {
  description = "URL to push/pull the backend image (used later by CI and ECS)."
  value       = aws_ecr_repository.backend.repository_url
}

output "staging_alb_dns" {
  description = "Backend ALB DNS name (CloudFront's /api origin)."
  value       = aws_lb.staging.dns_name
}
