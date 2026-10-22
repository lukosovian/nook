/**
 * Destekçiler: Nook'un GitHub deposuna yıldız verenler. GitHub yıldız verenlerin listesini artık
 * yalnızca giriş yapmış isteklere veriyor; liste yayın sırasında depoya yazılır (supporters.ps1 →
 * supporters.json), Nook o dosyayı okur. Yıldız sayısı herkese açık: yeni yıldız gelince adada teşekkür.
 */
import { useEffect } from "react";
import { create } from "zustand";
import { isPrimary } from "./bridge";
import { useNook } from "../store/nook";
import { playAntic } from "../hooks/useAntics";
import { tt } from "./i18n";

export const REPO_URL = "https://github.com/lukosovian/nook";
const LIST_URL = "https://raw.githubusercontent.com/lukosovian/nook/main/supporters.json";
const REPO_API = "https://api.github.com/repos/lukosovian/nook";
const STORE = "nook.supporters";
const LIST_EVERY_MS = 6 * 3600_000;

/** Destekçiler arasında “Yatırımcı” rozetiyle, en başta görünenler (GitHub adı) */
export const INVESTORS = new Set(["hsnatagul"]);

export interface Supporter {
  login: string;
  avatar: string;
  url: string;
  /** Yıldız verdiği an (ISO) */
  at: string;
}

interface Saved {
  listAt: number;
  list: Supporter[];
  /** Son bilinen yıldız sayısı (yeni yıldızı anlamak için) */
  stars: number | null;
}

/** Derleme anındaki liste (yayınlayanın bilgisayarındaki supporters.json; dosya yoksa boş) */
const BUNDLED: Supporter[] =
  (Object.values(import.meta.glob("/supporters.json", { eager: true, import: "default" }))[0] as Supporter[] | undefined) ?? [];

function load(): Saved {
  let s: Saved = { listAt: 0, list: [], stars: null };
  try {
    s = { ...s, ...(JSON.parse(localStorage.getItem(STORE) ?? "{}") as Partial<Saved>) };
  } catch {
    // bozuk kayıt
  }
  // GitHub'daki dosya henüz yoksa (yayınlanmadıysa) Nook'un içindeki liste
  if (!s.list.length) s.list = BUNDLED;
  return s;
}

function save(s: Saved) {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    // depolama kapalı: yalnızca bu oturum
  }
}

export const useSupporters = create<{ list: Supporter[]; stars: number | null }>(() => {
  const s = load();
  return { list: s.list, stars: s.stars };
});

export async function refreshSupporters(force = false) {
  const saved = load();
  // Liste (yayınla güncellenir): birkaç saatte bir
  if (force || Date.now() - saved.listAt > LIST_EVERY_MS) {
    try {
      const r = await fetch(LIST_URL, { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const list = ((await r.json()) as Supporter[]).filter((s) => s?.login).sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
        saved.list = list;
        saved.listAt = Date.now();
      }
    } catch {
      // internet yok ya da dosya henüz yayınlanmadı
    }
  }
  // Yıldız sayısı (anlık, herkese açık)
  let stars = saved.stars;
  try {
    const r = await fetch(REPO_API, { signal: AbortSignal.timeout(10000) });
    if (r.ok) stars = ((await r.json()) as { stargazers_count?: number }).stargazers_count ?? stars;
  } catch {
    // sonra yine denenir
  }
  const gained = saved.stars !== null && stars !== null ? stars - saved.stars : 0;
  saved.stars = stars;
  save(saved);
  useSupporters.setState({ list: saved.list, stars });
  if (gained > 0) {
    useNook.getState().pushToast({
      kind: "chat",
      title: gained === 1 ? tt("⭐ Nook'a yeni bir yıldız geldi!") : tt("⭐ Nook'a {0} yeni yıldız geldi!", gained),
      detail: tt("Toplam {0} yıldız. Teşekkürler!", stars ?? 0),
      ms: 7000,
    });
    playAntic("love");
  }
}

/** Yalnızca ana adada: açılıştan biraz sonra ve yarım saatte bir */
export function useSupportersFeed() {
  useEffect(() => {
    if (!isPrimary) return;
    const tick = () => void refreshSupporters().catch(() => {});
    const first = window.setTimeout(tick, 20_000);
    const t = window.setInterval(tick, 30 * 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);
}
