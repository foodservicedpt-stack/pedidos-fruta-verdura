import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProductosClient } from './_components/productos-client';

export const dynamic = 'force-dynamic';

export default async function ProductosPage() {
  // Acceso público: la app funciona sin login. Solo se usa la sesión para saber
  // si el usuario es admin (y así mostrar edición/creación de productos).
  const session = await getServerSession(authOptions).catch(() => null);
  const isAdmin = (session?.user as any)?.role === 'admin';
  return <ProductosClient isAdmin={isAdmin} />;
}
