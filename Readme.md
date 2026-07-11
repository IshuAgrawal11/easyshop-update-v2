# 🛍️ EasyShop - Modern E-commerce Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.1.1-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Redux](https://img.shields.io/badge/Redux-2.2.1-purple?style=flat-square&logo=redux)](https://redux.js.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/IshuAgrawal11/production-ready-e-commerce-application)

EasyShop is a production-ready, full-stack e-commerce platform built with **Next.js 14**, **TypeScript**, and **MongoDB**. This repository contains the complete DevSecOps pipeline to deploy the application on **AWS EKS** using **Terraform**, **Jenkins**, and **ArgoCD**.

## 🏗️ Architecture & Tech Stack

  - **Frontend/Backend:** Next.js 14 (App Router), Redux, Tailwind CSS
  - **Database:** MongoDB & Redis (Caching)
  - **Infrastructure:** Terraform & AWS CloudFormation
  - **Cloud Services:** AWS EKS, S3, CloudFront (CDN)
  - **CI/CD:** Jenkins (Master/Agent), ArgoCD (GitOps)
  - **Security:** SonarQube, OWASP Dependency Check, Trivy
  - **Ingress & DNS:** Nginx Ingress Controller, Cert-Manager (Let's Encrypt)
  - **Monitoring:** Prometheus & Grafana via Helm

-----

### <mark>Project Deployment Flow:</mark>
<img src="https://github.com/DevMadhup/Wanderlust-Mega-Project/blob/main/Assets/DevSecOps%2BGitOps.gif" />

## 🛠️ Step 1: Infrastructure Provisioning (Terraform)

1.  **Clone and Initialize:**
    ```bash
    git clone https://github.com/IshuAgrawal11/production-ready-e-commerce-application.git
    cd terraform
    terraform init
    ```
2.  **Deploy AWS Resources:**
    *Review the plan and apply to create your EC2 Jenkins Agent, S3 Bucket, and CloudFront Distribution.*
    ```bash
    terraform apply -auto-approve
    ```

### 🛰️ Step 2: S3 Asset Sync & CloudFront Configuration

Before building the application, you must sync your product images and configure the CDN.

1.  **Sync Images to S3:**
    ```bash
    aws s3 sync ../public/ s3://easyshop-product-images --region eu-north-1
    ```
2.  **Update Configuration:**
      * Get your **CloudFront Domain Name** from the Terraform output or AWS Console.
      * Update `next.config.js` and `04-configmap.yaml` with your CDN URL:
        ```yaml
        CDN_URL: "https://your-distribution-id.cloudfront.net"
        ```

-----

## ☸️ Step 3: EKS Cluster Setup

1.  **Create Cluster:**
    ```bash
    eksctl create cluster --name=easyshop \
      --region=eu-north-1 \
      --version=1.30 \
      --nodegroup-name=easyshop-nodes \
      --node-type=t3.medium \
      --nodes=2
    ```
2.  **Update Kubeconfig:**
    ```bash
    aws eks update-kubeconfig --region eu-north-1 --name easyshop
    ```

-----

## 🛡️ Step 4: Security & CI Setup (Jenkins)

### 1\. Install Security Tools on Jenkins Agent

Run these commands on your **Jenkins Agent** EC2 instance:

  * **SonarQube (via Docker):**
    ```bash
    docker run -d --name sonarqube -p 9000:9000 sonarqube:lts-community
    ```

### 2\. Configure Jenkins Plugins

Go to **Manage Jenkins \> Plugins \> Available** and install:

  - `SonarQube Scanner`
  - `OWASP Dependency-Check`
  - `Email Extension Plugin`
  - `Docker Pipeline`

### 3\. Add SonarQube & OWASP in Jenkins

  - **SonarQube:** Go to *Manage Jenkins \> System*. Add SonarQube Server URL (`http://<agent-ip>:9000`) and Server Authentication Token.
  - **OWASP:** Go to *Manage Jenkins \> Tools*. Add "Dependency-Check" and select "Install automatically" from GitHub.

### 4\. Setup Email Notifications

1.  Go to **Manage Jenkins \> System \> Extended E-mail Notification**.
2.  Set SMTP Server (e.g., `smtp.gmail.com`), Port `465`.
3.  Under **Advanced**, add your email and an **App Password**.

## 🚀 Step 5: Application Deployment (ArgoCD)

1.  **Install ArgoCD:**
    ```bash
    kubectl create namespace argocd
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    ```
2.  **Configure Ingress & NextAuth:**
      * Obtain your **Load Balancer IP/DNS** from the Nginx Ingress service.
      * **Update `04-configmap.yaml` & `10-ingress.yaml`:**
        ```yaml
        NEXTAUTH_URL: "https://<your-load-balancer-ip-or-domain>/"
        NEXT_PUBLIC_API_URL: "https://<your-load-balancer-ip-or-domain>/api"
        ```
      * Replace the host in `10-ingress.yaml` with your domain or NIP.io address.

-----

## 📊 Monitoring (Prometheus & Grafana)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace prometheus
helm install prometheus prometheus-community/kube-prometheus-stack -n prometheus
```

*Access Grafana using the default credentials: `admin` / `prom-operator`.*

-----

## 🧹 Clean Up

```bash
eksctl delete cluster --name=easyshop --region=eu-north-1
terraform destroy -auto-approve
```

-----
