terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.0.0"

  # Remote state with locking - fill in your own bucket/table (account-specific,
  # cannot be hardcoded here) and run `terraform init` to migrate from local state.
  # backend "s3" {
  #   bucket         = "YOUR_TERRAFORM_STATE_BUCKET"
  #   key            = "easyshop/terraform.tfstate"
  #   region         = "us-east-2"
  #   dynamodb_table = "YOUR_TERRAFORM_LOCK_TABLE"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = local.region
}

provider "random" {} 