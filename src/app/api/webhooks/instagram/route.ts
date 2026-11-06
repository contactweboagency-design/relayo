// Webhook Instagram : vérification (GET) et réception des événements (POST).
import { prisma } from "@/lib/db";
import { handleComment, handleDirectMessage, handlePostback } from "@/lib/engine";
import { verifySignature } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type MessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  message?: { mid: string; text?: string; is_echo?: boolean; reply_to?: { story?: unknown }; quick_reply?: { payload: string } };
  postback?: { payload: string; title?: string };
};
type ChangeEvent = {
  field: string;
  value: { id: string; text?: string; from?: { id: string; username?: string }; media?: { id: string } };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  const body = JSON.parse(raw) as { object: string; entry?: { id: string; messaging?: MessagingEvent[]; changes?: ChangeEvent[] }[] };
  if (body.object !== "instagram") return new Response("ignored");

  for (const entry of body.entry ?? []) {
    const account = await prisma.igAccount.findUnique({ where: { igUserId: entry.id } });
    if (!account || account.isDemo) continue;
    try {
      for (const ev of entry.messaging ?? []) {
        if (ev.sender.id === account.igUserId) continue; // nos propres messages
        if (ev.postback) {
          await handlePostback(account, { igsid: ev.sender.id, payload: ev.postback.payload, title: ev.postback.title });
        } else if (ev.message?.quick_reply) {
          await handlePostback(account, { igsid: ev.sender.id, payload: ev.message.quick_reply.payload, title: ev.message.text });
        } else if (ev.message && !ev.message.is_echo && ev.message.text) {
          await handleDirectMessage(account, { igsid: ev.sender.id, text: ev.message.text, storyReply: Boolean(ev.message.reply_to?.story) });
        }
      }
      for (const ch of entry.changes ?? []) {
        if (ch.field !== "comments" || !ch.value.from || ch.value.from.id === account.igUserId) continue;
        await handleComment(account, {
          commentId: ch.value.id,
          igsid: ch.value.from.id,
          username: ch.value.from.username,
          text: ch.value.text ?? "",
          mediaId: ch.value.media?.id,
        });
      }
    } catch (e) {
      // On répond 200 quand même pour que Meta ne réessaie pas en boucle.
      console.error("webhook error", e);
    }
  }
  return new Response("EVENT_RECEIVED");
}
