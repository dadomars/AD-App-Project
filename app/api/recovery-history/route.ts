import { NextResponse } from "next/server";
import { readManifest, resolveFromManifest } from "@/lib/manifest";
import { readJsonFileSafe } from "@/lib/filesafe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manifest = await readManifest();
    const filePath = resolveFromManifest(manifest, "recovery_log.json");
    const { obj } = await readJsonFileSafe(filePath);
    const all = Array.isArray(obj?.entries) ? obj.entries : [];

    // ordina per data+updatedAt desc
    const parsed = all
      .map((e: any) => {
        const d =
          typeof e?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
            ? new Date(`${e.date}T00:00:00Z`).getTime()
            : 0;
        const u = e?.updatedAt ? Date.parse(e.updatedAt) : 0;
        return { ...e, _d: d, _u: isNaN(u) ? 0 : u };
      })
      .sort((a: any, b: any) => b._d - a._d || b._u - a._u)
      .slice(0, 7)
      .map(({ _d, _u, ...entry }: { _d: number; _u: number }) => entry);


    return NextResponse.json({ ok: true, items: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Errore nel recupero dati" },
      { status: 500 }
    );
  }
}
