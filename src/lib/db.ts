// Connexion à Postgres (Neon) via le driver serverless de Neon (WebSocket, port 443)
// et l'adaptateur Prisma correspondant.
// - DATABASE_URL : chaîne "pooled" (hôte en -pooler), utilisée par l'app à l'exécution.
// - DATABASE_URL_UNPOOLED : chaîne directe, utilisée par Prisma pour `db push` (directUrl).
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { HttpsProxyAgent } from "https-proxy-agent";
import ws from "ws";

// Node n'a pas toujours de WebSocket natif compatible : on fournit `ws`.
// Si un proxy HTTPS sortant est imposé (environnements d'entreprise ou sandbox),
// on fait passer les WebSockets par ce proxy. Sur Vercel, HTTPS_PROXY n'est pas défini.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy) {
  const agent = new HttpsProxyAgent(proxy);
  neonConfig.webSocketConstructor = class extends ws {
    constructor(address: string | URL, protocols?: string | string[]) {
      super(address, protocols, { agent });
    }
  } as unknown as typeof ws;
} else {
  neonConfig.webSocketConstructor = ws;
}

function createClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
