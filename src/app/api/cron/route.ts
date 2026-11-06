// Traite les étapes "Attendre" arrivées à échéance et rafraîchit les jetons Instagram.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processDueJobs } from "@/lib/engine";
import { refreshToken } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const processed = await processDueJobs();

  // Les jetons longue durée expirent après 60 jours : on les renouvelle 10 jours avant.
  const soon = new Date(Date.now() + 10 * 86_400_000);
  const expiring = await prisma.igAccount.findMany({ where: { isDemo: false, tokenExpiresAt: { lte: soon }, accessToken: { not: null } } });
  let refreshed = 0;
  for (const acc of expiring) {
    try {
      const t = await refreshToken(acc.accessToken!);
      await prisma.igAccount.update({ where: { id: acc.id }, data: { accessToken: t.accessToken, tokenExpiresAt: new Date(Date.now() + t.expiresIn * 1000) } });
      refreshed++;
    } catch (e) {
      console.error("refresh failed", acc.id, e);
    }
  }
  return NextResponse.json({ processed, refreshed });
}
