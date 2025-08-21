// pwa/app/session/new/SessionForm.tsx
"use client";
import React from "react";
import { useRouter } from "next/navigation";

type RunMetrics = {
  totalDistanceKm?: number;
  totalTimeSec?: number;
  avgPace?: string;
  avgHr?: number;
} & Record<string, any>;

type SessionPayload = {
  date: string;
  type: "Corsa" | "WOD" | "Forza" | "Altro";
  runMetrics: RunMetrics | null;
  blocks: any | null;
  notes: string | null;
  source: "manual" | "device" | "import";
  status: "saved" | "draft";
  calories_equivalent: number | null;
};


function adaptMetrics(raw: RunMetrics): RunMetrics {
  const distanceKm =
    raw.totalDistanceKm ?? raw.distance_km ?? raw.distanceKm ?? null;
  const timeSec =
    raw.totalTimeSec ?? raw.duration_sec ?? raw.time_sec ?? null;
  const pace =
    raw.avgPace ?? raw.pace_avg ?? (timeSec && distanceKm ? `${Math.floor((timeSec/distanceKm)/60)}:${String(Math.round((timeSec/distanceKm)%60)).padStart(2,"0")}/km` : null);
  const avgHr =
    raw.avgHr ?? raw.hr_avg ?? null;

  return {
    ...raw,
    totalDistanceKm: distanceKm,
    totalTimeSec: timeSec,
    avgPace: pace,
    avgHr,
  };
}

function formatSec(s: number) {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = Math.floor(s % 60);
  return [h, m.toString().padStart(2, "0"), ss.toString().padStart(2, "0")]
    .filter((v, i) => !(i === 0 && h === 0))
    .join(":");
}

export default function SessionForm() {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsing, setParsing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();
  const [runMetrics, setRunMetrics] = React.useState<RunMetrics | null>(null);
  const [form, setForm] = React.useState({
    date: "",
    type: "Corsa" as SessionPayload["type"],
    notes: "",
    status: "saved" as SessionPayload["status"],
  });
  const [msg, setMsg] = React.useState<{ t: "info" | "ok" | "err"; m: string } | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setRunMetrics(null);
    setMsg(null);
  };

  async function parseRun() {
    if (!file) return setMsg({ t: "err", m: "Seleziona un file .tcx o .csv." });
    setParsing(true); setMsg({ t: "info", m: "Parsing in corso…" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/session/parse-run", { method: "POST", body: fd });
      if (!r.ok) {
        if (r.status === 413) throw new Error("File troppo grande (413).");
        const j = await safeJson(r); throw new Error(j?.error || `Errore ${r.status}`);
      }
      const j = await r.json();
      if (!j?.ok) throw new Error("Risposta non valida dal parser.");
      setRunMetrics(adaptMetrics(j.runMetrics ?? {}));
      setMsg({ t: "ok", m: "Parsing completato." });
    } catch (e: any) {
      setRunMetrics(null); setMsg({ t: "err", m: e?.message || "Errore parsing." });
    } finally { setParsing(false); }
  }

  function validate(): string | null {
    if (!form.date) return "La data è obbligatoria.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return "Formato data non valido (YYYY-MM-DD).";
    if (!form.type) return "Il tipo è obbligatorio.";
    return null;
  }

  async function save() {
    const err = validate(); if (err) return setMsg({ t: "err", m: err });
    const payload: SessionPayload = {
      date: form.date, type: form.type, runMetrics: runMetrics ?? null,
      blocks: null, notes: form.notes || null, source: "manual",
      status: form.status, calories_equivalent: null,
    };
    setSaving(true); setMsg({ t: "info", m: "Salvataggio in corso…" });
    try {
      const r = await fetch("/api/session/upsert", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const j = await safeJson(r);
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Errore ${r.status}`);
      setMsg({ t: "ok", m: "Sessione salvata." });
      setMsg({ t: "ok", m: "Sessione salvata." });

setTimeout(() => {
  // prova a leggere l'id restituito dall’API
  const id =
    j?.data?._id?.toString?.() ??  // ObjectId -> string se serve
    j?.data?.id ??                  // fallback se l’API usa 'id'
    undefined;

  if (id) {
    router.push(`/session/${id}`);
  } else {
    router.push("/session");
  }
}, 600);


    } catch (e: any) {
      setMsg({ t: "err", m: e?.message || "Errore salvataggio." });
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-md border p-3 text-sm ${
          msg.t === "err" ? "border-red-300 bg-red-50 text-red-800"
          : msg.t === "ok" ? "border-green-300 bg-green-50 text-green-800"
          : "border-gray-300 bg-gray-50 text-gray-700"}`}>
          {msg.m}
        </div>
      )}

      <section className="rounded-2xl border p-4 shadow-sm">
        <h2 className="font-semibold mb-3">1) Carica file e parse runMetrics</h2>
        <div className="flex items-center gap-3">
          <input type="file" accept=".tcx,.csv" onChange={onFile}
            className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-gray-700 hover:file:bg-gray-200" />
          <button type="button" onClick={parseRun} disabled={!file || parsing}
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50">
            {parsing ? "Parsing…" : "Estrai runMetrics"}
          </button>
        </div>

        {/* Preview + Summary Card */}
        {runMetrics && (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-4 shadow-sm">
                <div className="text-xs text-gray-500">Distanza</div>
                <div className="text-xl font-semibold">{runMetrics.totalDistanceKm ?? "—"} km</div>
              </div>
              <div className="rounded-xl border p-4 shadow-sm">
                <div className="text-xs text-gray-500">Tempo</div>
                <div className="text-xl font-semibold">
                  {runMetrics.totalTimeSec ? formatSec(runMetrics.totalTimeSec) : "—"}
                </div>
              </div>
              <div className="rounded-xl border p-4 shadow-sm">
                <div className="text-xs text-gray-500">Pace medio</div>
                <div className="text-xl font-semibold">{runMetrics.avgPace ?? "—"}</div>
              </div>
            </div>
            <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm overflow-auto">
              <details>
                <summary className="cursor-pointer select-none font-medium">Anteprima runMetrics</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {JSON.stringify(runMetrics, null, 2)}
                </pre>
              </details>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border p-4 shadow-sm">
        <h2 className="font-semibold mb-3">2) Compila dati sessione</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Data</label>
            <input type="date" value={form.date}
              onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">Tipo</label>
            <select value={form.type}
              onChange={(e) => setForm((s) => ({ ...s, type: e.target.value as any }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option value="Corsa">Corsa</option>
              <option value="WOD">WOD</option>
              <option value="Forza">Forza</option>
              <option value="Altro">Altro</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Note</label>
            <textarea value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm" rows={4} />
          </div>
          <div>
            <label className="block text-sm font-medium">Stato</label>
            <select value={form.status}
              onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as any }))}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
              <option value="saved">saved</option>
              <option value="draft">draft</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {saving ? "Salvataggio…" : "Salva sessione"}
        </button>
        <button type="button"
          onClick={() => { setFile(null); setRunMetrics(null); setForm({ date: "", type: "Corsa", notes: "", status: "saved" }); setMsg(null); }}
          className="rounded-md border px-4 py-2">
          Reset
        </button>
      </div>
    </div>
  );
}

async function safeJson(res: Response) { try { return await res.json(); } catch { return null; } }
