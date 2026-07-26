import { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface JWTPayload {
  userId: string;
  role: string;
  [key: string]: string;
}

export const generateToken = async (payload: JWTPayload): Promise<string> => {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  return token;
};

export const verifyToken = async (token: string): Promise<JWTPayload | null> => {
  if (!token || token === 'undefined' || token === '[object Object]') {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (!payload.userId || !payload.role) {
      return null;
    }

    return {
      userId: payload.userId as string,
      role: payload.role as string
    };
  } catch {
    return null;
  }
};

export const getTokenFromRequest = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token && token !== 'undefined' && token !== '[object Object]') {
      return token;
    }
  }

  const token = request.cookies.get('token')?.value;
  if (token && token !== 'undefined' && token !== '[object Object]') {
    return token;
  }

  return null;
};

export const isAuthenticated = async (request: NextRequest) => {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  return await verifyToken(token);
};

export const requireAuth = async (request: NextRequest) => {
  const auth = await isAuthenticated(request);
  if (!auth) {
    throw new Error('Authentication required');
  }
  return auth;
};

export const requireRole = async (request: NextRequest, roles: string[]) => {
  const auth = await requireAuth(request);
  if (!roles.includes(auth.role)) {
    throw new Error('Insufficient permissions');
  }
  return auth;
};
