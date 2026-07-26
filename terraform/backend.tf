# Remote state, backed by the bucket created in terraform/bootstrap/.
# Run `cd terraform/bootstrap && terraform init && terraform apply` once,
# first, before `terraform init` here.
#
# If you'd rather skip remote state for now and keep things local, delete
# this file before running `terraform init` in this directory — everything
# else in this root module works fine either way.
terraform {
  backend "s3" {
    bucket = "easyshop-terraform-state" # must match terraform/bootstrap/main.tf
    key    = "easyshop/terraform.tfstate"
    # Backend blocks can't reference variables, so this can't read
    # var.aws_region automatically — keep it in sync by hand if you ever
    # change that variable's default.
    region       = "eu-north-1"
    use_lockfile = true # S3-native locking (Terraform >= 1.11) — no DynamoDB table needed
    encrypt      = true
  }
}
