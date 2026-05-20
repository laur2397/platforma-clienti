'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(data.error ?? 'Autentificare eșuată.');
        setLoading(false);
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setErr('Eroare de rețea.');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">Autentificare administrator</h1>
        {err && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {err}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label" htmlFor="username">Utilizator</label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Parolă</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Se autentifică…' : 'Autentificare'}
          </button>
        </form>
      </div>
    </div>
  );
}
