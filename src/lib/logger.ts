import pino from 'pino';

// Plain JSON to stdout — this is deliberately simple. In both Docker
// Compose and Kubernetes, the log SHIPPER (Grafana Alloy) reads container
// stdout/stderr directly; the app itself doesn't need to know Loki exists.
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: process.env.OTEL_SERVICE_NAME || 'easyshop' },
});
