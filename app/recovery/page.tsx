"use client";
import React from "react";

function useRecoveryList() {
  const [data, setData] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [skip, setSkip] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string|null>(null);
  const limit = 20;

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/recovery/list?limit=${limit}&skip=${skip}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j.data || []); setTotal(j.total || 0);
    } catch (e: any) { setError(e?.message || "Errore caricamento"); }
    finally { setLoading(false); }
  }, [skip]);

  React.useEffect(() => { load(); }, [load]);
  return { data, total, skip, setSkip, limit, loading, error };
}

export default function RecoveryListPage() {
  const { data, total, skip, setSkip, limit, loading, error } = useRecoveryList();
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recovery</h1>
        <a href="/recovery/new" className="rounded-md bg-blue-600 px-4 py-2 text-white">+ Nuovo</a>
      </div>

      {loading && <div className="text-sm">Caricamento…</div>}
      {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Energy</th>
                <th className="px-3 py-2">Mood</th>
                <th className="px-3 py-2">Semaforo</th>
                <th className="px-3 py-2">DOMS</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="px-3 py-2 font-mono">{row.date}</td>
                  <td className="px-3 py-2">{row.energy}</td>
                  <td className="px-3 py-2">{row.mood}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                      row.semaforo === "green" ? "bg-green-100 text-green-800" :
                      row.semaforo === "yellow" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>{row.semaforo}</span>
                  </td>
                  <td className="px-3 py-2 truncate max-w-[32ch]">{(row.domsZones || []).join(", ")}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Nessuna entry.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <div>Totale: {total}</div>
        <div className="space-x-2">
          <button onClick={() => setSkip(Math.max(0, skip - limit))} disabled={skip===0} className="rounded border px-3 py-1 disabled:opacity-50">Prev</button>
          <button onClick={() => setSkip(skip + limit)} disabled={skip + limit >= total} className="rounded border px-3 py-1 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
