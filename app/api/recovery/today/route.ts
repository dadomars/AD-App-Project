import { NextResponse } from "next/server";
import path from "node:path";
import { readManifest, getFileEntry, resolveFromManifest } from "@/lib/manifest";
import { readJsonFileSafe } from "@/lib/filesafe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const manifest = readManifest();
  const entry = getFileEntry(manifest, "recovery_log.json");
  if (!entry) return NextResponse.json({ error: "recovery_log.json non in manifest" }, { status: 404 });

  const filePath = resolveFromManifest(manifest, "recovery_log.json");
  const { obj } = readJsonFileSafe(filePath);
  const today = new Date().toISOString().slice(0, 10);

  const all = Array.isArray(obj?.entries) ? obj.entries : [];
  const todayEntries = all
    .filter((e: any) => e?.date === today)
    .sort((a: any, b: any) => (Date.parse(b?.updatedAt || 0) - Date.parse(a?.updatedAt || 0)));

  return NextResponse.json({ date: today, entries: todayEntries, filePath: path.basename(filePath) });
}
