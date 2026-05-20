import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/session';
import AdminDashboard from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const session = await getAdminSession();
  if (!session.userId) {
    redirect('/admin/login');
  }
  return <AdminDashboard username={session.username ?? 'admin'} />;
}
