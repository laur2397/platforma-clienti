import type { SessionOptions } from 'iron-session';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export type AdminSession = {
  userId?: number;
  username?: string;
};

const SESSION_SECRET = process.env.SESSION_SECRET ?? '';
if (SESSION_SECRET.length < 32 && process.env.NODE_ENV === 'production') {
  // În producție refuzăm să pornim fără secret puternic.
  throw new Error(
    'SESSION_SECRET trebuie să aibă cel puțin 32 de caractere în producție.',
  );
}

export const sessionOptions: SessionOptions = {
  password:
    SESSION_SECRET ||
    'dezvoltare_local_secret_minimum_32_caractere_pentru_iron_session_xx',
  cookieName: 'platforma_admin',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8h
  },
};

export async function getAdminSession() {
  return getIronSession<AdminSession>(cookies(), sessionOptions);
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.userId) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return session;
}
