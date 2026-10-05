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
import { isSleeping, SULK_BELOW, useNook } from "../../store/nook";
import { ACCENT, Card } from "../ui/primitives";
import { ek, useNookName } from "../../lib/look";

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
          <div className="absolute inset-0" style={{ zoom: z }}>
            {lookTab ? <NameTag /> : <Activity view={view} />}
          </div>
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
          {z === 1 ? children : <div style={{ zoom: z, width: (c.w - 24) / z, height: (c.h - 24) / z }}>{children}</div>}
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
      <p className="mt-0.5 text-[10px] text-label-3">{custom ? "senin Nook'un" : "bir isim ver"}</p>
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
      <HeaderIcon icon={House} label="Ana sayfa" active={!searching && tab === "home"} onClick={() => go("home")} />
      <HeaderIcon icon={MessageCircle} label={`${ek(name, "la")} sohbet`} active={!searching && tab === "chat"} onClick={() => go("chat")} />
      <HeaderIcon icon={Search} label="Ara" active={searching} onClick={() => useNook.getState().setSearching(true)} />
      <HeaderIcon icon={Settings} label="Ayarlar" active={!searching && tab === "settings"} onClick={() => go("settings")} />
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
        <span className="flex items-center" style={{ color: inUse.color }} title={`${inUse.apps.join(", ")} kullanıyor`}>
          <inUse.icon size={11} strokeWidth={2.4} />
        </span>
      )}
      {weather && SkyIcon && (
        <span className="flex items-center gap-1" title={`${weather.city} · ${SKY_LABEL[weather.sky]} · ${weather.high}° / ${weather.low}° · yağış %${weather.rainChance}`}>
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
      <span className="text-label-2">{now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
      <MoveHandle />
      <BigToggle />
    </div>
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
      title="Sürükleyerek taşı"
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
      title={big ? "Küçült (Esc)" : "Tam ekran"}
      className="-my-1 -mr-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full text-label-3 transition-colors hover:bg-white/[0.08] hover:text-label"
    >
      <Icon size={11} strokeWidth={2.4} />
    </motion.button>
  );
}

interface Item {
  id: string;
  icon: LucideIcon;
  text: string;
  color?: string;
}

/**
 * "Şu an" listesi — Grok Bot'taki adım listesi gibi: en önemli iş parlak ve büyük, diğerleri soluk.
 * Ana sayfada Nook'un sağında dikey ortalı, bölüm görünümünde Nook'un altında.
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
  // Odak sayacı listede canlı aksın
  const [, tick] = useState(0);
  useEffect(() => {
    if (!focus) return;
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [focus]);

  const items: Item[] = [];
  if (!online) items.push({ id: "offline", icon: WifiOff, text: "İnternet yok", color: ACCENT.red });
  if (focus) items.push({ id: "focus", icon: Target, text: `${PHASE_LABEL[focus.phase]} · ${mmss(remaining(focus))}`, color: focus.phase === "work" ? ACCENT.red : ACCENT.teal });
  if (downloads.length) {
    const d = downloads[0];
    items.push({ id: "dl", icon: ArrowDown, text: d.speed ? `${d.name} · ${formatSize(d.speed)}/s` : d.name, color: ACCENT.blue });
  }
  if (media?.playing) items.push({ id: "music", icon: Music, text: media.title, color: ACCENT.pink });
  const mic = privacy.camera[0] ?? privacy.mic[0];
  if (mic) items.push({ id: "mic", icon: privacy.camera.length ? Video : Mic, text: `${mic} dinliyor`, color: ACCENT.orange });
  const low = [
    devices?.headset && devices.headset.percent <= 20 ? `Kulaklık %${devices.headset.percent}` : null,
    devices?.mouse && devices.mouse.percent <= 20 ? `Mouse %${devices.mouse.percent}` : null,
  ].filter(Boolean) as string[];
  if (low.length) items.push({ id: "low", icon: BatteryLow, text: low.join(" · "), color: ACCENT.red });
  const nextAlarm = alarms.filter((a) => a.enabled && a.next).sort((a, b) => a.next! - b.next!)[0];
  if (nextAlarm) {
    const d = new Date(nextAlarm.next!);
    items.push({ id: "alarm", icon: AlarmClock, text: `Alarm ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`, color: ACCENT.yellow });
  }
  if (weather) items.push({ id: "weather", icon: weather.isDay ? CloudSun : Moon, text: `${weather.temp}° ${weather.city}` });
  // Çok seviyorsa kalp ikonu söyler — yazı kısa kalır, dar kartta kesilmez
  const loved = !asleep && affection > 80;
  items.push({ id: "mood", icon: loved ? Heart : Sparkles, text: moodLine(affection, asleep), color: loved ? ACCENT.pink : undefined });

  const home = view === "home";
  const shown = items.slice(0, home ? 4 : 3);
  return (
    <motion.div
      className={home ? "absolute bottom-0 right-3 top-0 flex flex-col justify-center gap-1.5" : "absolute inset-x-3 bottom-3 space-y-1"}
      style={home ? { left: ex.homeListX / ex.zoom } : undefined}
      layout
      transition={CARD_SPRING}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map((it, i) => (
          <motion.div
            key={it.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className={`flex min-w-0 items-center gap-1.5 ${i === 0 ? "text-[13.5px] font-medium text-label" : "text-[11.5px] text-label-3"}`}
          >
            <it.icon size={i === 0 ? 13 : 11} strokeWidth={2.3} className="shrink-0" style={{ color: i === 0 || it.id === "mood" ? (it.color ?? (i === 0 ? "var(--color-label-2)" : undefined)) : undefined }} />
            <span className="truncate">{it.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function moodLine(affection: number, asleep: boolean) {
  if (asleep) return "Uyuyor…";
  if (affection < SULK_BELOW) return "Biraz küs";
  const h = new Date().getHours();
  const greet = h < 5 ? "Gece kuşu" : h < 12 ? "Günaydın" : h < 18 ? "Merhaba" : "İyi akşamlar";
  return greet;
}
