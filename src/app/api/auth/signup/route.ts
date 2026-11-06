import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { createDemoWorkspace } from "@/lib/demo";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const name = String(form.get("name") || "").trim() || null;
  const back = (error: string) => NextResponse.redirect(new URL(`/signup?error=${encodeURIComponent(error)}`, req.url), 303);
  if (!/^\S+@\S+\.\S+$/.test(email)) return back("Adresse e-mail invalide");
  if (password.length < 8) return back("Le mot de passe doit faire au moins 8 caractères");
  if (await prisma.user.findUnique({ where: { email } })) return back("Un compte existe déjà avec cet e-mail");
  const user = await prisma.user.create({ data: { email, name, passwordHash: await bcrypt.hash(password, 10) } });
  await createDemoWorkspace(user.id);
  await createSession(user.id);
  return NextResponse.redirect(new URL("/app", req.url), 303);
}
