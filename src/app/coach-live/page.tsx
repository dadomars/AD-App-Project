"use client";

import { useEffect, useRef, useState } from "react";

type Draft = {
  date?: string;
  athleteId?: string;
  weight?: number | null;
  rpe?: number | null;
  manualTimeSec?: number | null;
  notes?: string;
  updatedAt?: string;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function CoachLivePage() {
  const [form, setForm] = useState<Draft>({
    date: new Date().toISOString().slice(0, 10),
    athleteId: "davide",
    weight: null,
    rpe: null,
    manualTimeSec: null,
    notes: "",
  });
  const [status, setStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const timer = useRef<NodeJS.Timeout|null>(null);
  const inFlight = useRef<boolean>(false);
  const latestForm = useRef(form);
  useEffect(() => { latestForm.current = form; }, [form]);

  // peso a step 0.5 kg
  const setWeight = (v: number) =>
    setForm(f => ({ ...f, weight: Math.round(v * 2) / 2 }));

  // autosave dopo 5s di inattività
  const scheduleSave = () => {
    setStatus("idle");
    setErrorMsg("");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveDraft(), 2000);
  };

 async function saveDraft() {
  if (inFlight.current) return;
  inFlight.current = true;
  setStatus("saving");
  try {
    const f = latestForm.current; // 👈 sempre l'ultimo stato valido
    const payload = {
      file: "session_draft.json",
      ops: [
        { op: "add", path: "/date", value: f.date },
        { op: "add", path: "/athleteId", value: f.athleteId },
        { op: "add", path: "/weight", value: f.weight },
        { op: "add", path: "/rpe", value: f.rpe },
        { op: "add", path: "/manualTimeSec", value: f.manualTimeSec },
        { op: "add", path: "/notes", value: f.notes ?? "" },
        { op: "add", path: "/updatedAt", value: new Date().toISOString() }
      ]
    };

      const res = await fetch("/api/patch?dryRun=false", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }

      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Errore");
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Coach Live — autosave</h1>
      <p style={{opacity:.8, fontSize:14, marginTop:-8}}>Compila e smetti di digitare: salva automaticamente dopo 5 secondi.</p>

      <div style={{ display:"grid", gap:12, marginTop:16 }}>
        <label>
          Data
          <input type="date" value={form.date}
            onChange={e => { setForm(f => ({ ...f, date: e.target.value })); scheduleSave(); }} />
        </label>

        <label>
          Peso (kg) — step 0.5
          <input type="number" step={0.5} value={form.weight ?? ""}
            onChange={e => { const v = Number(e.target.value); if (!Number.isNaN(v)) setWeight(v); else setForm(f=>({...f,weight:null})); scheduleSave(); }} />
        </label>

        <label>
          RPE (1–10)
          <input type="number" min={1} max={10} step={1} value={form.rpe ?? ""}
            onChange={e => { const v = clamp(Number(e.target.value),1,10); setForm(f => ({ ...f, rpe: Number.isNaN(v)? null : v })); scheduleSave(); }} />
        </label>

        <label>
          Tempo manuale (sec)
          <input type="number" min={0} step={1} value={form.manualTimeSec ?? ""}
            onChange={e => { const v = Math.max(0, Number(e.target.value)); setForm(f => ({ ...f, manualTimeSec: Number.isNaN(v)? null : v })); scheduleSave(); }} />
        </label>

        <label>
          Note
          <textarea
  rows={3}
  value={form.notes ?? ""}
  onChange={e => { setForm(f => ({ ...f, notes: e.target.value })); scheduleSave(); }}
  onBlur={() => void saveDraft()}   // 👈 salva appena esci dal campo
/>
        </label>

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:14, opacity:.8 }}>
            Stato: {status === "idle" ? "—" : status}
          </span>
          {status === "saving" && <span>⏳</span>}
          {status === "saved" && <span>✅</span>}
          {status === "error" && <span>❌ {errorMsg}</span>}
          <button onClick={() => void saveDraft()} disabled={status==="saving"} style={{ marginLeft:"auto" }}>
            Salva ora
          </button>
        </div>
      </div>
    </main>
  );
}
