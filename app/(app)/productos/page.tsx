import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProductosClient } from './_components/productos-client';

export const dynamic = 'force-dynamic';

export default async function ProductosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const isAdmin = (session?.user as any)?.role === 'admin';
  return <ProductosClient isAdmin={isAdmin} />;
}
