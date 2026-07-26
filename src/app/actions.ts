"use server";

import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookie';

// The auth cookie itself is set server-side by the login/register API routes
// (see src/lib/auth/cookie.ts) — the browser stores it automatically from
// the Set-Cookie response header, so no client-triggered "create cookie"
// action is needed here.

export async function removeCookies() {
  const cookieStore = await cookies();
  cookieStore.delete({
    name: AUTH_COOKIE_NAME,
    path: "/",
  });
}

export async function getCookies(name: string) {
  const cookieStore = await cookies();
  return cookieStore.get(name);
}

export async function authenticated() {
  const token = await getCookies(AUTH_COOKIE_NAME);
  return !!token;
}
