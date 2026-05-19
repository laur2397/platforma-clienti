'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type FieldErrors = Record<string, string>;

const COFINANTARE_OPTIONS = [
  { value: 10, label: '10% cofinanțare – 10 puncte' },
  { value: 15, label: '15% cofinanțare – 15 puncte' },
  { value: 20, label: '20% cofinanțare – 20 puncte' },
];

const MENTINERE_OPTIONS = [
  { value: 24, label: '24 luni – 0 puncte' },
  { value: 30, label: '30 luni – 10 puncte' },
];

const FORFETARA_OPTIONS = [
  { value: 'Da', label: 'Da' },
  { value: 'Nu', label: 'Nu' },
  { value: 'Nu stiu', label: 'Nu știu / decid împreună cu consultantul' },
];

export default function FormClient() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function setError(name: string, msg?: string) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (msg) next[name] = msg;
      else delete next[name];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    setSubmitting(true);
    setGeneralError(null);
    setFieldErrors({});

    const fd = new FormData(formRef.current);

    // Validări minime client-side (server-ul re-validează).
    const cui = String(fd.get('cui') ?? '').replace(/\D+/g, '');
    if (!cui) {
      setError('cui', 'CUI obligatoriu');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/submit', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fieldErrors?: FieldErrors;
      };
      if (!res.ok || !data.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setGeneralError(data.error ?? 'A apărut o eroare la transmiterea formularului.');
        setSubmitting(false);
        return;
      }
      router.push('/confirmare');
    } catch (err) {
      setGeneralError('Nu am putut contacta serverul. Verificați conexiunea și încercați din nou.');
      setSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="space-y-6"
      encType="multipart/form-data"
    >
      {generalError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {generalError}
        </div>
      )}

      {/* Secțiunea 1 */}
      <section className="card">
        <h2 className="section-title">1. Date firmă</h2>
        <p className="section-help">
          CUI-ul este identificatorul principal al dosarului. Denumirea firmei este obligatorie
          pentru verificare.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cui" className="label label-required">CUI firmă</label>
            <input
              id="cui"
              name="cui"
              type="text"
              autoComplete="off"
              inputMode="numeric"
              placeholder="ex: 12345678"
              required
              className="input"
            />
            {fieldErrors['cui'] && <p className="field-error">{fieldErrors['cui']}</p>}
          </div>
          <div>
            <label htmlFor="denumireFirma" className="label label-required">Denumire firmă</label>
            <input
              id="denumireFirma"
              name="denumireFirma"
              type="text"
              placeholder="ex: EXEMPLU SRL"
              required
              className="input"
            />
            {fieldErrors['denumireFirma'] && (
              <p className="field-error">{fieldErrors['denumireFirma']}</p>
            )}
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className="label label-required">
            Ați mai avut sau aveți calitatea de asociat/acționar majoritar ori administrator
            într-o altă firmă?
          </legend>
          <div className="flex gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="aAvutFirma" value="Da" required /> Da
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="aAvutFirma" value="Nu" required /> Nu
            </label>
          </div>
          {fieldErrors['aAvutFirma'] && (
            <p className="field-error">{fieldErrors['aAvutFirma']}</p>
          )}
        </fieldset>
      </section>

      {/* Secțiunea 2 */}
      <section className="card">
        <h2 className="section-title">2. Date administrator / asociat</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="numeAdmin" className="label label-required">Nume și prenume</label>
            <input id="numeAdmin" name="numeAdmin" type="text" required className="input" />
            {fieldErrors['numeAdmin'] && <p className="field-error">{fieldErrors['numeAdmin']}</p>}
          </div>
          <div>
            <label htmlFor="cnp" className="label label-required">CNP</label>
            <input
              id="cnp"
              name="cnp"
              type="text"
              inputMode="numeric"
              pattern="\d{13}"
              maxLength={13}
              required
              className="input"
            />
            {fieldErrors['cnp'] && <p className="field-error">{fieldErrors['cnp']}</p>}
          </div>
          <div>
            <label htmlFor="email" className="label label-required">Adresă de e-mail</label>
            <input id="email" name="email" type="email" required className="input" />
            {fieldErrors['email'] && <p className="field-error">{fieldErrors['email']}</p>}
          </div>
          <div>
            <label htmlFor="telefon" className="label label-required">Număr de telefon</label>
            <input
              id="telefon"
              name="telefon"
              type="tel"
              inputMode="tel"
              required
              className="input"
            />
            {fieldErrors['telefon'] && <p className="field-error">{fieldErrors['telefon']}</p>}
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="cartIdentitate" className="label label-required">
            Carte de identitate (PDF, JPG sau PNG)
          </label>
          <input
            id="cartIdentitate"
            name="cartIdentitate"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            required
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-white hover:file:bg-brand-700"
          />
        </div>
      </section>

      {/* Secțiunea 3 */}
      <section className="card">
        <h2 className="section-title">3. Activitatea propusă</h2>
        <p className="section-help">Codul CAEN va fi stabilit ulterior de consultant.</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="activitate" className="label label-required">
              Ce activitate doriți să desfășurați prin proiect?
            </label>
            <textarea
              id="activitate"
              name="activitate"
              required
              className="textarea"
              placeholder="Descrieți pe scurt activitatea pe care doriți să o desfășurați."
            />
            {fieldErrors['activitate'] && <p className="field-error">{fieldErrors['activitate']}</p>}
          </div>
          <div>
            <label htmlFor="localitateJudet" className="label label-required">
              Localitatea și județul unde se va desfășura activitatea
            </label>
            <input
              id="localitateJudet"
              name="localitateJudet"
              type="text"
              required
              className="input"
              placeholder="ex: Cluj-Napoca, Cluj"
            />
            {fieldErrors['localitateJudet'] && (
              <p className="field-error">{fieldErrors['localitateJudet']}</p>
            )}
          </div>
        </div>
      </section>

      {/* Secțiunea 4 */}
      <section className="card">
        <h2 className="section-title">4. Oferte</h2>
        <p className="section-help">
          Se recomandă încărcarea ofertelor în format PDF. Sunt acceptate și documente Word sau
          fotografii clare.
        </p>
        <div>
          <label htmlFor="oferte" className="label">
            Oferte pentru echipamente, bunuri sau servicii (PDF, DOC, DOCX, JPG, PNG)
          </label>
          <input
            id="oferte"
            name="oferte"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-white hover:file:bg-brand-700"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="observatiiOferte" className="label">
            Observații despre investiția dorită (opțional)
          </label>
          <textarea id="observatiiOferte" name="observatiiOferte" className="textarea" />
        </div>
      </section>

      {/* Secțiunea 5 */}
      <section className="card">
        <h2 className="section-title">5. Opțiuni proiect</h2>

        <fieldset className="mt-2">
          <legend className="label label-required">
            Ce procent de cofinanțare proprie doriți să asumați?
          </legend>
          <div className="space-y-1">
            {COFINANTARE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="cofinantare" value={opt.value} required />
                {opt.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Procentul ales presupune obligația de a susține financiar contribuția proprie aferentă
            proiectului.
          </p>
          {fieldErrors['cofinantare'] && <p className="field-error">{fieldErrors['cofinantare']}</p>}
        </fieldset>

        <fieldset className="mt-5">
          <legend className="label label-required">
            Pentru cele două locuri de muncă obligatorii, ce perioadă de menținere vă asumați?
          </legend>
          <div className="flex flex-wrap gap-4">
            {MENTINERE_OPTIONS.map((opt) => (
              <label key={opt.value} className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="mentinereLuni" value={opt.value} required />
                {opt.label}
              </label>
            ))}
          </div>
          {fieldErrors['mentinereLuni'] && (
            <p className="field-error">{fieldErrors['mentinereLuni']}</p>
          )}
        </fieldset>

        <fieldset className="mt-5">
          <legend className="label label-required">
            Doriți să alocați bani, în limita a 80.000 lei, pentru sume forfetare (salarii, chirie,
            utilități și contabilitate)?
          </legend>
          <div className="space-y-1">
            {FORFETARA_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="sumaForfetara" value={opt.value} required />
                {opt.label}
              </label>
            ))}
          </div>
          {fieldErrors['sumaForfetara'] && (
            <p className="field-error">{fieldErrors['sumaForfetara']}</p>
          )}
        </fieldset>
      </section>

      {/* Acord */}
      <section className="card space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acordCorectitudine" value="on" required className="mt-1" />
          <span>
            Confirm că datele completate sunt corecte și că documentele încărcate sunt lizibile.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acordGDPR" value="on" required className="mt-1" />
          <span>
            Sunt de acord cu prelucrarea datelor personale în scopul analizării și pregătirii
            dosarului de finanțare.
          </span>
        </label>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Se trimite…' : 'Trimite documentele'}
        </button>
      </div>
    </form>
  );
}
