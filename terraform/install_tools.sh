#!/bin/bash
# Exit immediately if any command fails
set -e 

# Tell apt-get not to prompt for human input during installations
export DEBIAN_FRONTEND=noninteractive

sudo apt-get update
# Add -y 
sudo apt-get upgrade -y 

# Install prerequisites
sudo apt-get install -y fontconfig openjdk-21-jre

# ==========================================
# 1. Jenkins Installation
# ==========================================
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update
sudo apt install jenkins -y


sudo systemctl enable --now jenkins

# ==========================================
# 2. Docker Installation
# ==========================================
sudo apt-get install docker.io -y

# Explicitly add the default 'ubuntu' user (change to 'ec2-user' if using Amazon Linux)
sudo usermod -aG docker ubuntu || true 
sudo usermod -aG docker jenkins

# ==========================================
# 3. Trivy Installation (Secure GPG Method)
# ==========================================
sudo apt-get install wget gnupg
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy -y


# ==========================================
# 4. Snap Packages (AWS CLI, Helm, Kubectl)
# ==========================================
sudo snap install aws-cli --classic
sudo snap install helm --classic
sudo snap install kubectl --classic