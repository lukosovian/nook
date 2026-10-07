import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlarmClock,
  ArrowDown,
  BatteryFull,
  BatteryLow,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  House,
  MessageCircle,
  Mic,
  Moon,
  Music,
  Search,
  Settings,
  Heart,
  Maximize2,
  Minimize2,
  Move,
  Sparkles,
  Sun,
  Target,
  Video,
  Plus,
  Volume2,
  VolumeX,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { mmss, PHASE_LABEL, remaining } from "../../lib/focus";
import { formatSize } from "../../lib/format";
import type { View } from "../../lib/layout";
import { useExpanded } from "../../hooks/useExpanded";
import { toggleBig } from "../../lib/big";
import { islandDrag } from "../../lib/bridge";
import { easeOut } from "../../lib/motion";
import { SKY_LABEL, type Sky } from "../../lib/weather";
import { isLive, isSleeping, SULK_BELOW, useNook } from "../../store/nook";
import { ACCENT, Card, tintBg, tintText } from "../ui/primitives";
import { ek, useNookName } from "../../lib/look";
import { tt, locale } from "../../lib/i18n";
import { allProfiles, MAX_PROFILES, newProfile, userProfiles } from "../../lib/profiles";
import { SoundBody } from "../SoundCard";
import { lineAt, lyricOffset, useLyrics } from "../../lib/lyrics";

const CARD_SPRING = { type: "spring", stiffness: 340, damping: 32 } as const;

/**
 * Açık adanın iskeleti (Grok Bot düzeni): üstte küçük ikonlar + durum çubuğu, altında iki kart.
 * Büyük Nook'un kendisi Island'da çizilir (kapalıyken küçük olan aynı Nook büyüyüp karta yerleşir).
 */
export function Frame({ view, title, children }: { view: View; title?: string; children: React.ReactNode }) {
  const ex = useExpanded();
  const { hero: h, content: c } = ex.views[view];
  const z = ex.zoom;
  const lookTab = useNook((s) => s.tab === "look");
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.06, duration: 0.22, ease: easeOut } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <div className="absolute inset-x-0 top-0" style={{ zoom: z }}>
        <HeaderNav title={title} />
        <StatusBar />
      </div>

      <motion.div
        className="absolute"
        initial={{ left: h.x, top: h.y + 8, width: h.w, height: h.h, opacity: 0 }}
        animate={{ left: h.x, top: h.y, width: h.w, height: h.h, opacity: 1 }}
        transition={CARD_SPRING}
      >
        <Card className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-x-0 top-0" style={{ zoom: z, bottom: ex.soundH }}>
            {lookTab ? <NameTag /> : view === "module" && ex.soundH > 0 ? null : <Activity view={view} />}
          </div>
          {/* Büyük adada ses ayarları Nook'un altında (yandaki kart pencereden taşar) */}
          {ex.soundH > 0 && (
            <div className="absolute inset-x-0 bottom-0 p-2" style={{ height: ex.soundH }}>
              <div className="rounded-[22px] bg-black/60 p-3" style={{ zoom: z, height: (ex.soundH - 16) / z }}>
                <SoundBody />
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div
        className="absolute"
        initial={{ left: c.x, top: c.y + 8, width: c.w, height: c.h, opacity: 0 }}
        animate={{ left: c.x, top: c.y, width: c.w, height: c.h, opacity: 1 }}
        transition={{ ...CARD_SPRING, delay: 0.03 }}
      >
        <Card className="h-full w-full overflow-hidden p-3">
          {/* Tam ekranda içerik yakınlaşır: yazılar, düğmeler, liste satırları birlikte büyür */}
          {/* Hep aynı sarmalayıcı: tam ekrana geçince içerik baştan oluşmasın (kaydırma, girdiler, önizlemeler korunur) */}
          <div style={{ zoom: z, width: (c.w - 24) / z, height: (c.h - 24) / z }}>{children}</div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/** Görünüm düzenlenirken büyük Nook'un altında adı */
function NameTag() {
  const name = useNookName();
  const custom = useNook((s) => !!s.settings.nookName.trim());
  return (
    <div className="absolute inset-x-3 bottom-4 text-center">
      <motion.p key={name} className="truncate text-[17px] font-semibold tracking-tight text-label" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={CARD_SPRING}>
        {name}
      </motion.p>
      <p className="mt-0.5 text-[10px] text-label-3">{custom ? tt("senin Nook'un") : tt("bir isim ver")}</p>
    </div>
  );
}

/** Sol üst: Grok Bot'taki gibi üç küçük ikon (Ana sayfa · Arama · Ayarlar) ve bulunulan bölüm. */
function HeaderNav({ title }: { title?: string }) {
  const tab = useNook((s) => s.tab);
  const searching = useNook((s) => s.searching);
  const name = useNookName();
  const go = (t: "home" | "settings" | "chat") => {
    const s = useNook.getState();
    if (s.searching) s.setSearching(false);
    s.setTab(t);
  };
  return (
    <div className="absolute left-3.5 top-[9px] flex items-center gap-0.5">
      <HeaderIcon icon={House} label={tt("Ana sayfa")} active={!searching && tab === "home"} onClick={() => go("home")} />
      <HeaderIcon icon={MessageCircle} label={tt("{0} sohbet", ek(name, "la"))} active={!searching && tab === "chat"} onClick={() => go("chat")} />
      <HeaderIcon icon={Search} label={tt("Ara")} active={searching} onClick={() => useNook.getState().setSearching(true)} />
      <HeaderIcon icon={Settings} label={tt("Ayarlar")} active={!searching && tab === "settings"} onClick={() => go("settings")} />
      {!searching && tab === "home" && <ProfilePills />}
      <AnimatePresence mode="wait" initial={false}>
        {title && (
          <motion.span
            key={title}
            className="ml-1 flex items-center gap-1 text-[11px] font-medium text-label-2"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            transition={{ duration: 0.14 }}
          >
            <ChevronRight size={11} strokeWidth={2.4} className="text-label-3" />
            {title}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Ana sayfa profili: Hepsi · İş · Oyun · Eğlence · kendi profillerin; + yeni profil */
function ProfilePills() {
  const profile = useNook((s) => s.settings.homeProfile);
  const custom = useNook((s) => s.settings.profiles);
  const add = () => {
    const s = useNook.getState();
    const list = userProfiles(s.settings.profiles);
    const p = newProfile(list);
    s.updateSettings({ profiles: [...list, p], homeProfile: p.id });
    // Yeni profile hangi bölümlerin gireceği seçilsin
    s.setHomeEdit(true);
  };
  return (
    <div className="ml-2 flex items-center gap-0.5 rounded-full bg-white/[0.04] p-[2px]">
      {userProfiles(custom).length < MAX_PROFILES && (
        <button onClick={add} title={tt("Yeni profil")} className="order-last flex h-[18px] w-[18px] items-center justify-center rounded-full text-label-3 hover:bg-white/[0.08] hover:text-label">
          <Plus size={10} strokeWidth={2.8} />
        </button>
      )}
      {allProfiles(custom).map((p) => {
        const on = p.id === profile;
        return (
          <button
            key={p.id}
            onClick={() => useNook.getState().updateSettings({ homeProfile: p.id })}
            className={`relative max-w-[80px] truncate rounded-full px-2 py-[2px] text-[10px] font-medium transition-colors ${on ? "" : "text-label-3 hover:text-label-2"}`}
            style={on ? { color: tintText(p.color) } : undefined}
          >
            {on && <motion.span layoutId="hdr-profile" className="absolute inset-0 rounded-full" style={{ background: tintBg(p.color, 20) }} transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HeaderIcon({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex h-[22px] w-[22px] items-center justify-center rounded-full transition-colors ${active ? "text-label" : "text-label-3 hover:text-label-2"}`}
    >
      {active && <motion.span layoutId="hdr-pill" className="absolute inset-0 rounded-full bg-white/[0.1]" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
      <Icon size={11.5} strokeWidth={2.3} className="relative" fill={active && Icon === House ? "currentColor" : "none"} />
    </button>
  );
}

const SKY_ICON: Record<Sky, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/** Sağ üst: küçük ve sessiz — mikrofon · hava · pil · saat */
function StatusBar() {
  const weather = useNook((s) => s.weather);
  const privacy = useNook((s) => s.privacy);
  const battery = useNook((s) => s.stats?.battery);
  const now = useClock();
  const SkyIcon = weather ? (weather.sky === "clear" && !weather.isDay ? Moon : SKY_ICON[weather.sky]) : null;
  const inUse = privacy.camera.length ? { icon: Video, color: ACCENT.green, apps: privacy.camera } : privacy.mic.length ? { icon: Mic, color: ACCENT.orange, apps: privacy.mic } : null;

  return (
    <div className="absolute right-4 top-[12px] flex items-center gap-2.5 text-[10.5px] font-medium tabular-nums text-label-3">
      {inUse && (
        <span className="flex items-center" style={{ color: inUse.color }} title={tt("{0} kullanıyor", inUse.apps.join(", "))}>
          <inUse.icon size={11} strokeWidth={2.4} />
        </span>
      )}
      {weather && SkyIcon && (
        <span className="flex items-center gap-1" title={tt("{0} · {1} · {2}° / {3}° · yağış %{4}", weather.city, SKY_LABEL[weather.sky], weather.high, weather.low, weather.rainChance)}>
          <SkyIcon size={11} strokeWidth={2.4} />
          {weather.temp}°
        </span>
      )}
      {battery && (
        <span className="flex items-center gap-1" style={{ color: !battery.charging && battery.percent <= 20 ? ACCENT.red : undefined }}>
          %{battery.percent}
          {battery.percent <= 20 && !battery.charging ? <BatteryLow size={13} /> : <BatteryFull size={13} />}
        </span>
      )}
      <span className="text-label-2">{now.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}</span>
      <LiveBadge />
      <SoundToggle />
      <MoveHandle />
      <BigToggle />
    </div>
  );
}

/** Yayın maskesi açıkken kırmızı CANLI rozeti; tıklayınca maske bu yayın için kapanır */
function LiveBadge() {
  const live = useNook(isLive);
  const source = useNook((s) => s.liveAuto.source);
  if (!live) return null;
  return (
    <button
      onClick={() => useNook.getState().setLive(null, false)}
      title={tt("Yayın maskesi açık{0} · tıkla: kapat", source ? ` (${source})` : "")}
      className="-my-1 flex items-center gap-1 rounded-full px-2 py-[2px] text-[9.5px] font-bold tracking-wider"
      style={{ background: tintBg(ACCENT.red, 22), color: tintText(ACCENT.red) }}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: ACCENT.red }} />
      {tt("CANLI")}
    </button>
  );
}

/** Ses kartını (adanın yanındaki, büyük adada Nook'un altındaki) aç / kapat */
function SoundToggle() {
  const on = useNook((s) => s.settings.soundCard);
  return (
    <button
      onClick={() => useNook.getState().updateSettings({ soundCard: !on })}
      title={on ? tt("Ses kartını kapat") : tt("Ses kartını aç")}
      className="-my-1 flex h-[22px] w-[22px] items-center justify-center rounded-full transition-colors hover:bg-white/[0.08]"
      style={{ color: on ? tintText(ACCENT.pink) : "var(--color-label-3)", background: on ? tintBg(ACCENT.pink, 14) : undefined }}
    >
      {on ? <Volume2 size={11} strokeWidth={2.4} /> : <VolumeX size={11} strokeWidth={2.4} />}
    </button>
  );
}

/** Basılı tutup sürükle: ada ekranda istediğin yere taşınır (Ayarlar'dan ya da sağ tıkla ortalanır) */
function MoveHandle() {
  const big = useNook((s) => !!s.big);
  if (big) return null;
  return (
    <button
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        void islandDrag();
      }}
      title={tt("Sürükleyerek taşı")}
      className="-my-1 flex h-[22px] w-[22px] cursor-grab items-center justify-center rounded-full text-label-3 transition-colors hover:bg-white/[0.08] hover:text-label active:cursor-grabbing"
    >
      <Move size={11} strokeWidth={2.4} />
    </button>
  );
}

/** Tam ekran: ada ekrana yayılır; tekrar basınca (ya da Esc) eski boyutuna döner */
function BigToggle() {
  const big = useNook((s) => !!s.big);
  const Icon = big ? Minimize2 : Maximize2;
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={toggleBig}
      title={big ? tt("Küçült (Esc)") : tt("Tam ekran")}
      className="-my-1 -mr-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full text-label-3 transition-colors hover:bg-white/[0.08] hover:text-label"
    >
      <Icon size={11} strokeWidth={2.4} />
    </motion.button>
  );
}

interface Item {
  id: string;
  icon: LucideIcon;
  title: string;
  /** İkinci satır (sanatçı, "pil azalıyor", "3 sa sonra") */
  sub?: string;
  /** Sağda kısa değer (14:05, %7, 18°) */
  value?: string;
  /** Alttaki ince çubuk (0–1) */
  progress?: number;
  color?: string;
}

const GRAY = "#8a8a93";

/** "3 sa 12 dk sonra" */
function untilText(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return tt("{0} dk sonra", m);
  const h = Math.floor(m / 60);
  return m % 60 ? tt("{0} sa {1} dk sonra", h, m % 60) : tt("{0} sa sonra", h);
}

/**
 * "Şu an" kartları — Nook'un yanında küçük, düzenli satırlar: renkli ikon, başlık ve alt satır,
 * sağda kısa değer, gerekirse altta ilerleme çubuğu. En önemli iş en üstte ve kendi renginde çerçeveli.
 * Ana sayfada Nook'un sağında, bölüm görünümünde Nook'un altında (orada daha sade).
 */
function Activity({ view }: { view: View }) {
  const ex = useExpanded();
  const media = useNook((s) => s.media);
  const downloads = useNook((s) => s.downloads);
  const privacy = useNook((s) => s.privacy);
  const devices = useNook((s) => s.devices);
  const weather = useNook((s) => s.weather);
  const affection = useNook((s) => s.affection);
  const asleep = useNook(isSleeping);
  const alarms = useNook((s) => s.alarms);
  const focus = useNook((s) => s.focus);
  const online = useNook((s) => s.online);
  const { lyrics, key: lyricKey } = useLyrics();
  // Odak sayacı ve şarkının ilerlemesi canlı aksın
  const [now, setNow] = useState(Date.now());
  const live = !!focus || !!media?.playing;
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [live]);

  const items: Item[] = [];
  if (!online) items.push({ id: "offline", icon: WifiOff, title: tt("İnternet yok"), sub: tt("Bağlantı bekleniyor"), color: ACCENT.red });
  if (focus) {
    const left = remaining(focus, now);
    items.push({
      id: "focus",
      icon: Target,
      title: PHASE_LABEL[focus.phase],
      sub: focus.endsAt === null ? tt("Duraklatıldı") : focus.phase === "work" ? tt("{0}. tur", focus.round + 1) : tt("Biraz dinlen"),
      value: mmss(left),
      progress: 1 - left / focus.total,
      color: focus.phase === "work" ? ACCENT.red : ACCENT.teal,
    });
  }
  if (downloads.length) {
    const d = downloads[0];
    items.push({ id: "dl", icon: ArrowDown, title: d.name, sub: d.speed ? `${formatSize(d.speed)}/s` : tt("İniyor"), value: formatSize(d.received), color: ACCENT.blue });
  }
  if (media?.playing) {
    const pos = Math.min(media.durationMs || Infinity, media.positionMs + (performance.now() - media.at));
    // Sözler açıksa sanatçı yerine o anki satır
    const line = lyrics?.kind === "synced" ? lyrics.lines[lineAt(lyrics.lines, pos + lyricOffset(lyricKey))]?.text : undefined;
    items.push({ id: "music", icon: Music, title: media.title, sub: line || media.artist || tt("Çalıyor"), progress: media.durationMs ? pos / media.durationMs : undefined, color: ACCENT.pink });
  }
  const cam = privacy.camera[0];
  const mic = privacy.mic[0];
  if (cam || mic) items.push({ id: "mic", icon: cam ? Video : Mic, title: (cam ?? mic)!, sub: cam ? tt("Kamerayı kullanıyor") : tt("Mikrofonu kullanıyor"), color: cam ? ACCENT.green : ACCENT.orange });
  for (const [key, label, p] of [
    ["mouse", tt("Mouse"), devices?.mouse?.percent],
    ["headset", tt("Kulaklık"), devices?.headset?.percent],
  ] as const) {
    if (p != null && p <= 20) items.push({ id: `low-${key}`, icon: BatteryLow, title: label, sub: tt("Pil azalıyor"), value: `%${p}`, progress: p / 100, color: ACCENT.red });
  }
  const nextAlarm = alarms.filter((a) => a.enabled && a.next).sort((a, b) => a.next! - b.next!)[0];
  if (nextAlarm) {
    const d = new Date(nextAlarm.next!);
    items.push({
      id: "alarm",
      icon: AlarmClock,
      title: nextAlarm.label || tt("Alarm"),
      sub: untilText(nextAlarm.next! - Date.now()),
      value: d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }),
      color: ACCENT.yellow,
    });
  }
  if (weather) {
    const Sky = weather.sky === "clear" && !weather.isDay ? Moon : SKY_ICON[weather.sky];
    items.push({ id: "weather", icon: Sky, title: weather.city, sub: `${SKY_LABEL[weather.sky]} · ${weather.high}° / ${weather.low}°`, value: `${weather.temp}°`, color: ACCENT.blue });
  }
  const loved = !asleep && affection > 80;
  items.push({ id: "mood", icon: loved ? Heart : Sparkles, title: moodLine(affection, asleep), sub: tt("Keyfi"), progress: affection / 100, color: loved ? ACCENT.pink : GRAY });

  const home = view === "home";
  const shown = items.slice(0, home ? 4 : 3);
  return (
    <motion.div
      className={home ? "absolute bottom-0 right-3 top-0 flex flex-col justify-center gap-1.5" : "absolute inset-x-2 bottom-2 flex flex-col gap-1"}
      style={home ? { left: ex.homeListX / ex.zoom } : undefined}
      layout
      transition={CARD_SPRING}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map((it, i) => (
          <Row key={it.id} item={it} lead={i === 0} compact={!home} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function Row({ item: it, lead, compact }: { item: Item; lead: boolean; compact: boolean }) {
  const c = it.color ?? GRAY;
  const bubble = compact ? 18 : 22;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={`relative flex min-w-0 items-center gap-2 overflow-hidden rounded-[12px] border ${compact ? "px-1.5 py-1" : "px-2 py-[5px]"}`}
      style={{
        background: lead ? tintBg(c, 10) : "rgb(255 255 255 / 0.03)",
        borderColor: lead ? tintBg(c, 30) : "rgb(255 255 255 / 0.05)",
      }}
    >
      <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: bubble, height: bubble, background: tintBg(c, 20), color: c }}>
        <it.icon size={compact ? 10 : 11.5} strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className={`block truncate font-medium ${lead ? "text-label" : "text-label-2"} ${compact ? "text-[11px]" : "text-[12px]"}`}>{it.title}</span>
        {it.sub && !compact && <span className="block truncate text-[9.5px] text-label-3">{it.sub}</span>}
      </span>
      {it.value && (
        <span className={`shrink-0 font-semibold tabular-nums ${compact ? "text-[10.5px]" : "text-[11.5px]"}`} style={{ color: lead ? tintText(c) : "var(--color-label-2)" }}>
          {it.value}
        </span>
      )}
      {it.progress != null && (
        <span className="absolute inset-x-2 bottom-[2px] h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
          <motion.span className="block h-full rounded-full" style={{ background: c }} initial={false} animate={{ width: `${Math.max(2, Math.min(100, it.progress * 100))}%` }} transition={{ duration: 0.4 }} />
        </span>
      )}
    </motion.div>
  );
}

function moodLine(affection: number, asleep: boolean) {
  if (asleep) return tt("Uyuyor…");
  if (affection < SULK_BELOW) return tt("Biraz küs");
  const h = new Date().getHours();
  const greet = h < 5 ? tt("Gece kuşu") : h < 12 ? tt("Günaydın") : h < 18 ? tt("Merhaba") : tt("İyi akşamlar");
  return greet;
}
