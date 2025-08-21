"use client";
import React from "react";
import type { RecoveryPayload } from "@/schemas/recovery";

export default function RecoveryForm() {
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{t:"info"|"ok"|"err"; m:string} | null>(null);
  const [form, setForm] = React.useState<RecoveryPayload>({
    date: "", energy: 3, mood: 3, sleepHours: null, bodyweight: null, hrRest: null,
    domsZones: [], semaforo: "green", notes: "", status: "chosen", // scelgo direttamente
  });

  function onToggleZone(z: string) {
    setForm(s => ({ ...s, domsZones: s.domsZones.includes(z) ? s.domsZones.filter(v => v!==z) : [...s.domsZones, z] }));
  }

  function validate(): string | null {
    if (!form.date) return "La data è obbligatoria.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return "Formato data YYYY-MM-DD.";
    if (!form.domsZones || form.domsZones.length < 1) return "Indica almeno una zona DOMS.";
    if (!form.semaforo) return "Imposta il semaforo.";
    return null;
  }

  async function save() {
    const err = validate(); if (err) return setMsg({ t:"err", m: err });
    setSaving(true); setMsg({ t:"info", m:"Salvataggio in corso…" });
    try {
      const r = await fetch("/api/recovery/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await safeJson(r);
      if (!r.ok || !j?.ok) throw new Error(j?.error?.toString?.() || `HTTP ${r.status}`);
      setMsg({ t:"ok", m:"Recovery salvato." });
      // redirect alla lista dopo 600ms
setTimeout(()=>{ window.location.href = "/recovery"; }, 600);

    } catch (e:any) {
      setMsg({ t:"err", m: e?.message || "Errore salvataggio." });
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Data</label>
          <input type="date" value={form.date}
            onChange={(e)=>setForm(s=>({...s, date: e.target.value}))}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"/>
        </div>
        <div>
          <label className="block text-sm font-medium">Semaforo</label>
          <select value={form.semaforo}
            onChange={(e)=>setForm(s=>({...s, semaforo: e.target.value as any}))}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
            <option value="green">green</option>
            <option value="yellow">yellow</option>
            <option value="red">red</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Energy (1-5)</label>
          <input type="number" min={1} max={5} value={form.energy}
            onChange={(e)=>setForm(s=>({...s, energy: Number(e.target.value)}))}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"/>
        </div>
        <div>
          <label className="block text-sm font-medium">Mood (1-5)</label>
          <input type="number" min={1} max={5} value={form.mood}
            onChange={(e)=>setForm(s=>({...s, mood: Number(e.target.value)}))}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"/>
        </div>
        <div>
          <label className="block text-sm font-medium">Sleep (h)</label>
          <input type="number" min={0} max={24} step="0.1" value={form.sleepHours ?? ""}
            onChange={(e)=>setForm(s=>({...s, sleepHours: e.target.value==="" ? null : Number(e.target.value)}))}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"/>
        </div>
        <div>
          <label className="block text-sm font-medium">Peso (kg)</label>
          <input type="number" min={20} max={200} step="0.1" value={form.bodyweight ?? ""}
            onChange={(e)=>setForm(s=>({...s, bodyweight: e.target.value==="" ? null : Number(e.target.value)}))}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"/>
        </div>
        <div>
          <label className="block text-sm font-medium">HR Rest</label>
          <input type="number" min={30} max={120} value={form.hrRest ?? ""}
            onChange={(e)=>setForm(s=>({...s, hrRest: e.target.value==="" ? null : Number(e.target.value)}))}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"/>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">DOMS (seleziona zone)</label>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {["quadricipiti","ischiocrurali","polpacci","glutei","schiena","spalle","petto","core"].map(z=>(
              <button key={z} type="button"
                onClick={()=>onToggleZone(z)}
                className={`rounded border px-3 py-1 ${form.domsZones.includes(z) ? "bg-black text-white" : ""}`}>
                {z}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Note</label>
          <textarea rows={4} value={form.notes || ""}
            onChange={(e)=>setForm(s=>({...s, notes: e.target.value || ""}))}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"/>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {saving ? "Salvataggio…" : "Salva Recovery"}
        </button>
        <a href="/recovery" className="text-sm text-blue-600 hover:underline">Annulla</a>
      </div>
    </div>
  );
}

async function safeJson(res: Response) { try { return await res.json(); } catch { return null; } }
