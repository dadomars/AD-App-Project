"use client";
import React, { useState } from "react";
import { formatDateIT } from "../../lib/date";

export default function ImportRun() {
  const [metrics, setMetrics] = useState<any>(null);
  const [status, setStatus] = useState<"idle"|"parsing"|"ready"|"saving"|"done"|"error">("idle");
  const [dateIso] = useState<string>(new Date().toISOString().slice(0,10));

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("parsing");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/sessions/parse-run", { method:"POST", body: fd });
    const data = await res.json();
    if (data?.ok) {
      setMetrics(data.runMetrics);
      setStatus("ready");
    } else {
      console.error(data);
      setStatus("error");
    }
  }

  async function saveToday() {
    if (!metrics) return;
    setStatus("saving");
    const res = await fetch("/api/sessions/upsert", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ date: dateIso, type:"Corsa", runMetrics: metrics, source:"garmin", status:"saved" })
    });
    const data = await res.json();
    if (data?.ok) setStatus("done"); else setStatus("error");
  }

  return (
    <main style={{ padding:24, fontFamily:"sans-serif", maxWidth:800 }}>
      <h1>Import corsa (oggi {formatDateIT(dateIso)})</h1>
      <p>Carica un file <code>.tcx</code> o <code>.csv</code> Garmin (max 20MB).</p>

      <input type="file" accept=".tcx,.csv" onChange={onFile} />
      <div style={{ marginTop:12 }}><strong>Status:</strong> {status}</div>

      {metrics && (
        <div style={{ marginTop:16, border:"1px solid #ddd", padding:12, borderRadius:8 }}>
          <h3>Anteprima metriche</h3>
          <ul>
            <li>Distanza: {metrics.distance_km ?? "-"} km</li>
            <li>Durata: {metrics.duration_sec ?? "-"} s</li>
            <li>Pace medio: {metrics.avg_pace_min_km ? metrics.avg_pace_min_km.toFixed(2) + " min/km" : "-"}</li>
            <li>HR medio: {metrics.avg_hr_bpm ?? "-"}</li>
            <li>HR max: {metrics.max_hr_bpm ?? "-"}</li>
            <li>Calorie: {metrics.calories ?? "-"}</li>
            <li>Salita: {metrics.elevation_gain_m ?? "-"} m</li>
            <li>Discesa: {metrics.elevation_loss_m ?? "-"} m</li>
            <li>Cadenza media: {metrics.cadence_avg_spm ?? "-"}</li>
          </ul>
          <button onClick={saveToday} disabled={status==="saving"}>Salva come sessione di oggi</button>
          {status==="done" && <span style={{ marginLeft:8 }}>✅ Salvato!</span>}
        </div>
      )}
    </main>
  );
}
