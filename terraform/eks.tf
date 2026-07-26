module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name               = var.cluster_name
  kubernetes_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets # control plane ENIs + nodes live here

  endpoint_public_access  = true
  endpoint_private_access = true
  # Always includes the Jenkins instance's own stable EIP (so the pipeline's
  # `kubectl` keeps working), plus whatever you add via
  # var.eks_public_access_cidrs (e.g. your own laptop's IP) for interactive
  # access. Defaults to 0.0.0.0/0 until you set that variable — tighten it
  # once you know the CIDR(s) you actually need.
  endpoint_public_access_cidrs = distinct(concat(
    var.eks_public_access_cidrs,
    ["${aws_eip.jenkins.public_ip}/32"]
  ))

  # Adds whoever runs `terraform apply` as a cluster admin via an access
  # entry automatically (modern replacement for "creator is always
  # system:masters").
  enable_cluster_creator_admin_permissions = true

  eks_managed_node_groups = {
    easyshop_nodes = {
      name           = "easyshop-nodes"
      instance_types = [var.node_instance_type]
      ami_type       = "AL2023_x86_64_STANDARD"

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size
    }
  }

  # Modern EKS access-entries API (not the legacy aws-auth ConfigMap) —
  # grants the Jenkins EC2 instance's IAM role (terraform/iam.tf) admin
  # access inside the cluster's RBAC, so `kubectl apply`/`rollout status`
  # from the Jenkins agent works once it has run `aws eks update-kubeconfig`.
  access_entries = {
    jenkins = {
      principal_arn = aws_iam_role.jenkins_eks.arn

      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }

  tags = local.tags
}
