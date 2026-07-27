output "bastion_public_ip" {
  description = "Public IP address of the bastion host"
  value       = aws_instance.bastion.public_ip
}

output "bastion_public_dns" {
  description = "Public DNS name of the bastion host"
  value       = aws_instance.bastion.public_dns
}

output "bastion_security_group_id" {
  description = "ID of the bastion security group"
  value       = var.security_group_id
}

output "bastion_key_name" {
  description = "Name of the SSH key pair"
  value       = aws_key_pair.bastion.key_name
}

output "bastion_private_key_secret_arn" {
  description = "Secrets Manager ARN holding the bastion SSH private key"
  value       = aws_secretsmanager_secret.bastion_private_key.arn
}

output "retrieve_key_command" {
  description = "Command to fetch the bastion SSH private key from Secrets Manager"
  value       = "aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.bastion_private_key.name} --query SecretString --output text > bastion_key.pem && chmod 400 bastion_key.pem"
}