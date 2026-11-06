import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendManual } from "@/lib/engine";

async function load(id: string) {
  const user = await apiUser();
  if (!user?.account) return null;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  return contact ? { user, account: user.account, contact } : null;
}

// Envoi d'un message manuel
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await load((await params).id);
  if (!ctx) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { text } = (await req.json()) as { text: string };
  if (!text?.trim()) return NextResponse.json({ error: "Message vide" }, { status: 400 });
  const account = ctx.contact.isDemo ? { ...ctx.account, isDemo: true } : ctx.account;
  const msg = await sendManual(account, ctx.contact, text.trim());
  return NextResponse.json({ message: msg });
}

// Mise à jour des étiquettes
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await load((await params).id);
  if (!ctx) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { tags } = (await req.json()) as { tags: string[] };
  const clean = [...new Set((tags || []).map((t) => t.trim()).filter(Boolean))].slice(0, 50);
  await prisma.contact.update({ where: { id: ctx.contact.id }, data: { tags: clean } });
  return NextResponse.json({ tags: clean });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await load((await params).id);
  if (!ctx) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.contact.delete({ where: { id: ctx.contact.id } });
  return NextResponse.json({ ok: true });
}
