import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Conversation } from "./Conversation";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const c = await prisma.contact.findFirst({
    where: { id: (await params).id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 500 } },
  });
  if (!c) notFound();
  return (
    <div className="flex h-[calc(100vh-96px)] flex-col md:h-screen">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/app/contacts" className="btn-ghost px-2" aria-label="Retour"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="font-semibold">@{c.username ?? c.igsid}</h1>
          <p className="text-xs text-slate-500">Contact depuis le {c.createdAt.toLocaleDateString("fr-FR")}</p>
        </div>
      </div>
      <Conversation
        contactId={c.id}
        initialTags={c.tags}
        initial={c.messages.map((m) => ({ id: m.id, direction: m.direction, kind: m.kind, text: m.text, status: m.status, createdAt: m.createdAt.toISOString(), meta: m.meta as Record<string, unknown> | null }))}
      />
    </div>
  );
}
