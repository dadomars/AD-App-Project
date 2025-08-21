import RecoveryForm from "./RecoveryForm";
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <a href="/recovery" className="text-sm text-blue-600 hover:underline">← Torna alla lista</a>
      <h1 className="mt-2 text-2xl font-bold">Nuovo Recovery</h1>
      <div className="mt-6"><RecoveryForm /></div>
    </div>
  );
}
