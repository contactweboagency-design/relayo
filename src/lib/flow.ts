// Types partagés entre l'éditeur (client) et le moteur (serveur).

export type ButtonDef = { id: string; title: string; type: "postback" | "url"; url?: string };

export type NodeData =
  | { kind: "trigger" }
  | { kind: "message"; text: string; buttons: ButtonDef[] }
  | { kind: "condition"; check: "has_tag" | "text_contains"; value: string }
  | { kind: "delay"; amount: number; unit: "minutes" | "hours" | "days" }
  | { kind: "tag"; action: "add" | "remove"; tag: string }
  | { kind: "comment_reply"; texts: string[] };

export type FlowNode = { id: string; type: string; position: { x: number; y: number }; data: NodeData };
export type FlowEdge = { id: string; source: string; target: string; sourceHandle?: string | null };
export type Flow = { nodes: FlowNode[]; edges: FlowEdge[] };

export const TRIGGER_LABELS: Record<string, string> = {
  DM_KEYWORD: "Mot-clé en message privé",
  COMMENT_KEYWORD: "Commentaire sur une publication",
  STORY_REPLY: "Réponse à une story",
  DEFAULT_REPLY: "Réponse par défaut",
};

export function uid(prefix = "n") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function starterFlow(triggerType: string): Flow {
  const msgId = uid();
  const nodes: FlowNode[] = [
    { id: "trigger", type: "trigger", position: { x: 0, y: 0 }, data: { kind: "trigger" } },
    {
      id: msgId,
      type: "message",
      position: { x: 360, y: 0 },
      data: {
        kind: "message",
        text:
          triggerType === "COMMENT_KEYWORD"
            ? "Salut {{username}} ! Merci pour ton commentaire 🙌 Voici ce que tu m'as demandé :"
            : "Salut {{username}} ! Merci pour ton message 👋",
        buttons: [],
      },
    },
  ];
  const edges: FlowEdge[] = [{ id: uid("e"), source: "trigger", target: msgId, sourceHandle: "next" }];
  if (triggerType === "COMMENT_KEYWORD") {
    const replyId = uid();
    nodes.splice(1, 0, {
      id: replyId,
      type: "comment_reply",
      position: { x: 360, y: -200 },
      data: { kind: "comment_reply", texts: ["Je t'envoie ça en DM ✉️", "C'est parti, regarde tes messages 📩"] },
    });
    edges[0] = { id: uid("e"), source: "trigger", target: replyId, sourceHandle: "next" };
    edges.push({ id: uid("e"), source: replyId, target: msgId, sourceHandle: "next" });
    nodes[2].position = { x: 720, y: -100 };
  }
  return { nodes, edges };
}

export function matchesKeywords(text: string, keywords: string[], matchType: "CONTAINS" | "EXACT") {
  if (keywords.length === 0) return true;
  const t = normalize(text);
  return keywords.some((k) => {
    const kw = normalize(k);
    if (!kw) return false;
    return matchType === "EXACT" ? t === kw : t.includes(kw);
  });
}

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
