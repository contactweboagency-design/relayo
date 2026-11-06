import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { starterFlow, uid, type Flow } from "./flow";

export const DEMO_POSTS = [
  { id: "demo_post_1", caption: "Nouvelle collection automne 🍂 Commente LIEN pour recevoir le catalogue", color: "from-amber-400 to-rose-500" },
  { id: "demo_post_2", caption: "Mon guide gratuit pour lancer ta boutique. Commente GUIDE 👇", color: "from-emerald-400 to-cyan-500" },
  { id: "demo_post_3", caption: "Concours ! Commente avec ton emoji préféré pour participer", color: "from-violet-500 to-fuchsia-500" },
];

export async function createDemoWorkspace(userId: string) {
  await prisma.igAccount.create({
    data: { userId, igUserId: `demo_${userId}`, username: "ma_boutique.demo", isDemo: true },
  });

  // Exemple 1 : commentaire "LIEN" -> réponse publique + DM avec bouton -> lien.
  const reply = uid(), dm = uid(), link = uid(), tag = uid();
  const commentFlow: Flow = {
    nodes: [
      { id: "trigger", type: "trigger", position: { x: 0, y: 0 }, data: { kind: "trigger" } },
      { id: reply, type: "comment_reply", position: { x: 340, y: -40 }, data: { kind: "comment_reply", texts: ["Je t'envoie ça en DM ✉️", "Regarde tes messages 📩"] } },
      {
        id: dm, type: "message", position: { x: 680, y: -40 },
        data: { kind: "message", text: "Salut {{username}} ! Tu veux recevoir le catalogue de la nouvelle collection ?", buttons: [{ id: "b_yes", title: "Oui, envoie-le !", type: "postback" }] },
      },
      { id: tag, type: "tag", position: { x: 1020, y: -40 }, data: { kind: "tag", action: "add", tag: "catalogue" } },
      {
        id: link, type: "message", position: { x: 1340, y: -40 },
        data: { kind: "message", text: "Et voilà 🎉 Bonne découverte !", buttons: [{ id: "b_url", title: "Voir le catalogue", type: "url", url: "https://example.com/catalogue" }] },
      },
    ],
    edges: [
      { id: uid("e"), source: "trigger", target: reply, sourceHandle: "next" },
      { id: uid("e"), source: reply, target: dm, sourceHandle: "next" },
      { id: uid("e"), source: dm, target: tag, sourceHandle: "b_yes" },
      { id: uid("e"), source: tag, target: link, sourceHandle: "next" },
    ],
  };

  await prisma.automation.createMany({
    data: [
      {
        userId, name: "Catalogue par commentaire", active: true, triggerType: "COMMENT_KEYWORD",
        keywords: ["lien", "catalogue"], postId: "demo_post_1", flow: commentFlow as unknown as Prisma.InputJsonValue,
      },
      {
        userId, name: "Mot-clé PRIX en DM", active: true, triggerType: "DM_KEYWORD", keywords: ["prix", "tarif"],
        flow: (() => {
          const f = starterFlow("DM_KEYWORD");
          (f.nodes[1].data as { text: string }).text = "Hello {{username}} ! Nos prix démarrent à 29 €. Tu veux que je t'envoie la grille complète ?";
          return f;
        })() as unknown as Prisma.InputJsonValue,
      },
      {
        userId, name: "Message d'accueil", active: false, triggerType: "DEFAULT_REPLY", keywords: [],
        flow: starterFlow("DEFAULT_REPLY") as unknown as Prisma.InputJsonValue,
      },
    ],
  });
}
