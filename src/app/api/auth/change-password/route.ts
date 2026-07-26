import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import User from "@/lib/models/user";
import dbConnect from "@/lib/db";
import { requireAuth } from "@/lib/auth/utils";

const changePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await dbConnect();

    const parsed = changePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { oldPassword, newPassword } = parsed.data;

    const user = await User.findById(auth.userId).select("+password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    user.password = newPassword;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message === "Authentication required" ? error.message : "Failed to change password" },
      { status: error.message === "Authentication required" ? 401 : 500 }
    );
  }
}
