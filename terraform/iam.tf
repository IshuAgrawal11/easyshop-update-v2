data "aws_iam_policy_document" "jenkins_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "jenkins_eks" {
  name               = "jenkins-eks-access-role"
  assume_role_policy = data.aws_iam_policy_document.jenkins_assume_role.json
  tags               = local.tags
}

# This is the only IAM permission `aws eks update-kubeconfig` actually
# needs (it calls DescribeCluster to fetch the endpoint + CA cert). Actual
# kubectl-level authorization comes from the EKS access entry in eks.tf,
# not from any IAM action grant here. (Deliberately not also granting
# eks:ListClusters — it doesn't support resource-level scoping, so adding
# it here would just be a silent `*` grant dressed up to look scoped.)
data "aws_iam_policy_document" "jenkins_eks_describe" {
  statement {
    sid       = "EKSDescribeForKubeconfig"
    actions   = ["eks:DescribeCluster"]
    resources = [module.eks.cluster_arn]
  }
}

resource "aws_iam_role_policy" "jenkins_eks_describe" {
  name   = "eks-describe-cluster"
  role   = aws_iam_role.jenkins_eks.id
  policy = data.aws_iam_policy_document.jenkins_eks_describe.json
}

resource "aws_iam_instance_profile" "jenkins_eks" {
  name = "jenkins-eks-instance-profile"
  role = aws_iam_role.jenkins_eks.name
}
