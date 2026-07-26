// Simple in-memory sliding-window limiter for a single Next.js instance.
// Good enough to blunt casual brute-force/mass-registration locally and in a
// single-replica deployment; a multi-replica production deployment should
// swap this for a shared store (e.g. Redis) so limits apply across instances.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function getClientIp(request: Request): string {
  // X-Forwarded-For is appended-to by each proxy hop, not replaced — our
  // own load balancer is the single trusted hop in front of this app, and
  // it appends the real client IP last. Taking the FIRST entry instead
  // (the common mistake) lets any client trivially bypass rate limiting by
  // sending their own fake `X-Forwarded-For: 1.2.3.4` header, since that
  // spoofed value would sort ahead of the real IP the load balancer adds.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return "unknown";
}
