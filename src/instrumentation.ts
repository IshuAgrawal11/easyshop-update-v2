export async function register() {
  // Only instrument the Node.js runtime (API routes, server components) -
  // the Edge runtime (middleware) doesn't support these instrumentations.
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { registerOTel } = await import('@vercel/otel');
  const { MongoDBInstrumentation } = await import('@opentelemetry/instrumentation-mongodb');
  const { IORedisInstrumentation } = await import('@opentelemetry/instrumentation-ioredis');

  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME || 'easyshop',
    instrumentations: [
      new MongoDBInstrumentation(),
      new IORedisInstrumentation(),
    ],
  });
}
