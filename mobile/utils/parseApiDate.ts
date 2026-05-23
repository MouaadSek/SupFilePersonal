export function parseApiDate(value?: string | null, fallback?: Date): Date {
  if (value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback ?? new Date();
}
