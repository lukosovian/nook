import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlarmClock,
  AppWindow,
  Bell,
  Power,
  ArrowDown,
  BatteryFull,
  BatteryLow,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  House,
  LayoutGrid,
  Shirt,
  ArrowLeft,
  MessageCircle,
  Mic,
  Moon,
  Music,
  Search,
  Settings,
  Maximize2,
  Minimize2,
  Move,
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
import { expandedLayout, FACE, mascotPose, sizeFor, type View } from "../../lib/layout";
import { useExpanded } from "../../hooks/useExpanded";
import { toggleBig } from "../../lib/big";
import { islandDrag } from "../../lib/bridge";
import { easeOut } from "../../lib/motion";
import { SKY_LABEL, type Sky } from "../../lib/weather";
import { isLive, useNook, type Tab } from "../../store/nook";
import { useAvailable } from "./moduleData";
import { openStudio } from "../../lib/studio";
import { ACCENT, Card, tintBg, tintText } from "../ui/primitives";
import { ek, useNookName } from "../../lib/look";
import { pickGreeting } from "../../lib/greet";
import { shortLeft, timerLine, usePowerTimer } from "../../lib/powerTimer";
import { pct as fmtPct, tt, locale } from "../../lib/i18n";
import { allProfiles, MAX_PROFILES, newProfile, userProfiles } from "../../lib/profiles";
import { SoundBody } from "../SoundCard";
import { lineAt, lyricOffset, useLyrics } from "../../lib/lyrics";

const CARD_SPRING = { type: "spring", stiffness: 340, damping: 32 } as const;

/**
 * Açık adanın iskeleti (0.3): solda dikey çubuk, üstte durum çubuğu, altında kartlar.
 * Ana sayfa ve modül ızgarası kendi kartlarını çizer; bölümler tek bir içerik kartında.
 * Büyük Nook'un kendisi Island'da çizilir (kapalıyken küçük olan aynı Nook büyüyüp karta yerleşir).
 */
export function Frame({ view, title, color, children }: { view: View; title?: string; color?: string; children: React.ReactNode }) {
  const ex = useExpanded();
  const { hero: h, content: c } = ex.views[view];
  const z = ex.zoom;
  const lookTab = useNook((s) => s.tab === "look");
  const plain = view !== "module";
  // Tam ekranda içerik, bölümün normal boyutundaki düzenini koruyacak kadar yakınlaşır: yalnızca genel
  // yakınlaştırmayla içerik boşluğa yayılıp bozuluyordu (takvimin günleri uzuyor, düğmeler kayboluyordu)
  const tab = useNook((s) => s.tab);
  const searching = useNook((s) => s.searching);
  const cz = useMemo(() => {
    if (z === 1) return 1;
    const d = expandedLayout(null, false, sizeFor(tab, searching)).views[view].content;
    const pad = plain ? 0 : 24;
    return Math.max(z, Math.min(1.75, (c.w - pad) / (d.w - pad), (c.h - pad) / (d.h - pad)));
  }, [z, tab, searching, view, plain, c.w, c.h]);
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.06, duration: 0.22, ease: easeOut } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <Dock />
      <motion.div className="absolute right-0 top-0 z-20" initial={false} animate={{ left: ex.dock }} transition={CARD_SPRING} style={{ height: ex.header }}>
        <div className="absolute inset-0" style={{ zoom: z }}>
          <TopBar view={view} title={title} color={color} />
        </div>
      </motion.div>

      <motion.div
        className="absolute"
        initial={{ left: h.x, top: h.y + 8, width: h.w, height: h.h, opacity: 0 }}
        animate={{ left: h.x, top: h.y, width: h.w, height: h.h, opacity: 1 }}
        transition={CARD_SPRING}
      >
        <Card className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-x-0 top-0" style={{ zoom: z, bottom: ex.soundH }}>
            {lookTab ? <NameTag /> : view === "home" ? <HomeHero /> : view === "modules" ? <ModulesHero /> : ex.soundH > 0 ? null : <Activity />}
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
        {plain ? (
          // Ana sayfa ve ızgara kendi kartlarını çizer
          <div style={{ zoom: cz, width: c.w / cz, height: c.h / cz }}>{children}</div>
        ) : (
          <Card className="h-full w-full overflow-hidden p-3">
            {/* Tam ekranda içerik yakınlaşır: yazılar, düğmeler, liste satırları birlikte büyür */}
            {/* Hep aynı sarmalayıcı: tam ekrana geçince içerik baştan oluşmasın (kaydırma, girdiler, önizlemeler korunur) */}
            <div style={{ zoom: cz, width: (c.w - 24) / cz, height: (c.h - 24) / cz }}>{children}</div>
          </Card>
        )}
      </motion.div>
      {!lookTab && <Greeting view={view} />}
    </motion.div>
  );
}

/** Son selamın ne zaman kapandığı: ada kısa süre içinde yeniden açılırsa bir daha selam vermez */
let greetedAt = 0;

/**
 * Ada açılınca Nook'un başının üstünde kısa bir selam balonu (dikdörtgen, kuyruklu); 1,8 sn sonra
 * söner. Ada 8 sn içinde yeniden açılırsa çıkmaz.
 */
function Greeting({ view }: { view: View }) {
  const ex = useExpanded();
  const searching = useNook((s) => s.searching);
  const [text] = useState(() => (Date.now() - greetedAt > 8000 && !useNook.getState().searching ? pickGreeting() : null));
  const [shown, setShown] = useState(!!text);
  useEffect(() => {
    // Önizlemede ?greet ile balon kalır (ekran görüntüsü için)
    if (!text || (import.meta.env.DEV && new URLSearchParams(location.search).has("greet"))) return;
    const t = window.setTimeout(() => setShown(false), 1800);
    return () => window.clearTimeout(t);
  }, [text]);
  useEffect(() => () => void (greetedAt = Date.now()), []);
  const pose = mascotPose("expanded", ex.width, view, ex);
  const cx = pose.left + FACE / 2;
  const head = pose.top + FACE / 2 - (FACE * pose.scale) / 2;
  return (
    <AnimatePresence>
      {shown && text && !searching && (
        <div key="greet" className="pointer-events-none absolute z-20 h-0" style={{ left: cx - 120, width: 240, top: head - 3 * ex.zoom }}>
        <motion.div
          className="absolute inset-x-0 bottom-0 flex justify-center"
          initial={{ opacity: 0, y: 6, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 520, damping: 24, delay: 0.25 } }}
          exit={{ opacity: 0, y: -4, scale: 0.85, transition: { duration: 0.18 } }}
        >
          <div className="relative" style={{ zoom: ex.zoom }}>
            <div className="whitespace-nowrap rounded-[9px] bg-white px-2.5 py-[3px] text-[11px] font-bold tracking-tight text-black shadow-[0_4px_14px_-4px_rgba(255,255,255,0.35)]">{text}</div>
            <span className="absolute left-1/2 top-full -ml-[4px] h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-white" />
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
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

/** Dock sekmelerinin renkleri: üst çubuktaki başlık noktasıyla aynı */
export const HUB_COLOR = { home: ACCENT.purple, modules: ACCENT.green, chat: ACCENT.blue, search: ACCENT.teal } as const;

/**
 * Sol dikey çubuk: ana sayfa, bütün modüller, sohbet, arama; altta görünüm ve ayarlar.
 * Seçili olan kendi renginde (başlığın yanındaki noktayla aynı) dolu bir kare.
 */
function Dock() {
  const ex = useExpanded();
  const tab = useNook((s) => s.tab);
  const searching = useNook((s) => s.searching);
  const name = useNookName();
  const go = (t: Tab) => {
    const s = useNook.getState();
    if (s.searching) s.setSearching(false);
    s.setTab(t);
  };
  const on = (t: Tab) => !searching && tab === t;
  return (
    <div className="absolute bottom-0 left-0 top-0 border-r border-white/[0.06] bg-white/[0.022]" style={{ width: ex.dock }}>
      <div className="flex flex-col items-center gap-1 pb-3 pt-2.5" style={{ zoom: ex.zoom, width: ex.dock / ex.zoom, height: ex.height / ex.zoom }}>
        <DockIcon icon={House} label={tt("Ana sayfa")} color={HUB_COLOR.home} active={on("home")} onClick={() => go("home")} />
        <DockIcon icon={LayoutGrid} label={tt("Tüm modüller")} color={HUB_COLOR.modules} active={on("modules")} onClick={() => go("modules")} />
        <DockIcon icon={MessageCircle} label={tt("{0} sohbet", ek(name, "la"))} color={HUB_COLOR.chat} active={on("chat")} onClick={() => go("chat")} />
        <DockIcon icon={Search} label={tt("Ara")} color={HUB_COLOR.search} active={searching} onClick={() => useNook.getState().setSearching(true)} />
        <div className="flex-1" />
        {/* Studio'nun kendisi, görünüm ve ayarlar Nook Studio'da (ayrı pencere) */}
        <DockIcon icon={AppWindow} label="Nook Studio" color={ACCENT.purple} active={false} onClick={() => openStudio("home")} />
        <DockIcon icon={Shirt} label={tt("Görünüm · Nook Studio")} color={ACCENT.pink} active={false} onClick={() => openStudio("look")} />
        <DockIcon icon={Settings} label={tt("Ayarlar · Nook Studio")} color={ACCENT.gray} active={false} onClick={() => openStudio("settings")} />
      </div>
    </div>
  );
}

function DockIcon({ icon: Icon, label, color, active, onClick }: { icon: LucideIcon; label: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      title={label}
      whileTap={{ scale: 0.9 }}
      className={`relative flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-[11px] transition-colors ${active ? "text-white" : "text-label-3 hover:bg-white/[0.06] hover:text-label-2"}`}
    >
      {active && (
        <motion.span
          layoutId="dock-pill"
          className="absolute inset-0 rounded-[11px]"
          style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 88%, white) 0%, ${color} 100%)`, boxShadow: `0 4px 14px -4px ${color}` }}
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
        />
      )}
      <Icon size={14} strokeWidth={2.3} className="relative" fill={active && Icon === House ? "currentColor" : "none"} />
    </motion.button>
  );
}

/** Üst çubuk: solda nerede olduğun (ana sayfada profiller), sağda mikrofon, hava, tarih ve saat, araçlar */
function TopBar({ view, title, color }: { view: View; title?: string; color?: string }) {
  const searching = useNook((s) => s.searching);
  return (
    <div className="absolute inset-0 flex items-center gap-2 px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {(view === "module" || searching) && <BackButton />}
        {view === "module" || searching ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={title}
              className="flex min-w-0 items-center gap-1.5"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.14 }}
            >
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: color ?? "var(--color-label-2)", boxShadow: `0 0 8px ${color ?? "transparent"}` }} />
              <span className="truncate text-[12.5px] font-bold tracking-tight text-label">{title}</span>
            </motion.span>
          </AnimatePresence>
        ) : (
          <>
            <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: HUB_COLOR[view === "modules" ? "modules" : "home"], boxShadow: `0 0 8px ${HUB_COLOR[view === "modules" ? "modules" : "home"]}` }} />
            {view === "modules" && <span className="shrink-0 text-[12.5px] font-bold tracking-tight text-label">{tt("Modüller")}</span>}
            <ProfilePills />
          </>
        )}
      </div>
      <StatusBar />
    </div>
  );
}

/**
 * Bir modüle nereden girildi (ana sayfa ya da modül ızgarası): geri oku oraya döner.
 * Modülden modüle geçişte (aramadan, kısayoldan) ilk giriş yeri korunur.
 */
let backTo: Tab = "home";
useNook.subscribe((st, prev) => {
  if (st.tab === prev.tab) return;
  if (prev.tab === "home" || prev.tab === "modules") backTo = prev.tab;
  else if (st.tab === "home" || st.tab === "modules") backTo = "home";
});

/** Sol üstte geri oku: girdiğin yere (ana sayfa / modüller) döner; aramadaysa aramayı kapatır */
function BackButton() {
  const back = () => {
    const s = useNook.getState();
    if (s.searching) return s.setSearching(false);
    s.setTab(backTo);
  };
  return (
    <motion.button
      onClick={back}
      title={backTo === "modules" ? tt("Modüllere dön") : tt("Ana sayfaya dön")}
      initial={{ opacity: 0, x: 4 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: -1.5 }}
      whileTap={{ scale: 0.88 }}
      className="-ml-1 flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-label-2 transition-colors hover:bg-white/[0.12] hover:text-label"
    >
      <ArrowLeft size={13} strokeWidth={2.6} />
    </motion.button>
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
    // Yeni profile hangi bölümlerin gireceği ızgarada seçilsin
    s.setTab("modules");
    s.setHomeEdit(true);
  };
  return (
    <div className="flex min-w-0 items-center gap-0.5 overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.035] p-[2px]">
      {userProfiles(custom).length < MAX_PROFILES && (
        <button onClick={add} title={tt("Yeni profil")} className="order-last flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-white/[0.08] hover:text-label">
          <Plus size={10} strokeWidth={2.8} />
        </button>
      )}
      {allProfiles(custom).map((p) => {
        const on = p.id === profile;
        return (
          <button
            key={p.id}
            onClick={() => useNook.getState().updateSettings({ homeProfile: p.id })}
            className={`relative max-w-[80px] shrink-0 truncate rounded-full px-2 py-[2px] text-[10.5px] font-semibold transition-colors ${on ? "" : "text-label-3 hover:text-label-2"}`}
            style={on ? { color: tintText(p.color) } : undefined}
          >
            {on && <motion.span layoutId="hdr-profile" className="absolute inset-0 rounded-full" style={{ background: tintBg(p.color, 22) }} transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
            <span className="relative">{p.label}</span>
          </button>
        );
      })}
    </div>
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

/** Sağ üst: mikrofon/kamera kullanan, hava, pil, tarih ve kalın saat; yanında küçük araçlar */
function StatusBar() {
  const ex = useExpanded();
  const weather = useNook((s) => s.weather);
  const privacy = useNook((s) => s.privacy);
  const battery = useNook((s) => s.stats?.battery);
  const now = useClock();
  const SkyIcon = weather ? (weather.sky === "clear" && !weather.isDay ? Moon : SKY_ICON[weather.sky]) : null;
  const inUse = privacy.camera.length
    ? { icon: Video, color: ACCENT.green, apps: privacy.camera, what: tt("kamerayı kullanıyor") }
    : privacy.mic.length
      ? { icon: Mic, color: ACCENT.orange, apps: privacy.mic, what: tt("mikrofonu kullanıyor") }
      : null;
  // Dar adada kimin kullandığı yazmaz, yalnızca simgesi ve adı
  const roomy = ex.width / ex.zoom >= 700;

  return (
    <div className="flex shrink-0 items-center gap-1.5 text-[10.5px] font-medium tabular-nums text-label-2">
      {inUse && (
        <span
          className="flex max-w-[200px] items-center gap-1 truncate rounded-full border px-2 py-[2px] font-semibold"
          style={{ color: tintText(inUse.color), background: tintBg(inUse.color, 12), borderColor: tintBg(inUse.color, 35) }}
          title={tt("{0} kullanıyor", inUse.apps.join(", "))}
        >
          <inUse.icon size={10.5} strokeWidth={2.5} className="shrink-0" />
          <span className="truncate">{roomy ? `${inUse.apps[0]} ${inUse.what}` : inUse.apps[0]}</span>
        </span>
      )}
      {weather && SkyIcon && (
        <span
          className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.04] px-2 py-[2px]"
          title={tt("{0} · {1} · {2}° / {3}° · yağış %{4}", weather.city, SKY_LABEL[weather.sky], weather.high, weather.low, weather.rainChance)}
        >
          <SkyIcon size={11} strokeWidth={2.4} style={{ color: tintText(ACCENT.blue) }} />
          {roomy && !inUse && <span className="max-w-[70px] truncate">{weather.city}</span>}
          <span className="font-semibold text-label">{weather.temp}°</span>
        </span>
      )}
      <AlarmBell />
      <PowerPill />
      {battery && (
        <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.04] px-2 py-[2px]" style={{ color: !battery.charging && battery.percent <= 20 ? ACCENT.red : undefined }}>
          {fmtPct(battery.percent)}
          {battery.percent <= 20 && !battery.charging ? <BatteryLow size={12} /> : <BatteryFull size={12} />}
        </span>
      )}
      {/* Tarih ve saat: tarihe tıklayınca Takvim açılır */}
      <span className="flex items-baseline gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-[1px]">
        <button
          type="button"
          onClick={() => useNook.getState().setTab("calendar")}
          title={tt("Takvimi aç")}
          className="text-[10px] text-label-3 transition-colors hover:text-label hover:underline"
        >
          {now.toLocaleDateString(locale(), { day: "numeric", month: "short", weekday: "short" })}
        </button>
        <span className="text-[13px] font-extrabold tracking-tight text-label">{now.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}</span>
      </span>
      <LiveBadge />
      <SoundToggle />
      <MoveHandle />
      <BigToggle />
    </div>
  );
}

/** Zamanlı kapatma kuruluysa sağ üstte kırmızı geri sayım; tıklayınca Kontrol › Zamanlı kapat */
function PowerPill() {
  const timer = usePowerTimer((s) => s.timer);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timer) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [timer]);
  if (!timer) return null;
  const left = timer.at - now;
  return (
    <motion.button
      onClick={() => useNook.getState().setTab("control")}
      title={timerLine(timer, now)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.9 }}
      className="flex items-center gap-1 rounded-full border px-2 py-[2px] font-semibold"
      style={{ color: tintText(ACCENT.red), background: tintBg(ACCENT.red, left < 60_000 ? 26 : 12), borderColor: tintBg(ACCENT.red, 36) }}
    >
      <Power size={10.5} strokeWidth={2.8} />
      {shortLeft(left)}
    </motion.button>
  );
}

/** Kurulu alarm varsa sağ üstte çan ve en yakın alarmın saati; tıklayınca Alarm açılır */
function AlarmBell() {
  const next = useNook((s) => s.alarms.filter((a) => a.enabled && a.next).sort((a, b) => a.next! - b.next!)[0]);
  if (!next) return null;
  const at = new Date(next.next!);
  return (
    <motion.button
      onClick={() => useNook.getState().setTab("alarm")}
      title={`${next.label || tt("Alarm")} · ${untilText(next.next! - Date.now())}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.9 }}
      className="flex items-center gap-1 rounded-full border px-2 py-[2px] font-semibold"
      style={{ color: tintText(ACCENT.yellow), background: tintBg(ACCENT.yellow, 12), borderColor: tintBg(ACCENT.yellow, 32) }}
    >
      <motion.span
        className="flex"
        style={{ originY: 0.15 }}
        animate={{ rotate: [0, -14, 12, -8, 0] }}
        transition={{ duration: 0.7, delay: 0.4, repeat: Infinity, repeatDelay: 6 }}
      >
        <Bell size={10.5} strokeWidth={2.6} fill="currentColor" />
      </motion.span>
      {at.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}
    </motion.button>
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
      className="flex items-center gap-1 rounded-full px-2 py-[3px] text-[9.5px] font-bold tracking-wider"
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
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        useNook.getState().updateSettings({ soundCard: !on });
      }}
      title={on ? tt("Ses kartını kapat") : tt("Ses kartını aç")}
      className="flex h-[22px] w-[22px] items-center justify-center rounded-full transition-colors hover:bg-white/[0.08]"
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
      className="flex h-[22px] w-[22px] cursor-grab items-center justify-center rounded-full text-label-3 transition-colors hover:bg-white/[0.08] hover:text-label active:cursor-grabbing"
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
      className="-mr-1 flex h-[22px] w-[22px] items-center justify-center rounded-full text-label-3 transition-colors hover:bg-white/[0.08] hover:text-label"
    >
      <Icon size={11} strokeWidth={2.4} />
    </motion.button>
  );
}

/**
 * Ana sayfadaki Nook kartı: ortada Nook (Island çizer), altta "şu an"ın en önemli iki işi.
 * Hava ve alarm burada yok: ikisi de sağ üstte.
 */
function HomeHero() {
  const items = useActivityItems().filter((it) => it.id !== "weather" && it.id !== "alarm");
  return (
    <div className="absolute inset-0 flex flex-col p-2.5">
      <div className="flex-1" />
      <div className="flex flex-col gap-1">
        <AnimatePresence initial={false} mode="popLayout">
          {items.slice(0, 2).map((it, i) => (
            <Row key={it.id} item={it} lead={i === 0} compact={false} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Izgaradaki dar Nook kartı: kaç modül var, ana sayfaya dönüş */
function ModulesHero() {
  const hidden = useNook((s) => s.settings.homeHidden);
  const list = useAvailable();
  const shown = list.filter((m) => !hidden.includes(m.id)).length;
  return (
    <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between rounded-[11px] bg-white/[0.04] px-2.5 py-[5px] text-[10.5px]">
        <span className="text-label-3">{tt("Modüller")}</span>
        <span className="font-bold" style={{ color: tintText(ACCENT.green) }}>
          {tt("{0} aktif", shown)}
        </span>
      </div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => useNook.getState().setTab("home")}
        className="flex items-center justify-center gap-1 rounded-[11px] border py-[5px] text-[10.5px] font-semibold"
        style={{ color: tintText(ACCENT.purple), background: tintBg(ACCENT.purple, 14), borderColor: tintBg(ACCENT.purple, 36) }}
      >
        <ArrowLeft size={11} strokeWidth={2.6} />
        {tt("Sık kullanılanlar")}
      </motion.button>
    </div>
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
 * "Şu an" işleri: renkli ikon, başlık ve alt satır, sağda kısa değer, gerekirse altta ilerleme çubuğu.
 * En önemli iş en üstte. Ana sayfada Nook kartının altında, bölüm görünümünde Nook'un altında (sade).
 */
function useActivityItems(): Item[] {
  const media = useNook((s) => s.media);
  const downloads = useNook((s) => s.downloads);
  const privacy = useNook((s) => s.privacy);
  const devices = useNook((s) => s.devices);
  const weather = useNook((s) => s.weather);
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
    if (p != null && p <= 20) items.push({ id: `low-${key}`, icon: BatteryLow, title: label, sub: tt("Pil azalıyor"), value: fmtPct(p), progress: p / 100, color: ACCENT.red });
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
  return items;
}

/** Bölüm görünümünde dar Nook kartının altı: en önemli üç iş */
function Activity() {
  // Hava ve alarm sağ üstte; medyadayken çalan şarkı zaten yanda
  const tab = useNook((s) => s.tab);
  const shown = useActivityItems()
    .filter((it) => it.id !== "weather" && it.id !== "alarm" && !(tab === "media" && it.id === "music"))
    .slice(0, 3);
  return (
    <motion.div className="absolute inset-x-2 bottom-2 flex flex-col gap-1" layout transition={CARD_SPRING}>
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map((it, i) => (
          <Row key={it.id} item={it} lead={i === 0} compact />
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
