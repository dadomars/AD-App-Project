import { NextResponse } from "next/server";
import { readManifest, getFileEntry, resolveFromManifest } from "@/lib/manifest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("file") || "recovery_log.json";
  const manifest = readManifest();
  const entry = getFileEntry(manifest, name);
  const filePath = entry ? resolveFromManifest(manifest, name) : null;
  return NextResponse.json({
    file: name,
    found: !!entry,
    write_policy: entry?.write_policy ?? "(default)",
    path: filePath
  });
}
