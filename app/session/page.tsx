"use client";
import React from "react";
import Link from "next/link";

type RunMetrics = Record<string, any>;
type SessionDoc = {
  _id: string;
  date: string;     // "YYYY-MM-DD"
  type: string;     // "Corsa" | ...
  status: string;   // "saved" | "draft"
  runMetrics?: RunMetrics | null;
  createdAt?: string;
  updatedAt?: string;
};

function formatSec(s?: number) {
  if (!s && s !== 0) return "—";
  const h = Math.floor(s / 3600),
        m = Math.floor((s % 3600) / 60),
        ss = Math.floor(s % 60);
  return [h, m.toString().padStart(2, "0"), ss.toString().padStart(2, "0")]
    .filter((v, i) => !(i === 0 && h === 0))
    .join(":");
}

export default function SessionListPage() {
  const [rows, setRows] = React.useState<SessionDoc[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fDate, setFDate] = React.useState("");
  const [fType, setFType] = React.useState("");
  
  async function load() {
  setLoading(true);
  try {
    const qs = new URLSearchParams({
      limit: "50",
      skip: "0",
      ...(fDate ? { date: fDate } : {}),
      ...(fType ? { type: fType } : {}),
    }).toString();
    const r = await fetch(`/api/session/list?${qs}`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
    setRows(j.data ?? []);
  } finally { setLoading(false); }
}

  return (
    
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessioni</h1>
        <div className="mt-4 flex flex-wrap items-end gap-3">
  <div>
    <label className="block text-xs text-gray-500">Data</label>
    <input type="date" value={fDate} onChange={(e)=>setFDate(e.target.value)}
      className="rounded-md border px-2 py-1 text-sm"/>
  </div>
  <div>
    <label className="block text-xs text-gray-500">Tipo</label>
    <select value={fType} onChange={(e)=>setFType(e.target.value)}
      className="rounded-md border px-2 py-1 text-sm">
      <option value="">Tutti</option>
      <option value="Corsa">Corsa</option>
      <option value="WOD">WOD</option>
      <option value="Forza">Forza</option>
      <option value="Altro">Altro</option>
    </select>
  </div>
  <button onClick={load} className="rounded-md border px-3 py-1 text-sm">Filtra</button>
  <button onClick={()=>{setFDate(""); setFType(""); load();}} className="rounded-md border px-3 py-1 text-sm">Reset</button>
</div>

        <Link href="/session/new" className="rounded-md bg-blue-600 px-4 py-2 text-white">+ Nuova</Link>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Distanza</th>
              <th className="px-3 py-2">Tempo</th>
              <th className="px-3 py-2">Pace</th>
              <th className="px-3 py-2">Stato</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={7}>Caricamento…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={7}>Nessuna sessione.</td></tr>
            )}
            {rows.map((r) => {
              const dist = r.runMetrics?.totalDistanceKm ?? r.runMetrics?.distance_km ?? "—";
              const tsec = r.runMetrics?.totalTimeSec ?? r.runMetrics?.duration_sec;
             const pace =
  typeof tsec === "number" && typeof dist === "number" && dist > 0
    ? `${Math.floor((tsec / dist) / 60)}:${String(Math.round((tsec / dist) % 60)).padStart(2,"0")}/km`
    : "—";

              return (
                <tr key={r._id} className="border-t">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{dist !== undefined ? dist : "—"} km</td>
                  <td className="px-3 py-2">{formatSec(typeof tsec === "number" ? tsec : undefined)}</td>
                  <td className="px-3 py-2">
  {pace !== "—"
    ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{pace}</span>
    : "—"}
</td>

                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      r.status === "saved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/session/${r._id}`} className="text-blue-600 hover:underline">Dettagli</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
