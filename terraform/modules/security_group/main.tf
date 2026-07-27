resource "aws_security_group" "bastion_security_group" {
  name_prefix = "${var.name}-bastion-sg-"
  description = "Bastion security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr
    description = "SSH access (restricted to admin_cidr)"
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS to EKS API and other services"
  }

  egress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH to EKS nodes"
  }

  egress {
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Kubelet API access"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All other outbound traffic"
  }

  // Jenkins UI - restricted to admin_cidr, not the whole internet
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr
    description = "Jenkins access (restricted to admin_cidr)"
  }

  // Note: no 80/443 ingress here - the app is served via the EKS ingress
  // controller/load balancer, not directly from this bastion instance.

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-bastion-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}