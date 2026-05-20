import FormClient from '@/components/FormClient';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Formular colectare documente – Start-Up Nation
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Vă rugăm să completați datele firmei și ale administratorului și să încărcați
          documentele solicitate. La final, dosarul dumneavoastră va fi transmis automat
          consultantului.
        </p>
      </div>
      <FormClient />
    </div>
  );
}
