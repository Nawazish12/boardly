# ===========================================================================
# Frontend hosting: private S3 bucket + CloudFront (free HTTPS, default domain).
#   /*      -> S3 (the SPA), with SPA routing via a CloudFront Function
#   /api/*  -> backend ALB (no caching, forwards everything)
# ===========================================================================

# ---------- Private S3 bucket (no public access; CloudFront-only via OAC) ----------
resource "aws_s3_bucket" "staging_web" {
  bucket = "${var.project}-staging-web-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "staging_web" {
  bucket                  = aws_s3_bucket.staging_web.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "staging_web" {
  name                              = "${var.project}-staging-web-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ---------- SPA routing: rewrite extensionless paths to /index.html ----------
resource "aws_cloudfront_function" "spa_router" {
  name    = "${var.project}-staging-spa-router"
  runtime = "cloudfront-js-2.0"
  comment = "SPA routing: extensionless paths -> /index.html"
  publish = true
  code    = <<-JS
    function handler(event) {
      var request = event.request;
      if (!request.uri.includes('.')) {
        request.uri = '/index.html';
      }
      return request;
    }
  JS
}

locals {
  s3_origin_id  = "s3-staging-web"
  alb_origin_id = "alb-staging-api"
}

resource "aws_cloudfront_distribution" "staging" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${var.project} staging"
  price_class         = "PriceClass_100" # cheapest edge set; fine for a learning project

  # Origin 1 — the SPA in private S3 (via OAC)
  origin {
    origin_id                = local.s3_origin_id
    domain_name              = aws_s3_bucket.staging_web.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.staging_web.id
  }

  # Origin 2 — backend ALB (HTTP only)
  origin {
    origin_id   = local.alb_origin_id
    domain_name = aws_lb.staging.dns_name
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default: serve the SPA from S3
  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }
  }

  # /api/* -> backend ALB, no caching, forward everything
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.alb_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3" # Managed-AllViewer
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true # free HTTPS on *.cloudfront.net
  }
}

# ---------- Bucket policy: only THIS CloudFront distribution may read ----------
data "aws_iam_policy_document" "staging_web_s3" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.staging_web.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.staging.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "staging_web" {
  bucket = aws_s3_bucket.staging_web.id
  policy = data.aws_iam_policy_document.staging_web_s3.json
}
