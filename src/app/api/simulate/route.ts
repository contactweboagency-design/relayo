// Simulateur : rejoue les mêmes traitements que le webhook, sur le compte de démo.
import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleComment, handleDirectMessage, handlePostback, processDueJobs } from "@/lib/engine";

type Body =
  | { action: "dm"; username: string; text: string; story?: boolean }
  | { action: "comment"; username: string; text: string; mediaId: string }
  | { action: "button"; username: string; payload: string; title: string }
  | { action: "advance" }
  | { action: "reset"; username: string };

function igsidFor(username: string) {
  return `sim_${username.toLowerCase().replace(/[^a-z0-9._]/g, "") || "visiteur"}`;
}

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user?.account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Le simulateur n'envoie jamais de vrais messages : on force le mode démo pour cet appel.
  const account = { ...user.account, isDemo: true };
  const b = (await req.json()) as Body;
  if (b.action === "advance") return NextResponse.json({ processed: await processDueJobs({ userId: user.id, force: true }) });

  const username = b.username.trim().replace(/^@/, "") || "visiteur";
  const igsid = igsidFor(username);
  if (b.action === "reset") {
    await prisma.contact.deleteMany({ where: { userId: user.id, igsid } });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "dm") await handleDirectMessage(account, { igsid, username, text: b.text, storyReply: b.story });
  if (b.action === "comment") await handleComment(account, { igsid, username, text: b.text, mediaId: b.mediaId, commentId: `sim_c_${Date.now()}` });
  if (b.action === "button") await handlePostback(account, { igsid, payload: b.payload, title: b.title });
  await prisma.contact.updateMany({ where: { userId: user.id, igsid }, data: { isDemo: true } });
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const username = new URL(req.url).searchParams.get("username") || "visiteur";
  const contact = await prisma.contact.findUnique({
    where: { userId_igsid: { userId: user.id, igsid: igsidFor(username.replace(/^@/, "")) } },
    include: { messages: { orderBy: { createdAt: "asc" } }, jobs: { where: { status: "pending" } } },
  });
  return NextResponse.json({ contact });
}
