/**
 * Nager.Date — free, open public holiday API, no API key required.
 * https://date.nager.at
 *
 * Used by the Predictive Schedule Risk Engine to flag crew-availability risk
 * where a task window overlaps a national public holiday in India.
 */

const BASE_URL = process.env.HOLIDAY_API_BASE_URL ?? 'https://date.nager.at/api/v3/PublicHolidays';
const COUNTRY = process.env.PROJECT_COUNTRY_CODE ?? 'IN';

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  localName: string;
  name: string;
}

const cache = new Map<number, PublicHoliday[]>();

export async function fetchPublicHolidays(year: number): Promise<PublicHoliday[]> {
  if (cache.has(year)) return cache.get(year)!;
  const res = await fetch(`${BASE_URL}/${year}/${COUNTRY}`, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Nager.Date request failed: ${res.status}`);
  const data = (await res.json()) as PublicHoliday[];
  cache.set(year, data);
  return data;
}

export function windowOverlapsHoliday(holidays: PublicHoliday[], start: Date, end: Date): boolean {
  return holidays.some((h) => {
    const d = new Date(h.date);
    return d >= start && d <= end;
  });
}
