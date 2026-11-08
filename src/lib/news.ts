/**
 * Haberler: seçili kaynakların RSS akışlarından son başlıklar (anahtar gerektirmez).
 * İndirme Rust'taki `fetch_text` ile (tarayıcının CORS engeline takılmaz). Son liste saklanır:
 * internet yokken eskisi "son güncelleme" saatiyle görünür, bağlantı gelince yenilenir.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchText } from "./bridge";
import { isTurkish } from "./i18n";

export interface NewsSource {
  id: string;
  name: string;
  url: string;
}

/** Türkçe kaynaklar; başka dilde BBC News */
export const SOURCES: NewsSource[] = isTurkish
  ? [
      { id: "bbc", name: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml" },
      { id: "dw", name: "DW Türkçe", url: "https://rss.dw.com/rdf/rss-tur-all" },
      { id: "trt", name: "TRT Haber", url: "https://www.trthaber.com/manset_articles.rss" },
      { id: "aa", name: "AA", url: "https://www.aa.com.tr/tr/rss/default?cat=guncel" },
      { id: "cnn", name: "CNN Türk", url: "https://www.cnnturk.com/feed/rss/all/news" },
      { id: "ntv", name: "NTV", url: "https://www.ntv.com.tr/gundem.rss" },
    ]
  : [{ id: "bbcen", name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml" }];

const DEFAULT_ON = isTurkish ? ["bbc", "dw", "trt"] : ["bbcen"];

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  at: number;
  image?: string;
}

interface NewsStore {
  on: string[];
  items: NewsItem[];
  /** Son başarılı yenileme */
  at: number;
  /** Son denemede hiçbir kaynağa ulaşılamadı */
  offline: boolean;
  loading: boolean;
  toggle: (id: string) => void;
}

export const useNews = create<NewsStore>()(
  persist(
    (set, get) => ({
      on: DEFAULT_ON,
      items: [],
      at: 0,
      offline: false,
      loading: false,
      toggle: (id) => {
        const on = get().on.includes(id) ? get().on.filter((x) => x !== id) : [...get().on, id];
        // En az bir kaynak kalsın
        if (!on.length) return;
        set({ on });
        void refreshNews();
      },
    }),
    { name: "nook-news", partialize: (s) => ({ on: s.on, items: s.items, at: s.at }) },
  ),
);

const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? "";

/** RSS 2.0, RDF ve Atom öğelerini tek biçime çevirir */
function parseFeed(xml: string, source: string): NewsItem[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const nodes = [...doc.getElementsByTagName("item"), ...doc.getElementsByTagName("entry")];
  return nodes
    .map((n) => {
      const get = (tag: string) => n.getElementsByTagName(tag)[0];
      const linkEl = get("link");
      const link = text(linkEl) || linkEl?.getAttribute("href") || text(get("guid"));
      const when = text(get("pubDate")) || text(get("dc:date")) || text(get("updated")) || text(get("published"));
      const media = get("media:content") ?? get("media:thumbnail") ?? get("enclosure");
      const image = media?.getAttribute("url") || /<img[^>]+src="([^"]+)"/.exec(text(get("description")))?.[1];
      const at = Date.parse(when);
      return { id: link, source, title: text(get("title")), link, at: Number.isNaN(at) ? 0 : at, image: image || undefined };
    })
    .filter((x) => x.title && x.link.startsWith("http"));
}

let inflight: Promise<void> | null = null;

/** Açık kaynakları indirir; hiçbiri gelmezse eski liste kalır ve "bağlantı yok" yazar */
export function refreshNews(): Promise<void> {
  if (inflight) return inflight;
  const { on } = useNews.getState();
  const sources = SOURCES.filter((s) => on.includes(s.id));
  useNews.setState({ loading: true });
  inflight = Promise.allSettled(sources.map((s) => fetchText(s.url).then((xml) => parseFeed(xml, s.id))))
    .then((res) => {
      const ok = res.filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled").flatMap((r) => r.value);
      if (!ok.length) return void useNews.setState({ offline: true });
      const seen = new Set<string>();
      const items = ok
        .sort((a, b) => b.at - a.at)
        .filter((x) => !seen.has(x.title) && (seen.add(x.title), true))
        .slice(0, 60);
      useNews.setState({ items, at: Date.now(), offline: false });
    })
    .finally(() => {
      useNews.setState({ loading: false });
      inflight = null;
    });
  return inflight;
}

/** Bu kadar eskiyse bölüm açılınca yenilenir */
export const STALE_MS = 20 * 60_000;
