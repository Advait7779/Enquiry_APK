declare const process: { env: Record<string, string | undefined> };

const defaultCountryCode = (process.env.EXPO_PUBLIC_DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');

export function toDialNumber(contactNo: string): string {
  return contactNo.replace(/[^0-9+]/g, '');
}

export function toWhatsAppNumber(contactNo: string): string | null {
  const trimmed = contactNo.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+') || digits.length > 10) return digits;
  if (digits.length === 10 && defaultCountryCode) return `${defaultCountryCode}${digits}`;
  return null;
}
