import { NextResponse } from "next/server";
import type { MatchType, Prisma } from "@prisma/client";
import { apiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Flow } from "@/lib/flow";

type Body = { name?: string; active?: boolean; keywords?: string[]; matchType?: MatchType; postId?: string | null; flow?: Flow };

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const b = (await req.json()) as Body;
  const existing = await prisma.automation.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (b.flow && (!Array.isArray(b.flow.nodes) || !Array.isArray(b.flow.edges) || !b.flow.nodes.some((n) => n.id === "trigger"))) {
    return NextResponse.json({ error: "Scénario invalide" }, { status: 400 });
  }
  const updated = await prisma.automation.update({
    where: { id },
    data: {
      ...(b.name !== undefined ? { name: b.name.slice(0, 120) } : {}),
      ...(b.active !== undefined ? { active: b.active } : {}),
      ...(b.keywords ? { keywords: b.keywords.map((k) => k.trim()).filter(Boolean).slice(0, 30) } : {}),
      ...(b.matchType ? { matchType: b.matchType } : {}),
      ...(b.postId !== undefined ? { postId: b.postId || null } : {}),
      ...(b.flow ? { flow: b.flow as unknown as Prisma.InputJsonValue } : {}),
    },
  });
  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.automation.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
