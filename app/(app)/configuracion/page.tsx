export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ConfiguracionClient } from './_components/configuracion-client';

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const isAdmin = (session?.user as any)?.role === 'admin';
  return <ConfiguracionClient isAdmin={isAdmin} />;
}
