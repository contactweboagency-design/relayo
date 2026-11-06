import { requireUser } from "@/lib/auth";
import { appUrl, IG_SCOPES, instagramConfigured, redirectUri } from "@/lib/instagram";
import { PageHeader } from "../PageHeader";

export default async function Settings({ searchParams }: { searchParams: Promise<{ error?: string; connected?: string }> }) {
  const user = await requireUser();
  const { error, connected } = await searchParams;
  const acc = user.account;
  const configured = instagramConfigured();
  const webhook = `${appUrl()}/api/webhooks/instagram`;

  return (
    <>
      <PageHeader title="Réglages" subtitle="Connexion Instagram et configuration de l'app Meta." />
      <div className="max-w-3xl space-y-6 p-6">
        {connected && <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">Compte Instagram connecté 🎉 Tes scénarios actifs répondent maintenant pour de vrai.</p>}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "config" ? "L'app Meta n'est pas encore configurée (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET manquants)." : error}
          </p>
        )}

        <section className="card p-5">
          <h2 className="font-semibold">Compte Instagram</h2>
          {acc && !acc.isDemo ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {acc.profilePic && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={acc.profilePic} alt="" className="h-10 w-10 rounded-full" />
                )}
                <div>
                  <p className="font-medium">@{acc.username}</p>
                  <p className="text-xs text-slate-500">Jeton valide jusqu&apos;au {acc.tokenExpiresAt?.toLocaleDateString("fr-FR") ?? "?"} (renouvelé automatiquement)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a href="/api/instagram/connect" className="btn-ghost">Reconnecter</a>
                <form action="/api/instagram/disconnect" method="post"><button className="btn-danger">Déconnecter</button></form>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-600">Tu utilises le compte de démonstration. Connecte un compte Instagram <b>professionnel</b> (Business ou Créateur) pour activer les vraies réponses.</p>
              {configured ? (
                <a href="/api/instagram/connect" className="btn-primary bg-gradient-to-r from-fuchsia-600 to-orange-500 hover:opacity-90">Connecter Instagram</a>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Configure d&apos;abord l&apos;app Meta (étapes ci-dessous), puis redéploie.</p>
              )}
            </div>
          )}
        </section>

        <section className="card space-y-4 p-5 text-sm">
          <h2 className="font-semibold">Configurer l&apos;app Meta (une seule fois)</h2>
          <ol className="list-decimal space-y-3 pl-5 text-slate-700">
            <li>Sur <a className="text-brand-700 underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a>, crée une app de type <b>Entreprise</b> et ajoute le produit <b>Instagram</b> → « API avec connexion Instagram ».</li>
            <li>Copie l&apos;<b>ID de l&apos;app Instagram</b> et sa <b>clé secrète</b> dans les variables <code>INSTAGRAM_APP_ID</code> et <code>INSTAGRAM_APP_SECRET</code>.</li>
            <li>Dans « Configurer la connexion professionnelle Instagram », ajoute cette URL de redirection :<Copy value={redirectUri()} /></li>
            <li>Dans « Configurer les webhooks », indique l&apos;URL de rappel et le jeton de vérification, puis abonne-toi aux champs <b>comments</b>, <b>messages</b> et <b>messaging_postbacks</b> :
              <Copy value={webhook} />
              <Copy value={process.env.META_VERIFY_TOKEN || "(définis META_VERIFY_TOKEN)"} />
            </li>
            <li>Autorisations demandées : {IG_SCOPES.map((s) => <code key={s} className="mr-1">{s}</code>)}. En mode développement, seuls les comptes ajoutés comme testeurs peuvent se connecter ; pour le public, fais valider l&apos;app par Meta (App Review).</li>
          </ol>
        </section>

        <section className="card p-5 text-sm">
          <h2 className="font-semibold">Profil</h2>
          <p className="mt-2 text-slate-600">{user.email}</p>
        </section>
      </div>
    </>
  );
}

function Copy({ value }: { value: string }) {
  return <code className="mt-1 block select-all break-all rounded-md bg-slate-100 px-2 py-1.5 text-xs">{value}</code>;
}
