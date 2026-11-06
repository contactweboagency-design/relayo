import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Revient au compte de démonstration.
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), 303);
  await prisma.igAccount.update({
    where: { userId: user.id },
    data: { isDemo: true, accessToken: null, tokenExpiresAt: null, igUserId: `demo_${user.id}`, username: "ma_boutique.demo", profilePic: null },
  });
  return NextResponse.redirect(new URL("/app/settings", req.url), 303);
}
