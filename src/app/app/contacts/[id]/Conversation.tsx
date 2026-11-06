"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { MessageList, type Msg } from "../../MessageList";

export function Conversation({ contactId, initial, initialTags }: { contactId: string; initial: Msg[]; initialTags: string[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [tags, setTags] = useState(initialTags);
  const [text, setText] = useState("");
  const [newTag, setNewTag] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView(); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await fetch(`/api/contacts/${contactId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const d = await res.json();
    if (d.message) setMessages((m) => [...m, { ...d.message, createdAt: d.message.createdAt }]);
    setText("");
  }

  async function saveTags(next: string[]) {
    const res = await fetch(`/api/contacts/${contactId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags: next }) });
    setTags((await res.json()).tags);
  }

  async function remove() {
    if (!confirm("Supprimer ce contact et son historique ?")) return;
    await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    router.push("/app/contacts");
    router.refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <MessageList messages={messages} />
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-slate-200 bg-white p-3">
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Répondre manuellement…" />
          <button className="btn-primary" aria-label="Envoyer"><Send className="h-4 w-4" /></button>
        </form>
        <p className="bg-white px-3 pb-2 text-xs text-slate-400">Instagram n&apos;autorise les réponses que dans les 24 h suivant le dernier message du contact.</p>
      </div>
      <aside className="shrink-0 space-y-3 border-t border-slate-200 bg-white p-4 lg:w-72 lg:border-l lg:border-t-0">
        <h2 className="text-sm font-semibold">Étiquettes</h2>
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="badge gap-1 bg-rose-50 text-rose-700">
              {t}
              <button onClick={() => saveTags(tags.filter((x) => x !== t))} aria-label={`Retirer ${t}`}><X className="h-3 w-3" /></button>
            </span>
          ))}
          {!tags.length && <span className="text-xs text-slate-400">Aucune étiquette</span>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTag.trim()) saveTags([...tags, newTag.trim()]);
            setNewTag("");
          }}
          className="flex gap-2"
        >
          <input className="input" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Nouvelle étiquette" />
          <button className="btn-ghost">Ajouter</button>
        </form>
        <button onClick={remove} className="btn-danger w-full">Supprimer le contact</button>
      </aside>
    </div>
  );
}
