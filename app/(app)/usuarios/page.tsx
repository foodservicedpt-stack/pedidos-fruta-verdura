import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UsuariosClient } from './_components/usuarios-client';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');
  return <UsuariosClient />;
}
