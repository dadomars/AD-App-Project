/* Pagina di test per /api/upload/screenshot */
import React, { useState } from "react";

export default function UploadTest() {
  const [status, setStatus] = useState<"idle"|"uploading"|"done"|"error">("idle");
  const [url, setUrl] = useState<string>("");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    
    if (!file) return;
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/screenshot", { method: "POST", body: formData });
      const data = await res.json();
      if (data?.ok && data.url) {
        setUrl(data.url);
        setStatus("done");
      } else {
        console.error(data);
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Test Upload Screenshot</h1>
      <p>Seleziona un’immagine da caricare su <code>/api/upload/screenshot</code>.</p>

      <input type="file" accept="image/*" onChange={handleChange} />

      <div style={{ marginTop: 16 }}>
        <strong>Status:</strong> {status}
      </div>

      {url ? (
        <div style={{ marginTop: 16 }}>
          <div><strong>URL:</strong> <a href={url} target="_blank" rel="noreferrer">{url}</a></div>
          <div style={{ marginTop: 8 }}>
            <img src={url} alt="preview" style={{ maxWidth: 320, display: "block" }} />
          </div>
        </div>
        
      ) : null}
    </main>
  );
}
