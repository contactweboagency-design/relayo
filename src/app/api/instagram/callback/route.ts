import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exchangeCode, getProfile, subscribeWebhooks } from "@/lib/instagram";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await apiUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const jar = await cookies();
  const back = (msg: string) => NextResponse.redirect(new URL(`/app/settings?error=${encodeURIComponent(msg)}`, req.url));
  if (url.searchParams.get("error")) return back(url.searchParams.get("error_description") || "Connexion annulée");
  if (!url.searchParams.get("state") || url.searchParams.get("state") !== jar.get("ig_state")?.value) return back("État OAuth invalide");
  jar.delete("ig_state");

  try {
    const code = url.searchParams.get("code")!.replace(/#_$/, "");
    const { accessToken, expiresIn } = await exchangeCode(code);
    const profile = await getProfile(accessToken);
    await subscribeWebhooks(accessToken).catch((e) => console.error("subscribe failed", e));

    // Un compte Instagram ne peut être relié qu'à un seul espace.
    await prisma.igAccount.deleteMany({ where: { igUserId: profile.user_id, NOT: { userId: user.id } } });
    const data = {
      igUserId: profile.user_id,
      username: profile.username,
      profilePic: profile.profile_picture_url ?? null,
      accessToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      isDemo: false,
    };
    await prisma.igAccount.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
    return NextResponse.redirect(new URL("/app/settings?connected=1", req.url));
  } catch (e) {
    return back((e as Error).message);
  }
}
