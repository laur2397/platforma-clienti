import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/session';
import DosarView from '@/components/DosarView';

export const dynamic = 'force-dynamic';

export default async function AdminDosarPage({ params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session.userId) {
    redirect('/admin/login');
  }
  return <DosarView id={params.id} />;
}
