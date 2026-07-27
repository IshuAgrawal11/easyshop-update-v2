import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Match the `secure` flag used when the cookie was set (login/register) -
  // deriving it from NODE_ENV instead of the actual request protocol could
  // otherwise mean this clear instruction is itself dropped by the browser
  // over plain HTTP, leaving the user still logged in.
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  // Clear both auth cookies - login sets `auth-token` and `token`, and
  // getTokenFromRequest checks `auth-token` first, so clearing only `token`
  // left sessions logged in after "logout".
  for (const name of ["token", "auth-token"]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      expires: new Date(0),
      secure: isHttps,
      sameSite: "strict",
      path: "/",
    });
  }

  return response;
}
