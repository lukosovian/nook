/**
 * Yama notları: her sürümde neler geldi, görseli ve animasyonuyla. Güncellemeden sonraki ilk açılışta
 * ada büyüyüp en yeni notu bir kez gösterir (görülen bir daha kendiliğinden açılmaz); eskilere
 * "Yama notları" çipinden bakılır. Yeni sürümde NOTES'un başına bir kayıt eklemek yeter.
 */
import { playAntic } from "../hooks/useAntics";
import { isPrimary, setWindowSize } from "./bridge";
import { TOUR_WINDOW } from "./layout";
import { useNook } from "../store/nook";

/** Notun görseli (components/notes/Demos'ta çizilir) */
export type DemoId =
  | "halloween"
  | "notes"
  | "move"
  | "intro"
  | "noglow"
  | "reload"
  | "shapes"
  | "crowd"
  | "fullscreen"
  | "alarm"
  | "glasses"
  | "look";

export interface NoteItem {
  title: string;
  text: string;
  demo: DemoId;
}

export interface PatchNote {
  version: string;
  date: string;
  /** Sürümün tek satırlık özeti (listede görünür) */
  headline: string;
  items: NoteItem[];
}

export const NOTES: PatchNote[] = [
  {
    version: "0.2.29",
    date: "5 Ekim 2026",
    headline: "Cadılar Bayramı geldi",
    items: [
      {
        title: "Cadılar Bayramı Nook'ları",
        text: "Balkabağı ve hayalet gövdeler; cadı şapkası, şeytan boynuzu ve yarasa tokası. Görünüm'de tek dokunuşla giyilen hazır kostümler.",
        demo: "halloween",
      },
      {
        title: "Yama notları",
        text: "Güncellemeden sonra Nook neler geldiğini bir kez gösterir. Eskilerine ana sayfadaki Yama notları çipinden bakabilirsin.",
        demo: "notes",
      },
    ],
  },
  {
    version: "0.2.28",
    date: "5 Ekim 2026",
    headline: "Animasyonlara önizleme",
    items: [
      { title: "Geçiş önizlemesi", text: "Ayarlar'da ekranlar arası geçişin yanındaki ▶ ile efekti iki mini ekranda izle; seçim değişince de oynar.", demo: "move" },
      { title: "Açılış önizlemesi", text: "Açılış animasyonu mini adada, senin Nook'unla oynar. \"Her seferinde farklı\" seçiliyse her basışta başkası.", demo: "intro" },
      { title: "Yenile donmaz", text: "Sağ tık › Yenile'den sonra ada tıklamaları ve odağı tutmaz; yeniden yüklenirken her şey sıfırlanır.", demo: "reload" },
    ],
  },
  {
    version: "0.2.27",
    date: "5 Ekim 2026",
    headline: "Adanın arkası artık parlamıyor",
    items: [
      { title: "Arkadaki ışık gitti", text: "Nook'un arkasındaki parıltı şeffaf pencereden dışarı sızıp adanın altında mavi-beyaz bir ışık yakıyordu. Düzeldi.", demo: "noglow" },
    ],
  },
  {
    version: "0.2.26",
    date: "4 Ekim 2026",
    headline: "Nook kalabalığı ve tam ekran",
    items: [
      { title: "Tanıtımda Nook kalabalığı", text: "Parlayan \"nook\" yazısı ve iç içe dizilmiş peluş Nook'lar; üzerine gelince adını söyler.", demo: "crowd" },
      { title: "Yeni gövde ve başlıklar", text: "Damla gövde; kep, tavşan kulağı, filiz, çiçek ve yıldız tokası, salyangoz gözleri.", demo: "shapes" },
      { title: "Tam ekran", text: "Açık ada sağ üstteki düğmeyle ekrana yayılır, Esc ile döner.", demo: "fullscreen" },
    ],
  },
  {
    version: "0.2.24",
    date: "4 Ekim 2026",
    headline: "Oyunda alarm hemen görünür",
    items: [{ title: "Alarm oyunda da çalar", text: "Vakti gelince Nook tam ekran oyunun üstünde bile hemen haber verir.", demo: "alarm" }],
  },
  {
    version: "0.2.23",
    date: "4 Ekim 2026",
    headline: "Gözlükler yerine oturdu",
    items: [{ title: "Gözler camın içinde", text: "Gözlük takınca gözler camların ardında kalır, köprü düzeldi.", demo: "glasses" }],
  },
  {
    version: "0.2.22",
    date: "4 Ekim 2026",
    headline: "Nook 3B oldu",
    items: [
      { title: "Dots tarzı 3B Nook", text: "Vinil ya da peluş gövde, canlı renkler, siyah parlak aksesuarlar: gözlük, bere, melon, kulaklık, anten, fiyonk, papyon.", demo: "look" },
    ],
  },
  {
    version: "0.2.20",
    date: "3 Ekim 2026",
    headline: "Ekranlar arası geçiş efektleri",
    items: [{ title: "Işınlan, zıpla, kay", text: "İmleci takip ederken ada ekrandan ekrana ışınlanma, ışık hızı, portal, zıplama, kayma ya da dijital bozulmayla geçer.", demo: "move" }],
  },
  {
    version: "0.2.17",
    date: "3 Ekim 2026",
    headline: "Star Trek açılışı",
    items: [{ title: "Açılış animasyonları", text: "Yıldız gemisi geçer, Nook altın ışıltıyla ışınlanır. Toz, halkalar, konfeti, kabarcıklar ve daha fazlası.", demo: "intro" }],
  },
];

export const latestNote = () => NOTES[0];

/** Ada küçülme animasyonu bitmeden pencere küçülmesin */
const SHRINK_AFTER_MS = 700;
/** Hiç dokunulmazsa açık kalma süresi */
const AUTO_CLOSE_MS = 30_000;

let shrinkTimer = 0;
let closeTimer = 0;
let unsub: (() => void) | null = null;

/** En yeni not henüz kendiliğinden gösterilmedi mi */
export function notesDue() {
  const s = useNook.getState();
  return isPrimary && s.toured && s.notesSeen !== latestNote().version;
}

/** Yama notlarını aç; `version` verilirse o sürümün notuyla */
export async function openNotes(version?: string) {
  if (!isPrimary) return;
  const s = useNook.getState();
  if (s.tour) return;
  if (version) pendingVersion = version;
  if (s.notes) return;
  window.clearTimeout(shrinkTimer);
  s.setSearching(false);
  if (s.brief) s.setBrief(false);
  // Bir kez görülen not bir daha kendiliğinden açılmaz
  s.setNotesSeen(latestNote().version);
  await setWindowSize(TOUR_WINDOW.width, TOUR_WINDOW.height).catch(() => undefined);
  const wasInside = useNook.getState().hovered;
  useNook.getState().setNotes(true);
  playAntic("hop");

  // İmleç içerideyken açıldıysa (çip) ya da sonradan girdiyse: çıkınca kapan
  let entered = wasInside;
  window.clearTimeout(closeTimer);
  if (!entered) closeTimer = window.setTimeout(closeNotes, AUTO_CLOSE_MS);
  unsub?.();
  unsub = useNook.subscribe((st, prev) => {
    if (!st.notes) return;
    if (st.hovered && !prev.hovered) {
      entered = true;
      window.clearTimeout(closeTimer);
    } else if (!st.hovered && prev.hovered && entered && !st.holds.length) closeNotes();
    if (st.fullscreen || st.ringing || st.searching) closeNotes();
  });
}

/** Açılışta gösterilecek sürüm (çipten açılınca en yenisi) */
let pendingVersion: string | null = null;
export const takePendingVersion = () => {
  const v = pendingVersion;
  pendingVersion = null;
  return v;
};

export function closeNotes() {
  window.clearTimeout(closeTimer);
  unsub?.();
  unsub = null;
  const s = useNook.getState();
  if (!s.notes) return;
  s.setNotes(false);
  window.clearTimeout(shrinkTimer);
  shrinkTimer = window.setTimeout(() => {
    const st = useNook.getState();
    if (!st.brief && !st.tour && !st.notes && !st.big) void setWindowSize().catch(() => undefined);
  }, SHRINK_AFTER_MS);
}
