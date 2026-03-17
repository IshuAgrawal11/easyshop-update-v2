resource "aws_s3_bucket" "product_images" {
  bucket = "ishu11-easyshop-product-images-production" # Must be globally unique! Change this name.

  tags = {
    Name        = "Easyshop Product Images"
    Environment = "Production"
  }
}

resource "aws_s3_bucket_public_access_block" "product_images_public_block" {
  bucket = aws_s3_bucket.product_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "default" {
  name                              = "easyshop-s3-oac"
  description                       = "OAC for Easyshop Product Images"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Easyshop Image CDN"
  default_root_object = ""

  origin {
    domain_name              = aws_s3_bucket.product_images.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.product_images.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.default.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.product_images.bucket}"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

resource "aws_s3_bucket_policy" "allow_cloudfront_access" {
  bucket = aws_s3_bucket.product_images.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.product_images.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}

# ==========================================
# 5. Outputs (You'll need these!)
# ==========================================
output "s3_bucket_name" {
  description = "The name of the S3 bucket to upload images to"
  value       = aws_s3_bucket.product_images.bucket
}

output "cloudfront_domain_name" {
  description = "The CDN domain name to use in your Next.js app (e.g., d123abc.cloudfront.net)"
  value       = aws_cloudfront_distribution.cdn.domain_name
}