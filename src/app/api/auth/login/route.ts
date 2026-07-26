import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import User from "@/lib/models/user";
import dbConnect from "@/lib/db";
import { generateToken } from "@/lib/auth/utils";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE, authCookieOptions } from "@/lib/auth/cookie";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { loginAttemptsTotal, loginFailuresTotal, trackRequest } from "@/lib/metrics";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  return trackRequest("/api/auth/login", "POST", async () => {
    loginAttemptsTotal.inc();
    try {
      const ip = getClientIp(request);
      if (!checkRateLimit(`login:${ip}`, 10, 60 * 1000)) {
        logger.warn({ ip }, "login rate limit exceeded");
        return NextResponse.json(
          { error: "Too many login attempts. Please try again later." },
          { status: 429 }
        );
      }

      const parsed = loginSchema.safeParse(await request.json());
      if (!parsed.success) {
        loginFailuresTotal.inc();
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      const { email, password } = parsed.data;

      await dbConnect();

      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        loginFailuresTotal.inc();
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        loginFailuresTotal.inc();
        logger.warn({ userId: user._id.toString() }, "login failed: bad password");
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const token = await generateToken({
        userId: user._id.toString(),
        role: user.role,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        ...authCookieOptions,
        maxAge: AUTH_COOKIE_MAX_AGE,
      });

      logger.info({ userId: user._id.toString() }, "login succeeded");
      return response;
    } catch (error) {
      logger.error({ err: error }, "login error");
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
  });
}
