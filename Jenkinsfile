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
        AWS_REGION = 'eu-north-1'
        EKS_CLUSTER_NAME = 'easyshop'
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
        
        stage('Trivy: Image scan') {
            steps {
                sh "trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed ${env.DOCKER_IMAGE_NAME}:${env.DOCKER_IMAGE_TAG}"
                sh "trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed ${env.DOCKER_MIGRATION_IMAGE_NAME}:${env.DOCKER_IMAGE_TAG}"
            }
        }

        stage('Run Unit Tests') {
            steps {
                // Test the actual built image rather than the raw workspace:
                // the Dockerfile's `builder` target already has full
                // devDependencies installed, and this hits Docker's build
                // cache from the "Build Docker Images" stage above, so it's
                // fast.
                sh "docker build --target builder -t ${env.DOCKER_IMAGE_NAME}:test-builder ."
                sh "docker run --rm ${env.DOCKER_IMAGE_NAME}:test-builder npm run test"
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

        stage('Deploy to EKS') {
            steps {
                // Authenticates via the Jenkins EC2 instance's own IAM role
                // (see terraform/iam.tf) — no separate AWS credential needed.
                sh "aws eks update-kubeconfig --region ${env.AWS_REGION} --name ${env.EKS_CLUSTER_NAME}"

                // Deliberately skips 00-cluster-issuer.yml and 10-ingress.yaml:
                // cert-manager/nginx-ingress-controller aren't installed on
                // this cluster yet, and applying them would fail outright
                // (unknown CRD). Add those back once you're on the
                // real-domain "fully deploy" phase.
                sh '''
                    kubectl apply -f kubernetes/01-namespace.yaml
                    kubectl apply -f kubernetes/02-mongodb-pv.yaml
                    kubectl apply -f kubernetes/03-mongodb-pvc.yaml
                    kubectl apply -f kubernetes/04-configmap.yaml
                    kubectl apply -f kubernetes/05-secrets.yaml
                    kubectl apply -f kubernetes/06-mongodb-service.yaml
                    kubectl apply -f kubernetes/13-mongodb-init-configmap.yaml
                    kubectl apply -f kubernetes/07-mongodb-statefulset.yaml
                    kubectl apply -f kubernetes/14-mongodb-networkpolicy.yaml
                '''

                // Wait for Mongo before the app/migration try to connect to it —
                // there's no equivalent to docker-compose's `depends_on:
                // condition: service_healthy` on Kubernetes.
                sh "kubectl rollout status statefulset/mongodb -n easyshop --timeout=180s"

                sh '''
                    kubectl apply -f kubernetes/08-easyshop-deployment.yaml
                    kubectl apply -f kubernetes/09-easyshop-service.yaml
                    kubectl apply -f kubernetes/11-hpa.yaml
                    kubectl apply -f kubernetes/15-easyshop-pdb.yaml
                '''

                // The deployment manifest's image tag is plain text
                // (`ishu11/e-shop-app:latest`) — `kubectl apply` only
                // triggers a rollout if the applied object's text actually
                // differs from what's live. If the "Update Kubernetes
                // Manifests" step upstream ever fails to bump that tag,
                // `kubectl apply` above would silently be a no-op and the
                // pipeline would report success without deploying anything
                // new. `kubectl set image` makes the current build's tag
                // authoritative regardless of what's in the file.
                sh "kubectl set image deployment/easyshop easyshop=${env.DOCKER_IMAGE_NAME}:${env.DOCKER_IMAGE_TAG} -n easyshop"

                // Jobs are immutable once created — delete before re-applying
                // so each deploy re-runs the migration against the current image.
                sh "kubectl delete job db-migration -n easyshop --ignore-not-found"
                sh "kubectl apply -f kubernetes/12-migration-job.yaml"

                sh "kubectl rollout status deployment/easyshop -n easyshop --timeout=180s"

                // Unlike the Deployment, the migration Job's outcome was
                // never actually checked before — a failed migration could
                // pass silently while the pipeline moved on to the smoke test.
                sh '''
                    if ! kubectl wait --for=condition=complete job/db-migration -n easyshop --timeout=120s; then
                      echo "Migration job did not complete successfully — logs:"
                      kubectl logs job/db-migration -n easyshop --tail=200 || true
                      exit 1
                    fi
                '''
            }
        }

        stage('Post-Deploy Smoke Test') {
            steps {
                script {
                    def lbHost = ''
                    timeout(time: 5, unit: 'MINUTES') {
                        waitUntil {
                            lbHost = sh(
                                script: "kubectl get svc easyshop-service -n easyshop -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'",
                                returnStdout: true
                            ).trim()
                            return lbHost != ''
                        }
                    }
                    env.EASYSHOP_LB_HOST = lbHost
                }
                sh '''
                    for i in $(seq 1 20); do
                      STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${EASYSHOP_LB_HOST}/api/health" || true)
                      if [ "$STATUS" = "200" ]; then
                        echo "Smoke test passed (health check returned 200)"
                        exit 0
                      fi
                      echo "Attempt $i: health check returned $STATUS, retrying in 15s..."
                      sleep 15
                    done
                    echo "Smoke test failed: /api/health never returned 200"
                    exit 1
                '''
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
