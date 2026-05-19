export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Pagină inexistentă</h1>
      <p className="mt-2 text-slate-600">Pagina căutată nu a fost găsită.</p>
      <a href="/" className="btn-secondary mt-6 inline-flex">
        Înapoi acasă
      </a>
    </div>
  );
}
