export const AUTH_COOKIE_NAME = "token";

export const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// Shared so the cookie set at login/register and cleared at logout can never drift apart again.
export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};
