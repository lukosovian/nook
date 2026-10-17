import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, MoreHorizontal } from "lucide-react";
import { cached, getDiary, getMedia, today, wakePc, type Pairing, type NowPlaying, type PcDiary, type Status } from "../lib/pc";
import { ChipNook, errText, NookChip, Sheet, tintBg, tintText, useToast } from "../ui";
import { LiveNook } from "../LiveNook";
import { installUpdate, useInstallProgress, useMobileUpdate } from "../lib/update";
import { diagnose } from "../lib/diagnose";
import { native } from "../lib/native";
import { onOutbox, pending } from "../lib/outbox";
import type { Conn } from "../App";

export type Screen = "home" | "pc" | "argus" | "media" | "clips" | "notes" | "hum" | "notify" | "look" | "claude" | "shelf";

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
  { id: "argus", nook: "argus", label: "Argus", color: "#00c0fa" },
  { id: "media", nook: "media", label: "Medya", color: "#FF5C8A" },
  { id: "clips", nook: "clip", label: "Pano", color: "#9B7BFF" },
  { id: "shelf", nook: "shelf", label: "Raf", color: "#2FD4C0" },
  { id: "notes", nook: "note", label: "Not", color: "#FF6A3D" },
  { id: "hum", nook: "hum", label: "Hum", color: "#9B7BFF" },
  { id: "notify", nook: "notify", label: "Bildirimler", color: "#9B7BFF" },
  { id: "look", nook: "look", label: "Görünüm", color: "#FF5C8A" },
  { id: "claude", nook: "claude", label: "Claude", color: "#D97757" },
];

/** PC kapalıyken de açılanlar (son görülen veriyle; yapılanlar PC açılınca gider) */
const OFFLINE_OK: Screen[] = ["pc", "argus", "clips", "shelf", "notes", "hum", "notify", "claude"];

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
  const install = useInstallProgress();
  const waiting = usePending();
  const diag = conn === "offline" ? diagnose(pairing) : null;

  const subtitle = (t: Tile) => {
    if (t.id === "media") return !online ? "PC açılınca" : playing ? `${playing.title}${playing.artist ? ` · ${playing.artist}` : ""}` : "Çalan bir şey yok";
    if (t.id === "argus") return online ? "Ne izlesem? · Devam et" : "Son görülen liste";
    if (t.id === "clips") return online ? "Kopyalananlar, PC'ye gönder" : "PC açılınca gönderilir";
    if (t.id === "shelf") return online ? "PC'deki dosyalar, telefondan gönder" : "Son görülen raf";
    if (t.id === "notes") return online ? "PC'deki notların" : "Yaz, PC açılınca gider";
    if (t.id === "hum") return online ? "Çalan şarkıyı bul" : "Dinle, PC açılınca bulunur";
    if (t.id === "notify") return "Telefonun bildirimleri PC'de";
    if (t.id === "look") return online ? "Nook'unu giydir" : "PC açılınca";
    if (t.id === "claude") {
      const c = status?.claude;
      if (!online || !c) return "Son görülen oturumlar";
      return c.asks ? `${c.asks} onay bekliyor` : c.working ? "Çalışıyor" : c.sessions ? `${c.sessions} oturum` : "Açık oturum yok";
    }
    return online ? "Kapat, uyut, ekran görüntüsü" : "Aç, uzaktan açma rehberi";
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4">
      {/* Üst: ortada PC'deki gibi canlı Nook, altında bağlantı */}
      <header className="relative flex flex-col items-center pt-1">
        <button onClick={() => setMenu(true)} className="absolute right-0 top-1 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-card text-label-2">
          <MoreHorizontal size={20} />
        </button>
        {/* Nook'a dokununca Görünüm açılır */}
        <div className={online ? "" : "opacity-60 grayscale"} onClick={() => online && onOpen("look")}>
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
      {diag && (
        <div className="rounded-3xl bg-card p-4">
          <p className="text-[15px] font-bold">{diag.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-label-2">{diag.detail}</p>
          {diag.action === "tailscale-store" && (
            <button onClick={() => void openTailscaleStore()} className="mt-3 w-full rounded-2xl py-3.5 text-[15px] font-bold text-black" style={{ background: "#2B8CFF" }}>
              Tailscale'i Play Store'da aç
            </button>
          )}
          {diag.action === "tailscale-open" && (
            <button onClick={() => native?.openTailscale()} className="mt-3 w-full rounded-2xl py-3.5 text-[15px] font-bold text-black" style={{ background: "#2B8CFF" }}>
              Tailscale'i aç
            </button>
          )}
          {diag.canWake && (
            <button
              disabled={waking || !(status?.mac || pairing.mac)}
              onClick={() => void wake()}
              className={`mt-2.5 w-full rounded-2xl py-3.5 text-[15px] font-bold disabled:opacity-50 ${diag.action === "wake" ? "text-black" : "bg-well text-label"}`}
              style={diag.action === "wake" ? { background: "#8FE03A" } : undefined}
            >
              {waking ? "Açılıyor…" : "PC'yi aç"}
            </button>
          )}
          <button onClick={() => onOpen("pc")} className="mt-2 w-full py-1.5 text-[12.5px] font-medium text-label-3">
            Uzaktan açma rehberi (BIOS, modem…)
          </button>
        </div>
      )}
      {waiting > 0 && (
        <p className="-mt-1 px-2 text-[12px] text-label-3">{online ? "Bekleyenler PC'ye gönderiliyor…" : `${waiting} iş PC açılınca gönderilecek`}</p>
      )}

      {update && (
        <section className="flex items-center gap-3 rounded-3xl p-3.5" style={{ background: tintBg("#3ccf6e", 10), border: `1px solid ${tintBg("#3ccf6e", 30)}` }}>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold" style={{ color: tintText("#3ccf6e") }}>
              Nook Mobil {update.version} hazır
            </span>
            <span className="block text-[12px] leading-snug text-label-3">
              {install?.phase === "progress"
                ? `İndiriliyor… ${install.pct >= 0 ? `%${install.pct}` : ""}`
                : install?.phase === "permission"
                  ? "Açılan ekranda “Bu kaynağa izin ver”i aç ve geri dön; güncelleme kendiliğinden devam eder."
                  : install?.phase === "install"
                    ? "Açılan pencerede Güncelle'ye bas."
                    : install?.phase === "error"
                      ? install.message
                      : "Uygulamanın içinde iner ve kurulur."}
            </span>
          </span>
          <button
            disabled={install?.phase === "progress"}
            onClick={() => void installUpdate(update)}
            className="shrink-0 rounded-2xl px-4 py-2.5 text-[14px] font-bold text-black disabled:opacity-50"
            style={{ background: "#3ccf6e" }}
          >
            {install?.phase === "progress" ? "İniyor…" : install?.phase === "error" ? "Yeniden dene" : "Güncelle"}
          </button>
        </section>
      )}
      {online && <OutsideTip pairing={pairing} />}
      <DiaryCard pairing={pairing} online={online} />

      <h2 className="-mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Nook'lar</h2>
      <section className="grid grid-cols-2 gap-2.5 pb-4">
        {TILES.filter((t) => t.id !== "claude" || status?.claude || cached("claude")).map((t) =>
          t.id === "pc" ? (
            <PcChip key={t.id} tile={t} sub={subtitle(t)} status={online ? status : null} disabled={false} onClick={() => onOpen(t.id)} />
          ) : (
            <NookChip key={t.id} id={t.nook} label={t.label} sub={subtitle(t)} color={t.color} disabled={!online && !OFFLINE_OK.includes(t.id)} onClick={() => onOpen(t.id)} />
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

const DIARY = "#9B7BFF";

function dayLabel(day: string) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  if (day === today()) return "Bugün";
  if (day === yk) return "Dün";
  const [yy, mm, dd] = day.split("-").map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

/** Nook'un günlüğü: PC'deki Nook her gece günü kendi ağzından yazar; en yenisi burada, öncekiler sayfada */
function DiaryCard({ pairing, online }: { pairing: Pairing; online: boolean }) {
  const [list, setList] = useState<PcDiary[]>(() => cached<PcDiary[]>("diary") ?? []);
  const [all, setAll] = useState(false);
  useEffect(() => {
    if (online) void getDiary(pairing).then(setList).catch(() => {});
  }, [pairing, online]);
  const last = list[0];
  if (!last) return null;
  return (
    <>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setAll(true)}
        className="rounded-3xl p-4 text-left"
        style={{ background: `linear-gradient(160deg, ${tintBg(DIARY, 16)}, ${tintBg(DIARY, 6)})`, border: `1px solid ${tintBg(DIARY, 30)}` }}
      >
        <span className="flex items-center gap-2 text-[12px] font-bold" style={{ color: tintText(DIARY) }}>
          <BookOpen size={15} /> Nook'un günlüğü · {dayLabel(last.day)}
        </span>
        <p className="mt-1.5 text-[14px] leading-relaxed text-label-2">{last.text}</p>
      </motion.button>
      <AnimatePresence>
        {all && (
          <Sheet key="diary" onClose={() => setAll(false)}>
            <p className="mb-3 px-1 text-[17px] font-bold">Nook'un günlüğü</p>
            <div className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto">
              {list.map((d) => (
                <div key={d.day} className="rounded-2xl bg-card p-3.5">
                  <p className="text-[12px] font-bold" style={{ color: tintText(DIARY) }}>
                    {dayLabel(d.day)}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-label-2">{d.text}</p>
                </div>
              ))}
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </>
  );
}

/** PC kapalıyken yapılıp gönderilmeyi bekleyen işler */
function usePending() {
  const [n, setN] = useState(() => pending());
  useEffect(() => onOutbox(() => setN(pending())), []);
  return n;
}

async function openTailscaleStore() {
  const url = "https://play.google.com/store/apps/details?id=com.tailscale.ipn";
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
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
