# Relayo

Outil d'automatisation Instagram : réponds automatiquement aux commentaires, aux DM et aux réponses de story avec des scénarios construits dans un éditeur visuel.

## Fonctionnalités

- **Éditeur visuel de scénarios** (glisser-déposer) avec les blocs : envoyer un message (avec boutons), répondre publiquement au commentaire, condition (étiquette ou texte), attendre, ajouter/retirer une étiquette.
- **Déclencheurs** : mot-clé en DM, commentaire sur une publication (toutes ou une précise), réponse à une story, réponse par défaut.
- **Commentaire → DM** : réponse publique variée + réponse privée (API « private replies » d'Instagram), puis DM classiques quand le contact clique sur un bouton.
- **Contacts** : chaque personne est enregistrée avec son historique, ses étiquettes, et une réponse manuelle possible.
- **Mode démo + simulateur** : chaque nouvel espace démarre avec un compte fictif et 3 scénarios d'exemple. Le simulateur rejoue exactement le même moteur que le webhook, sans rien envoyer.
- **Intégration officielle** : API Instagram avec connexion Instagram (OAuth), webhooks signés (`X-Hub-Signature-256`), jetons longue durée renouvelés automatiquement.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · React Flow · Prisma · PostgreSQL.

## Lancer en local

```bash
cp .env.example .env        # puis renseigne DATABASE_URL et AUTH_SECRET
npm install
npx prisma db push          # crée les tables
npm run dev
```

Ouvre http://localhost:3000, crée un compte, puis va dans **Simulateur** : choisis la première publication, envoie « LIEN » et clique sur le bouton reçu.

## Déployer (Vercel + Neon/Supabase)

1. Crée une base PostgreSQL (Neon, Supabase, Vercel Postgres…) et récupère son URL.
2. Importe le dépôt sur Vercel et ajoute les variables de `.env.example` (`APP_URL` = l'URL Vercel).
3. Lance une fois `npx prisma db push` avec la `DATABASE_URL` de production.
4. `vercel.json` déclare un cron chaque minute sur `/api/cron` (étapes « Attendre » + renouvellement des jetons). Le plan gratuit de Vercel limite les crons à un par jour : sur ce plan, utilise un service externe (cron-job.org…) qui appelle `GET /api/cron` avec l'en-tête `Authorization: Bearer <CRON_SECRET>`.

## Brancher Instagram

1. Sur https://developers.facebook.com/apps, crée une app **Entreprise** et ajoute le produit **Instagram → API avec connexion Instagram**.
2. Renseigne `INSTAGRAM_APP_ID` et `INSTAGRAM_APP_SECRET` (identifiants de l'app *Instagram*, pas ceux de l'app Facebook).
3. URL de redirection OAuth : `https://TON-DOMAINE/api/instagram/callback`.
4. Webhook : URL `https://TON-DOMAINE/api/webhooks/instagram`, jeton = `META_VERIFY_TOKEN`, champs `comments`, `messages`, `messaging_postbacks`.
5. Dans l'app, **Réglages → Connecter Instagram** avec un compte professionnel (Business ou Créateur).

En mode développement Meta, seuls les comptes ajoutés comme testeurs de l'app peuvent se connecter. Pour ouvrir à tous, il faut passer l'App Review de Meta pour `instagram_business_manage_messages` et `instagram_business_manage_comments`.

### Limites imposées par Instagram

- Un DM ne peut être envoyé que dans les **24 h** suivant le dernier message du contact (les blocs « Attendre » plus longs échoueront).
- Une seule réponse privée par commentaire, dans les 7 jours.
- 3 boutons maximum par message, titres de 20 caractères.

## Structure

```
src/lib/engine.ts        moteur d'exécution des scénarios
src/lib/instagram.ts     client API Instagram (OAuth, envoi, signature)
src/app/api/webhooks/    réception des événements Meta
src/app/app/automations/ éditeur visuel (React Flow)
src/app/app/simulator/   simulateur du mode démo
prisma/schema.prisma     modèle de données
```
