import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TRIGGER_LABELS } from "@/lib/flow";
import { kindLabel } from "@/lib/labels";
import { PageHeader } from "./PageHeader";

export default async function Dashboard() {
  const user = await requireUser();
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [contacts, newContacts, sent, automations, recent] = await Promise.all([
    prisma.contact.count({ where: { userId: user.id } }),
    prisma.contact.count({ where: { userId: user.id, createdAt: { gte: since } } }),
    prisma.message.count({ where: { contact: { userId: user.id }, direction: "OUT", createdAt: { gte: since } } }),
    prisma.automation.findMany({ where: { userId: user.id }, orderBy: { runs: "desc" }, take: 5 }),
    prisma.message.findMany({
      where: { contact: { userId: user.id }, direction: "IN" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { contact: true },
    }),
  ]);
  const active = automations.filter((a) => a.active).length;

  return (
    <>
      <PageHeader title={`Bonjour${user.name ? ` ${user.name}` : ""} 👋`} subtitle="Voici ce qui s'est passé ces 7 derniers jours." />
      <div className="space-y-6 p-6">
        {user.account?.isDemo && (
          <div className="card flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-4 text-sm">
            <p>Tu es en <b>mode démo</b> : aucun vrai message n&apos;est envoyé. Teste tes scénarios dans le simulateur, puis connecte ton compte Instagram.</p>
            <div className="flex gap-2">
              <Link href="/app/simulator" className="btn-ghost">Ouvrir le simulateur</Link>
              <Link href="/app/settings" className="btn-primary">Connecter Instagram</Link>
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Contacts" value={contacts} />
          <Stat label="Nouveaux contacts (7 j)" value={newContacts} />
          <Stat label="Messages envoyés (7 j)" value={sent} />
          <Stat label="Scénarios actifs" value={active} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card">
            <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Scénarios les plus utilisés</h2>
            <ul className="divide-y divide-slate-100">
              {automations.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/automations/${a.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-slate-500">{TRIGGER_LABELS[a.triggerType]}</p>
                    </div>
                    <span className="text-sm tabular-nums text-slate-600">{a.runs} exéc.</span>
                  </Link>
                </li>
              ))}
              {!automations.length && <li className="px-4 py-6 text-sm text-slate-500">Aucun scénario pour l&apos;instant.</li>}
            </ul>
          </section>
          <section className="card">
            <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Derniers messages reçus</h2>
            <ul className="divide-y divide-slate-100">
              {recent.map((m) => (
                <li key={m.id}>
                  <Link href={`/app/contacts/${m.contactId}`} className="block px-4 py-3 hover:bg-slate-50">
                    <p className="text-sm"><b>@{m.contact.username ?? m.contact.igsid}</b> <span className="text-slate-400">· {kindLabel(m.kind)}</span></p>
                    <p className="truncate text-sm text-slate-600">{m.text}</p>
                  </Link>
                </li>
              ))}
              {!recent.length && <li className="px-4 py-6 text-sm text-slate-500">Rien pour l&apos;instant. Essaie le simulateur !</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
