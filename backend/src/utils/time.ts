export type OfficePeriod = 'today' | 'yesterday' | 'month' | 'year';

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
    : period === 'yesterday'
      ? Date.UTC(year, month, day - 1)
    : period === 'month'
      ? Date.UTC(year, month, 1)
      : Date.UTC(year, 0, 1);
  const endShifted = period === 'today'
    ? Date.UTC(year, month, day + 1)
    : period === 'yesterday'
      ? Date.UTC(year, month, day)
    : period === 'month'
      ? Date.UTC(year, month + 1, 1)
      : Date.UTC(year + 1, 0, 1);
  return {
    start: new Date(startShifted - offsetMinutes * 60_000),
    end: new Date(endShifted - offsetMinutes * 60_000),
  };
}

export function getOfficeDateRange(startDate: string, endDate = startDate): { start: Date; end: Date } {
  const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const startMatch = datePattern.exec(startDate);
  const endMatch = datePattern.exec(endDate);
  if (!startMatch || !endMatch) throw new Error('Dates must use YYYY-MM-DD format');

  const offsetMs = getOfficeTimeOffsetMinutes() * 60_000;
  const toUtc = (parts: RegExpExecArray) => {
    const year = Number(parts[1]);
    const month = Number(parts[2]) - 1;
    const day = Number(parts[3]);
    const timestamp = Date.UTC(year, month, day) - offsetMs;
    const shifted = new Date(timestamp + offsetMs);
    if (
      shifted.getUTCFullYear() !== year ||
      shifted.getUTCMonth() !== month ||
      shifted.getUTCDate() !== day
    ) {
      throw new Error('Invalid calendar date');
    }
    return new Date(timestamp);
  };

  const start = toUtc(startMatch);
  const end = new Date(toUtc(endMatch).getTime() + 86_400_000);
  if (start >= end) throw new Error('The start date must not be after the end date');
  return { start, end };
}

export function formatOfficeDay(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shifted = new Date(date.getTime() + getOfficeTimeOffsetMinutes() * 60_000);
  return days[shifted.getUTCDay()];
}

export function formatOfficeDate(date: Date): string {
  const shifted = new Date(date.getTime() + getOfficeTimeOffsetMinutes() * 60_000);
  return shifted.toISOString().split('T')[0];
}

export function formatOfficeTime(date: Date): string {
  const shifted = new Date(date.getTime() + getOfficeTimeOffsetMinutes() * 60_000);
  let hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}
