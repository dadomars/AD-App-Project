import path from "path";
import { NextResponse } from "next/server";
import { readManifest, getFileEntry, resolveFromManifest } from "@/lib/manifest";
import { readJsonFileSafe } from "@/lib/filesafe";
import { atomicWriteJsonWithBackup } from "@/lib/filesafe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const date: string = body?.date;
    const keepUpdatedAt: string = body?.updatedAt;

    if (!date || !keepUpdatedAt) {
      return NextResponse.json(
        { error: "date e updatedAt sono obbligatori" },
        { status: 400 }
      );
    }

    const manifest = readManifest();
    const entry = getFileEntry(manifest, "recovery_log.json");
    if (!entry) {
      return NextResponse.json(
        { error: "recovery_log.json non in manifest" },
        { status: 404 }
      );
    }

    const filePath = resolveFromManifest(manifest, "recovery_log.json");
    const before = readJsonFileSafe(filePath);
    const list: any[] = Array.isArray(before.obj?.entries) ? before.obj.entries : [];

    // seleziona quella da tenere
    const todayList = list.filter((e: any) => e?.date === date);
const keep = todayList.find((e: any) => e?.updatedAt === keepUpdatedAt);
if (!keep) {
  return NextResponse.json(
    { error: "entry da mantenere non trovata" },
    { status: 404 }
  );
}

    // ricostruisci entries: tutte le altre + quella scelta marcata non pending
    const others = list.filter((e: any) => e?.date !== date);
    const kept = { ...keep, pending: false, updatedAt: new Date().toISOString() };
    const after = { ...before.obj, entries: [...others, kept] };

    // If-Match / ETag come nella patch
    const allowDirect = entry?.write_policy === "draft_direct";
    const effectiveIfMatch = allowDirect ? (before.etag || "*") : req.headers.get("If-Match");

    if (!allowDirect && !effectiveIfMatch) {
      return NextResponse.json(
        { error: "Precondition Failed (If-Match required)" },
        { status: 412 }
      );
    }

    // directory versioni dai backups (se configurata)
    const versionsDir: string | undefined =
      manifest.backups?.file_versions?.dir || undefined;

    const newEtag = await atomicWriteJsonWithBackup(filePath, after, {
      ifMatch: effectiveIfMatch ?? null,
      versionsDir,
    });

    return NextResponse.json({ ok: true, kept: kept.updatedAt, date, etag: newEtag });
  } catch (e: any) {
    console.error("[/api/recovery-keep] ERROR:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
