# Generate SSH Key Pair
resource "tls_private_key" "bastion" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Store the private key in Secrets Manager instead of writing it to local
# plaintext disk - avoids key material sitting unencrypted in the terraform
# working directory / being accidentally committed.
resource "aws_secretsmanager_secret" "bastion_private_key" {
  name = "${var.name}-bastion-ssh-private-key"
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "bastion_private_key" {
  secret_id     = aws_secretsmanager_secret.bastion_private_key.id
  secret_string = tls_private_key.bastion.private_key_pem
}

# Create AWS Key Pair with OpenSSH format
resource "aws_key_pair" "bastion" {
  key_name   = var.key_name
  public_key = tls_private_key.bastion.public_key_openssh
}

# Ubuntu AMI data source
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Bastion Host Instance
resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = aws_key_pair.bastion.key_name
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [var.security_group_id]
  associate_public_ip_address = true
  iam_instance_profile        = var.iam_instance_profile

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-bastion"
    }
  )
}
