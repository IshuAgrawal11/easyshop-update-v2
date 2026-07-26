# Full observability stack for the EKS cluster: metrics (Prometheus/
# Grafana), logs (Loki/Alloy), traces (Jaeger/OTel Collector) — mirrors the
# local docker-compose stack, using Helm charts instead of raw containers.
#
# Namespacing: everything here lives in "monitoring", separate from the
# app's "easyshop" namespace (created by kubernetes/01-namespace.yaml,
# applied separately via kubectl/Jenkins, not by Terraform).

resource "kubernetes_namespace_v1" "monitoring" {
  metadata {
    name = "monitoring"
  }
}

resource "random_password" "grafana_admin" {
  length  = 20
  special = false
}

output "grafana_admin_password" {
  description = "Grafana admin password (also settable via `kubectl get secret` after apply)"
  value       = random_password.grafana_admin.result
  sensitive   = true
}

# Prometheus + Grafana + Alertmanager + node-exporter + kube-state-metrics.
# Ships its own ~20 Kubernetes/node dashboards out of the box — not
# duplicating those; kubernetes/16-*.yaml and 17-*.yaml add the two
# app/MongoDB-specific ones via the dashboard sidecar below.
resource "helm_release" "kube_prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = kubernetes_namespace_v1.monitoring.metadata[0].name
  create_namespace = false

  values = [yamlencode({
    grafana = {
      adminPassword = random_password.grafana_admin.result
      persistence = {
        enabled = true
        size    = "5Gi"
      }
      # Prometheus and Jaeger datasources are auto-created by this chart
      # and the jaeger chart's own Grafana-datasource hook, respectively —
      # only Loki needs to be added explicitly here.
      additionalDataSources = [
        {
          name   = "Loki"
          type   = "loki"
          url    = "http://loki-gateway.monitoring.svc.cluster.local"
          access = "proxy"
        }
      ]
      # Auto-imports any ConfigMap labeled grafana_dashboard=1 in any
      # namespace — that's how kubernetes/16-easyshop-app-dashboard.yaml and
      # 17-mongodb-dashboard.yaml (applied separately, like the rest of
      # kubernetes/) get into Grafana without Terraform needing to know
      # about them directly.
      sidecar = {
        dashboards = {
          enabled         = true
          label           = "grafana_dashboard"
          searchNamespace = "ALL"
        }
      }
    }

    prometheus = {
      prometheusSpec = {
        retention = "15d"
        # Select ServiceMonitors/PodMonitors across every namespace, not
        # just ones carrying this release's own labels — simpler than
        # requiring every future ServiceMonitor to match a specific label
        # convention.
        serviceMonitorSelectorNilUsesHelmValues = false
        podMonitorSelectorNilUsesHelmValues     = false
        storageSpec = {
          volumeClaimTemplate = {
            spec = {
              accessModes = ["ReadWriteOnce"]
              resources   = { requests = { storage = "20Gi" } }
            }
          }
        }
      }
    }

    alertmanager = {
      alertmanagerSpec = {
        storage = {
          volumeClaimTemplate = {
            spec = {
              accessModes = ["ReadWriteOnce"]
              resources   = { requests = { storage = "2Gi" } }
            }
          }
        }
      }
    }
  })]

  depends_on = [aws_eks_addon.ebs_csi]
}

# Loki, monolithic mode (single-binary — appropriate at this scale, not the
# fully distributed microservices deployment mode). EBS-backed PVC via the
# EBS CSI driver instead of the local-filesystem-only setup used in Compose.
resource "helm_release" "loki" {
  name       = "loki"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "loki"
  namespace  = kubernetes_namespace_v1.monitoring.metadata[0].name

  values = [yamlencode({
    deploymentMode = "SingleBinary"
    loki = {
      commonConfig = { replication_factor = 1 }
      storage      = { type = "filesystem" }
      schemaConfig = {
        configs = [{
          from         = "2024-01-01"
          store        = "tsdb"
          object_store = "filesystem"
          schema       = "v13"
          index        = { prefix = "index_", period = "24h" }
        }]
      }
    }
    singleBinary = {
      replicas = 1
      persistence = {
        enabled = true
        size    = "20Gi"
      }
    }
    # These run as separate charts/components in the distributed mode —
    # explicitly disabled since SingleBinary mode doesn't need them.
    backend     = { replicas = 0 }
    read        = { replicas = 0 }
    write       = { replicas = 0 }
    ingester    = { replicas = 0 }
    querier     = { replicas = 0 }
    distributor = { replicas = 0 }
  })]

  depends_on = [aws_eks_addon.ebs_csi]
}

# Log shipping — Kubernetes-native pod-log discovery instead of the
# Docker-socket discovery used in Compose. Replaces Promtail (EOL March
# 2026, no further updates).
resource "helm_release" "alloy" {
  name       = "alloy"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "alloy"
  namespace  = kubernetes_namespace_v1.monitoring.metadata[0].name

  values = [yamlencode({
    alloy = {
      configMap = {
        content = <<-EOT
          discovery.kubernetes "pods" {
            role = "pod"
          }

          discovery.relabel "pods" {
            targets = discovery.kubernetes.pods.targets
            rule {
              source_labels = ["__meta_kubernetes_namespace"]
              target_label  = "namespace"
            }
            rule {
              source_labels = ["__meta_kubernetes_pod_name"]
              target_label  = "pod"
            }
            rule {
              source_labels = ["__meta_kubernetes_pod_container_name"]
              target_label  = "container"
            }
          }

          loki.source.kubernetes "pods" {
            targets    = discovery.relabel.pods.output
            forward_to = [loki.write.default.receiver]
          }

          loki.write "default" {
            endpoint {
              url = "http://loki-gateway.monitoring.svc.cluster.local/loki/api/v1/push"
            }
          }
        EOT
      }
    }
  })]

  depends_on = [helm_release.loki]
}

# All-in-one Jaeger, Badger (embedded, disk-persisted) storage — a real
# step up from memory-only, without the operational weight of a full
# Elasticsearch/Cassandra backend at this scale.
resource "helm_release" "jaeger" {
  name       = "jaeger"
  repository = "https://jaegertracing.github.io/helm-charts"
  chart      = "jaeger"
  namespace  = kubernetes_namespace_v1.monitoring.metadata[0].name

  values = [yamlencode({
    allInOne = {
      enabled = true
      extraEnv = [
        { name = "SPAN_STORAGE_TYPE", value = "badger" },
        { name = "BADGER_EPHEMERAL", value = "false" },
        { name = "BADGER_DIRECTORY_VALUE", value = "/badger/data" },
        { name = "BADGER_DIRECTORY_KEY", value = "/badger/key" },
      ]
      persistence = {
        enabled = true
        size    = "10Gi"
      }
    }
    # All-in-one mode is a single deployment — the separate
    # collector/query/agent charts are only for distributed deployments.
    collector = { enabled = false }
    query     = { enabled = false }
    agent     = { enabled = false }
    storage   = { type = "badger" }
    provisionDataStore = {
      cassandra     = false
      elasticsearch = false
      kafka         = false
    }
  })]

  depends_on = [aws_eks_addon.ebs_csi]
}

# Receives OTLP traces from the app, forwards to Jaeger — same pipeline
# shape as the local Compose otel-collector.
resource "helm_release" "otel_collector" {
  name       = "opentelemetry-collector"
  repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
  chart      = "opentelemetry-collector"
  namespace  = kubernetes_namespace_v1.monitoring.metadata[0].name

  values = [yamlencode({
    mode = "deployment"
    config = {
      receivers = {
        otlp = {
          protocols = {
            grpc = { endpoint = "0.0.0.0:4317" }
            http = { endpoint = "0.0.0.0:4318" }
          }
        }
      }
      exporters = {
        "otlp/jaeger" = {
          endpoint = "jaeger-collector.monitoring.svc.cluster.local:4317"
          tls      = { insecure = true }
        }
        prometheus = { endpoint = "0.0.0.0:8889" }
      }
      service = {
        pipelines = {
          traces = {
            receivers  = ["otlp"]
            processors = ["batch"]
            exporters  = ["otlp/jaeger"]
          }
          metrics = {
            receivers  = ["otlp"]
            processors = ["batch"]
            exporters  = ["prometheus"]
          }
        }
      }
    }
  })]

  depends_on = [helm_release.jaeger]
}
