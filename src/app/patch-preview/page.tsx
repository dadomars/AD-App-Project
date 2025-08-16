"use client";
import { useEffect, useMemo, useState } from "react";

type Draft = {
  date?: string;
  athleteId?: string;
  weight?: number|null;
  rpe?: number|null;
  manualTimeSec?: number|null;
  notes?: string;
  updatedAt?: string;
};

type DryRunResult = {
  ok: boolean;
  file?: string;
  dryRun?: boolean;
  beforeVersion?: string;
  afterVersion?: string;
  changesPreview?: { approxChangedKeys: string[] };
  error?: string;
};

export default function PatchPreviewPage() {
  const [draft, setDraft] = useState<Draft|null>(null);
  const [dry, setDry] = useState<DryRunResult|null>(null);
  const [etag, setEtag] = useState<string|undefined>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/session/draft", { cache: "no-store" });
      const j = await r.json();
      setDraft(j?.draft ?? {});
    })();
  }, []);

  const entry = useMemo(() => {
    if (!draft) return null;
    return {
      date: draft.date ?? new Date().toISOString().slice(0,10),
      athleteId: draft.athleteId ?? "davide",
      weight: draft.weight ?? null,
      rpe: draft.rpe ?? null,
      manualTimeSec: draft.manualTimeSec ?? null,
      notes: draft.notes ?? "",
      updatedAt: draft.updatedAt ?? new Date().toISOString()
    };
  }, [draft]);

  async function doDryRun() {
    if (!entry) return;
    setBusy(true); setMsg("");
    try {
      const payload = {
        file: "session_log.json",
        // append alla lista /entries
        ops: [{ op: "add", path: "/entries/-", value: entry }]
      };
      const res = await fetch("/api/patch?dryRun=true", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const et = res.headers.get("ETag") ?? undefined;
      const j = await res.json();
      setDry(j);
      setEtag(et);
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
    } catch (e:any) {
      setMsg(e?.message || "Errore dry-run");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!entry) return;
    if (!etag) { setMsg("Fai prima la Anteprima (dry-run)."); return; }
    setBusy(true); setMsg("");
    try {
      // 1) commit su session_log.json con If-Match
      const payload = {
        file: "session_log.json",
        ops: [{ op: "add", path: "/entries/-", value: entry }]
      };
      const commit = await fetch("/api/patch?dryRun=false", {
        method: "POST",
        headers: { "content-type": "application/json", "if-match": etag },
        body: JSON.stringify(payload)
      });
      const cj = await commit.json();
      if (!commit.ok) throw new Error(cj?.error || `HTTP ${commit.status}`);

      // 2) purge del draft (rimuovo campi conosciuti)
      const purgeOps = [
        "date","athleteId","weight","rpe","manualTimeSec","notes","updatedAt"
      ].map(k => ({ op: "remove", path: `/${k}` }));
      await fetch("/api/patch?dryRun=false", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: "session_draft.json", ops: purgeOps })
      });

      setMsg("✅ Patch approvata e salvata nel log. Draft svuotato.");
      setDry(null);
      setEtag(undefined);
    } catch (e:any) {
      setMsg(e?.message || "Errore approvazione");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{maxWidth:900, margin:"40px auto", padding:16}}>
      <h1>Anteprima Patch → Approva</h1>

      {!draft && <p>Caricamento draft…</p>}
      {draft && (
        <>
          <section style={{marginTop:16}}>
            <h3>Entry che verrà aggiunta a <code>session_log.json</code></h3>
            <pre style={{background:"#111",color:"#eee",padding:12,borderRadius:8,overflow:"auto"}}>
              {JSON.stringify(entry, null, 2)}
            </pre>
            <div style={{display:"flex", gap:8}}>
              <button onClick={doDryRun} disabled={busy}>Anteprima (dry‑run)</button>
              <button onClick={approve} disabled={busy || !etag}>Approva (commit)</button>
              {etag && <span style={{fontSize:12,opacity:.7}}>ETag: {etag}</span>}
            </div>
          </section>

          {dry && (
            <section style={{marginTop:16}}>
              <h3>Risultato dry‑run</h3>
              <pre style={{background:"#111",color:"#eee",padding:12,borderRadius:8,overflow:"auto"}}>
                {JSON.stringify(dry, null, 2)}
              </pre>
            </section>
          )}

          {msg && <p style={{marginTop:12}}>{msg}</p>}
        </>
      )}
    </main>
  );
}
