@Library('Shared') _

pipeline {
    agent any
    
    environment {
        // Update the main app image name to match the deployment file
        SONAR_HOME = tool "Sonar"
        DOCKER_IMAGE_NAME = 'ishu11/e-shop-app'
        DOCKER_MIGRATION_IMAGE_NAME = 'ishu/e-shop-migration'
        DOCKER_IMAGE_TAG = "${BUILD_NUMBER}"
        GITHUB_CREDENTIALS = credentials('github-credentials')
        GIT_BRANCH = "main"
    }
    
    stages {
        stage('Cleanup Workspace') {
            steps {
                script {
                    clean_ws()
                }
            }
        }
        
        stage('Clone Repository') {
            steps {
                script {
                    clone("https://github.com/IshuAgrawal11/production-ready-e-commerce-application.git","main")
                }
            }
        }
        
        stage('Cleanup Docker Environment') {
            steps {
                script {
                    sh "docker image prune -f"
                    sh "docker image prune -a -f --filter 'until=24h'"
                    sh "docker rmi -f ${env.DOCKER_IMAGE_NAME}:${env.DOCKER_IMAGE_TAG} || true"
                    sh "docker rmi -f ${env.DOCKER_MIGRATION_IMAGE_NAME}:${env.DOCKER_IMAGE_TAG} || true"
                }
            }
        }
        
         stage("Trivy: Filesystem scan"){
            steps{
                script{
                    trivy_scan()
                }
            }
        }

        stage("OWASP: Dependency check"){
            steps{
                script{
                    owasp_dependency()
                }
            }
        }
        
        stage("SonarQube: Code Analysis"){
            steps{
                script{
                    sonarqube_analysis("Sonar","wanderlust","wanderlust")
                }
            }
        }
        
        stage("SonarQube: Code Quality Gates"){
            steps{
                script{
                    sonarqube_code_quality()
                }
            }
        }
        
        stage('Build Docker Images') {
            parallel {
                stage('Build Main App Image') {
                    steps {
                        script {
                            docker_build(
                                imageName: env.DOCKER_IMAGE_NAME,
                                imageTag: env.DOCKER_IMAGE_TAG,
                                dockerfile: 'Dockerfile',
                                context: '.'
                            )
                        }
                    }
                }
                
                stage('Build Migration Image') {
                    steps {
                        script {
                            docker_build(
                                imageName: env.DOCKER_MIGRATION_IMAGE_NAME,
                                imageTag: env.DOCKER_IMAGE_TAG,
                                dockerfile: 'scripts/Dockerfile.migration',
                                context: '.'
                            )
                        }
                    }
                }
            }
        }
        
        stage('Run Unit Tests') {
            steps {
                script {
                    run_tests()
                }
            }
        }
        
        stage('Push Docker Images') {
            parallel {
                stage('Push Main App Image') {
                    steps {
                        script {
                            docker_push(
                                imageName: env.DOCKER_IMAGE_NAME,
                                imageTag: env.DOCKER_IMAGE_TAG,
                                credentials: 'docker-hub-credentials'
                            )
                        }
                    }
                }
                
                stage('Push Migration Image') {
                    steps {
                        script {
                            docker_push(
                                imageName: env.DOCKER_MIGRATION_IMAGE_NAME,
                                imageTag: env.DOCKER_IMAGE_TAG,
                                credentials: 'docker-hub-credentials'
                            )
                        }
                    }
                }
            }
        }
        
        stage('Update Kubernetes Manifests') {
            steps {
                script {
                    update_k8s_manifests(
                        imageTag: env.DOCKER_IMAGE_TAG,
                        manifestsPath: 'kubernetes',
                        gitCredentials: 'github-credentials',
                        gitUserName: 'Jenkins CI',
                        gitUserEmail: 'ishuagrawal1103@gmail.com'
                    )
                }
            }
        }
    } 
    post {
        success {
            emailext from: 'ishuagrawal1103@gmail.com',
                     to: 'ishuagrawal1103@gmail.com',
                     body: "Build success for easyshop CICD App - Job ${env.BUILD_NUMBER}",
                     subject: 'Build success for Demo CICD App'
        } 
        failure {
            emailext from: 'ishuagrawal1103@gmail.com',
                     to: 'ishuagrawal1103@gmail.com',
                     body: "Build Failed for easyshop CICD App - Check logs at ${env.BUILD_URL}",
                     subject: 'Build Failed for Demo CICD App'
        }
    }
}
