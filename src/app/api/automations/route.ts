import { NextResponse } from "next/server";
import type { Prisma, TriggerType } from "@prisma/client";
import { apiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { starterFlow, TRIGGER_LABELS } from "@/lib/flow";

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const triggerType = String(form.get("triggerType") || "DM_KEYWORD") as TriggerType;
  if (!(triggerType in TRIGGER_LABELS)) return NextResponse.json({ error: "bad trigger" }, { status: 400 });
  const a = await prisma.automation.create({
    data: {
      userId: user.id,
      name: String(form.get("name") || "").trim() || `Nouveau scénario (${TRIGGER_LABELS[triggerType]})`,
      triggerType,
      keywords: [],
      flow: starterFlow(triggerType) as unknown as Prisma.InputJsonValue,
    },
  });
  return NextResponse.redirect(new URL(`/app/automations/${a.id}`, req.url), 303);
}
