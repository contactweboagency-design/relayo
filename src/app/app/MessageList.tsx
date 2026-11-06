"use client";
import { kindLabel } from "@/lib/labels";

export type Msg = {
  id: string; direction: "IN" | "OUT"; kind: string; text: string; status: string; createdAt: string;
  meta: Record<string, unknown> | null;
};
type Btn = { id: string; title: string; type: "postback" | "url"; url?: string };

export function MessageList({ messages, onButton }: { messages: Msg[]; onButton?: (m: Msg, b: Btn) => void }) {
  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const out = m.direction === "OUT";
        const buttons = ((m.meta?.buttons as Btn[]) ?? []).filter((b) => b.title);
        const publicKind = m.kind === "comment" || m.kind === "comment_reply";
        return (
          <div key={m.id} className={`flex flex-col ${out ? "items-end" : "items-start"}`}>
            <span className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-400">
              {kindLabel(m.kind)} · {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              {m.status === "failed" && <span className="text-red-500"> · échec</span>}
            </span>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                publicKind ? "border border-dashed border-slate-300 bg-white" : out ? "bg-brand-600 text-white" : "bg-slate-100"
              }`}
            >
              {m.text}
            </div>
            {buttons.length > 0 && (
              <div className="mt-1 flex w-full max-w-[80%] flex-col gap-1">
                {buttons.map((b) =>
                  b.type === "url" ? (
                    <a key={b.id} href={b.url} target="_blank" rel="noreferrer" className="rounded-lg border border-brand-500 bg-white px-3 py-1.5 text-center text-sm font-medium text-brand-700">{b.title} ↗</a>
                  ) : (
                    <button key={b.id} disabled={!onButton} onClick={() => onButton?.(m, b)} className="rounded-lg border border-brand-500 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 enabled:hover:bg-brand-50">{b.title}</button>
                  ),
                )}
              </div>
            )}
            {typeof m.meta?.error === "string" && <span className="mt-0.5 max-w-[80%] text-xs text-red-500">{m.meta.error}</span>}
          </div>
        );
      })}
    </div>
  );
}
