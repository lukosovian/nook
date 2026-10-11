/**
 * Argus'un "Ne İzlesem?"i (Argus/app/src/components/RandomPickerButton.tsx) telefonda: Argus'un kendi
 * Ana Sayfa Ayarları'nı okur — arşiv mi TMDB mi, "Ne İzlesem?" filtresi, görsel şekli, kaç aday —
 * ve aynı kurallarla seçer. Argus'ta o dosya değişirse bu da güncellenmeli.
 */
import { argusApi, type Pairing } from "./pc";

type Value = string | number | boolean | string[] | null | undefined | Record<string, unknown>;

interface PropertyDef {
  id: string;
  name: string;
  type: string;
  options?: { id: string; label: string }[];
}

interface Board {
  id: string;
  titlePropertyId: string;
  titleImagePropertyId: string | null;
  properties: PropertyDef[];
  roles?: Record<string, string | null>;
  statMapping?: Record<string, string | null>;
}

interface Row {
  id: string;
  values: Record<string, Value>;
}

interface FilterCondition {
  propertyId: string;
  include: string[];
  exclude: string[];
}

interface FilterLike {
  propertyId: string | null;
  optionIds: string[];
  conditions?: FilterCondition[];
}

interface HomeSettings {
  boardId?: string | null;
  randomPickerFilter?: FilterLike;
  randomPickerCount?: number;
  randomPickerImageShape?: "dikey" | "yatay" | null;
  randomPickerSource?: "arsiv" | "tmdb";
  randomPickerTmdb?: { type: "movie" | "tv" | "mixed"; genreIds: number[]; excludeGenreIds?: number[]; sort: "popular" | "top" | "new" };
}

export interface TmdbCard {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string;
  year: string;
  poster: string | null;
  backdrop?: string | null;
  overview: string;
  rating: number | null;
}

/** Aday: arşivdeki bir kayıt ya da arşivde olmayan bir TMDB içeriği */
export interface Pick {
  key: string;
  title: string;
  /** Arşiv kaydıysa "/medya/…" (argusImage ile), TMDB ise tam adres */
  cover: string;
  local: boolean;
  landscape: boolean;
  rowId?: string;
  tmdb?: TmdbCard;
}

const DEFAULT_COUNT = 30;

const fold = (s: string) => s.trim().toLocaleLowerCase("tr");

/** Sütun görevi (Argus lib/roles.ts resolveRole'un burada gereken kısmı) */
function resolveRole(board: Board, key: string, names: [string, string], types: string[], legacy?: string): PropertyDef | undefined {
  const explicit = board.roles?.[key];
  if (explicit === null) return undefined;
  if (explicit) {
    const p = board.properties.find((x) => x.id === explicit);
    if (p) return types.includes(p.type) ? p : undefined;
  }
  if (legacy) {
    const l = board.statMapping?.[legacy];
    if (l === null) return undefined;
    const p = l ? board.properties.find((x) => x.id === l) : undefined;
    if (p && types.includes(p.type)) return p;
  }
  return board.properties.find((p) => (fold(p.name) === fold(names[0]) || fold(p.name) === fold(names[1])) && types.includes(p.type));
}

function filterConditions(f: FilterLike | null | undefined): FilterCondition[] {
  if (!f) return [];
  if (f.conditions) return f.conditions.filter((c) => c.include.length > 0 || c.exclude.length > 0);
  if (f.propertyId && f.optionIds.length > 0) return [{ propertyId: f.propertyId, include: f.optionIds, exclude: [] }];
  return [];
}

function valueIds(v: Value): string[] {
  if (Array.isArray(v)) return v;
  return typeof v === "string" && v ? [v] : [];
}

function matches(row: Row, conds: FilterCondition[]) {
  return conds.every((c) => {
    const ids = valueIds(row.values[c.propertyId]);
    if (c.include.length > 0 && !ids.some((id) => c.include.includes(id))) return false;
    if (c.exclude.length > 0 && ids.some((id) => c.exclude.includes(id))) return false;
    return true;
  });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Argus'un ayarlarıyla aday havuzunu kurar ve kazananı seçer. `shown`: animasyonda gösterilecek
 * birkaç aday (kazanan sonda).
 */
export async function pickSomething(p: Pairing, profileId: string): Promise<{ winner: Pick; shown: Pick[] }> {
  const base = `/api/profiles/${profileId}`;
  const [boards, settings] = await Promise.all([argusApi<Board[]>(p, "GET", `${base}/boards`), argusApi<HomeSettings | null>(p, "GET", `${base}/home-settings`)]);
  const s = settings ?? {};
  if (!s.boardId) throw new Error("Önce Argus'ta Ana Sayfa Ayarları'ndan bir arşiv seç.");
  const board = boards.find((b) => b.id === s.boardId);
  if (!board) throw new Error("Argus'ta arşiv bulunamadı.");
  const pref = s.randomPickerImageShape === "dikey" || s.randomPickerImageShape === "yatay" ? s.randomPickerImageShape : null;
  const count = s.randomPickerCount ?? DEFAULT_COUNT;

  let pool: Pick[];
  if (s.randomPickerSource === "tmdb") {
    const t = s.randomPickerTmdb ?? { type: "movie", genreIds: [], sort: "popular" };
    const ask = (type: "movie" | "tv", n: number, genreIds: number[], excludeGenreIds: number[] = []) =>
      argusApi<{ items: TmdbCard[] }>(p, "POST", `${base}/tmdb-discover/${board.id}`, { type, genreIds, excludeGenreIds, count: n, sort: t.sort, random: true }).then((r) => r.items);
    const cards =
      t.type === "mixed"
        ? shuffle((await Promise.all([ask("movie", Math.ceil(count / 2), []), ask("tv", Math.ceil(count / 2), [])])).flat())
        : await ask(t.type, count, t.genreIds, t.excludeGenreIds ?? []);
    pool = cards.flatMap((c): Pick[] => {
      const url = pref === "yatay" ? c.backdrop || c.poster : c.poster || c.backdrop;
      return url ? [{ key: `tmdb:${c.mediaType}:${c.tmdbId}`, title: c.title, cover: url, local: false, landscape: url === c.backdrop, tmdb: c }] : [];
    });
    if (!pool.length) throw new Error("Bu ayarlara uyan, arşivinde olmayan bir içerik bulunamadı.");
  } else {
    const rows = await argusApi<Row[]>(p, "GET", `${base}/boards/${board.id}/rows`);
    // Vizyon tarihi henüz gelmemişler seçilmez (Argus'taki gibi)
    const vizyon = resolveRole(board, "vizyon", ["Vizyon Tarihi", "Release Date"], ["date"], "vizyonId");
    const today = todayIso();
    const released = rows.filter((r) => {
      const v = vizyon ? r.values[vizyon.id] : null;
      return !(typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && v.slice(0, 10) > today);
    });
    const conds = filterConditions(s.randomPickerFilter);
    const candidates = conds.length ? released.filter((r) => matches(r, conds)) : released;
    // Görsel sütunları: Argus görselin en/boy oranına bakıyor; burada Poster (dikey) ve Banner (yatay) görevleri,
    // yoksa başlık logosu dışındaki ilk görsel sütunu
    const poster = resolveRole(board, "poster", ["Poster", "Poster"], ["image"]);
    const banner = resolveRole(board, "banner", ["Banner", "Banner"], ["image"]);
    const anyImage = board.properties.find((x) => x.type === "image" && x.id !== board.titleImagePropertyId);
    const order: { prop: PropertyDef; landscape: boolean }[] = [];
    if (pref !== "yatay" && poster) order.push({ prop: poster, landscape: false });
    if (pref !== "dikey" && banner) order.push({ prop: banner, landscape: true });
    if (!order.length && anyImage) order.push({ prop: anyImage, landscape: false });
    pool = candidates.flatMap((r): Pick[] => {
      for (const o of order) {
        const v = r.values[o.prop.id];
        if (typeof v === "string" && v) {
          const title = r.values[board.titlePropertyId];
          return [{ key: r.id, rowId: r.id, title: typeof title === "string" ? title : "", cover: v, local: v.startsWith("/medya/"), landscape: o.landscape }];
        }
      }
      return [];
    });
    if (!pool.length) throw new Error("Bu filtreye uyan, görseli olan bir içerik bulunamadı.");
  }
  const winner = pool[Math.floor(Math.random() * pool.length)];
  const shown = [...shuffle(pool.filter((e) => e.key !== winner.key)).slice(0, 9), winner];
  return { winner, shown };
}
