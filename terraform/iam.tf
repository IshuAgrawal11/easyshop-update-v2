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

# --- IRSA role for the EBS CSI driver addon ---
# Needed for Prometheus/Loki/Grafana/Jaeger to get real EBS-backed
# PersistentVolumes (dynamic provisioning) instead of losing all metrics/
# logs/dashboards on every pod restart. The module's `enable_irsa = true`
# default (eks.tf) already creates the OIDC provider this trust policy
# federates with.
data "aws_iam_policy_document" "ebs_csi_irsa_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:sub"
      values   = ["system:serviceaccount:kube-system:ebs-csi-controller-sa"]
    }

    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ebs_csi" {
  name               = "${var.cluster_name}-ebs-csi-driver"
  assume_role_policy = data.aws_iam_policy_document.ebs_csi_irsa_trust.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  role       = aws_iam_role.ebs_csi.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

# A standalone resource, not declared via module.eks's own `addons` input —
# see the comment in eks.tf for why (this role depends on that module's own
# OIDC output, so the module's input can't depend on this role in turn).
resource "aws_eks_addon" "ebs_csi" {
  cluster_name             = module.eks.cluster_name
  addon_name               = "aws-ebs-csi-driver"
  service_account_role_arn = aws_iam_role.ebs_csi.arn

  depends_on = [module.eks]
}
