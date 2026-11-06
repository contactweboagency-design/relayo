"use client";
import { createContext, useContext, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { Clock, GitBranch, MessageCircle, MessageSquareReply, Send, Tag, Zap } from "lucide-react";
import type { NodeData } from "@/lib/flow";
import { TRIGGER_LABELS } from "@/lib/flow";

export const TriggerCtx = createContext<{ triggerType: string; keywords: string[]; postLabel?: string }>({ triggerType: "", keywords: [] });

const STYLES: Record<string, { color: string; icon: typeof Zap; label: string }> = {
  trigger: { color: "bg-amber-500", icon: Zap, label: "Déclencheur" },
  message: { color: "bg-brand-600", icon: Send, label: "Envoyer un message" },
  comment_reply: { color: "bg-sky-500", icon: MessageSquareReply, label: "Répondre au commentaire" },
  condition: { color: "bg-violet-500", icon: GitBranch, label: "Condition" },
  delay: { color: "bg-slate-500", icon: Clock, label: "Attendre" },
  tag: { color: "bg-rose-500", icon: Tag, label: "Étiquette" },
};
export const NODE_STYLES = STYLES;

function Shell({ type, selected, children, target = true }: { type: string; selected?: boolean; children: React.ReactNode; target?: boolean }) {
  const s = STYLES[type];
  const Icon = s.icon;
  return (
    <div className={`w-64 rounded-xl border bg-white shadow-sm ${selected ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"}`}>
      {target && <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-slate-400" />}
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md text-white ${s.color}`}><Icon className="h-3.5 w-3.5" /></span>
        <span className="text-xs font-semibold text-slate-700">{s.label}</span>
      </div>
      <div className="px-3 py-2 text-xs text-slate-600">{children}</div>
    </div>
  );
}

function Out({ id, top, label }: { id: string; top?: string; label?: string }) {
  return (
    <Handle
      type="source"
      id={id}
      position={Position.Right}
      style={top ? { top } : undefined}
      className="!h-3 !w-3 !border-2 !border-white !bg-brand-600"
      title={label}
    />
  );
}

export function TriggerNode({ selected }: NodeProps) {
  const t = useContext(TriggerCtx);
  return (
    <Shell type="trigger" selected={selected} target={false}>
      <p className="font-medium text-slate-800">{TRIGGER_LABELS[t.triggerType]}</p>
      {t.triggerType !== "DEFAULT_REPLY" && (
        <p className="mt-1">{t.keywords.length ? <>Mots-clés : <b>{t.keywords.join(", ")}</b></> : "N'importe quel texte"}</p>
      )}
      {t.triggerType === "COMMENT_KEYWORD" && <p className="mt-1 truncate">Publication : {t.postLabel ?? "toutes"}</p>}
      <Out id="next" />
    </Shell>
  );
}

export function MessageNode({ id, data, selected }: NodeProps) {
  const d = data as Extract<NodeData, { kind: "message" }>;
  const update = useUpdateNodeInternals();
  const buttons = d.buttons ?? [];
  const sig = buttons.map((b) => b.id + b.type).join();
  useEffect(() => { update(id); }, [sig, id, update]);
  const hasPostback = buttons.some((b) => b.type === "postback");
  return (
    <Shell type="message" selected={selected}>
      <p className="line-clamp-4 whitespace-pre-wrap rounded-lg bg-slate-100 px-2 py-1.5 text-slate-800">{d.text || <i className="text-slate-400">Message vide</i>}</p>
      {buttons.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {buttons.map((b) => (
            <div key={b.id} className="relative rounded-md border border-brand-500/40 px-2 py-1 text-center font-medium text-brand-700">
              {b.title || "Bouton"} {b.type === "url" && "↗"}
              {b.type === "postback" && <Out id={b.id} label={b.title} />}
            </div>
          ))}
        </div>
      )}
      {!hasPostback && <Out id="next" />}
    </Shell>
  );
}

export function CommentReplyNode({ data, selected }: NodeProps) {
  const d = data as Extract<NodeData, { kind: "comment_reply" }>;
  const texts = (d.texts ?? []).filter(Boolean);
  return (
    <Shell type="comment_reply" selected={selected}>
      <p className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> Réponse publique{texts.length > 1 ? ` (1 parmi ${texts.length}, au hasard)` : ""}</p>
      <p className="mt-1 line-clamp-2 italic">{texts[0] ?? "—"}</p>
      <Out id="next" />
    </Shell>
  );
}

export function ConditionNode({ data, selected }: NodeProps) {
  const d = data as Extract<NodeData, { kind: "condition" }>;
  return (
    <Shell type="condition" selected={selected}>
      <p>{d.check === "has_tag" ? "Le contact a l'étiquette" : "Le message contient"} <b>« {d.value || "…"} »</b></p>
      <div className="mt-2 space-y-1.5">
        <div className="relative rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">Oui<Out id="yes" /></div>
        <div className="relative rounded-md bg-red-50 px-2 py-1 font-medium text-red-700">Non<Out id="no" /></div>
      </div>
    </Shell>
  );
}

const UNITS = { minutes: "minute(s)", hours: "heure(s)", days: "jour(s)" };
export function DelayNode({ data, selected }: NodeProps) {
  const d = data as Extract<NodeData, { kind: "delay" }>;
  return (
    <Shell type="delay" selected={selected}>
      <p>Attendre <b>{d.amount} {UNITS[d.unit]}</b> puis continuer</p>
      <Out id="next" />
    </Shell>
  );
}

export function TagNode({ data, selected }: NodeProps) {
  const d = data as Extract<NodeData, { kind: "tag" }>;
  return (
    <Shell type="tag" selected={selected}>
      <p>{d.action === "remove" ? "Retirer" : "Ajouter"} l&apos;étiquette <b>{d.tag || "…"}</b></p>
      <Out id="next" />
    </Shell>
  );
}

export const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  comment_reply: CommentReplyNode,
  condition: ConditionNode,
  delay: DelayNode,
  tag: TagNode,
};
