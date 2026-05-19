'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">A apărut o eroare</h1>
      <p className="mt-2 text-slate-600">
        Vă rugăm să încercați din nou. Dacă problema persistă, contactați consultantul.
      </p>
      <button className="btn-primary mt-6" onClick={() => reset()}>
        Reîncearcă
      </button>
    </div>
  );
}
