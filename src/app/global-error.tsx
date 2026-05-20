'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ro">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f8fafc',
          color: '#1e293b',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 520, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>A apărut o eroare</h1>
          <p style={{ marginBottom: 16 }}>
            Vă rugăm să încercați din nou. Dacă problema persistă, contactați consultantul.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#365b92',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            Reîncearcă
          </button>
        </div>
      </body>
    </html>
  );
}
