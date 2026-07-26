variable "aws_region" {
  description = "AWS region where resources will be provisioned"
  default     = "eu-north-1"
}

variable "ami_id" {
  description = "AMI ID for the EC2 instance"
  default     = "ami-0974a2c5ddf10f442"
}

variable "instance_type" {
  description = "Instance type for the EC2 instance"
  default     = "t3.medium"
}

variable "my_enviroment" {
  description = "Instance type for the EC2 instance"
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name — kept as 'easyshop' to match the existing README/eksctl naming"
  type        = string
  default     = "easyshop"
}

variable "kubernetes_version" {
  description = <<-EOT
    EKS Kubernetes version, e.g. "1.31". Left with no default on purpose —
    AWS periodically deprecates old versions. Before applying, check what's
    currently supported with:
      aws eks describe-cluster-versions \
        --query "clusterVersions[?clusterVersionStatus=='STANDARD'].clusterVersion" \
        --output table
    then set this via -var or a .tfvars file.
  EOT
  type        = string
  default     = null
}

variable "vpc_cidr" {
  description = "CIDR block for the EKS VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability zones for the EKS VPC"
  type        = list(string)
  default     = ["eu-north-1a", "eu-north-1b"]
}

variable "public_subnets" {
  description = "Public subnet CIDRs (one per AZ, same order as var.azs)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "Private subnet CIDRs (one per AZ, same order as var.azs) — EKS nodes + control plane ENIs live here"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

variable "intra_subnets" {
  description = "Fully isolated subnet CIDRs (no NAT/IGW route) — not consumed by EKS today, kept for future use"
  type        = list(string)
  default     = ["10.0.5.0/24", "10.0.6.0/24"]
}

variable "node_instance_type" {
  description = "Instance type for the EKS managed node group"
  type        = string
  default     = "t3.medium"
}

variable "node_desired_size" {
  description = "Desired node count in the managed node group"
  type        = number
  default     = 2
}

variable "node_min_size" {
  description = "Minimum node count in the managed node group"
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum node count in the managed node group"
  type        = number
  default     = 3
}

variable "admin_cidr" {
  description = <<-EOT
    CIDR allowed to reach the Jenkins instance's SSH (22) and Jenkins UI
    (8080) ports. Defaults to 0.0.0.0/0 (open to the internet) since no
    known-safe CIDR exists yet — set this to your own IP (e.g. "1.2.3.4/32")
    via -var once you know it. This is the single most important thing to
    tighten before this stops being a "testing" setup.
  EOT
  type        = string
  default     = "0.0.0.0/0"
}

variable "eks_public_access_cidrs" {
  description = <<-EOT
    Additional CIDRs (beyond the Jenkins instance's own EIP, which is always
    included automatically) allowed to reach the EKS public API endpoint —
    e.g. your own laptop's IP for interactive kubectl access. Defaults to
    0.0.0.0/0 until you set this.
  EOT
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
