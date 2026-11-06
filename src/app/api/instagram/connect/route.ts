import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUser } from "@/lib/auth";
import { authorizeUrl, instagramConfigured } from "@/lib/instagram";

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (!instagramConfigured()) return NextResponse.redirect(new URL("/app/settings?error=config", req.url));
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("ig_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(authorizeUrl(state));
}
