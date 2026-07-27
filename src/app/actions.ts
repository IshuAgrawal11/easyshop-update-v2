"use server";

import { cookies } from 'next/headers';

export async function createCookies(token: string) {
  const url = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000');

  const cookieStore = await cookies();
  cookieStore.set({
    name: "token",
    value: token,
    // httpOnly so the token isn't readable/exfiltrable via client-side JS
    // (XSS). The server already reads it directly from the request cookie
    // (see getTokenFromRequest), and the browser sends cookies automatically
    // via credentials:"include"/withCredentials, so client-side JS never
    // needs to read this cookie itself.
    httpOnly: true,
    // Only mark secure when actually served over HTTPS - browsers drop
    // secure cookies over plain HTTP, which would break local dev.
    secure: url.protocol === 'https:',
    sameSite: "lax",
    path: "/",
    domain: url.hostname === 'localhost' ? 'localhost' : undefined, // Let browser set domain for EC2
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function removeCookies() {
  const cookieStore = await cookies();
  cookieStore.delete({
    name: "token",
    path: "/",
  });
}

export async function getCookies(name: string) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(name);
  return cookie;
}

export async function authenticated() {
  const token = await getCookies("token");
  return !!token;
}
