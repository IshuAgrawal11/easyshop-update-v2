terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

locals {
  tags = {
    Project     = var.cluster_name
    Environment = "production"
  }
}

provider "aws" {
  region = var.aws_region
}
