output "vpc_id" {
  description = "ID of the EKS VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnets
}

output "public_subnet_ids" {
  value = module.vpc.public_subnets
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster API server endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  value     = module.eks.cluster_certificate_authority_data
  sensitive = true
}

output "cluster_arn" {
  value = module.eks.cluster_arn
}

output "jenkins_eks_role_arn" {
  description = "IAM role ARN attached to the Jenkins EC2 instance profile"
  value       = aws_iam_role.jenkins_eks.arn
}

output "update_kubeconfig_command" {
  description = "Run this after apply to point kubectl at the new cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
