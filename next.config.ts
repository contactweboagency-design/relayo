import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `ws` ne doit pas être empaqueté par webpack (sinon ses dépendances natives optionnelles cassent).
  serverExternalPackages: ["ws", "@neondatabase/serverless", "@prisma/adapter-neon"],
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};

export default nextConfig;
