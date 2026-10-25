/**
 * Modüllerin ortak bilgisi: ad, renk, açıklama, canlı durumları ve çiplerdeki küçük Nook'ları.
 * Ana sayfanın bentosu, modül ızgarası ve Studio aynı kaynaktan okur.
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { clock } from "../../lib/alarm";
import { mmss, PHASE_LABEL, remaining } from "../../lib/focus";
import { dayKey, isLive, moduleScore, remindAt, useNook, type Tab } from "../../store/nook";
import type { ProfileDef } from "../../lib/profiles";
import { ACCENT, levelColor, MiniNook } from "../ui/primitives";
import { ARGUS_BLUE } from "../ArgusPromo";
import { epLabel, todayEpisodes, useArgus, watching } from "../../lib/argus";
import { latestNote } from "../../lib/notes";
import { CHIP_NOOKS } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { CLAUDE_COLOR, effectivePct, useClaude } from "../../lib/claude";
import { useUnifiedWaChats, useWhatsApp, WA_COLOR } from "../../lib/whatsapp";
import { isTurkish, locale, pct, tt } from "../../lib/i18n";
import { formatSize } from "../../lib/format";
import { SKY_LABEL } from "../../lib/weather";

export type Module = Exclude<Tab, "home" | "modules">;
export interface ModuleDef {
  id: Module;
  label: string;
  color: string;
  /** Ne işe yaradığı (ilk hafta açılmamış çipin alt yazısı, her zaman üstüne gelince) */
  desc: string;
}

export const MODULES: ModuleDef[] = [
  { id: "today", label: tt("Bugün"), color: ACCENT.yellow, desc: tt("Hava, alarm, günün özeti") },
  { id: "media", label: tt("Medya"), color: ACCENT.pink, desc: tt("Çalan müzik, şarkı sözleri") },
  { id: "whatsapp", label: "WhatsApp", color: WA_COLOR, desc: tt("Mesajları gör ve yanıtla") },
  { id: "hum", label: "Hum", color: ACCENT.purple, desc: tt("Çalan şarkıyı bul") },
  { id: "argus", label: "Argus", color: ARGUS_BLUE, desc: tt("Dizi ve film listen") },
  { id: "claude", label: "Claude", color: CLAUDE_COLOR, desc: tt("Claude Code oturumların") },
  { id: "focus", label: "Pomodoro", color: ACCENT.red, desc: tt("Odaklanma sayacı") },
  { id: "shelf", label: tt("Raf"), color: ACCENT.teal, desc: tt("Bana bıraktığın dosyalar") },
  { id: "clip", label: tt("Pano"), color: ACCENT.purple, desc: tt("Kopyaladıkların, çevirisi") },
  { id: "note", label: tt("Not"), color: ACCENT.orange, desc: tt("Hızlı karalama") },
  { id: "alarm", label: tt("Alarm"), color: ACCENT.yellow, desc: tt("Alarm kur, uyandır") },
  { id: "remind", label: tt("Hatırlatıcı"), color: ACCENT.orange, desc: tt("Şunu şu saatte hatırlat") },
  { id: "calendar", label: tt("Takvim"), color: ACCENT.blue, desc: tt("Etkinlikler, geri sayım") },
  { id: "apps", label: tt("Kısayollar"), color: ACCENT.blue, desc: tt("Sık açtığın uygulamalar") },
  { id: "notify", label: tt("Bildirimler"), color: ACCENT.purple, desc: tt("Windows ve telefon bildirimleri") },
  { id: "control", label: tt("Kontrol"), color: ACCENT.green, desc: tt("Wi-Fi, uygulama bazlı ses") },
  { id: "devices", label: "Lukonnect", color: ACCENT.blue, desc: tt("Mouse, kulaklık pili") },
  { id: "stats", label: tt("Sistem"), color: ACCENT.red, desc: tt("İşlemci, bellek, ağ") },
  { id: "play", label: tt("Oyun"), color: ACCENT.pink, desc: tt("Benimle mini oyunlar") },
  { id: "report", label: tt("Karne"), color: ACCENT.teal, desc: tt("Haftalık istatistik") },
  { id: "look", label: tt("Görünüm"), color: ACCENT.pink, desc: tt("Beni giydir") },
  { id: "notes", label: tt("Yama notları"), color: ACCENT.orange, desc: tt("Yeni gelenler") },
  { id: "year", label: tt("Yıl özeti"), color: ACCENT.yellow, desc: tt("Yılın nasıl geçti") },
];

export const moduleDef = (id: string) => MODULES.find((m) => m.id === id);

/** Lukonnect bu bilgisayarda hiç yoksa (ör. arkadaşının bilgisayarı) Cihazlar bölümü gizlenir. */
export const hasLukonnect = (d: ReturnType<typeof useNook.getState>["devices"]) => !!(d && (d.lukonnect || d.mouse || d.headset || d.fan));

/** Çipin hâli: meşgul (parlar), uyarı, sıradan, boş (soluk) */
export type ChipState = "active" | "alert" | "idle" | "empty";
export interface Status {
  text: string;
  state?: ChipState;
  soon?: boolean;
  /** Kartın sağ üstündeki kısa değer (%37, 3, 14:05) */
  value?: string;
  /** Kartın altındaki çubuk (0–1) */
  progress?: number;
  /** Kartın alt satırı: solda açıklama, sağda kısa bilgi */
  foot?: [string, string?];
}

/** Kullanıcının dizdiği sıra; listede olmayan (yeni) bölümler sona eklenir */
export function ordered(order: string[]) {
  const pos = new Map(order.map((id, i) => [id, i]));
  return [...MODULES].sort((a, b) => (pos.get(a.id) ?? 1000 + MODULES.indexOf(a)) - (pos.get(b.id) ?? 1000 + MODULES.indexOf(b)));
}

export function byProfile<T extends { id: Tab }>(list: T[], p: ProfileDef | undefined) {
  if (!p || p.id === "all") return list;
  // Boş "yalnızca" profil: hiçbir bölüm seçilmemiş, hepsi görünsün (boş ekran kalmasın)
  if (!p.ids.length) return list;
  const front = p.ids.flatMap((id) => list.filter((m) => m.id === id));
  return p.only ? front : [...front, ...list.filter((m) => !p.ids.includes(m.id))];
}

/** Bu bilgisayarda kullanılabilen bölümler (Lukonnect, Argus, Claude Code yoksa onlar düşer), kullanıcının sırasıyla */
export function useAvailable(draft?: string[] | null) {
  const lukonnect = useNook((s) => hasLukonnect(s.devices));
  const argus = useArgus((s) => !!s.snap);
  // Claude Code olmayan bilgisayarda gizli
  const claude = useClaude((s) => !!s.setup?.present);
  // Argus yalnızca Türkçe: başka dilde kurulu değilse tanıtımı da gösterilmez
  const promo = useNook((s) => s.settings.argusPromo) && isTurkish;
  const order = useNook((s) => s.settings.homeOrder);
  return ordered(draft ?? order).filter((m) => (m.id !== "devices" || lukonnect) && (m.id !== "argus" || argus || promo) && (m.id !== "claude" || claude));
}

/** Nook'un kullanıldığı ilk bu kadar gün "yeni gelen" sayılır */
export const NEWCOMER_DAYS = 7;

/**
 * İlk hafta (Nook'un kullanıldığı ilk 7 gün): henüz açılmamış bölümün çipinde canlı bilgi yerine ne işe
 * yaradığı yazar; bir kez açılınca normale döner. Yeni gelen "Hum ne, Argus ne?" diye kalmasın.
 */
export function useExplain(id: string) {
  return useNook((s) => Object.keys(s.days).length <= NEWCOMER_DAYS && !s.moduleUse[id]);
}

/** En çok açılanlar önde; eşit puanda (hiç açılmamışlar) kullanıcının dizdiği sıra */
export function byUse<T extends { id: string }>(list: T[], use: Record<string, { score: number; at: number }>, newcomer: boolean) {
  if (newcomer) return list;
  const now = Date.now();
  const score = (id: string) => (use[id] ? moduleScore(use[id], now) : 0);
  return list
    .map((m, i) => ({ m, i, sc: score(m.id) }))
    .sort((a, b) => b.sc - a.sc || a.i - b.i)
    .map((x) => x.m);
}

/** Bölümü aç (kullanım sayılır) */
export function openModule(id: Tab) {
  const s = useNook.getState();
  s.noteModuleUse(id);
  s.setTab(id);
}

/** Meşgul bölüm kendi renginde yavaşça "nefes alır" */
export function Breath({ color, alert, radius = 9999 }: { color: string; alert: boolean; radius?: number }) {
  return (
    <motion.span
      className="pointer-events-none absolute inset-0"
      style={{ borderRadius: radius, boxShadow: `0 0 16px -3px ${color}, inset 0 0 8px -4px ${color}` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.25, 1, 0.25] }}
      transition={{ duration: alert ? 1.2 : 2.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/**
 * Çipin Nook'u: bölümüne göre giyinmiş küçük 3B Nook. Hâline göre kıpırdar: meşgulse ritimle sallanır,
 * alarm yaklaşınca zıplar, boştayken ara sıra göz kırpar, boşsa uykulu bakar.
 */
export function ChipNook({ id, color, state, soon, size = 22 }: { id: string; color: string; state: ChipState; soon: boolean; size?: number }) {
  const c = CHIP_NOOKS[id];
  const blink = useRandomBlink(state !== "active");
  const box = size + 4;
  if (!c) return <MiniNook color={color} size={size + 2} eyes={state === "alert" ? "closed" : "open"} />;
  const expression = blink ? "sleepy" : state === "empty" ? "drowsy" : state === "active" ? (id === "focus" ? "focused" : "happy") : state === "alert" ? "surprised" : "idle";
  const hop = size / 5.5;
  const motionFor =
    soon || state === "alert"
      ? { animate: { y: [0, -hop, 0, -hop / 2, 0] }, transition: { duration: 0.7, repeat: Infinity, repeatDelay: 1.1, ease: "easeOut" as const } }
      : state === "active"
        ? { animate: { y: [0, -hop / 2.5, 0], rotate: [-5, 5, -5] }, transition: { duration: id === "media" ? 0.9 : 2.2, repeat: Infinity, ease: "easeInOut" as const } }
        : { animate: { y: 0, rotate: 0 }, transition: { duration: 0.3 } };
  return (
    <motion.span className="relative flex shrink-0 items-center justify-center" style={{ width: box, height: box }} {...motionFor}>
      <NookFigure look={c.look} color={c.color} size={size} expression={expression} />
    </motion.span>
  );
}

/** Rastgele aralıklarla bir an göz kırpar (çiplerin hepsi aynı anda kırpmasın) */
function useRandomBlink(on: boolean) {
  const [shut, setShut] = useState(false);
  useEffect(() => {
    if (!on) return;
    let t = 0;
    const loop = () => {
      t = window.setTimeout(() => {
        setShut(true);
        t = window.setTimeout(() => {
          setShut(false);
          loop();
        }, 160);
      }, 4000 + Math.random() * 9000);
    };
    loop();
    return () => window.clearTimeout(t);
  }, [on]);
  return on && shut;
}

/** Çiplerin ve kartların canlı bilgisi, hâli ve (bentodaki büyük kartlar için) değeri ve çubuğu. */
export function useModuleStatus(): Partial<Record<Module, Status>> {
  const media = useNook((s) => s.media);
  const shelf = useNook((s) => s.shelf);
  const clips = useNook((s) => s.clips);
  const note = useNook((s) => s.note);
  const alarms = useNook((s) => s.alarms);
  const ringing = useNook((s) => !!s.ringing);
  const devices = useNook((s) => s.devices);
  const stats = useNook((s) => s.stats);
  const focus = useNook((s) => s.focus);
  const apps = useNook((s) => s.pinnedApps.length + (s.deck?.length ?? 4));
  const notifs = useNook((s) => s.notifications);
  const active = useNook((s) => s.days[dayKey()]?.active ?? 0);
  const argusSnap = useArgus((s) => s.snap);
  const events = useNook((s) => s.events);
  const live = useNook(isLive);
  const claudeSessions = useClaude((s) => s.sessions);
  const claudeAsks = useClaude((s) => s.asks.length);
  const claudePlan = useClaude((s) => s.plan);
  const claudeHooked = useClaude((s) => !!s.setup?.hooked);
  const waWebStatus = useWhatsApp((s) => s.web.status);
  const waChats = useUnifiedWaChats();
  const lastHum = useNook((s) => s.hums[0]);
  const humCount = useNook((s) => s.hums.length);
  const humListening = useNook((s) => s.hum?.phase === "listening");
  const humAuto = useNook((s) => s.settings.humAuto);
  const weather = useNook((s) => s.weather);
  const newToday = todayEpisodes(argusSnap);
  const watchingList = watching(argusSnap);
  // Pomodoro ve alarm yakınlığı canlı aksın
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const next = alarms.filter((a) => a.enabled && a.next).sort((a, b) => a.next! - b.next!)[0];
  const alarmSoon = !!next && next.next! - now < 10 * 60_000;
  const batteries = [devices?.headset?.percent, devices?.mouse?.percent].filter((p): p is number => p != null);
  const lowest = batteries.length ? Math.min(...batteries) : null;
  const running = !!focus && focus.endsAt !== null;
  const clockNow = new Date(now).toTimeString().slice(0, 5);
  const cpu = stats?.cpu;
  const pos = media ? Math.min(media.durationMs || Infinity, media.positionMs + (media.playing ? performance.now() - media.at : 0)) : 0;

  return {
    media: {
      text: media ? (media.playing ? media.title : tt("Duraklatıldı")) : tt("Sessiz"),
      state: media?.playing ? "active" : media ? "idle" : "empty",
      progress: media?.durationMs ? pos / media.durationMs : undefined,
      foot: media ? [media.artist || media.app.replace(/\.exe$/i, ""), media.durationMs ? `${mmss(pos)} / ${mmss(media.durationMs)}` : undefined] : [tt("Bir şey çalınca burada")],
    },
    whatsapp: (() => {
      const unread = waChats.reduce((sum, c) => sum + c.unread, 0);
      const top = waChats[0];
      if (!top) {
        return {
          text: waWebStatus === "ready" ? tt("Sohbetler hazır") : tt("Mesajlar"),
          state: waWebStatus === "ready" ? ("idle" as const) : ("empty" as const),
          foot: [waWebStatus === "ready" ? tt("WhatsApp Web bağlı") : tt("Bildirimden ya da Web'den yanıtla")] as [string],
        };
      }
      return {
        text: live ? tt("Gizli") : unread > 0 ? tt("{0} okunmamış", unread) : `${top.title} · ${top.lastText || tt("Sohbet")}`,
        state: unread > 0 ? ("active" as const) : ("idle" as const),
        value: unread > 0 ? String(unread) : String(waChats.length),
        foot: [live ? tt("Gizli") : `${top.title}: ${top.lastText || ""}`, top.time || undefined] as [string, string?],
      };
    })(),
    shelf: {
      text: shelf.length ? tt("{0} öğe", shelf.length) : tt("Boş"),
      state: shelf.length ? "idle" : "empty",
      value: shelf.length ? String(shelf.length) : undefined,
      foot: shelf.length ? [shelf[0].name, formatSize(shelf.reduce((a, x) => a + x.size, 0))] : [tt("Dosyayı adaya sürükle")],
    },
    clip: {
      text: clips.length ? tt("{0} kayıt", clips.length) : tt("Boş"),
      state: clips.length ? "idle" : "empty",
      value: clips.length ? String(clips.length) : undefined,
      foot: clips.length ? [live ? tt("Gizli") : clips[0].text.split("\n")[0]] : [tt("Kopyaladıkların burada")],
    },
    note: { text: live && note ? tt("Gizli") : note ? note.split("\n")[0] : tt("Boş"), state: note ? "idle" : "empty", foot: [note ? tt("{0} satır", note.split("\n").length) : tt("Aklına geleni yaz")] },
    remind: (() => {
      const pending = events.filter((e) => e.alarmId && alarms.some((a) => a.id === e.alarmId && a.enabled)).map((e) => ({ e, at: remindAt(e) ?? 0 })).sort((a, b) => a.at - b.at);
      const first = pending[0];
      if (!first) return { text: tt("Boş"), state: "empty" as const, foot: [tt("Hatırlatma kur")] as [string] };
      const hm = new Date(first.at).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
      const soon = first.at - now < 10 * 60_000;
      return {
        text: live ? `${hm} · ${tt("Gizli")}` : `${hm} · ${first.e.title}`,
        state: soon ? ("active" as const) : ("idle" as const),
        soon,
        value: String(pending.length),
        foot: [live ? tt("Gizli") : first.e.title, untilShort(first.at - now)] as [string, string],
      };
    })(),
    calendar: (() => {
      const today = dayKey();
      const upcoming = events.filter((e) => !e.reminder).filter((e) => e.day > today || (e.day === today && (!e.time || e.time >= clockNow)));
      const todays = events.filter((e) => e.day === today && !e.reminder).length;
      const first = upcoming[0];
      if (!first) return { text: tt("Boş"), state: "empty" as const, foot: [tt("Etkinlik yok")] as [string] };
      const when = first.day === today ? first.time || tt("Bugün") : new Date(first.day + "T00:00").toLocaleDateString(locale(), { day: "numeric", month: "short" });
      return {
        text: live ? `${when} · ${tt("Gizli")}` : `${when} · ${first.title}`,
        state: first.day === today ? ("active" as const) : ("idle" as const),
        value: todays ? String(todays) : undefined,
        foot: [live ? tt("Gizli") : first.title, when] as [string, string],
      };
    })(),
    alarm: {
      text: next ? `${clock(next)}${next.label ? ` · ${next.label}` : ""}` : tt("Kurulu değil"),
      state: ringing ? "alert" : alarmSoon ? "active" : next ? "idle" : "empty",
      soon: alarmSoon || ringing,
      value: next ? clock(next) : undefined,
      foot: next ? [next.label || tt("Alarm"), untilShort(next.next! - now)] : [tt("Alarm kur")],
    },
    devices: {
      text: lowest !== null ? tt("En düşük %{0}", lowest) : tt("Bilgi yok"),
      state: lowest !== null && lowest <= 15 ? "alert" : lowest === null ? "empty" : "idle",
      value: lowest !== null ? pct(lowest) : undefined,
      progress: lowest !== null ? lowest / 100 : undefined,
      foot: [
        [devices?.mouse && tt("Mouse"), devices?.headset && tt("Kulaklık")].filter(Boolean).join(" & ") || tt("Cihaz yok"),
        lowest === null ? undefined : lowest <= 20 ? tt("Şarj et") : tt("Pil iyi"),
      ],
    },
    control: { text: tt("Wi-Fi, ses, mikrofon"), foot: [tt("Ses ve bağlantılar")] },
    stats: {
      text: cpu != null ? tt("İşlemci %{0}", Math.round(cpu)) : tt("Ölçülüyor"),
      state: cpu != null && levelColor(cpu, true) === ACCENT.red ? "alert" : "idle",
      value: cpu != null ? pct(Math.round(cpu)) : undefined,
      progress: cpu != null ? cpu / 100 : undefined,
      foot: stats ? [tt("Bellek"), `${formatSize(stats.memUsed)} / ${formatSize(stats.memTotal)}`] : [tt("Ölçülüyor")],
    },
    focus: {
      text: focus ? `${PHASE_LABEL[focus.phase]} · ${mmss(remaining(focus, now))}` : tt("Başlat"),
      state: running ? "active" : "idle",
      value: focus ? mmss(remaining(focus, now)) : undefined,
      progress: focus ? 1 - remaining(focus, now) / focus.total : undefined,
      foot: focus ? [PHASE_LABEL[focus.phase], tt("{0}. tur", focus.round + 1)] : [tt("25 dk odaklan")],
    },
    apps: { text: apps ? tt("{0} kısayol", apps) : tt("Ekle"), state: apps ? "idle" : "empty", value: apps ? String(apps) : undefined, foot: [apps ? tt("{0} kısayol", apps) : tt("Uygulama ekle")] },
    notify: {
      text: notifs.length ? tt("{0} bildirim", notifs.length) : tt("Sessiz"),
      state: notifs.length ? "idle" : "empty",
      value: notifs.length ? String(notifs.length) : undefined,
      foot: notifs.length ? [live ? tt("Gizli") : `${notifs[0].app} · ${notifs[0].title}`] : [tt("Yeni bildirim yok")],
    },
    play: { text: tt("{0} mini oyun", 6), foot: [tt("Benimle oyna")] },
    notes: { text: `${latestNote().version} · ${latestNote().headline}`, value: latestNote().version },
    look: { text: tt("Kostüm, renk, şapka") },
    report: { text: active ? tt("Bugün {0}", active >= 60 ? tt("{0} sa {1} dk", Math.floor(active / 60), active % 60) : tt("{0} dk", active)) : tt("Bu hafta") },
    argus: {
      text: !argusSnap
        ? tt("Keşfet")
        : newToday.length
          ? tt("Bugün {0} {1}", newToday[0].item.title, epLabel(newToday[0].ep))
          : watchingList.length
            ? tt("{0} dizi izliyorsun", watchingList.length)
            : tt("Ne izlesem?"),
      state: newToday.length ? "active" : "idle",
      value: newToday.length ? String(newToday.length) : watchingList.length ? String(watchingList.length) : undefined,
      foot: argusSnap ? [newToday.length ? tt("Bugün yeni bölüm") : tt("İzlediğin diziler"), watchingList.length ? tt("{0} dizi", watchingList.length) : undefined] : [tt("Dizi ve film listen")],
    },
    claude: (() => {
      const list = Object.values(claudeSessions).sort((a, b) => b.updatedAt - a.updatedAt);
      const working = list.find((s) => s.state === "working");
      const five = claudePlan?.fiveHour;
      const used = five ? effectivePct(five, now) : null;
      const base = {
        value: used != null ? pct(Math.round(used)) : undefined,
        progress: used != null ? used / 100 : undefined,
        foot: [tt("5 saatlik limit"), five && five.resetsAt > now && used ? tt("{0} yenilenir", untilShort(five.resetsAt - now)) : used === 0 ? tt("Tamamen boş") : undefined] as [string, string?],
      };
      if (!claudeHooked) return { text: tt("Bağla"), state: "empty" as const, foot: [tt("Claude Code'u bağla")] as [string] };
      if (claudeAsks) return { ...base, text: tt("Onay bekliyor"), state: "alert" as const };
      if (working) return { ...base, text: live ? tt("Çalışıyor") : `${working.project} · ${working.action}`, state: "active" as const };
      return { ...base, text: list.length ? tt("{0} oturum", list.length) : tt("Hazır"), state: "idle" as const };
    })(),
    today: (() => {
      // Günün özeti: tarih, hava, sıradaki etkinlik; çubuk günün ne kadarının geçtiği
      const d = new Date(now);
      const mins = d.getHours() * 60 + d.getMinutes();
      const todays = events.filter((e) => e.day === dayKey() && (!e.time || e.time >= clockNow));
      return {
        text: weather ? `${d.toLocaleDateString(locale(), { day: "numeric", month: "long", weekday: "short" })} · ${SKY_LABEL[weather.sky]}` : d.toLocaleDateString(locale(), { day: "numeric", month: "long", weekday: "short" }),
        value: weather ? `${weather.temp}°` : undefined,
        progress: mins / 1440,
        foot: [todays[0] ? `${todays[0].time || tt("Bugün")} · ${live ? tt("Gizli") : todays[0].title}` : weather ? `${weather.city} · ${weather.high}° / ${weather.low}°` : tt("Günün özeti"), tt("Gün {0}", pct(Math.round((mins / 1440) * 100)))],
      };
    })(),
    hum: {
      text: humListening ? tt("Dinliyor…") : lastHum ? `${lastHum.artist} · ${lastHum.title}` : humAuto ? tt("Arkada dinliyor") : tt("Çalan şarkıyı bul"),
      state: humListening ? "active" : lastHum || humAuto ? "idle" : "empty",
      value: humCount ? String(humCount) : undefined,
      foot: lastHum ? [lastHum.title, lastHum.artist] : [tt("Ctrl+Alt+M ile dinlet")],
    },
  };
}

/** "3 sa sonra", "12 dk sonra" */
function untilShort(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return tt("{0} dk sonra", m);
  return tt("{0} sa sonra", Math.round(m / 60));
}
