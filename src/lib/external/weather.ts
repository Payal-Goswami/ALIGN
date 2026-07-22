/**
 * Open-Meteo — free, open-source weather API, no API key required.
 * https://open-meteo.com (CC BY 4.0, free for non-commercial use up to
 * 10,000 calls/day, which comfortably covers a single-project dashboard).
 *
 * Used by the Predictive Schedule Risk Engine to flag tasks whose window
 * overlaps forecast heavy-precipitation days — a real, non-synthetic signal.
 */

const BASE_URL = process.env.WEATHER_API_BASE_URL ?? 'https://api.open-meteo.com/v1/forecast';

export interface DailyPrecipitation {
  date: string; // YYYY-MM-DD
  precipitationMm: number;
  precipitationProbability: number;
}

export async function fetchPrecipitationForecast(lat: number, lng: number): Promise<DailyPrecipitation[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('daily', 'precipitation_sum,precipitation_probability_max');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '16');

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status}`);
  const data = (await res.json()) as {
    daily: { time: string[]; precipitation_sum: number[]; precipitation_probability_max: number[] };
  };

  return data.daily.time.map((date, i) => ({
    date,
    precipitationMm: data.daily.precipitation_sum[i] ?? 0,
    precipitationProbability: data.daily.precipitation_probability_max[i] ?? 0,
  }));
}

/** Counts forecast days within [start, end] with meaningful rain risk (>10mm or >60% prob). */
export function countWeatherRiskDaysInWindow(
  forecast: DailyPrecipitation[],
  start: Date,
  end: Date
): number {
  return forecast.filter((d) => {
    const date = new Date(d.date);
    if (date < start || date > end) return false;
    return d.precipitationMm > 10 || d.precipitationProbability > 60;
  }).length;
}
