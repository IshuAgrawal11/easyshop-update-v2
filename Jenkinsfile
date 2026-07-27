@Library('EasyShop-jenkins-shared-lib@main') _

pipeline {
    agent any

    environment {
        // Update the main app image name to match the deployment file
        DOCKER_IMAGE_NAME = 'iemafzal/easyshop-app'
        DOCKER_MIGRATION_IMAGE_NAME = 'iemafzal/easyshop-migration'
        DOCKER_IMAGE_TAG = "${BUILD_NUMBER}"
        AWS_CREDENTIALS = credentials('aws-credentials')
        GITHUB_CREDENTIALS = credentials('github-credentials')
        GIT_BRANCH = "tf-DevOps"
        // Fill in with your team's notification address(es) before use.
        NOTIFY_EMAIL = 'team@example.com'
    }

    stages {
        stage('Check for CI Skip') {
            steps {
                script {
                    def commitMessage = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
                    echo "Commit message: ${commitMessage}"
                    if (commitMessage.contains('[ci skip]') || commitMessage.contains('[skip ci]')) {
                        echo "Found CI skip directive in commit message, aborting build"
                        currentBuild.result = 'ABORTED'
                        error("Build skipped due to [ci skip] directive")
                    }
                }
            }
        }

        stage('Cleanup Workspace') {
            steps {
                script {
                    cleanupWorkspace()
                }
            }
        }

        stage('Clone Repository') {
            steps {
                script {
                    checkoutRepo()
                }
            }
        }

        stage('Install Dependencies & Run Tests') {
            steps {
                sh 'npm ci'
                sh 'npm run lint'
                sh 'npm test -- --ci --coverage'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'junit.xml'
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('OWASP Dependency-Check') {
            steps {
                sh 'mkdir -p dependency-check-report'
                sh '''
                    docker run --rm \
                      -v "$WORKSPACE":/src \
                      -v dependency-check-data:/usr/share/dependency-check/data \
                      owasp/dependency-check:latest \
                      --scan /src \
                      --format ALL \
                      --out /src/dependency-check-report \
                      --project EasyShop \
                      --exclude "**/node_modules/**" \
                      --exclude "**/.next/**" \
                      --failOnCVSS 9
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'dependency-check-report/**', allowEmptyArchive: true
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                // Requires the SonarQube Scanner plugin and a server named
                // "SonarQube" configured under Manage Jenkins > System > SonarQube servers.
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        docker run --rm \
                          -e SONAR_HOST_URL="$SONAR_HOST_URL" \
                          -e SONAR_TOKEN="$SONAR_AUTH_TOKEN" \
                          -v "$WORKSPACE":/usr/src \
                          sonarsource/sonar-scanner-cli
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                // Requires a webhook from the SonarQube server back to this
                // Jenkins instance (Administration > Configuration > Webhooks).
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Trivy Filesystem Scan') {
            steps {
                sh 'mkdir -p trivy-results'
                sh '''
                    trivy fs \
                      --severity HIGH,CRITICAL \
                      --exit-code 1 \
                      --format json \
                      -o trivy-results/fs-scan.json \
                      --ignoredirs node_modules,.next \
                      .
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-results/fs-scan.json', allowEmptyArchive: true
                }
            }
        }

        stage('Build Docker Images') {
            parallel {
                stage('Build Main App Image') {
                    steps {
                        script {
                            buildDockerImage(
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
                            buildDockerImage(
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

        stage('Security Scan with Trivy') {
            steps {
                script {
                    // Create directory for results
                    sh "mkdir -p trivy-results"

                    // Run scans sequentially to avoid conflicts
                    echo "Scanning main application image..."
                    trivyScan(
                        imageName: env.DOCKER_IMAGE_NAME,
                        imageTag: env.DOCKER_IMAGE_TAG,
                        threshold: 150,
                        severity: 'HIGH,CRITICAL'
                    )

                    echo "Scanning migration image..."
                    trivyScan(
                        imageName: env.DOCKER_MIGRATION_IMAGE_NAME,
                        imageTag: env.DOCKER_IMAGE_TAG,
                        threshold: 150,
                        severity: 'HIGH,CRITICAL'
                    )
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-results/*.json,trivy-results/*.html', allowEmptyArchive: true
                }
            }
        }

        stage('Push Docker Images') {
            parallel {
                stage('Push Main App Image') {
                    steps {
                        script {
                            pushDockerImage(
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
                            pushDockerImage(
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
                    updateK8sManifests(
                        imageTag: env.DOCKER_IMAGE_TAG,
                        manifestsPath: 'kubernetes',
                        gitCredentials: 'github-credentials',
                        gitUserName: 'Jenkins CI',
                        gitUserEmail: 'iemafzalhassan@gmail.com'
                    )
                }
            }
        }
    }

    post {
        always {
            script {
                generateReport(
                    projectName: 'EasyShop',
                    imageName: "${env.DOCKER_IMAGE_NAME}, ${env.DOCKER_MIGRATION_IMAGE_NAME}",
                    imageTag: env.DOCKER_IMAGE_TAG
                )
            }
        }
        success {
            emailext(
                to: "${env.NOTIFY_EMAIL}",
                subject: "SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Build succeeded: ${env.BUILD_URL}"
            )
        }
        failure {
            emailext(
                to: "${env.NOTIFY_EMAIL}",
                subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Build failed: ${env.BUILD_URL}console"
            )
        }
    }
}
