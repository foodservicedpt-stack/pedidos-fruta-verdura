/**
 * Helpers para rutas API (App Router).
 *
 * Elimina el boilerplate de autenticación/autorización que estaba repetido en
 * ~20 rutas y unifica el formato de las respuestas de error. Así cualquier
 * cambio en la política de acceso se hace en un único sitio.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

/** Respuesta JSON de error con el status indicado. */
export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Exige una sesión válida. Devuelve el usuario de sesión o un objeto con la
 * respuesta 401 lista para retornar.
 *
 * Uso:
 *   const auth = await requireAuth();
 *   if ('response' in auth) return auth.response;
 *   const user = auth.user;
 *
 * SOLO la usan las rutas de administración. El resto de la API es de acceso
 * público (herramienta interna de equipo) y usa `optionalAuth`.
 */
export async function requireAuth(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { response: jsonError('No autorizado', 401) };
  return { user: session.user as SessionUser };
}

/**
 * Devuelve el usuario de sesión si existe, o null si no. NUNCA bloquea.
 * Permite que la app funcione sin login. Si hay sesión se usa para atribuir
 * la creación del pedido (creadoPor) y mostrar su autor; si no, el pedido
 * queda sin autor ("Equipo").
 */
export async function optionalAuth(): Promise<{ user: SessionUser | null }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { user: null };
    return { user: session.user as SessionUser };
  } catch (e) {
    // Si la sesión no puede leerse (por ejemplo, sin base de auth), no bloquear.
    return { user: null };
  }
}

/** Como requireAuth pero además exige rol admin (403 si no lo es). */
export async function requireAdmin(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const auth = await requireAuth();
  if ('response' in auth) return auth;
  if (auth.user.role !== 'admin') {
    return { response: jsonError('Solo administradores', 403) };
  }
  return auth;
}

/**
 * Convierte un id de ruta a entero validando que sea un número positivo.
 * Evita que un id no numérico (p.ej. /api/pedidos/abc) llegue como NaN a la
 * base de datos y provoque un error 500.
 */
export function parseIntId(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
