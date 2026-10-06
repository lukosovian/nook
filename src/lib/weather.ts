import { tt } from "./i18n";
/**
 * Hava durumu — Open-Meteo (ücretsiz, anahtar gerektirmez).
 * Konum: ayarlardaki şehir (Open-Meteo geocoding) ya da boşsa IP'den yaklaşık konum (ipwho.is).
 */

export type Sky = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export interface Weather {
  city: string;
  temp: number;
  high: number;
  low: number;
  sky: Sky;
  isDay: boolean;
  /** Bugün yağış ihtimali (%) */
  rainChance: number;
  at: number;
}

/** WMO hava kodu → gökyüzü */
function sky(code: number): Sky {
  if (code === 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67 || (code >= 80 && code <= 82)) return "rain";
  if (code <= 77 || code === 85 || code === 86) return "snow";
  return "storm";
}

export const SKY_LABEL: Record<Sky, string> = {
  clear: tt("Açık"),
  partly: tt("Parçalı bulutlu"),
  cloudy: tt("Bulutlu"),
  fog: tt("Sisli"),
  drizzle: tt("Çiseleyen yağmur"),
  rain: tt("Yağmurlu"),
  snow: tt("Karlı"),
  storm: tt("Fırtınalı"),
};

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<T>;
}

async function locate(city: string): Promise<{ lat: number; lon: number; name: string }> {
  if (city.trim()) {
    const g = await json<{ results?: { latitude: number; longitude: number; name: string }[] }>(
      `https://geocoding-api.open-meteo.com/v1/search?count=1&language=tr&name=${encodeURIComponent(city.trim())}`,
    );
    const hit = g.results?.[0];
    if (!hit) throw new Error(tt("şehir bulunamadı"));
    return { lat: hit.latitude, lon: hit.longitude, name: hit.name };
  }
  const ip = await json<{ success: boolean; latitude: number; longitude: number; city: string }>("https://ipwho.is/");
  if (!ip.success) throw new Error(tt("konum bulunamadı"));
  return { lat: ip.latitude, lon: ip.longitude, name: ip.city };
}

export async function fetchWeather(city: string): Promise<Weather> {
  const loc = await locate(city);
  const w = await json<{
    current: { temperature_2m: number; weather_code: number; is_day: number };
    daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[] };
  }>(
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
      "&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&timezone=auto&forecast_days=1",
  );
  return {
    city: loc.name,
    temp: Math.round(w.current.temperature_2m),
    high: Math.round(w.daily.temperature_2m_max[0]),
    low: Math.round(w.daily.temperature_2m_min[0]),
    sky: sky(w.current.weather_code),
    isDay: w.current.is_day === 1,
    rainChance: w.daily.precipitation_probability_max[0] ?? 0,
    at: Date.now(),
  };
}
