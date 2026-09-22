export function formatFeesPaid(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;
  return `₹${safeAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
