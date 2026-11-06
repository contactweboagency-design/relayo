// Client minimal pour l'API Instagram (Instagram API with Instagram Login).
// Docs : https://developers.facebook.com/docs/instagram-platform
import crypto from "crypto";
import type { ButtonDef } from "./flow";

const GRAPH = "https://graph.instagram.com/v21.0";

export function instagramConfigured() {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function redirectUri() {
  return `${appUrl()}/api/instagram/callback`;
}

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
];

export function authorizeUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: IG_SCOPES.join(","),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${p}`;
}

async function igFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const msg = body?.error?.message || body?.error_message || `HTTP ${res.status}`;
    throw new Error(`Instagram : ${msg}`);
  }
  return body;
}

export async function exchangeCode(code: string) {
  const form = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code,
  });
  const short = await igFetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
  const long = await igFetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${short.access_token}`,
  );
  return { accessToken: long.access_token as string, expiresIn: long.expires_in as number };
}

export async function refreshToken(token: string) {
  const r = await igFetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
  return { accessToken: r.access_token as string, expiresIn: r.expires_in as number };
}

export async function getProfile(token: string) {
  return igFetch(`${GRAPH}/me?fields=user_id,username,profile_picture_url&access_token=${token}`) as Promise<{
    user_id: string;
    username: string;
    profile_picture_url?: string;
  }>;
}

export async function subscribeWebhooks(token: string) {
  return igFetch(
    `${GRAPH}/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,comments&access_token=${token}`,
    { method: "POST" },
  );
}

export type Media = { id: string; caption?: string; media_url?: string; thumbnail_url?: string; permalink?: string };

export async function listMedia(token: string): Promise<Media[]> {
  const r = await igFetch(`${GRAPH}/me/media?fields=id,caption,media_url,thumbnail_url,permalink,media_type&limit=24&access_token=${token}`);
  return r.data;
}

export async function getUsername(token: string, igsid: string): Promise<string | null> {
  try {
    const r = await igFetch(`${GRAPH}/${igsid}?fields=username,name&access_token=${token}`);
    return r.username ?? null;
  } catch {
    return null;
  }
}

/** Construit le corps "message" de l'API d'envoi (texte simple ou modèle à boutons). */
export function buildMessage(text: string, buttons: ButtonDef[], payloadFor: (b: ButtonDef) => string) {
  if (!buttons.length) return { text };
  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text,
        buttons: buttons.slice(0, 3).map((b) =>
          b.type === "url" ? { type: "web_url", url: b.url, title: b.title } : { type: "postback", title: b.title, payload: payloadFor(b) },
        ),
      },
    },
  };
}

/** recipient = { id: IGSID } pour un DM, ou { comment_id } pour une réponse privée à un commentaire. */
export async function sendMessage(token: string, recipient: { id: string } | { comment_id: string }, message: object) {
  return igFetch(`${GRAPH}/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient, message }),
  });
}

export async function replyToComment(token: string, commentId: string, text: string) {
  return igFetch(`${GRAPH}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message: text }),
  });
}

export function verifySignature(rawBody: string, header: string | null) {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret) return false;
  if (!header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.slice(7);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
