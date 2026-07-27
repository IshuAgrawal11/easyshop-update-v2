# Create IAM role for bastion
resource "aws_iam_role" "bastion" {
  name = "${local.tags.Name}-bastion-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Minimal policy for the bastion to run `aws eks update-kubeconfig` / describe the
# cluster. AmazonEKSClusterPolicy is meant for the EKS service role, not a kubectl
# client instance, and grants far more than this box needs - actual in-cluster
# authorization happens via the aws-auth ConfigMap, not this IAM policy.
resource "aws_iam_policy" "bastion_eks_describe" {
  name        = "${local.tags.Name}-bastion-eks-describe"
  description = "Minimal EKS read access for the bastion to fetch cluster kubeconfig"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["eks:DescribeCluster", "eks:ListClusters"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "bastion_eks" {
  role       = aws_iam_role.bastion.name
  policy_arn = aws_iam_policy.bastion_eks_describe.arn
}

# Defense-in-depth: allow SSM Session Manager access to the bastion in addition
# to the CIDR-restricted SSH ingress.
resource "aws_iam_role_policy_attachment" "bastion_ssm" {
  role       = aws_iam_role.bastion.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Create instance profile for bastion
resource "aws_iam_instance_profile" "bastion" {
  name = "${local.tags.Name}-bastion-profile"
  role = aws_iam_role.bastion.name
}

module "vpc" {
  source          = "./modules/vpc"
  vpc_name        = local.vpc_name
  vpc_cidr        = local.vpc_cidr
  azs             = local.azs
  public_subnets  = local.public_subnets
  private_subnets = local.private_subnets
  intra_subnets   = local.intra_subnets
  tags            = local.tags
}

module "security_group" {
  source     = "./modules/security_group"
  name       = local.sg_name
  vpc_id     = module.vpc.vpc_id
  tags       = local.tags
  admin_cidr = var.admin_cidr
}

resource "aws_kms_key" "eks" {
  description         = "KMS key for EKS secrets envelope encryption"
  enable_key_rotation = true
  tags                = local.tags
}

module "eks" {
  source                    = "./modules/eks"
  cluster_name              = local.cluster_name
  cluster_version           = local.cluster_version
  environment               = local.environment
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.public_subnets
  control_plane_subnet_ids  = module.vpc.private_subnets
  bastion_security_group_id = module.security_group.bastion_security_group_id
  eks_addon_versions        = local.eks_addon_versions
  admin_cidr                = var.admin_cidr
  kms_key_arn               = aws_kms_key.eks.arn
  tags                      = local.tags
}

module "bastion" {
  source               = "./modules/bastion"
  depends_on           = [module.eks]
  name                 = local.tags.Name
  key_name             = local.key_name
  instance_type        = local.instance_type
  region               = local.region
  cluster_name         = local.cluster_name
  tags                 = local.tags
  subnet_id            = module.vpc.public_subnets[0]
  security_group_id    = module.security_group.bastion_security_group_id
  iam_instance_profile = aws_iam_instance_profile.bastion.name
}