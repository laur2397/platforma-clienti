import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Platformă colectare documente – Start-Up Nation',
  description:
    'Platformă online pentru colectarea documentelor necesare proiectelor Start-Up Nation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
              <a href="/" className="font-semibold text-brand-700">
                Platformă consultanță · Start-Up Nation
              </a>
              <a
                href="/admin"
                className="text-sm text-slate-500 hover:text-brand-700"
              >
                Zona administrator
              </a>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-slate-500">
              © {new Date().getFullYear()} – Platformă internă consultanță fonduri europene.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
