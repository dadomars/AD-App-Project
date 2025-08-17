import React, { useState } from "react";

const initial = {
  date: new Date().toISOString().slice(0,10),
  source: "manual",
  fields: {
    sleep_score: "",
    sleep_duration: "",
    resting_hr: "",
    hrv_ms: "",
    body_battery: "",
    training_readiness: "",
    perceived_recovery: "",
    doms: "",
    affected_area: "",
    pain_level: "",
    notes: ""
  },
  screenshotUrl: ""
};

export default function RecoveryPage() {
  const [form, setForm] = useState<any>(initial);
  const [busy, setBusy] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/screenshot", { method:"POST", body: fd });
    const data = await res.json();
    if (data?.ok) setForm((s:any)=>({ ...s, screenshotUrl: data.url }));
  }

  async function onSave() {
    setBusy(true);
    const res = await fetch("/api/recovery/upsert", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (data?.ok) setForm(initial); // ✅ reset dopo salvataggio
  }

  async function onChoose() {
    setBusy(true);
    const res = await fetch("/api/recovery/choose", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ _id: form._id, date: form.date }),
    });
    const data = await res.json();
    setBusy(false);
    if (data?.ok) alert("Selezionata come recovery del giorno");
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Recovery</h1>

      <div style={{ display:"grid", gap:12, maxWidth:640 }}>
        <label>
          Data
          <input type="date" value={form.date}
            onChange={e=>setForm((s:any)=>({ ...s, date: e.target.value }))} />
        </label>

        <label>
          Source
          <select value={form.source}
            onChange={e=>setForm((s:any)=>({ ...s, source: e.target.value }))}>
            <option value="manual">Manuale</option>
            <option value="garmin">Garmin</option>
          </select>
        </label>

        <label>
          Sleep score
          <input value={form.fields.sleep_score}
            onChange={e=>setForm((s:any)=>({ ...s, fields:{ ...s.fields, sleep_score: e.target.value } }))} />
        </label>

        <label>
          Resting HR
          <input value={form.fields.resting_hr}
            onChange={e=>setForm((s:any)=>({ ...s, fields:{ ...s.fields, resting_hr: e.target.value } }))} />
        </label>

        <label>
          HRV (ms)
          <input value={form.fields.hrv_ms}
            onChange={e=>setForm((s:any)=>({ ...s, fields:{ ...s.fields, hrv_ms: e.target.value } }))} />
        </label>

        <label>
          DOMS
          <input value={form.fields.doms}
            onChange={e=>setForm((s:any)=>({ ...s, fields:{ ...s.fields, doms: e.target.value } }))} />
        </label>

        <label>
          Note
          <textarea value={form.fields.notes}
            onChange={e=>setForm((s:any)=>({ ...s, fields:{ ...s.fields, notes: e.target.value } }))} />
        </label>

        <label>
          Screenshot (max 20MB)
          <input type="file" accept="image/*" onChange={onUpload} />
          {form.screenshotUrl ? (
            <img src={form.screenshotUrl} alt="preview" style={{ maxWidth: 240, marginTop: 8 }} />
          ) : null}
        </label>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onSave} disabled={busy}>Salva</button>
          <button onClick={onChoose} disabled={busy || !form._id}>Scegli questa</button>
          <button onClick={()=>setForm(initial)} disabled={busy}>Pulisci</button>
        </div>
      </div>
    </main>
  );
}
