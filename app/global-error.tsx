"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui" }}>
        <h2>Qualcosa è andato storto</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error?.message}</pre>
        <button onClick={() => reset()} style={{ marginTop: 8 }}>
          Riprova
        </button>
      </body>
    </html>
  );
}
