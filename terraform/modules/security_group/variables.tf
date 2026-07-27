variable "name" {
  description = "Name of the security group"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the security group will be created"
  type        = string
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}

variable "admin_cidr" {
  description = "CIDR blocks allowed to reach admin ports (SSH, Jenkins UI) on the bastion"
  type        = list(string)
}