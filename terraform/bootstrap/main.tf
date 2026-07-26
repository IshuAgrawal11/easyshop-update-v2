# One-time bootstrap for Terraform remote state. Apply this BEFORE the main
# terraform/ root module — it creates the S3 bucket that terraform/backend.tf
# points at. Uses its own local state (never bootstrap a remote backend's
# storage from inside the state it's meant to hold — chicken/egg).
#
# Usage:
#   cd terraform/bootstrap
#   terraform init
#   terraform apply

terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "eu-north-1"
}

# Bucket name must be globally unique across all of AWS — change it if it's taken.
resource "aws_s3_bucket" "tf_state" {
  bucket = "easyshop-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Terraform state can contain sensitive values (e.g. resource attributes
# marked non-sensitive by a provider but still worth protecting). Deny any
# request that doesn't come over HTTPS.
resource "aws_s3_bucket_policy" "tf_state_tls_only" {
  bucket = aws_s3_bucket.tf_state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.tf_state.arn,
          "${aws_s3_bucket.tf_state.arn}/*",
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

output "state_bucket_name" {
  value = aws_s3_bucket.tf_state.bucket
}
