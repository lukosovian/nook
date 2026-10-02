import type { AppEntry } from "./bridge";
import { evaluate, formatNumber } from "./calc";
import { convert } from "./convert";
import { searchEmoji } from "./emoji";
import { convertCurrency, parseCurrency, translate } from "./online";

export type ResultKind = "calc" | "convert" | "currency" | "translate" | "emoji" | "app" | "web" | "note" | "ask";

export interface SearchResult {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  /** calc/convert: panoya kopyalanacak; app: kısayol yolu; web: URL; note: not metni */
  payload: string;
}

/** Basit bulanık eşleşme puanı: baştan eşleşme > kelime başı > içerir > harf sırası. */
function score(name: string, q: string): number {
  const n = name.toLocaleLowerCase("tr");
  if (n.startsWith(q)) return 100 - n.length / 10;
  if (n.split(/[\s\-_.]+/).some((w) => w.startsWith(q))) return 80 - n.length / 10;
  if (n.includes(q)) return 60 - n.length / 10;
  let i = 0;
  for (const ch of n) if (ch === q[i]) i++;
  return i === q.length ? 30 - n.length / 10 : -1;
}

const MAX_APPS = 5;

export function search(query: string, apps: AppEntry[]): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const out: SearchResult[] = [];

  // "not: …" → uçucu nota ekle
  const note = /^not[:\s]\s*(.+)$/i.exec(q);
  if (note) {
    out.push({ id: "note", kind: "note", title: note[1], subtitle: "Nota ekle", payload: note[1] });
  }

  // "emoji kalp" / ":kalp" → emojiler
  const emojis = searchEmoji(q);
  if (emojis.length) {
    emojis.forEach((e, i) => out.push({ id: `emoji:${i}`, kind: "emoji", title: e, subtitle: "Enter ile kopyala", payload: e }));
    return out;
  }

  const conv = convert(q);
  if (conv) out.push({ id: "convert", kind: "convert", title: conv.text, subtitle: "Enter ile sonucu kopyala", payload: conv.value });

  const calc = conv || parseCurrency(q) ? null : evaluate(q.replace(/=\s*$/, ""));
  if (calc !== null) {
    const v = formatNumber(calc);
    out.push({ id: "calc", kind: "calc", title: `= ${v}`, subtitle: "Enter ile sonucu kopyala", payload: v });
  }

  const lower = q.toLocaleLowerCase("tr");
  apps
    .map((a) => ({ a, s: score(a.name, lower) }))
    .filter((x) => x.s >= 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, MAX_APPS)
    .forEach(({ a }) => out.push({ id: `app:${a.path}`, kind: "app", title: a.name, subtitle: "Uygulamayı aç", payload: a.path }));

  // Yerel yapay zekâya sor
  out.push({ id: "ask", kind: "ask", title: q, subtitle: "Nook'a sor", payload: q });

  const isUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(q) && !/\s/.test(q);
  out.push(
    isUrl
      ? { id: "url", kind: "web", title: q, subtitle: "Tarayıcıda aç", payload: q.startsWith("http") ? q : `https://${q}` }
      : {
          id: "web",
          kind: "web",
          title: q,
          subtitle: "Google'da ara",
          payload: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        },
  );
  return out;
}

/** İnternet gerektiren sonuçlar (döviz, çeviri) — yazmayı bitirince ayrıca eklenir. */
export async function searchOnline(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const [cur, tr] = await Promise.all([convertCurrency(q).catch(() => null), translate(q).catch(() => null)]);
  const out: SearchResult[] = [];
  if (cur) out.push({ id: "currency", kind: "currency", title: cur.text, subtitle: "Güncel kur · Enter ile kopyala", payload: cur.value });
  if (tr) out.push({ id: "translate", kind: "translate", title: tr.text, subtitle: `${tr.pair} · Enter ile kopyala`, payload: tr.text });
  return out;
}
