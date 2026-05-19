import { z } from 'zod';

export const COFINANTARI = [10, 15, 20] as const;
export const MENTINERE = [24, 30] as const;
export const SUMA_FORFETARA = ['Da', 'Nu', 'Nu stiu'] as const;

export const FormSchema = z.object({
  cui: z
    .string()
    .min(1, 'CUI obligatoriu')
    .transform((v) => v.replace(/^RO/i, '').replace(/\D+/g, ''))
    .pipe(
      z
        .string()
        .min(2, 'CUI invalid')
        .max(12, 'CUI invalid'),
    ),
  denumireFirma: z.string().trim().min(2, 'Denumirea firmei este obligatorie').max(200),
  aAvutFirma: z.enum(['Da', 'Nu'], {
    errorMap: () => ({ message: 'Selectați Da sau Nu' }),
  }),

  numeAdmin: z.string().trim().min(2, 'Numele administratorului este obligatoriu').max(120),
  cnp: z
    .string()
    .trim()
    .regex(/^\d{13}$/, 'CNP-ul trebuie să aibă 13 cifre'),
  email: z.string().trim().email('Adresa de e-mail nu este validă').max(200),
  telefon: z
    .string()
    .trim()
    .min(8, 'Numărul de telefon este prea scurt')
    .max(20, 'Numărul de telefon este prea lung')
    .regex(/^[\d+\-\s().]+$/, 'Numărul de telefon conține caractere nepermise'),

  activitate: z.string().trim().min(5, 'Descrieți activitatea propusă').max(2000),
  localitateJudet: z.string().trim().min(2, 'Localitatea / județul este obligatoriu').max(200),

  cofinantare: z.coerce.number().refine((v) => (COFINANTARI as readonly number[]).includes(v), {
    message: 'Selectați procentul de cofinanțare',
  }),
  mentinereLuni: z.coerce.number().refine((v) => (MENTINERE as readonly number[]).includes(v), {
    message: 'Selectați perioada de menținere',
  }),
  sumaForfetara: z.enum(SUMA_FORFETARA, {
    errorMap: () => ({ message: 'Selectați o opțiune' }),
  }),

  observatiiOferte: z.string().trim().max(2000).optional().default(''),

  acordCorectitudine: z.literal('on', {
    errorMap: () => ({ message: 'Trebuie să confirmați corectitudinea datelor' }),
  }),
  acordGDPR: z.literal('on', {
    errorMap: () => ({ message: 'Este necesar acordul pentru prelucrarea datelor' }),
  }),
});

export type FormData = z.infer<typeof FormSchema>;

export function punctajCofinantare(cof: number): number {
  // Conform cerinței: 10% → 10pct, 15% → 15pct, 20% → 20pct.
  return cof;
}
