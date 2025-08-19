// src/app/api/patch/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readManifest, getFileEntry, resolveFromManifest } from "@/lib/manifest";
import { readJsonFileSafe, atomicWriteJsonWithBackup } from "@/lib/filesafe";
import { applyPatch, PatchOp } from "@/lib/jsonpatch";

export const runtime = "nodejs";          // usiamo FS → serve Node runtime
export const dynamic = "force-dynamic";   // niente prefetch cartella progetto

type Body = {
  file: string;
  expectedVersion?: string;   // ETag corrente (fallback all'header If-Match)
  schemaName?: string;        // (stub) validazione opzionale
  ops: PatchOp[];
};
// --- VALIDAZIONE + MERGE per recovery_log.json -----------------
function roundHalf(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(10, Math.round(x * 2) / 2));
}
function clampInt(n: any, lo: number, hi: number) {
  const x = Math.trunc(Number(n));
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}
function snapMinutes(n: any) {
  const allowed = [0, 15, 30, 45];
  const x = Math.trunc(Number(n));
  if (!Number.isFinite(x)) return 0;
  return allowed.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), 0);
}
function isoDateOrToday(s: any) {
  const today = new Date().toISOString().slice(0, 10);
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return today;
  return s;
}

/** Sanifica una entry di recovery. */
function sanitizeRecoveryEntry(e: any) {
  const out = { ...e };
  out.date = isoDateOrToday(out.date);
  out.doms = roundHalf(out.doms);
  out.sleepHours = clampInt(out.sleepHours, 0, 12);
  out.sleepMinutes = snapMinutes(out.sleepMinutes);
  if (typeof out.athleteId !== "string" || !out.athleteId) out.athleteId = "davide";
  if (typeof out.pending !== "boolean") out.pending = true;
  if (typeof out.updatedAt !== "string") out.updatedAt = new Date().toISOString();
  // stringhe pulite
  if (out.notes != null) out.notes = String(out.notes).trim();
  if (out.pains != null) out.pains = String(out.pains).trim();
  return out;
}

/** Unisce entry con stessa (date, athleteId): tiene la più recente e concatena pains/notes. */
function consolidateRecoveryEntries(list: any[]) {
  const map = new Map<string, any>();
  for (const raw of list || []) {
    const e = sanitizeRecoveryEntry(raw);
    const key = `${e.athleteId}|${e.date}`;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, e);
    } else {
      // scegli la più recente
      const curT = Date.parse(cur.updatedAt || 0);
      const newT = Date.parse(e.updatedAt || 0);
      const newer = newT > curT ? e : cur;
      const older = newT > curT ? cur : e;
      const merged = {
        ...newer,
        notes: [older.notes, newer.notes].filter(Boolean).join(" | "),
        pains: [older.pains, newer.pains].filter(Boolean).join(" | ")
      };
      map.set(key, merged);
    }
  }
  return Array.from(map.values());
}
// ----------------------------------------------------------------
/** Rimuove null/undefined ricorsivamente da oggetti/array. */
function dropNullsDeep(v: any): any {
  if (v === null || v === undefined) return undefined;

  if (Array.isArray(v)) {
    const arr = v.map(dropNullsDeep).filter(x => x !== undefined);
    // se vuoi tenere array vuoti, ritorna arr (senza controllo length)
    return arr.length ? arr : undefined;
  }

  if (typeof v === "object") {
    const out: any = {};
    for (const [k, val] of Object.entries(v)) {
      const cleaned = dropNullsDeep(val);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    // se vuoi tenere oggetti vuoti, ritorna out (senza controllo keys)
    return Object.keys(out).length ? out : undefined;
  }

  return v;
}

function ok(data: any = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}
function fail(status: number, error: string, extra: any = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") !== "false"; // default: true

    // 1) parse & validate input
    const body = (await req.json()) as Body;
    if (!body || typeof body.file !== "string") {
      return fail(400, "Missing 'file' in body");
    }
    if (!Array.isArray(body.ops) || body.ops.length === 0) {
      return fail(400, "Missing or empty 'ops' array");
    }

    // 2) manifest + allowlist
    const manifest = readManifest();
    const entry = getFileEntry(manifest, body.file);
    if (!entry) return fail(403, "File non autorizzato (non presente nel manifest)");

    // 3) policy
    const policy = entry.write_policy ?? "patch_only_with_approval";
    const isDraftDirect = policy === "draft_direct" && body.file === "session_draft.json";
    if (!dryRun && policy === "read_only") {
      return fail(403, "File in sola lettura (automation-only)");
    }

    // 4) risolvi path SOLO dal manifest (no input esterno)
    const filePath = resolveFromManifest(manifest, body.file);
    const versionsDir = manifest.backups?.file_versions?.enabled
      ? (manifest.backups?.file_versions?.dir ?? path.join(path.dirname(filePath), ".file_versions"))
      : undefined;
    const keepLast = manifest.backups?.file_versions?.keep_last ?? 20;

    // 5) leggi + ETag
    const { obj: beforeObj, etag: beforeETag } = readJsonFileSafe(filePath);

    // 6) precondizione ETag: richiesta se commit e non draft_direct
    if (!dryRun && !isDraftDirect) {
      // ------------- FIX If-Match per draft_direct -------------
const allowDirect = entry?.write_policy === "draft_direct";

// etag corrente del file (serve per bypassare l'If-Match)
const { etag: currentEtag } = readJsonFileSafe(filePath);

// Header If-Match inviato dal client (può essere null)
const headerIfMatch = req.headers.get("If-Match");

// Se è draft_direct, NON richiedere If-Match.
// Usiamo l'etag corrente per garantire l'atomicità senza obbligare il client.
const effectiveIfMatch = allowDirect
  ? (currentEtag || "*")
  : headerIfMatch;

// Se NON è draft_direct e manca l'If-Match -> 412 (comportamento normale)
if (!allowDirect && !effectiveIfMatch) {
  return NextResponse.json({ error: "Precondition Failed (If-Match required)" }, { status: 412 });
}
// ------------- FINE FIX -------------

    }

    // 7) applica la patch in memoria
    // 7) applica la patch in memoria
const afterObj = applyPatch(beforeObj, body.ops);

// Post-processing per recovery_log.json: valida e unisce entry del giorno
try {
  const isRecovery =
    path.basename(filePath).toLowerCase() === "recovery_log.json";
  if (isRecovery) {
    // 1) sanifica TUTTE le entry
    if (!Array.isArray((afterObj as any).entries)) (afterObj as any).entries = [];
    (afterObj as any).entries = (afterObj as any).entries
  .map((e: any) => dropNullsDeep(sanitizeRecoveryEntry(e)))
  .filter(Boolean);


    // 2) merge automatico per stessa (date, athleteId)
    ////(afterObj as any).entries = consolidateRecoveryEntries((afterObj as any).entries);
  }
} catch (e) {
  console.error("[/api/patch] recovery post-process error:", e);
}



    // (Stub) 8) validazione schema opzionale
    const validated = true;
    const validationErrors: string[] = [];
    if (!validated) return fail(422, "Schema validation failed", { validationErrors });

    // 9) scrivi se non è dry-run
   let afterETag: string = beforeETag;  // tipo esplicito
if (!dryRun) {
  const allowDirect = entry?.write_policy === "draft_direct";
  const effectiveIfMatch = allowDirect ? (beforeETag || "*") : (req.headers.get("If-Match") ?? undefined);

  afterETag = await atomicWriteJsonWithBackup(
    filePath,
    afterObj,
    { ifMatch: effectiveIfMatch, versionsDir }
  );
}


    // 10) risposta uniforme
    const changesPreview = { approxChangedKeys: Object.keys(afterObj ?? {}) };
    const res = ok({
      file: body.file,
      dryRun,
      validated,
      validationErrors,
      beforeVersion: beforeETag,
      afterVersion: afterETag,
      changesPreview,
    });
    res.headers.set("ETag", afterETag);
    return res;
  } catch (e: any) {
    // log server
    console.error("[/api/patch][POST] ERROR:", e?.message, e?.stack);
    return fail(500, e?.message || "Errore interno");
  }
}
