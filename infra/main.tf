terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-2"
}

resource "aws_s3_bucket" "ghar_web" {
  bucket = "ghar-web-sompyakurel"
}

resource "aws_s3_bucket_website_configuration" "ghar_web" {
  bucket = aws_s3_bucket.ghar_web.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "ghar_web" {
  bucket = aws_s3_bucket.ghar_web.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "ghar_web" {
  bucket = aws_s3_bucket.ghar_web.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "arn:aws:s3:::${aws_s3_bucket.ghar_web.id}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.ghar_web]
}

resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.ghar_web.id
  key          = "index.html"
  source       = "../index.html"
  content_type = "text/html; charset=utf-8"
  etag         = filemd5("../index.html")
}

resource "aws_cloudfront_distribution" "ghar_web" {
  origin {
    domain_name = aws_s3_bucket_website_configuration.ghar_web.website_endpoint
    origin_id   = "s3-website"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Ghar website — full Ghar on the web"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-website"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
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

output "website_endpoint" {
  value = aws_s3_bucket_website_configuration.ghar_web.website_endpoint
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.ghar_web.domain_name
}
