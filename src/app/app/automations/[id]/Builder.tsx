"use client";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addEdge, Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type Node,
} from "@xyflow/react";
import { ArrowLeft, Plus, Save, Trash2, X } from "lucide-react";
import { uid, TRIGGER_LABELS, type ButtonDef, type Flow, type NodeData } from "@/lib/flow";
import { NODE_STYLES, nodeTypes, TriggerCtx } from "./nodes";

type AutomationDTO = {
  id: string; name: string; active: boolean; triggerType: string; keywords: string[];
  matchType: "CONTAINS" | "EXACT"; postId: string | null; flow: Flow;
};
type Post = { id: string; caption: string; image?: string; color?: string };

const DEFAULTS: Record<string, () => NodeData> = {
  message: () => ({ kind: "message", text: "", buttons: [] }),
  comment_reply: () => ({ kind: "comment_reply", texts: ["Je t'envoie ça en DM ✉️"] }),
  condition: () => ({ kind: "condition", check: "has_tag", value: "" }),
  delay: () => ({ kind: "delay", amount: 1, unit: "hours" }),
  tag: () => ({ kind: "tag", action: "add", tag: "" }),
};

export function Builder(props: { automation: AutomationDTO }) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({ automation }: { automation: AutomationDTO }) {
  const router = useRouter();
  const rf = useReactFlow();
  const [name, setName] = useState(automation.name);
  const [active, setActive] = useState(automation.active);
  const [keywords, setKeywords] = useState(automation.keywords.join(", "));
  const [matchType, setMatchType] = useState(automation.matchType);
  const [postId, setPostId] = useState(automation.postId ?? "");
  const [posts, setPosts] = useState<Post[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    automation.flow.nodes.map((n) => ({ ...n, deletable: n.id !== "trigger" }) as Node),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(automation.flow.edges as Edge[]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [error, setError] = useState("");

  const isComment = automation.triggerType === "COMMENT_KEYWORD";
  useEffect(() => {
    if (isComment) fetch("/api/posts").then((r) => r.json()).then((d) => setPosts(d.posts ?? []));
  }, [isComment]);

  const kwList = useMemo(() => keywords.split(",").map((k) => k.trim()).filter(Boolean), [keywords]);
  const postLabel = postId ? posts.find((p) => p.id === postId)?.caption?.slice(0, 40) ?? postId : undefined;

  // Tout changement marque le scénario comme modifié.
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (ready) setStatus("dirty");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, active, keywords, matchType, postId, edges, JSON.stringify(nodes.map((n) => [n.id, n.data, n.position]))]);

  const save = useCallback(async () => {
    setStatus("saving");
    setError("");
    const flow: Flow = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.type!, position: n.position, data: n.data as NodeData })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? "next" })),
    };
    const res = await fetch(`/api/automations/${automation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, active, keywords: kwList, matchType, postId: postId || null, flow }),
    });
    if (res.ok) setStatus("saved");
    else {
      setStatus("error");
      setError((await res.json().catch(() => ({}))).error ?? "Erreur d'enregistrement");
    }
  }, [nodes, edges, name, active, kwList, matchType, postId, automation.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...c, id: uid("e"), sourceHandle: c.sourceHandle ?? "next" },
          // Une seule sortie par poignée : on remplace l'ancienne liaison.
          eds.filter((e) => !(e.source === c.source && (e.sourceHandle ?? "next") === (c.sourceHandle ?? "next"))),
        ),
      ),
    [setEdges],
  );

  function addNode(type: string) {
    const center = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const id = uid();
    setNodes((ns) => [...ns, { id, type, position: { x: center.x - 128 + Math.random() * 40, y: center.y - 60 + Math.random() * 40 }, data: DEFAULTS[type]() }]);
    setSelectedId(id);
  }

  function patchNode(id: string, patch: Partial<NodeData>) {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function removeNode(id: string) {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }

  async function destroy() {
    if (!confirm("Supprimer définitivement ce scénario ?")) return;
    await fetch(`/api/automations/${automation.id}`, { method: "DELETE" });
    router.push("/app/automations");
    router.refresh();
  }

  const selected = nodes.find((n) => n.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-96px)] flex-col md:h-screen">
      {/* Barre du haut */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/app/automations" className="btn-ghost px-2" aria-label="Retour"><ArrowLeft className="h-4 w-4" /></Link>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input max-w-xs font-medium" aria-label="Nom du scénario" />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <span className={`relative inline-block h-5 w-9 rounded-full transition ${active ? "bg-brand-600" : "bg-slate-300"}`}>
            <input type="checkbox" className="peer sr-only" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${active ? "left-4.5" : "left-0.5"}`} />
          </span>
          {active ? "Actif" : "Brouillon"}
        </label>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {{ saved: "Enregistré", dirty: "Modifications non enregistrées", saving: "Enregistrement…", error: error }[status]}
          </span>
          <button onClick={destroy} className="btn-danger px-2" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
          <button onClick={save} className="btn-primary" disabled={status === "saving"}><Save className="h-4 w-4" /> Enregistrer</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Panneau gauche : déclencheur + blocs */}
        <aside className="max-h-72 shrink-0 space-y-5 overflow-y-auto border-b border-slate-200 bg-white p-4 lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Déclencheur</h2>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{TRIGGER_LABELS[automation.triggerType]}</p>
            {automation.triggerType !== "DEFAULT_REPLY" && (
              <>
                <div>
                  <label className="label" htmlFor="kw">Mots-clés (séparés par des virgules)</label>
                  <input id="kw" className="input" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="lien, info, prix" />
                  <p className="mt-1 text-xs text-slate-400">
                    {automation.triggerType === "DM_KEYWORD" ? "Au moins un mot-clé est requis." : "Vide = réagit à tout."} Majuscules et accents ignorés.
                  </p>
                </div>
                <div>
                  <label className="label" htmlFor="mt">Correspondance</label>
                  <select id="mt" className="input" value={matchType} onChange={(e) => setMatchType(e.target.value as "CONTAINS" | "EXACT")}>
                    <option value="CONTAINS">Le message contient le mot-clé</option>
                    <option value="EXACT">Le message est exactement le mot-clé</option>
                  </select>
                </div>
              </>
            )}
            {isComment && (
              <div>
                <span className="label">Publication</span>
                <div className="space-y-1.5">
                  <PostOption selected={!postId} onClick={() => setPostId("")} label="Toutes les publications" />
                  {posts.map((p) => (
                    <PostOption key={p.id} selected={postId === p.id} onClick={() => setPostId(p.id)} label={p.caption || p.id} image={p.image} color={p.color} />
                  ))}
                </div>
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Ajouter un bloc</h2>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {Object.keys(DEFAULTS)
                .filter((t) => t !== "comment_reply" || isComment)
                .map((t) => {
                  const s = NODE_STYLES[t];
                  const Icon = s.icon;
                  return (
                    <button key={t} onClick={() => addNode(t)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-brand-500 hover:bg-brand-50">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md text-white ${s.color}`}><Icon className="h-3.5 w-3.5" /></span>
                      {s.label}
                      <Plus className="ml-auto h-3.5 w-3.5 text-slate-400" />
                    </button>
                  );
                })}
            </div>
            <p className="mt-3 text-xs text-slate-400">Relie les blocs en tirant depuis le point vert à droite d&apos;un bloc. Suppr pour effacer une liaison sélectionnée.</p>
          </section>
        </aside>

        {/* Canevas */}
        <div className="relative min-h-[400px] flex-1">
          <TriggerCtx.Provider value={{ triggerType: automation.triggerType, keywords: kwList, postLabel }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              onNodesDelete={() => setSelectedId(null)}
              defaultEdgeOptions={{ type: "smoothstep", style: { strokeWidth: 2, stroke: "#059669" } }}
              onInit={(inst) => setTimeout(() => inst.fitView({ padding: 0.2, maxZoom: 1 }), 50)}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} color="#cbd5e1" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable className="!hidden md:!block" />
            </ReactFlow>
          </TriggerCtx.Provider>
        </div>

        {/* Inspecteur */}
        {selected && selected.type !== "trigger" && (
          <aside className="max-h-96 w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-4 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{NODE_STYLES[selected.type!].label}</h2>
              <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600" aria-label="Fermer"><X className="h-4 w-4" /></button>
            </div>
            <Inspector node={selected} patch={(p) => patchNode(selected.id, p)} />
            <button onClick={() => removeNode(selected.id)} className="btn-danger mt-6 w-full"><Trash2 className="h-4 w-4" /> Supprimer le bloc</button>
          </aside>
        )}
      </div>
    </div>
  );
}

function PostOption({ selected, onClick, label, image, color }: { selected: boolean; onClick: () => void; label: string; image?: string; color?: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs ${selected ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
      ) : color ? (
        <span className={`h-8 w-8 shrink-0 rounded bg-gradient-to-br ${color}`} />
      ) : null}
      <span className="line-clamp-2">{label}</span>
    </button>
  );
}

function Inspector({ node, patch }: { node: Node; patch: (p: Partial<NodeData>) => void }) {
  const d = node.data as NodeData;
  switch (d.kind) {
    case "message": {
      const setButtons = (buttons: ButtonDef[]) => patch({ buttons } as Partial<NodeData>);
      return (
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="txt">Texte du message</label>
            <textarea id="txt" rows={6} className="input" value={d.text} onChange={(e) => patch({ text: e.target.value } as Partial<NodeData>)} maxLength={1000} />
            <p className="mt-1 text-xs text-slate-400">Variable disponible : {"{{username}}"}</p>
          </div>
          <div>
            <span className="label">Boutons (3 max)</span>
            <div className="space-y-3">
              {d.buttons.map((b, i) => (
                <div key={b.id} className="space-y-2 rounded-lg border border-slate-200 p-2">
                  <div className="flex gap-2">
                    <input className="input" value={b.title} maxLength={20} placeholder="Texte du bouton" onChange={(e) => setButtons(d.buttons.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    <button className="text-slate-400 hover:text-red-600" aria-label="Retirer" onClick={() => setButtons(d.buttons.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button>
                  </div>
                  <select className="input" value={b.type} onChange={(e) => setButtons(d.buttons.map((x, j) => (j === i ? { ...x, type: e.target.value as ButtonDef["type"] } : x)))}>
                    <option value="postback">Continuer le scénario</option>
                    <option value="url">Ouvrir un lien</option>
                  </select>
                  {b.type === "url" && (
                    <input className="input" type="url" placeholder="https://…" value={b.url ?? ""} onChange={(e) => setButtons(d.buttons.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  )}
                </div>
              ))}
              {d.buttons.length < 3 && (
                <button className="btn-ghost w-full" onClick={() => setButtons([...d.buttons, { id: uid("b"), title: "", type: "postback" }])}><Plus className="h-4 w-4" /> Ajouter un bouton</button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">Un bouton « Continuer le scénario » a sa propre sortie : relie-la au bloc suivant.</p>
          </div>
        </div>
      );
    }
    case "comment_reply":
      return (
        <div>
          <label className="label" htmlFor="cr">Réponses publiques (une par ligne, choisie au hasard)</label>
          <textarea id="cr" rows={6} className="input" value={d.texts.join("\n")} onChange={(e) => patch({ texts: e.target.value.split("\n") } as Partial<NodeData>)} />
          <p className="mt-1 text-xs text-slate-400">Varier les réponses évite qu&apos;Instagram les considère comme du spam.</p>
        </div>
      );
    case "condition":
      return (
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="ck">Vérifier si</label>
            <select id="ck" className="input" value={d.check} onChange={(e) => patch({ check: e.target.value } as Partial<NodeData>)}>
              <option value="has_tag">Le contact a l&apos;étiquette…</option>
              <option value="text_contains">Le message déclencheur contient…</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cv">Valeur</label>
            <input id="cv" className="input" value={d.value} onChange={(e) => patch({ value: e.target.value } as Partial<NodeData>)} />
          </div>
        </div>
      );
    case "delay":
      return (
        <div className="flex gap-2">
          <input type="number" min={1} className="input w-24" value={d.amount} onChange={(e) => patch({ amount: Number(e.target.value) } as Partial<NodeData>)} aria-label="Durée" />
          <select className="input" value={d.unit} onChange={(e) => patch({ unit: e.target.value } as Partial<NodeData>)} aria-label="Unité">
            <option value="minutes">minutes</option>
            <option value="hours">heures</option>
            <option value="days">jours</option>
          </select>
        </div>
      );
    case "tag":
      return (
        <div className="space-y-3">
          <select className="input" value={d.action} onChange={(e) => patch({ action: e.target.value } as Partial<NodeData>)} aria-label="Action">
            <option value="add">Ajouter l&apos;étiquette</option>
            <option value="remove">Retirer l&apos;étiquette</option>
          </select>
          <input className="input" value={d.tag} placeholder="Ex. : client-chaud" onChange={(e) => patch({ tag: e.target.value } as Partial<NodeData>)} aria-label="Étiquette" />
        </div>
      );
    default:
      return null;
  }
}
