/** The notification URL contract uses a ten-digit Indian mobile number. */
export function normalizeNotificationPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[+]?[0-9\s()-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  return /^\d{10}$/.test(digits) ? digits : null;
}
