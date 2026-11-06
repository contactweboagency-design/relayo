import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TRIGGER_LABELS } from "@/lib/flow";
import { PageHeader } from "../PageHeader";

export default async function Automations() {
  const user = await requireUser();
  const list = await prisma.automation.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageHeader title="Scénarios" subtitle="Chaque scénario démarre par un déclencheur Instagram." />
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-4 py-2 font-medium">Nom</th><th className="px-4 py-2 font-medium">Déclencheur</th><th className="hidden px-4 py-2 font-medium sm:table-cell">Mots-clés</th><th className="px-4 py-2 text-right font-medium">Exéc.</th><th className="px-4 py-2 font-medium">Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link className="font-medium text-ink hover:text-brand-700" href={`/app/automations/${a.id}`}>{a.name}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{TRIGGER_LABELS[a.triggerType]}</td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{a.keywords.join(", ") || <span className="text-slate-400">tous</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{a.runs}</td>
                  <td className="px-4 py-3">{a.active ? <span className="badge bg-brand-50 text-brand-700">Actif</span> : <span className="badge bg-slate-100 text-slate-500">Brouillon</span>}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Crée ton premier scénario →</td></tr>}
            </tbody>
          </table>
        </div>
        <form action="/api/automations" method="post" className="card h-fit space-y-4 p-4">
          <h2 className="font-semibold">Nouveau scénario</h2>
          <div>
            <label className="label" htmlFor="name">Nom</label>
            <input id="name" name="name" className="input" placeholder="Ex. : Lien du guide gratuit" />
          </div>
          <fieldset className="space-y-2">
            <legend className="label">Déclencheur</legend>
            {Object.entries(TRIGGER_LABELS).map(([k, v], i) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type="radio" name="triggerType" value={k} defaultChecked={i === 1} className="accent-brand-600" /> {v}
              </label>
            ))}
          </fieldset>
          <button className="btn-primary w-full">Créer et ouvrir l&apos;éditeur</button>
        </form>
      </div>
    </>
  );
}
