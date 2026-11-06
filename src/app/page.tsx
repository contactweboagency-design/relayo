import Link from "next/link";
import { MessageCircle, MessagesSquare, Users, Workflow } from "lucide-react";
import { Logo } from "./Logo";
import { getUserId } from "@/lib/auth";

export default async function Home() {
  const logged = Boolean(await getUserId());
  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo className="text-lg" />
        <nav className="flex gap-2">
          {logged ? (
            <Link href="/app" className="btn-primary">Ouvrir l&apos;app</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Connexion</Link>
              <Link href="/signup" className="btn-primary">Essayer gratuitement</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 md:grid-cols-2">
        <div>
          <span className="badge bg-brand-50 text-brand-700">Instagram · DM · Commentaires</span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
            Transforme chaque commentaire en conversation.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Relayo répond à ta place sur Instagram : un abonné commente « LIEN », il reçoit le lien en DM en quelques secondes.
            Construis tes scénarios en glissant des blocs, sans coder.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">Créer mon espace</Link>
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">J&apos;ai déjà un compte</Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">Mode démo inclus : teste tout sans connecter Instagram.</p>
        </div>
        <div className="relative rounded-3xl bg-gradient-to-br from-brand-50 to-amber-50 p-6">
          <div className="card space-y-3 p-4 shadow-sm">
            <Bubble who="in">Trop beau ! LIEN stp 😍</Bubble>
            <Bubble who="out">Je t&apos;envoie ça en DM ✉️</Bubble>
          </div>
          <div className="card mt-4 space-y-3 p-4 shadow-sm">
            <Bubble who="out">Salut @julie ! Voici le catalogue de la nouvelle collection 👇</Bubble>
            <div className="ml-auto w-fit rounded-lg border border-brand-500 px-3 py-1.5 text-sm font-medium text-brand-700">Voir le catalogue</div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-4">
          {[
            { icon: Workflow, t: "Éditeur visuel", d: "Déclencheurs, messages, boutons, conditions, délais et étiquettes." },
            { icon: MessageCircle, t: "Commentaires → DM", d: "Réponse publique + message privé automatique sur tes publications." },
            { icon: MessagesSquare, t: "Mots-clés en DM", d: "Réponds instantanément aux questions fréquentes." },
            { icon: Users, t: "Contacts", d: "Chaque personne qui interagit est enregistrée et étiquetée." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card p-5">
              <Icon className="h-6 w-6 text-brand-600" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="py-8 text-center text-xs text-slate-400">Relayo · utilise l&apos;API officielle Instagram de Meta</footer>
    </main>
  );
}

function Bubble({ who, children }: { who: "in" | "out"; children: React.ReactNode }) {
  return (
    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${who === "in" ? "bg-slate-100" : "ml-auto bg-brand-600 text-white"}`}>
      {children}
    </div>
  );
}
