export type OfficePeriod = 'today' | 'month' | 'year';

export function getOfficeTimeOffsetMinutes(): number {
  const offset = Number(process.env.OFFICE_TIMEZONE_OFFSET_MINUTES ?? 330);
  if (!Number.isInteger(offset) || offset < -840 || offset > 840) {
    throw new Error('OFFICE_TIMEZONE_OFFSET_MINUTES must be an integer between -840 and 840');
  }
  return offset;
}

export function getOfficePeriodRange(period: OfficePeriod, now = new Date()): { start: Date; end: Date } {
  const offsetMinutes = getOfficeTimeOffsetMinutes();
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const startShifted = period === 'today'
    ? Date.UTC(year, month, day)
    : period === 'month'
      ? Date.UTC(year, month, 1)
      : Date.UTC(year, 0, 1);
  const endShifted = period === 'today'
    ? Date.UTC(year, month, day + 1)
    : period === 'month'
      ? Date.UTC(year, month + 1, 1)
      : Date.UTC(year + 1, 0, 1);
  return {
    start: new Date(startShifted - offsetMinutes * 60_000),
    end: new Date(endShifted - offsetMinutes * 60_000),
  };
}
