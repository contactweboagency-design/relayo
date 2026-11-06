import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Avatar } from "../Avatar";
import { PageHeader } from "../PageHeader";

export default async function Contacts({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string }> }) {
  const user = await requireUser();
  const { q, tag } = await searchParams;
  const [contacts, all] = await Promise.all([
    prisma.contact.findMany({
      where: {
        userId: user.id,
        ...(q ? { username: { contains: q.replace(/^@/, ""), mode: "insensitive" as const } } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: { lastInteractionAt: "desc" },
      take: 200,
      include: { _count: { select: { messages: true } } },
    }),
    prisma.contact.findMany({ where: { userId: user.id }, select: { tags: true } }),
  ]);
  const tags = [...new Set(all.flatMap((c) => c.tags))].sort();

  return (
    <>
      <PageHeader title="Contacts" subtitle="Toutes les personnes qui ont interagi avec ton compte." />
      <div className="space-y-4 p-6">
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Rechercher @pseudo" className="input max-w-xs" />
          <select name="tag" defaultValue={tag ?? ""} className="input max-w-[200px]">
            <option value="">Toutes les étiquettes</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-ghost">Filtrer</button>
        </form>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-4 py-2 font-medium">Contact</th><th className="px-4 py-2 font-medium">Étiquettes</th><th className="px-4 py-2 font-medium">Messages</th><th className="px-4 py-2 font-medium">Dernière interaction</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/contacts/${c.id}`} className="flex items-center gap-2 font-medium hover:text-brand-700">
                      <Avatar name={c.username ?? "?"} /> @{c.username ?? c.igsid}
                      {c.isDemo && <span className="badge bg-amber-50 text-amber-700">démo</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{c.tags.map((t) => <span key={t} className="badge bg-rose-50 text-rose-700">{t}</span>)}</div></td>
                  <td className="px-4 py-3 tabular-nums">{c._count.messages}</td>
                  <td className="px-4 py-3 text-slate-500">{c.lastInteractionAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                </tr>
              ))}
              {!contacts.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucun contact. Ils apparaîtront ici dès leur premier message ou commentaire.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
