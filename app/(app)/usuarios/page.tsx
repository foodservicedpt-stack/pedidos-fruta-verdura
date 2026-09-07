import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UsuariosClient } from './_components/usuarios-client';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  // Acceso público al resto de la app; la gestión de usuarios queda restringida
  // a administradores dentro del cliente (y en la API con requireAdmin).
  const session = await getServerSession(authOptions).catch(() => null);
  void session;
  return <UsuariosClient />;
}
