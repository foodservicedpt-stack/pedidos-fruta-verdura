/**
 * Limitador de intentos de acceso en memoria (best-effort).
 *
 * Nota importante: al ejecutarse en un entorno sin estado compartido, este
 * contador vive por instancia de proceso y se reinicia al reiniciarse el
 * servidor. Ofrece una barrera básica frente a intentos de fuerza bruta
 * rápidos desde una misma instancia, pero NO sustituye a un limitador
 * distribuido (Redis/base de datos) si en el futuro se necesita una
 * protección estricta.
 */

type Attempt = { count: number; firstAt: number };

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 8; // intentos fallidos permitidos por ventana

const attempts = new Map<string, Attempt>();

function normalizeKey(key: string): string {
  return (key ?? '').toLowerCase().trim();
}

/** Devuelve true si la clave (p. ej. email) ha superado el límite de intentos. */
export function isRateLimited(key: string): boolean {
  const k = normalizeKey(key);
  if (!k) return false;
  const entry = attempts.get(k);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.delete(k);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

/** Registra un intento fallido para la clave dada. */
export function registerFailedAttempt(key: string): void {
  const k = normalizeKey(key);
  if (!k) return;
  const now = Date.now();
  const entry = attempts.get(k);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(k, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }
}

/** Limpia el contador tras un acceso correcto. */
export function clearAttempts(key: string): void {
  attempts.delete(normalizeKey(key));
}
