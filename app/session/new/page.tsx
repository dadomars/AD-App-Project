import SessionForm from "./SessionForm";

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <a href="/session" className="text-sm text-blue-600 hover:underline">← Torna alla lista</a>
      <h1 className="mt-2 text-2xl font-bold">Nuova Sessione</h1>
      <div className="mt-6"><SessionForm /></div>
    </div>
  );
}
