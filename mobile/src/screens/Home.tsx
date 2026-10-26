import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cached, getMedia, wakePc, drinkWater, type Pairing, type NowPlaying, type PcNote, type Status } from "../lib/pc";
import { ChipNook, errText, Sheet, tintBg, tintText, useToast } from "../ui";
import { LiveNook } from "../LiveNook";
import { installUpdate, useInstallProgress, useMobileUpdate } from "../lib/update";
import { diagnose } from "../lib/diagnose";
import { native } from "../lib/native";
import { onOutbox, pending } from "../lib/outbox";
import type { Conn } from "../App";
import { KeyButton, useDeck } from "./Keys";
import { dayLabel, DIARY, useDiary } from "./Diary";
import { useAppVersion } from "./Patch";

export type Screen = "home" | "pc" | "argus" | "media" | "clips" | "notes" | "hum" | "notify" | "look" | "claude" | "shelf" | "keys" | "diary" | "patch";

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
  { id: "keys", nook: "apps", label: "Kısayollar", color: "#2B8CFF" },
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
const OFFLINE_OK: Screen[] = ["pc", "argus", "clips", "shelf", "notes", "hum", "notify", "claude", "keys"];

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
  const [deck] = useDeck(pairing, online);
  const homeKeys = (deck?.keys ?? []).filter((k) => k.home).slice(0, 6);
  const mobile = useAppVersion();

  const subtitle = (t: Tile) => {
    if (t.id === "media") return !online ? "PC açılınca" : playing ? `${playing.title}${playing.artist ? ` · ${playing.artist}` : ""}` : "Çalan bir şey yok";
    if (t.id === "argus") return online ? "Ne izlesem? · Devam et" : "Son görülen liste";
    if (t.id === "clips") return online ? "Kopyalananlar, PC'ye gönder" : "PC açılınca gönderilir";
    if (t.id === "shelf") return online ? "PC'deki dosyalar, telefondan gönder" : "Son görülen raf";
    if (t.id === "notes") return online ? "PC'deki notların" : "Yaz, PC açılınca gider";
    if (t.id === "hum") return online ? "Çalan şarkıyı bul" : "Dinle, PC açılınca bulunur";
    if (t.id === "notify") return "Telefonun bildirimleri PC'de";
    if (t.id === "look") return online ? "Nook'unu giydir" : "PC açılınca";
    if (t.id === "keys") {
      const on = deck?.autos.filter((a) => a.on).length ?? 0;
      return !online ? "PC açılınca basılır" : deck ? `${deck.keys.length} tuş${on ? ` · ${on} otomasyon` : ""}` : "Tuşlar, otomasyonlar";
    }
    if (t.id === "claude") {
      const c = status?.claude;
      if (!online || !c) return "Son görülen oturumlar";
      return c.asks ? `${c.asks} onay bekliyor` : c.working ? "Çalışıyor" : c.sessions ? `${c.sessions} oturum` : "Açık oturum yok";
    }
    return online ? "Kapat, uyut, ekran görüntüsü" : "Aç, uzaktan açma rehberi";
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4">
      <header className="flex items-center gap-3 px-1 pt-1">
        <span className="min-w-0 flex-1">
          <span className="block font-round text-[26px] font-extrabold tracking-tight">{greeting()}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-label-2">
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
          </span>
        </span>
        <button onClick={() => setMenu(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-label-2">
          <MoreHorizontal size={20} />
        </button>
      </header>

      {/* PC'deki adadaki gibi canlı Nook; altında bilgisayarın durumu (dokununca Bilgisayar) */}
      <Hero status={online ? status : null} nook={status?.nook} online={online} playing={!!playing?.playing} sub={subtitle(TILES[0])} onLook={() => online && onOpen("look")} onPc={() => onOpen("pc")} />

      {/* Su Takibi ve Hızlı Bardak Ekleme */}
      <WaterCard pairing={pairing} status={status} />

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

      {homeKeys.length > 0 && (
        <>
          <h2 className="-mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Kısayollar</h2>
          <section className="grid grid-cols-3 gap-2.5">
            {homeKeys.map((k) => (
              <KeyButton key={k.id} k={k} pairing={pairing} online={online} say={say} small />
            ))}
          </section>
        </>
      )}

      <h2 className="-mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Nook'lar</h2>
      <section className="grid grid-cols-2 gap-2.5">
        {TILES.filter((t) => t.id !== "pc" && (t.id !== "claude" || status?.claude || cached("claude"))).map((t) => (
          <TileCard key={t.id} tile={t} sub={subtitle(t)} disabled={!online && !OFFLINE_OK.includes(t.id)} onClick={() => onOpen(t.id)} />
        ))}
      </section>

      <h2 className="-mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Daha fazla</h2>
      <More pairing={pairing} online={online} status={status} mobile={mobile} onOpen={onOpen} />

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
            <p className="mt-1 px-1 text-[13px] text-label-3">
              Nook Mobil {mobile ?? "—"} · PC'de Nook {status?.version ?? "—"}
            </p>
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

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : h < 22 ? "İyi akşamlar" : "İyi geceler";
}

/** Nook'lar: kare kart, Nook üstte, adı ve iki satıra kadar durumu altta */
function TileCard({ tile, sub, disabled, onClick }: { tile: Tile; sub: string; disabled: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96 }}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[118px] min-w-0 flex-col items-start rounded-[26px] border p-3 text-left disabled:opacity-40"
      style={{ background: `linear-gradient(155deg, ${tintBg(tile.color, 17)}, ${tintBg(tile.color, 5)})`, borderColor: tintBg(tile.color, 30) }}
    >
      <ChipNook id={tile.nook} size={42} />
      <span className="mt-auto block w-full pt-2 text-[15px] font-bold leading-tight" style={{ color: tintText(tile.color) }}>
        {tile.label}
      </span>
      <span className="mt-0.5 line-clamp-2 block w-full text-[11.5px] leading-snug text-label-3">{sub}</span>
    </motion.button>
  );
}

/** Ana ekranın altı: günlük ve yama notları birer satır, en altta iki tarafın sürümü */
function More({ pairing, online, status, mobile, onOpen }: { pairing: Pairing; online: boolean; status: Status | null; mobile: string | null; onOpen: (s: Screen) => void }) {
  const diary = useDiary(pairing, online);
  const note = cached<PcNote[]>("patchNotes")?.[0];
  const last = diary[0];
  return (
    <>
      <section className="overflow-hidden rounded-[26px] bg-card">
        <Row nook="today" color={DIARY} label="Nook'un günlüğü" sub={last ? `${dayLabel(last.day)} · ${last.text}` : "Nook her gece günü yazar"} onClick={() => onOpen("diary")} />
        <div className="ml-[62px] h-px bg-edge" />
        <Row nook="notes" color="#FFB13D" label="Yama notları" sub={note ? `${note.version} · ${note.headline}` : "Yeni sürümlerde neler var"} onClick={() => onOpen("patch")} />
      </section>
      <p className="pb-5 pt-1 text-center text-[11.5px] text-label-3">
        Nook Mobil {mobile ?? "—"}
        {status?.version ? ` · PC'de Nook ${status.version}` : ""}
      </p>
    </>
  );
}

function Row({ nook, color, label, sub, onClick }: { nook: string; color: string; label: string; sub: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onClick} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
      <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center">
        <ChipNook id={nook} size={36} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[14.5px] font-semibold" style={{ color: tintText(color) }}>
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-label-3">{sub}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-label-3" />
    </motion.button>
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

function WaterCard({ pairing, status }: { pairing: Pairing; status: Status | null }) {
  const [localWater, setLocalWater] = useState<number | null>(null);
  const [drinking, setDrinking] = useState(false);

  // PC'den taze su durumu geldiğinde iyimser yerel sayacı temizle
  useEffect(() => {
    if (status?.water?.count !== undefined) {
      setLocalWater(null);
    }
  }, [status?.water?.count]);

  const waterCount = localWater ?? status?.water?.count ?? 0;
  const waterGoal = status?.water?.goal ?? 8;

  const onDrink = async () => {
    setDrinking(true);
    setLocalWater(waterCount + 1);
    try {
      await drinkWater(pairing);
    } catch {
      // ignore
    }
    setTimeout(() => setDrinking(false), 800);
  };

  return (
    <div className="flex items-center justify-between rounded-3xl border border-edge bg-card p-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl">
          💧
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-white">Su Takibi</span>
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-bold text-cyan-300">
              {waterCount}/{waterGoal} bardak
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-label-3">
            {waterCount >= waterGoal ? "Harika! Günlük hedefe ulaştın 🎉" : `${waterGoal - waterCount} bardak daha içmelisin`}
          </p>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onDrink}
        className="flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2.5 text-[13.5px] font-bold text-black shadow-md transition-colors"
        style={{
          background: drinking ? "#67e8f9" : "#2fd4c0",
          boxShadow: "0 2px 12px rgba(47, 212, 192, 0.35)",
        }}
      >
        <span>+1</span>
        <span>İçtim</span>
      </motion.button>
    </div>
  );
}

/** Ana ekranın tepesi: canlı Nook (dokununca Görünüm), altında Bilgisayar satırı ve açık kalma, işlemci, bellek, boş disk */
function Hero({ status, nook, online, playing, sub, onLook, onPc }: { status: Status | null; nook: Status["nook"]; online: boolean; playing: boolean; sub: string; onLook: () => void; onPc: () => void }) {
  const st = status?.stats;
  const bat = st?.battery;
  const green = "#8FE03A";
  return (
    <section
      className="overflow-hidden rounded-[32px] border border-edge"
      style={{ background: `radial-gradient(120% 75% at 50% 0%, ${tintBg(nook?.color ?? "#ffffff", 10)}, transparent 70%), var(--color-card)` }}
    >
      <div className={`flex justify-center pt-3.5 pb-0.5 ${online ? "" : "opacity-60 grayscale"}`} onClick={onLook}>
        <LiveNook look={nook?.look} color={nook?.color} online={online} playing={playing} />
      </div>
      <motion.button whileTap={{ scale: 0.98 }} onClick={onPc} className="block w-full px-3 pb-3 text-left">
        <span className="flex items-center gap-2.5 rounded-[22px] bg-well py-1.5 pl-1.5 pr-3">
          <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center">
            <ChipNook id="control" size={32} />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[14.5px] font-semibold" style={{ color: tintText(green) }}>
              Bilgisayar
            </span>
            <span className="mt-0.5 block truncate text-[11.5px] text-label-3">{bat ? `${bat.charging ? "Şarj oluyor" : "Pil"} %${bat.percent} · ${sub}` : sub}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-label-3" />
        </span>
        {status && st && (
          <span className="mt-3 grid grid-cols-4 gap-2 px-1.5">
            <Stat label="Açık" value={uptime(status.uptimeSec)} />
            <Stat label="İşlemci" value={`%${Math.round(st.cpu)}`} frac={st.cpu / 100} color="#3d8bff" />
            <Stat label="Bellek" value={`${gb(st.memUsed)} GB`} frac={st.memTotal ? st.memUsed / st.memTotal : 0} color="#8f6bff" />
            <Stat label="Disk boş" value={`${gb(st.diskTotal - st.diskUsed)} GB`} frac={st.diskTotal ? st.diskUsed / st.diskTotal : 0} color="#f2a33a" />
          </span>
        )}
      </motion.button>
    </section>
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
