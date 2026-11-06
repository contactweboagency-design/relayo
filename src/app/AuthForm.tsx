import Link from "next/link";
import { Logo } from "./Logo";

export function AuthForm({ mode, error }: { mode: "login" | "signup"; error?: string }) {
  const signup = mode === "signup";
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/"><Logo className="text-lg" /></Link>
        <form action={`/api/auth/${mode}`} method="post" className="card mt-6 space-y-4 p-6">
          <h1 className="text-xl font-semibold">{signup ? "Créer ton espace" : "Connexion"}</h1>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {signup && (
            <div>
              <label className="label" htmlFor="name">Nom</label>
              <input className="input" id="name" name="name" autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Mot de passe</label>
            <input className="input" id="password" name="password" type="password" required minLength={signup ? 8 : 1} autoComplete={signup ? "new-password" : "current-password"} />
          </div>
          <button className="btn-primary w-full">{signup ? "Créer mon compte" : "Se connecter"}</button>
          <p className="text-center text-sm text-slate-500">
            {signup ? <>Déjà inscrit ? <Link className="text-brand-700" href="/login">Connexion</Link></> : <>Pas encore de compte ? <Link className="text-brand-700" href="/signup">Inscription</Link></>}
          </p>
        </form>
      </div>
    </main>
  );
}
