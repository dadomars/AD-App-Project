// src/app/api/debug-draft/route.ts
import { NextResponse } from "next/server";
import { readManifest, resolveFromManifest } from "@/lib/manifest";
import { readJsonFileSafe } from "@/lib/filesafe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const manifest = readManifest();
  const filePath = resolveFromManifest(manifest, "session_draft.json");
  const { obj } = readJsonFileSafe(filePath);
  return NextResponse.json({
    filePath,
    keys: Object.keys(obj || {}),
    sample: obj,
  });
}
