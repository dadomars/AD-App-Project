// src/app/api/debug/route.ts
import { NextResponse } from "next/server";
import fs from "node:fs";

export const dynamic = "force-dynamic";

export async function GET() {
  const envRoot = process.env.AD_STORAGE_ROOT;
  const envManifest = process.env.AD_MANIFEST;
  let manifestOk = false;
  let filesCount = -1;
  let error: any = null;

  try {
    if (envManifest) {
      const raw = fs.readFileSync(envManifest, "utf-8");
      const m = JSON.parse(raw);
      manifestOk = true;
      filesCount = Array.isArray(m?.files) ? m.files.length : -1;
    }
  } catch (e: any) {
    error = e?.message || String(e);
  }

  return NextResponse.json({
    env: { AD_STORAGE_ROOT: envRoot, AD_MANIFEST: envManifest },
    manifestOk,
    filesCount,
    error
  });
}
