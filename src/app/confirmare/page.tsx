export const dynamic = 'force-dynamic';

export default function ConfirmarePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="card text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-8 w-8 text-emerald-600"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Documentele au fost transmise cu succes.
        </h1>
        <p className="mt-2 text-slate-600">
          Vă vom contacta dacă sunt necesare completări.
        </p>
        <a href="/" className="btn-secondary mt-6 inline-flex">
          Înapoi la formular
        </a>
      </div>
    </div>
  );
}
