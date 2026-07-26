data "aws_ami" "os_image" {
  owners      = ["099720109477"]
  most_recent = true
  filter {
    name   = "state"
    values = ["available"]
  }
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/*24.04-amd64*"]
  }
}

resource "aws_key_pair" "deployer" {
  key_name   = "terra-automate-key"
  public_key = file("~/terra-key.pub")
}

# Jenkins lives in the same VPC as the EKS cluster (module.vpc's public
# subnet) instead of the account's default VPC. This is what makes it
# possible to reach the EKS API over its *private* endpoint and to scope
# the public endpoint CIDR to a stable address (this instance's EIP) rather
# than leaving it open to the whole internet.
resource "aws_security_group" "allow_user_to_connect" {
  name        = "allow TLS"
  description = "Allow user to connect"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "SSH — restrict this to your own IP via var.admin_cidr once you know it"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  ingress {
    description = "Jenkins UI — same caveat as SSH above"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  egress {
    description = "allow all outgoing traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "mysecurity" })
}

resource "aws_eip" "jenkins" {
  domain = "vpc"
  tags   = merge(local.tags, { Name = "jenkins-eip" })
}

resource "aws_eip_association" "jenkins" {
  instance_id   = aws_instance.testinstance.id
  allocation_id = aws_eip.jenkins.id
}

resource "aws_instance" "testinstance" {
  ami                         = data.aws_ami.os_image.id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.deployer.key_name
  subnet_id                   = module.vpc.public_subnets[0]
  vpc_security_group_ids      = [aws_security_group.allow_user_to_connect.id]
  associate_public_ip_address = true
  user_data                   = file("${path.module}/install_tools.sh")
  iam_instance_profile        = aws_iam_instance_profile.jenkins_eks.name

  # Require IMDSv2 — without this, anyone with a shell on the box (e.g. via
  # a future SSRF bug in the app or a Jenkins plugin RCE) can read this
  # instance's IAM credentials from the metadata service with a plain GET,
  # no token needed.
  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  # AMI lookups re-resolve to a newer image over time; without this, a
  # routine `terraform apply` months from now with zero code changes can
  # silently plan a replacement of this instance — destroying all Jenkins
  # job history/config, since it has no separate persistent volume.
  lifecycle {
    ignore_changes = [ami]
  }

  tags = merge(local.tags, { Name = "Jenkins-Automate" })

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }
}
