output "ecr_backend_repository_url" {
  description = "URL to push/pull the backend image (used later by CI and ECS)."
  value       = aws_ecr_repository.backend.repository_url
}

output "staging_alb_dns" {
  description = "Backend ALB DNS name (CloudFront's /api origin)."
  value       = aws_lb.staging.dns_name
}

output "staging_s3_web_bucket" {
  description = "S3 bucket the frontend bundle deploys to."
  value       = aws_s3_bucket.staging_web.bucket
}

output "staging_cloudfront_url" {
  description = "Public staging URL (HTTPS via CloudFront)."
  value       = "https://${aws_cloudfront_distribution.staging.domain_name}"
}
