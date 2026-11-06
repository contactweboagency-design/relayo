"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FastForward, RotateCcw, Send } from "lucide-react";
import { MessageList, type Msg } from "../MessageList";

type Post = { id: string; caption: string; image?: string; color?: string };
type Mode = "dm" | "comment" | "story";

export function Simulator() {
  const [username, setUsername] = useState("julie.martin");
  const [mode, setMode] = useState<Mode>("comment");
  const [text, setText] = useState("LIEN");
  const [posts, setPosts] = useState<Post[]>([]);
  const [mediaId, setMediaId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/posts").then((r) => r.json()).then((d) => {
      setPosts(d.posts ?? []);
      if (d.posts?.[0]) setMediaId(d.posts[0].id);
    });
  }, []);

  const load = useCallback(async () => {
    const d = await (await fetch(`/api/simulate?username=${encodeURIComponent(username)}`)).json();
    setMessages(d.contact?.messages ?? []);
    setPending(d.contact?.jobs?.length ?? 0);
    setTags(d.contact?.tags ?? []);
  }, [username]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function call(body: object) {
    setBusy(true);
    await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, ...body }) });
    await load();
    setBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (mode === "comment") await call({ action: "comment", text, mediaId });
    else await call({ action: "dm", text, story: mode === "story" });
    setText("");
  }

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px]">
      <div className="card flex h-[70vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-sm">
          <span>Conversation avec <b>@{username}</b></span>
          <div className="flex gap-2">
            {pending > 0 && (
              <button onClick={() => call({ action: "advance" })} className="btn-ghost py-1 text-xs" disabled={busy}>
                <FastForward className="h-3.5 w-3.5" /> Avancer le temps ({pending})
              </button>
            )}
            <button onClick={() => call({ action: "reset" })} className="btn-ghost py-1 text-xs" disabled={busy}><RotateCcw className="h-3.5 w-3.5" /> Réinitialiser</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length ? (
            <MessageList messages={messages} onButton={(m, b) => call({ action: "button", payload: `RLY|${m.meta?.automationId}|${m.meta?.nodeId}|${b.id}`, title: b.title })} />
          ) : (
            <p className="mt-20 text-center text-sm text-slate-400">Envoie un commentaire ou un DM pour lancer un scénario.</p>
          )}
          <div ref={bottom} />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Étiquettes du contact : {tags.map((t) => <span key={t} className="badge bg-rose-50 text-rose-700">{t}</span>)}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="card h-fit space-y-4 p-4">
        <div>
          <label className="label" htmlFor="u">Pseudo de l&apos;abonné simulé</label>
          <input id="u" className="input" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} />
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {([["comment", "Commentaire"], ["dm", "DM"], ["story", "Réponse story"]] as const).map(([k, v]) => (
            <button type="button" key={k} onClick={() => setMode(k)} className={`rounded-md px-2 py-1.5 ${mode === k ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}>{v}</button>
          ))}
        </div>
        {mode === "comment" && (
          <div>
            <span className="label">Sur la publication</span>
            <div className="grid grid-cols-3 gap-2">
              {posts.map((p) => (
                <button type="button" key={p.id} onClick={() => setMediaId(p.id)} title={p.caption} className={`aspect-square overflow-hidden rounded-lg ring-offset-2 ${mediaId === p.id ? "ring-2 ring-brand-500" : ""}`}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.caption} className="h-full w-full object-cover" />
                  ) : (
                    <span className={`flex h-full w-full items-end bg-gradient-to-br p-1.5 text-left text-[10px] leading-tight text-white ${p.color}`}>{p.caption.slice(0, 50)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="label" htmlFor="t">{mode === "comment" ? "Texte du commentaire" : "Message"}</label>
          <div className="flex gap-2">
            <input id="t" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex. : LIEN" />
            <button className="btn-primary" disabled={busy} aria-label="Envoyer"><Send className="h-4 w-4" /></button>
          </div>
        </div>
        <p className="text-xs text-slate-400">Seuls les scénarios <b>actifs</b> réagissent. Les étapes « Attendre » sont mises en file : clique sur « Avancer le temps » pour les exécuter tout de suite.</p>
      </form>
    </div>
  );
}
