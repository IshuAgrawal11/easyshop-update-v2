import { registerOTel } from '@vercel/otel';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';

// Next.js calls this once, automatically, before the server starts handling
// requests. registerOTel() picks up the standard OTEL_EXPORTER_OTLP_ENDPOINT
// env var for where to send traces (set in docker-compose.yml / the
// Kubernetes Deployment) — no exporter wiring needed here.
//
// Deliberately using just the HTTP + MongoDB instrumentations rather than
// the full @opentelemetry/auto-instrumentations-node kitchen sink — that
// package also instruments fs/dns/net/etc., which is mostly noise for this
// app and would bloat every trace.
export function register() {
  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME || 'easyshop',
    instrumentations: [
      new HttpInstrumentation(),
      new MongoDBInstrumentation({ enhancedDatabaseReporting: true }),
    ],
  });
}
