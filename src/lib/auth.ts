import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

export const SESSION_COOKIE = "relayo_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET manquant");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function verifyToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getUserId() {
  return verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Pour les pages et routes protégées : renvoie l'utilisateur ou redirige. */
export async function requireUser() {
  const id = await getUserId();
  const user = id ? await prisma.user.findUnique({ where: { id }, include: { account: true } }) : null;
  if (!user) redirect("/login");
  return user;
}

/** Variante pour les routes API : renvoie null au lieu de rediriger. */
export async function apiUser() {
  const id = await getUserId();
  return id ? prisma.user.findUnique({ where: { id }, include: { account: true } }) : null;
}
