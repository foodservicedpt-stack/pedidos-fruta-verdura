/**
 * Limitador en memoria de llamadas a la IA (por IP). Best-effort: útil en una
 * instancia, no sustituye a un limitador distribuido.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function consumeAICredit(ip: string, limit = 20, windowMs = 60_000): boolean {
  const key = (ip || 'anon').toLowerCase();
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return b.count <= limit;
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'anon';
}
