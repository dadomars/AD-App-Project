"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

function formatSec(s?: number) {
  if (!s && s !== 0) return "—";
  const h = Math.floor(s / 3600),
        m = Math.floor((s % 3600) / 60),
        ss = Math.floor(s % 60);
  return [h, m.toString().padStart(2, "0"), ss.toString().padStart(2, "0")]
    .filter((v, i) => !(i === 0 && h === 0))
    .join(":");
}

export default function SessionDetailPage() {
  
  const p = useParams<{ id: string }>();
  const id = p?.id;
  const [doc, setDoc] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
     if (!id) return;
    (async () => {
      try {
        const r = await fetch(`/api/session/get?id=${id}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        setDoc(j.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);
async function duplicate() {
  if (!doc) return;
  const payload = {
    date: doc.date, type: doc.type,
    runMetrics: doc.runMetrics ?? null,
    blocks: doc.blocks ?? null,
    notes: (doc.notes ? `${doc.notes} (duplicata)` : null),
    source: "manual",
    status: "draft",
    calories_equivalent: doc.calories_equivalent ?? null,
  };
  const r = await fetch("/api/session/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
  // redirect alla nuova (se ritorni _id) o alla lista
  const id = j?.data?._id?.toString?.() ?? j?.data?.id;
  window.location.href = id ? `/session/${id}` : "/session";
}

  const rm = doc?.runMetrics || {};
  const distanceKm = rm.totalDistanceKm ?? rm.distance_km ?? "—";
  const timeSec = rm.totalTimeSec ?? rm.duration_sec;
  const pace =
  typeof timeSec === "number" &&
  typeof distanceKm === "number" &&
  distanceKm > 0
    ? `${Math.floor((timeSec / distanceKm) / 60)}:${String(Math.round((timeSec / distanceKm) % 60)).padStart(2, "0")}/km`
    : null;


  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-3"><Link href="/session" className="text-sm text-blue-600 hover:underline">← Torna alla lista</Link></div>
      {loading && <div>Caricamento…</div>}
      {!loading && !doc && <div className="text-gray-500">Sessione non trovata.</div>}
      {doc && (
        <>
          <h1 className="text-2xl font-bold">{doc.date} · {doc.type}</h1>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-4 shadow-sm">
              <div className="text-xs text-gray-500">Distanza</div>
              <div className="text-xl font-semibold">{distanceKm} km</div>
            </div>
            <div className="rounded-xl border p-4 shadow-sm">
              <div className="text-xs text-gray-500">Tempo</div>
              <div className="text-xl font-semibold">{formatSec(typeof timeSec === "number" ? timeSec : undefined)}</div>
            </div>
            <div className="rounded-xl border p-4 shadow-sm">
  </div>
{(typeof timeSec === "number" && typeof distanceKm === "number" && distanceKm > 0) && (
  <div className="rounded-xl border p-4 shadow-sm">
    <div className="text-xs text-gray-500">Pace</div>
    <div className="text-xl font-semibold">
      {`${Math.floor((timeSec / distanceKm)/60)}:${String(Math.round((timeSec / distanceKm)%60)).padStart(2,"0")}/km`}
    </div>
  </div>
)}

            <div className="rounded-xl border p-4 shadow-sm">
              <div className="text-xs text-gray-500">Stato</div>
              <div className="text-xl font-semibold">{doc.status}</div>
            </div>
          </div>

          <div className="mt-6 rounded-md bg-gray-50 p-3 text-sm overflow-auto">
            <details open>
              <summary className="cursor-pointer select-none font-medium">runMetrics (raw)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">{JSON.stringify(doc.runMetrics ?? {}, null, 2)}</pre>
            </details>
          </div>
<button onClick={duplicate} className="mt-4 rounded-md border px-3 py-1 text-sm">
  Duplica come bozza
</button>

          {doc.notes && (
            <div className="mt-4 rounded-md border p-3">
              <div className="text-sm text-gray-500 mb-1">Note</div>
              <div className="text-sm">{doc.notes}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
