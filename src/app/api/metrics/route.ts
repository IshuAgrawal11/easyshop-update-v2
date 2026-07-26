import { NextRequest, NextResponse } from 'next/server';
import { registry } from '@/lib/metrics';

// Prometheus scrapes this endpoint on the same port/host as the app itself
// (there's no separate metrics-only port), so it needs its own auth check —
// otherwise anyone who can reach the app can also read internal request-
// rate/latency data and process metrics. Prometheus's `bearer_token`/
// `bearer_token_file` scrape config option sends exactly this header.
export async function GET(request: NextRequest) {
  const expectedToken = process.env.METRICS_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: 'Metrics endpoint not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await registry.metrics();
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': registry.contentType },
  });
}
