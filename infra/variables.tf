variable "project" {
  description = "Project name — used as a name prefix and tag on all resources."
  type        = string
  default     = "boardly"
}

variable "region" {
  description = "AWS region for all regional resources (CloudFront certs must also be us-east-1)."
  type        = string
  default     = "us-east-1"
}
