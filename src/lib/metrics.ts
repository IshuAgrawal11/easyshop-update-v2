import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

// One shared registry for the whole process. Next.js can load this module
// multiple times per process (route handlers, middleware, etc.) — guard
// against re-registering the same metric name twice via the global cache
// pattern already used for the Mongoose connection (src/lib/db.ts).
declare global {
  var __easyshopMetrics:
    | {
        registry: Registry;
        httpRequestDuration: Histogram<string>;
        httpRequestsTotal: Counter<string>;
        ordersCreatedTotal: Counter<string>;
        loginAttemptsTotal: Counter<string>;
        loginFailuresTotal: Counter<string>;
      }
    | undefined;
}

function createMetrics() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [registry],
  });

  const ordersCreatedTotal = new Counter({
    name: 'orders_created_total',
    help: 'Total orders created',
    registers: [registry],
  });

  const loginAttemptsTotal = new Counter({
    name: 'login_attempts_total',
    help: 'Total login attempts',
    registers: [registry],
  });

  const loginFailuresTotal = new Counter({
    name: 'login_failures_total',
    help: 'Total failed login attempts',
    registers: [registry],
  });

  return {
    registry,
    httpRequestDuration,
    httpRequestsTotal,
    ordersCreatedTotal,
    loginAttemptsTotal,
    loginFailuresTotal,
  };
}

const metrics = global.__easyshopMetrics ?? createMetrics();
if (!global.__easyshopMetrics) {
  global.__easyshopMetrics = metrics;
}

export const {
  registry,
  httpRequestDuration,
  httpRequestsTotal,
  ordersCreatedTotal,
  loginAttemptsTotal,
  loginFailuresTotal,
} = metrics;

// Wraps a route handler to record request count/duration automatically,
// labeled by a caller-supplied route name (Next.js dynamic segments would
// otherwise blow up label cardinality if we used the raw URL path).
export function trackRequest(
  route: string,
  method: string,
  fn: () => Promise<Response>
): Promise<Response> {
  const start = process.hrtime.bigint();
  return fn().then(
    (response) => {
      recordRequest(route, method, response.status, start);
      return response;
    },
    (error) => {
      recordRequest(route, method, 500, start);
      throw error;
    }
  );
}

function recordRequest(route: string, method: string, status: number, start: bigint) {
  const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
  const labels = { method, route, status: String(status) };
  httpRequestDuration.observe(labels, durationSeconds);
  httpRequestsTotal.inc(labels);
}
