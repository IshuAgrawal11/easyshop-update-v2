import { NextRequest, NextResponse } from "next/server";
import User from "@/lib/models/user";
import dbConnect from "@/lib/db";
import { generateToken } from "@/lib/auth/utils";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    await dbConnect();

    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create sanitized user object without password
    const { password: _, ...userWithoutPassword } = user.toObject();

    // Generate token
    const token = await generateToken({
      userId: user._id.toString(),
      role: user.role
    });

    const response = NextResponse.json({ 
      user: userWithoutPassword,
      token 
    }, { status: 200 });

    // Get the host from the request for dynamic cookie domain
    const host = request.headers.get('host') || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    // Derive from the actual request protocol, not NODE_ENV - browsers drop
    // Secure cookies over plain HTTP regardless of environment, and this app
    // is also deployed over plain HTTP directly to an EC2 IP (see NEXTAUTH_URL
    // comments), so `secure: NODE_ENV === 'production'` would silently break
    // login there since it forces Secure even without HTTPS.
    const isHttps =
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https';

    // Both cookies are httpOnly - the token is never read via client-side JS
    // (document.cookie); the browser sends cookies automatically on
    // same-origin requests and the server reads them directly.
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: isLocalhost ? 'lax' : 'none',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: isLocalhost ? 'lax' : 'none',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    // Add CORS headers - use the origin from the request if available
    const origin = request.headers.get('origin');
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}
