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

# CloudFront requires ACM certificates in us-east-1, even though the
# bucket and distribution live in us-east-2.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
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
  aliases             = ["gharlearn.com", "www.gharlearn.com"]

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

    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.ghar_security_headers.id
    min_ttl                    = 0
    default_ttl                = 3600
    max_ttl                    = 86400
    compress                   = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.gharlearn.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# --- gharlearn.com DNS (Route 53) ---
# Phase 1: the hosted zone + the Resend email records below are applied
# first (targeted apply). The nameservers from the zone are pasted into
# GoDaddy to move DNS to Route 53.
# Phase 2 (after the nameserver change propagates): the ACM certificate,
# CloudFront aliases/cert, and the ALIAS records.

resource "aws_route53_zone" "gharlearn" {
  name = "gharlearn.com"
}

# Resend email records — values copied verbatim from the live GoDaddy DNS
# (verified via DNS-over-HTTPS against two resolvers, 2026-11-11), so
# sign-in email keeps working after DNS moves to Route 53.
resource "aws_route53_record" "resend_dkim" {
  zone_id = aws_route53_zone.gharlearn.zone_id
  name    = "resend._domainkey.gharlearn.com"
  type    = "TXT"
  ttl     = 3600
  records = ["p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDYxbXIqzEEPAU2zwXY9rVkWn44axLou1vNHq7Q+Lj0vM44ffEyKSiAPB+RZtarXcAnGbq/1s/+ykCc5uGWmtioBs8ZAkVu8LIhfEj1bdoVlXQtGFWOcwuCndlRgEt1a6w3BGlQLpzdkebdsoo2TKmQRjv0L2maGYOQ48+AigurmwIDAQAB"]
}

resource "aws_route53_record" "resend_spf_rsend" {
  zone_id = aws_route53_zone.gharlearn.zone_id
  name    = "rsend.gharlearn.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["rsend.forge.rmta.net"]
}

resource "aws_route53_record" "resend_spf_send" {
  zone_id = aws_route53_zone.gharlearn.zone_id
  name    = "send.gharlearn.com"
  type    = "CNAME"
  ttl     = 3600
  records = ["send.forge.rmta.net"]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.gharlearn.zone_id
  name    = "_dmarc.gharlearn.com"
  type    = "TXT"
  ttl     = 3600
  records = ["v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;"]
}

# --- gharlearn.com TLS (ACM, us-east-1 — required for CloudFront) ---
resource "aws_acm_certificate" "gharlearn" {
  provider                  = aws.us_east_1
  domain_name               = "gharlearn.com"
  subject_alternative_names = ["www.gharlearn.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.gharlearn.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.gharlearn.zone_id
}

resource "aws_acm_certificate_validation" "gharlearn" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.gharlearn.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# --- gharlearn.com -> CloudFront (ALIAS records) ---
resource "aws_route53_record" "gharlearn_apex" {
  zone_id = aws_route53_zone.gharlearn.zone_id
  name    = "gharlearn.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.ghar_web.domain_name
    zone_id                = aws_cloudfront_distribution.ghar_web.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "gharlearn_www" {
  zone_id = aws_route53_zone.gharlearn.zone_id
  name    = "www.gharlearn.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.ghar_web.domain_name
    zone_id                = aws_cloudfront_distribution.ghar_web.hosted_zone_id
    evaluate_target_health = false
  }
}

output "website_endpoint" {
  value = aws_s3_bucket_website_configuration.ghar_web.website_endpoint
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.ghar_web.domain_name
}

output "route53_name_servers" {
  value = aws_route53_zone.gharlearn.name_servers
}

# --- Site health monitoring (added 2026-11-11) ---
# Route 53 health check pings https://gharlearn.com every 30s.
# If it fails 3 times in a row (~90s) it flips unhealthy and the
# CloudWatch alarm below emails Som via SNS.
# CloudFront 5xx errors are watched separately, also in us-east-1,
# because CloudFront metrics are only published there.
# Cost: health check $0.50/mo; 2 CloudWatch alarms + SNS email are
# inside the AWS free tier at this volume (10 alarms free).

resource "aws_route53_health_check" "gharlearn" {
  fqdn              = "gharlearn.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/"
  request_interval  = 30
  failure_threshold = 3
  enable_sni        = true

  tags = {
    Name = "gharlearn.com"
  }
}

# SNS must live in us-east-1: CloudWatch alarms can only send to an
# SNS topic in the same region as the alarm, and both alarms below
# must be in us-east-1 (Route 53 + CloudFront metrics live there).
resource "aws_sns_topic" "ghar_site_alerts" {
  provider = aws.us_east_1
  name     = "ghar-site-alerts"
}

resource "aws_sns_topic_subscription" "ghar_site_alerts_email" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.ghar_site_alerts.arn
  protocol  = "email"
  endpoint  = "sompyakurel@gmail.com"
}

resource "aws_cloudwatch_metric_alarm" "gharlearn_down" {
  provider = aws.us_east_1

  alarm_name          = "gharlearn-down"
  alarm_description   = "gharlearn.com failed its Route 53 health check (HTTPS, 3 x 30s failures)"
  namespace           = "AWS/Route53"
  metric_name         = "HealthCheckStatus"
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"

  dimensions = {
    HealthCheckId = aws_route53_health_check.gharlearn.id
  }

  alarm_actions = [aws_sns_topic.ghar_site_alerts.arn]
  ok_actions    = [aws_sns_topic.ghar_site_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "gharlearn_cloudfront_5xx" {
  provider = aws.us_east_1

  alarm_name          = "gharlearn-cloudfront-5xx"
  alarm_description   = "CloudFront 5xx error rate above 5% for 5 minutes on gharlearn.com"
  namespace           = "AWS/CloudFront"
  metric_name         = "5xxErrorRate"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = aws_cloudfront_distribution.ghar_web.id
    Region         = "Global"
  }

  alarm_actions = [aws_sns_topic.ghar_site_alerts.arn]
  ok_actions    = [aws_sns_topic.ghar_site_alerts.arn]
}

# ---------------------------------------------------------------------------
# Security response headers (added 2026-11-11, Som approved): HSTS +
# X-Frame-Options + X-Content-Type-Options + Referrer-Policy, applied to
# every response through the distribution's default cache behaviour.
# These four cannot be set by HTML <meta> tags. CSP deliberately stays as
# the per-page <meta> tag only — a second CSP as an HTTP header would be
# enforced IN ADDITION and risks breaking Rive WASM / API fetches.
# ---------------------------------------------------------------------------
resource "aws_cloudfront_response_headers_policy" "ghar_security_headers" {
  name    = "ghar-security-headers"
  comment = "HSTS + X-Frame-Options + X-Content-Type-Options + Referrer-Policy for gharlearn.com (CSP stays as a per-page meta tag)"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}
