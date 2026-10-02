import "server-only";

// Fixed-window counter of failed login attempts. Kept in memory, so limits are
// per server instance: fine for a single Node process, but a multi-instance or
// serverless deployment needs a shared store (e.g. Redis/Upstash) instead.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

type Entry = { count: number; resetAt: number };
const failures = new Map<string, Entry>();

function current(key: string, now: number): Entry | undefined {
  const entry = failures.get(key);
  if (entry && entry.resetAt <= now) {
    failures.delete(key);
    return undefined;
  }
  return entry;
}

function keysFor(email: string, ip: string) {
  return [
    { key: `email:${email}`, max: MAX_FAILURES_PER_EMAIL },
    { key: `ip:${ip}`, max: MAX_FAILURES_PER_IP },
  ];
}

export function isLoginBlocked(email: string, ip: string): boolean {
  const now = Date.now();
  return keysFor(email, ip).some(({ key, max }) => (current(key, now)?.count ?? 0) >= max);
}

export function recordLoginFailure(email: string, ip: string): void {
  const now = Date.now();
  for (const { key } of keysFor(email, ip)) {
    const entry = current(key, now);
    if (entry) entry.count++;
    else failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }
}

export function clearLoginFailures(email: string): void {
  failures.delete(`email:${email}`);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}
