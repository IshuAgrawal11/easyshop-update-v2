import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/utils";
import User from "@/lib/models/user";
import dbConnect from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await isAuthenticated(request);

    if (!auth || !auth.userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Connect to database and get user details
    await dbConnect();
    const user = await User.findById(auth.userId).select('-password');

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: "Authentication check failed" },
      { status: 401 }
    );
  }
}
