// pwa/src/app/api/recovery-day/route.ts
import { NextResponse } from "next/server";
import { readManifest, resolveFromManifest } from "@/lib/manifest";
import { readJsonFileSafe } from "@/lib/filesafe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { ok: false, error: "Parametro 'date' mancante o non valido (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const manifest = readManifest();
    const filePath = resolveFromManifest(manifest, "recovery_log.json");
    const { obj } = readJsonFileSafe(filePath);
    const all: any[] = Array.isArray(obj?.entries) ? obj.entries : [];

    const entries = all
      .filter(e => e?.date === date)
      .sort((a, b) => (Date.parse(b?.updatedAt || 0) - Date.parse(a?.updatedAt || 0)));

    return NextResponse.json({ ok: true, entries });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore nel recupero dati" },
      { status: 500 }
    );
  }
}
