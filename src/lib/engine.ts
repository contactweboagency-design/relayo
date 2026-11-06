// Moteur d'exécution des scénarios. Appelé par le webhook Instagram, le simulateur et le cron.
import type { Automation, Contact, IgAccount, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { matchesKeywords, normalize, type ButtonDef, type Flow, type FlowNode } from "./flow";
import * as ig from "./instagram";

type Ctx = {
  account: IgAccount;
  contact: Contact;
  automation: Automation;
  text: string;
  commentId?: string;
  // Une réponse privée à un commentaire ne peut être envoyée qu'une fois ; ensuite on écrit en DM classique.
  privateReplyUsed?: boolean;
};

const PAYLOAD_PREFIX = "RLY";
const MAX_STEPS = 50;

export function buttonPayload(automationId: string, nodeId: string, buttonId: string) {
  return [PAYLOAD_PREFIX, automationId, nodeId, buttonId].join("|");
}

function render(text: string, contact: Contact) {
  const username = contact.username || contact.name || "toi";
  return text.replace(/\{\{\s*(username|prenom|name)\s*\}\}/gi, username);
}

function live(account: IgAccount) {
  return !account.isDemo && Boolean(account.accessToken);
}

async function upsertContact(account: IgAccount, igsid: string, username?: string | null) {
  const existing = await prisma.contact.findUnique({ where: { userId_igsid: { userId: account.userId, igsid } } });
  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data: { lastInteractionAt: new Date(), ...(username && !existing.username ? { username } : {}) },
    });
  }
  let name = username ?? null;
  if (!name && live(account)) name = await ig.getUsername(account.accessToken!, igsid);
  return prisma.contact.create({
    data: { userId: account.userId, igsid, username: name, isDemo: account.isDemo },
  });
}

async function logIn(contact: Contact, kind: string, text: string, meta?: Prisma.InputJsonValue) {
  await prisma.message.create({ data: { contactId: contact.id, direction: "IN", kind, text, meta } });
}

async function deliver(ctx: Ctx, node: FlowNode, text: string, buttons: ButtonDef[]) {
  const body = render(text, ctx.contact);
  const usePrivate = Boolean(ctx.commentId && !ctx.privateReplyUsed);
  const recipient = usePrivate ? { comment_id: ctx.commentId! } : { id: ctx.contact.igsid };
  let status = "demo";
  let error: string | undefined;
  if (live(ctx.account)) {
    try {
      const msg = ig.buildMessage(body, buttons, (b) => buttonPayload(ctx.automation.id, node.id, b.id));
      await ig.sendMessage(ctx.account.accessToken!, recipient, msg);
      status = "sent";
    } catch (e) {
      status = "failed";
      error = (e as Error).message;
    }
  }
  if (usePrivate) ctx.privateReplyUsed = true;
  await prisma.message.create({
    data: {
      contactId: ctx.contact.id,
      direction: "OUT",
      kind: usePrivate ? "private_reply" : "dm",
      text: body,
      status,
      meta: { buttons, automationId: ctx.automation.id, nodeId: node.id, ...(error ? { error } : {}) } as Prisma.InputJsonValue,
    },
  });
}

async function publicReply(ctx: Ctx, texts: string[]) {
  if (!ctx.commentId) return;
  const options = texts.map((t) => t.trim()).filter(Boolean);
  if (!options.length) return;
  const text = render(options[Math.floor(Math.random() * options.length)], ctx.contact);
  let status = "demo";
  let error: string | undefined;
  if (live(ctx.account)) {
    try {
      await ig.replyToComment(ctx.account.accessToken!, ctx.commentId, text);
      status = "sent";
    } catch (e) {
      status = "failed";
      error = (e as Error).message;
    }
  }
  await prisma.message.create({
    data: {
      contactId: ctx.contact.id,
      direction: "OUT",
      kind: "comment_reply",
      text,
      status,
      meta: { commentId: ctx.commentId, ...(error ? { error } : {}) },
    },
  });
}

function nextOf(flow: Flow, nodeId: string, handle = "next") {
  const edge = flow.edges.find((e) => e.source === nodeId && (e.sourceHandle ?? "next") === handle);
  return edge?.target ?? null;
}

const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const;

/** Exécute le scénario à partir d'un bloc, jusqu'à une attente (boutons, délai) ou la fin. */
async function runFrom(ctx: Ctx, startId: string | null) {
  const flow = ctx.automation.flow as unknown as Flow;
  let current = startId;
  for (let step = 0; current && step < MAX_STEPS; step++) {
    const node = flow.nodes.find((n) => n.id === current);
    if (!node) return;
    const d = node.data;
    switch (d.kind) {
      case "trigger":
        current = nextOf(flow, node.id);
        break;
      case "message": {
        await deliver(ctx, node, d.text || "", d.buttons || []);
        // Avec des boutons "postback", le scénario reprend quand le contact clique.
        if ((d.buttons || []).some((b) => b.type === "postback")) return;
        current = nextOf(flow, node.id);
        break;
      }
      case "comment_reply":
        await publicReply(ctx, d.texts || []);
        current = nextOf(flow, node.id);
        break;
      case "tag": {
        const tag = d.tag.trim();
        if (tag) {
          const tags = new Set(ctx.contact.tags);
          if (d.action === "remove") tags.delete(tag);
          else tags.add(tag);
          ctx.contact = await prisma.contact.update({ where: { id: ctx.contact.id }, data: { tags: [...tags] } });
        }
        current = nextOf(flow, node.id);
        break;
      }
      case "condition": {
        const ok =
          d.check === "has_tag"
            ? ctx.contact.tags.includes(d.value.trim())
            : normalize(ctx.text).includes(normalize(d.value));
        current = nextOf(flow, node.id, ok ? "yes" : "no");
        break;
      }
      case "delay": {
        const next = nextOf(flow, node.id);
        if (!next) return;
        const ms = Math.max(0, Number(d.amount) || 0) * (UNIT_MS[d.unit] ?? UNIT_MS.minutes);
        await prisma.job.create({
          data: {
            automationId: ctx.automation.id,
            contactId: ctx.contact.id,
            nodeId: next,
            runAt: new Date(Date.now() + ms),
            context: { text: ctx.text, commentId: ctx.commentId ?? null, privateReplyUsed: !!ctx.privateReplyUsed },
          },
        });
        return;
      }
      default:
        return;
    }
  }
}

async function start(account: IgAccount, contact: Contact, automation: Automation, text: string, commentId?: string) {
  await prisma.automation.update({ where: { id: automation.id }, data: { runs: { increment: 1 } } });
  await runFrom({ account, contact, automation, text, commentId }, "trigger");
}

async function activeAutomations(userId: string, triggerType: Automation["triggerType"]) {
  return prisma.automation.findMany({ where: { userId, triggerType, active: true }, orderBy: { updatedAt: "desc" } });
}

export async function handleDirectMessage(
  account: IgAccount,
  input: { igsid: string; text: string; username?: string | null; storyReply?: boolean },
) {
  const contact = await upsertContact(account, input.igsid, input.username);
  await logIn(contact, input.storyReply ? "story_reply" : "dm", input.text);

  if (input.storyReply) {
    const story = (await activeAutomations(account.userId, "STORY_REPLY")).find((a) =>
      matchesKeywords(input.text, a.keywords, a.matchType),
    );
    if (story) return start(account, contact, story, input.text);
  }
  const keyword = (await activeAutomations(account.userId, "DM_KEYWORD")).find(
    (a) => a.keywords.length > 0 && matchesKeywords(input.text, a.keywords, a.matchType),
  );
  if (keyword) return start(account, contact, keyword, input.text);

  const fallback = (await activeAutomations(account.userId, "DEFAULT_REPLY"))[0];
  if (fallback) return start(account, contact, fallback, input.text);
}

export async function handleComment(
  account: IgAccount,
  input: { commentId: string; igsid: string; username?: string | null; text: string; mediaId?: string | null },
) {
  const contact = await upsertContact(account, input.igsid, input.username);
  await logIn(contact, "comment", input.text, { commentId: input.commentId, mediaId: input.mediaId ?? null });
  const match = (await activeAutomations(account.userId, "COMMENT_KEYWORD")).find(
    (a) => (!a.postId || a.postId === input.mediaId) && matchesKeywords(input.text, a.keywords, a.matchType),
  );
  if (match) return start(account, contact, match, input.text, input.commentId);
}

export async function handlePostback(account: IgAccount, input: { igsid: string; payload: string; title?: string }) {
  const contact = await upsertContact(account, input.igsid);
  const [prefix, automationId, nodeId, buttonId] = input.payload.split("|");
  await logIn(contact, "button", input.title || "Bouton", { payload: input.payload });
  if (prefix !== PAYLOAD_PREFIX) return;
  const automation = await prisma.automation.findFirst({ where: { id: automationId, userId: account.userId } });
  if (!automation) return;
  const flow = automation.flow as unknown as Flow;
  const target = nextOf(flow, nodeId, buttonId);
  await runFrom({ account, contact, automation, text: input.title || "" }, target);
}

/** Traite les étapes différées arrivées à échéance. `force` ignore l'horaire (simulateur). */
export async function processDueJobs(opts: { userId?: string; force?: boolean } = {}) {
  const jobs = await prisma.job.findMany({
    where: {
      status: "pending",
      ...(opts.force ? {} : { runAt: { lte: new Date() } }),
      ...(opts.userId ? { automation: { userId: opts.userId } } : {}),
    },
    include: { automation: { include: { user: { include: { account: true } } } }, contact: true },
    orderBy: { runAt: "asc" },
    take: 100,
  });
  let done = 0;
  for (const job of jobs) {
    // Verrou optimiste : un seul worker traite la tâche.
    const claimed = await prisma.job.updateMany({ where: { id: job.id, status: "pending" }, data: { status: "running" } });
    if (!claimed.count) continue;
    const account = job.automation.user.account;
    try {
      if (account) {
        const c = (job.context ?? {}) as { text?: string; commentId?: string | null; privateReplyUsed?: boolean };
        await runFrom(
          {
            account,
            contact: job.contact,
            automation: job.automation,
            text: c.text ?? "",
            commentId: c.commentId ?? undefined,
            privateReplyUsed: c.privateReplyUsed,
          },
          job.nodeId,
        );
      }
      await prisma.job.update({ where: { id: job.id }, data: { status: "done" } });
      done++;
    } catch (e) {
      console.error("job failed", job.id, e);
      await prisma.job.update({ where: { id: job.id }, data: { status: "failed" } });
    }
  }
  return done;
}

/** Envoi manuel depuis la boîte de réception. */
export async function sendManual(account: IgAccount, contact: Contact, text: string) {
  let status = "demo";
  let error: string | undefined;
  if (live(account)) {
    try {
      await ig.sendMessage(account.accessToken!, { id: contact.igsid }, { text });
      status = "sent";
    } catch (e) {
      status = "failed";
      error = (e as Error).message;
    }
  }
  return prisma.message.create({
    data: { contactId: contact.id, direction: "OUT", kind: "dm", text, status, meta: { manual: true, ...(error ? { error } : {}) } },
  });
}
