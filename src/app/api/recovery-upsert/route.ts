import { NextResponse } from "next/server";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const FILE = path.join(process.cwd(), "data", "recovery_log.json"); // adatta se serve

function dedupByDate(list:any[]) {
  // tieni l'ultimo per ogni data (ordinato per updatedAt)
  const sorted = [...list].sort((a,b)=>
    a.date === b.date
      ? (a.updatedAt > b.updatedAt ? 1 : -1)
      : (a.date > b.date ? 1 : -1)
  );
  const seen = new Set<string>();
  const out:any[] = [];
  for (const e of sorted) {
    if (seen.has(e.date)) continue;
    seen.add(e.date);
    out.push(e);
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const { matchUpdatedAt, entry } = await req.json() as {
      matchUpdatedAt?: string | null,
      entry: any
    };

    if (!entry?.date) {
      return NextResponse.json({ error: "entry.date mancante" }, { status: 400 });
    }

    // carica file
    let json: any = { entries: [] };
    try {
      const raw = await fs.readFile(FILE, "utf8");
      json = JSON.parse(raw || "{}");
      if (!Array.isArray(json.entries)) json.entries = [];
    } catch {
      json = { entries: [] };
    }

    // replace se editing, altrimenti push
    if (matchUpdatedAt) {
      const i = json.entries.findIndex((e:any) => e.updatedAt === matchUpdatedAt);
      if (i >= 0) json.entries[i] = entry;
      else json.entries.push(entry); // se non trovato, append
    } else {
      json.entries.push(entry);
    }

    // (opzionale) dedup stessa data: tieni l'ultimo
    // json.entries = dedupByDate(json.entries);

    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(json, null, 2), "utf8");

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "errore" }, { status: 500 });
  }
}
