'use client';
import { useState } from 'react';

export default function Page() {
  const [msg, setMsg] = useState('');
  return (
    <main style={{padding:20}}>
      <h1>Test /api/session/parse-run</h1>
      <input type="file" accept=".tcx,.csv" onChange={async e => {
        const f = e.target.files?.[0];
        if (!f) return;
        const fd = new FormData();
        fd.append('file', f);
        const res = await fetch('/api/session/parse-run', { method: 'POST', body: fd });
        setMsg(`${res.status} ` + await res.text());
      }} />
      <pre>{msg}</pre>
    </main>
  );
}
