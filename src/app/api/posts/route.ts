import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { DEMO_POSTS } from "@/lib/demo";
import { listMedia } from "@/lib/instagram";

export async function GET() {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const acc = user.account;
  if (!acc || acc.isDemo || !acc.accessToken) {
    return NextResponse.json({ demo: true, posts: DEMO_POSTS.map((p) => ({ id: p.id, caption: p.caption, color: p.color })) });
  }
  try {
    const media = await listMedia(acc.accessToken);
    return NextResponse.json({
      demo: false,
      posts: media.map((m) => ({ id: m.id, caption: m.caption ?? "", image: m.thumbnail_url || m.media_url, permalink: m.permalink })),
    });
  } catch (e) {
    return NextResponse.json({ demo: false, posts: [], error: (e as Error).message });
  }
}
