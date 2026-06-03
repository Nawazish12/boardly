# Production frontend: private S3 + CloudFront (free HTTPS default domain).
resource "aws_s3_bucket" "prod_web" {
  bucket = "${var.project}-prod-web-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "prod_web" {
  bucket                  = aws_s3_bucket.prod_web.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "prod_web" {
  name                              = "${var.project}-prod-web-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "prod_spa_router" {
  name    = "${var.project}-prod-spa-router"
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
  prod_s3_origin_id  = "s3-prod-web"
  prod_alb_origin_id = "alb-prod-api"
}

resource "aws_cloudfront_distribution" "prod" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${var.project} prod"
  price_class         = "PriceClass_100"

  origin {
    origin_id                = local.prod_s3_origin_id
    domain_name              = aws_s3_bucket.prod_web.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.prod_web.id
  }

  origin {
    origin_id   = local.prod_alb_origin_id
    domain_name = aws_lb.prod.dns_name
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = local.prod_s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.prod_spa_router.arn
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.prod_alb_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3" # AllViewer
  }

  # Swagger docs over HTTPS on the same production domain:
  # /api-docs, /api-docs/, /api-docs.json
  ordered_cache_behavior {
    path_pattern             = "/api-docs*"
    target_origin_id         = local.prod_alb_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3" # AllViewer
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

data "aws_iam_policy_document" "prod_web_s3" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.prod_web.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.prod.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "prod_web" {
  bucket = aws_s3_bucket.prod_web.id
  policy = data.aws_iam_policy_document.prod_web_s3.json
}
