import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MoreHorizontal } from "lucide-react";
import { getMedia, wakePc, type Pairing, type NowPlaying, type Status } from "../lib/pc";
import { ChipNook, errText, NookChip, Sheet, tintBg, tintText, useToast } from "../ui";
import { LiveNook } from "../LiveNook";
import { installUpdate, useMobileUpdate } from "../lib/update";
import type { Conn } from "../App";

export type Screen = "home" | "pc" | "argus" | "media" | "clips" | "notes" | "hum";

interface Tile {
  id: Screen;
  /** Masaüstündeki çip Nook'u (CHIP_NOOKS) */
  nook: string;
  label: string;
  color: string;
}

/** Masaüstündeki Nook çipleri gibi; telefona geldikçe buraya eklenir (Bildirimler, Claude sırada) */
const TILES: Tile[] = [
  { id: "pc", nook: "control", label: "Bilgisayar", color: "#8FE03A" },
  { id: "argus", nook: "argus", label: "Argus", color: "#2B8CFF" },
  { id: "media", nook: "media", label: "Medya", color: "#FF5C8A" },
  { id: "clips", nook: "clip", label: "Pano", color: "#9B7BFF" },
  { id: "notes", nook: "note", label: "Not", color: "#FF6A3D" },
  { id: "hum", nook: "hum", label: "Hum", color: "#9B7BFF" },
];

function gb(bytes: number) {
  return (bytes / 1024 ** 3).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

function uptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d ? `${d} gün ${h} sa` : h ? `${h} sa ${m} dk` : `${m} dk`;
}

export function HomeScreen({
  pairing,
  status,
  conn,
  onOpen,
  onTour,
  onUnpair,
}: {
  pairing: Pairing;
  status: Status | null;
  conn: Conn;
  onOpen: (s: Screen) => void;
  onTour: () => void;
  onUnpair: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [toast, say] = useToast();
  const [waking, setWaking] = useState(false);
  const wake = async () => {
    setWaking(true);
    try {
      await wakePc(pairing, status?.mac);
      say("Uyandırma gönderildi; PC birkaç saniyede açılır");
    } catch (e) {
      say(errText(e));
    }
    // Açılması bir dakikayı bulabilir; o sırada düğme "Açılıyor…" kalsın
    window.setTimeout(() => setWaking(false), 60_000);
  };
  const online = conn === "online";
  const playing = useNowPlaying(pairing, online);
  const update = useMobileUpdate();

  const subtitle = (t: Tile) => {
    if (t.id === "media") return playing ? `${playing.title}${playing.artist ? ` · ${playing.artist}` : ""}` : "Çalan bir şey yok";
    if (t.id === "argus") return "Ne izlesem? · Devam et";
    if (t.id === "clips") return "Kopyalananlar, PC'ye gönder";
    if (t.id === "notes") return "PC'deki notların";
    if (t.id === "hum") return "Çalan şarkıyı bul";
    return "Kapat, uyut, ekran görüntüsü";
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4">
      {/* Üst: ortada PC'deki gibi canlı Nook, altında bağlantı */}
      <header className="relative flex flex-col items-center pt-1">
        <button onClick={() => setMenu(true)} className="absolute right-0 top-1 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-card text-label-2">
          <MoreHorizontal size={20} />
        </button>
        <div className={online ? "" : "opacity-60 grayscale"}>
          <LiveNook look={status?.nook?.look} color={status?.nook?.color} online={online} playing={!!playing?.playing} />
        </div>
        <p className="-mt-1 flex items-center gap-1.5 text-[13px] text-label-2">
          <span className="h-2 w-2 rounded-full" style={{ background: online ? "#3ccf6e" : conn === "connecting" ? "#ffd23f" : "#f0545c" }} />
          {conn === "online"
            ? status?.locked
              ? "PC açık · kilitli"
              : "PC açık"
            : conn === "connecting"
              ? "Bağlanıyor…"
              : conn === "auth"
                ? "Eşleşme geçersiz"
                : "Ulaşılamıyor"}
        </p>
      </header>

      {conn === "auth" && (
        <div className="rounded-3xl bg-red/10 p-4 text-[13.5px] text-red">PC'de eşleşme sıfırlanmış. Menüden “Eşleşmeyi kaldır”a bas ve kodu yeniden okut.</div>
      )}
      {conn === "offline" && (
        <div className="rounded-3xl bg-card p-4">
          <p className="text-[13.5px] leading-relaxed text-label-2">
            PC kapalı ya da uykuda olabilir. Evdeysen aynı Wi-Fi'den açılır; dışarıdan açmak için modemde bir kerelik ayar gerekir (PC'de Ayarlar › Telefon › Telefondan PC'yi açma).
          </p>
          <button
            disabled={waking || !(status?.mac || pairing.mac)}
            onClick={() => void wake()}
            className="mt-3 w-full rounded-2xl py-3.5 text-[15px] font-bold text-black disabled:opacity-50"
            style={{ background: "#8FE03A" }}
          >
            {waking ? "Açılıyor…" : "PC'yi aç"}
          </button>
        </div>
      )}

      {update && (
        <section className="flex items-center gap-3 rounded-3xl p-3.5" style={{ background: tintBg("#3ccf6e", 10), border: `1px solid ${tintBg("#3ccf6e", 30)}` }}>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold" style={{ color: tintText("#3ccf6e") }}>
              Nook Mobil {update.version} hazır
            </span>
            <span className="block text-[12px] leading-snug text-label-3">İndirince Android kurmak için izin isteyebilir.</span>
          </span>
          <button onClick={() => void installUpdate(update)} className="shrink-0 rounded-2xl px-4 py-2.5 text-[14px] font-bold text-black" style={{ background: "#3ccf6e" }}>
            Güncelle
          </button>
        </section>
      )}
      {online && <OutsideTip pairing={pairing} />}

      <h2 className="-mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Nook'lar</h2>
      <section className="grid grid-cols-2 gap-2.5 pb-4">
        {TILES.map((t) =>
          t.id === "pc" ? (
            <PcChip key={t.id} tile={t} sub={subtitle(t)} status={online ? status : null} disabled={!online} onClick={() => onOpen(t.id)} />
          ) : (
            <NookChip key={t.id} id={t.nook} label={t.label} sub={subtitle(t)} color={t.color} disabled={!online} onClick={() => onOpen(t.id)} />
          ),
        )}
      </section>

      {toast}
      <AnimatePresence>
        {menu && (
          <Sheet key="menu" onClose={() => setMenu(false)}>
            <button
              onClick={() => {
                setMenu(false);
                onTour();
              }}
              className="mb-3 w-full rounded-2xl bg-card py-3.5 font-semibold text-label"
            >
              Nook Mobil'i tanı
            </button>
            <p className="px-1 text-[13px] text-label-3">Adresler: {pairing.hosts.join(", ")}</p>
            <button
              onClick={() => {
                setMenu(false);
                onUnpair();
              }}
              className="mt-3 w-full rounded-2xl bg-red/15 py-3.5 font-semibold text-red"
            >
              Eşleşmeyi kaldır
            </button>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Medya kartının alt yazısı için şu an çalan (ana ekranda 5 sn'de bir) */
function useNowPlaying(pairing: Pairing, online: boolean) {
  const [np, setNp] = useState<NowPlaying | null>(null);
  useEffect(() => {
    if (!online) return;
    let alive = true;
    const tick = () =>
      getMedia(pairing)
        .then((m) => alive && setNp(m.media))
        .catch(() => {});
    void tick();
    const t = window.setInterval(tick, 5000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [pairing, online]);
  return np;
}

/** Bilgisayar çipi: tüm satırı kaplar; açık kalma süresi, işlemci, bellek ve boş disk içinde */
function PcChip({ tile, sub, status, disabled, onClick }: { tile: Tile; sub: string; status: Status | null; disabled: boolean; onClick: () => void }) {
  const st = status?.stats;
  const bat = st?.battery;
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      onClick={onClick}
      className="col-span-2 flex min-w-0 flex-col gap-2 rounded-[26px] border py-1.5 pl-1.5 pr-3.5 text-left disabled:opacity-40"
      style={{ background: tintBg(tile.color, 12), borderColor: tintBg(tile.color, 34) }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center">
          <ChipNook id={tile.nook} size={34} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14.5px] font-semibold" style={{ color: tintText(tile.color) }}>
            {tile.label}
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-label-3">{bat ? `${bat.charging ? "Şarj oluyor" : "Pil"} %${bat.percent} · ${sub}` : sub}</span>
        </span>
      </span>
      {status && st && (
        <span className="grid grid-cols-4 gap-1.5 pb-1.5 pl-2">
          <Stat label="Açık" value={uptime(status.uptimeSec)} />
          <Stat label="İşlemci" value={`%${Math.round(st.cpu)}`} frac={st.cpu / 100} color="#3d8bff" />
          <Stat label="Bellek" value={`${gb(st.memUsed)} GB`} frac={st.memTotal ? st.memUsed / st.memTotal : 0} color="#8f6bff" />
          <Stat label="Disk boş" value={`${gb(st.diskTotal - st.diskUsed)} GB`} frac={st.diskTotal ? st.diskUsed / st.diskTotal : 0} color="#f2a33a" />
        </span>
      )}
    </motion.button>
  );
}

function Stat({ label, value, frac, color }: { label: string; value: string; frac?: number; color?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate font-round text-[14px] font-bold leading-tight">{value}</span>
      <span className="truncate text-[10.5px] text-label-3">{label}</span>
      <span className={`mt-1 h-1 overflow-hidden rounded-full ${frac === undefined ? "" : "bg-black/25"}`}>
        {frac !== undefined && <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(4, frac * 100))}%`, background: color }} />}
      </span>
    </span>
  );
}

const TIP_KEY = "nook.outsideTipHidden";

/** Evden uzaktayken de bağlanmak için Tailscale: PC'nin Tailscale adresi yoksa bir kez anlatılır */
function OutsideTip({ pairing }: { pairing: Pairing }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(TIP_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden || pairing.hosts.some((h) => h.startsWith("100."))) return null;
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(TIP_KEY, "1");
    } catch {
      /* yalnızca bu oturum */
    }
  };
  const store = async () => {
    const url = "https://play.google.com/store/apps/details?id=com.tailscale.ipn";
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };
  return (
    <section className="rounded-3xl p-4" style={{ background: tintBg("#2B8CFF", 10), border: `1px solid ${tintBg("#2B8CFF", 28)}` }}>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-[15px] font-bold" style={{ color: tintText("#2B8CFF") }}>
          Evden uzaktayken de bağlan
        </p>
        <button onClick={hide} className="-mr-1 -mt-1 h-8 w-8 shrink-0 rounded-full text-[18px] leading-none text-label-3">
          ×
        </button>
      </div>
      <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[13px] leading-snug text-label-2">
        <li>PC'de Nook › Ayarlar › Telefon › “Evden uzaktayken bağlanma” adımlarını tamamla (Tailscale'i oradan kurabilirsin).</li>
        <li>Bu telefona Tailscale'i kur ve PC'deki hesapla giriş yap.</li>
        <li>Hepsi bu: Nook Mobil yeni adresi kendisi öğrenir, kodu yeniden okutman gerekmez.</li>
      </ol>
      <button onClick={() => void store()} className="mt-3 w-full rounded-2xl py-3 text-[14.5px] font-bold text-black" style={{ background: "#2B8CFF" }}>
        Tailscale'i Play Store'da aç
      </button>
    </section>
  );
}
