import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Flow } from "@/lib/flow";
import { Builder } from "./Builder";

export default async function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const a = await prisma.automation.findFirst({ where: { id: (await params).id, userId: user.id } });
  if (!a) notFound();
  return (
    <Builder
      automation={{
        id: a.id,
        name: a.name,
        active: a.active,
        triggerType: a.triggerType,
        keywords: a.keywords,
        matchType: a.matchType,
        postId: a.postId,
        flow: a.flow as unknown as Flow,
      }}
    />
  );
}
