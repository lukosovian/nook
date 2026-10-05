/**
 * Günün özeti — büyük ada. Solda kocaman Nook, selam, günün sözü ve hava;
 * sağda dizi afişleri (bugün çıkan + bu hafta) ve mini Nook'lu küçük kartlar.
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Download, Plus, Sparkles, X, type LucideIcon } from "lucide-react";
import { drankWater } from "../../hooks/useFeatures";
import { generateOnce, pickQuickModel } from "../../lib/ai";
import { systemPrompt } from "../../lib/aiTools";
import { clock } from "../../lib/alarm";
import { calendar, epLabel, markNewsSeen, posterSrc, useArgus, weekStats, type CalendarEntry } from "../../lib/argus";
import { closeBrief } from "../../lib/brief";
import { startFocus } from "../../lib/focus";
import { BRIEF } from "../../lib/layout";
import { easeOut } from "../../lib/motion";
import { installUpdate, useUpdate } from "../../lib/update";
import { SKY_LABEL } from "../../lib/weather";
import { modelsFor } from "../../hooks/useGemini";
import { dayKey, useNook, type Tab } from "../../store/nook";
import { ACCENT, Card, MiniNook, tintBg, tintText } from "../ui/primitives";

const LINE_KEY = "nook-today-line";

/** Günün tek cümlelik yorumu — Gemini'den günde bir kez (anahtar yoksa yok). */
function useTodayLine() {
  const key = useNook((s) => s.settings.geminiKey.trim());
  const [line, setLine] = useState<string | null>(() => {
    try {
      const c = JSON.parse(localStorage.getItem(LINE_KEY) ?? "null") as { day: string; text: string } | null;
      return c?.day === dayKey() ? c.text : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (line !== null || !key) return;
    let alive = true;
    void (async () => {
      // Günde bir istek: hızlı model yerine sohbette çalışan model daha güvenilir
      const model = useNook.getState().settings.aiModel || pickQuickModel(await modelsFor(key));
      if (!model) return;
      const text = await generateOnce(
        key,
        model,
        [{ text: "Güne başlarken bana tek cümlelik, sıcak ve kısa bir günaydın mesajı ver. Hava, alarmlar ya da notum ilginçse birine değin. En fazla 18 kelime." }],
        systemPrompt(),
      );
      if (!alive || !text) return;
      setLine(text);
      try {
        localStorage.setItem(LINE_KEY, JSON.stringify({ day: dayKey(), text }));
      } catch {
        // depolama kapalı — yalnızca bu oturumda göster
      }
    })().catch((e) => {
      console.warn("[nook] günün mesajı", e);
      if (alive) setLine("");
    });
    return () => {
      alive = false;
    };
  }, [key, line]);
  return line;
}

const enter = (i: number) => ({
  initial: { opacity: 0, y: 10, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.32, ease: easeOut, delay: 0.12 + i * 0.045 },
});

const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} sa${m % 60 ? ` ${m % 60} dk` : ""}` : `${m} dk`);

export function Brief() {
  const s = useNook();
  const snap = useArgus((st) => st.snap);
  const update = useUpdate((u) => u.available);
  const progress = useUpdate((u) => u.progress);
  const line = useTodayLine();

  const now = new Date();
  const h = now.getHours();
  const greet = h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
  const w = s.weather;

  // Diziler: bugün çıkanlar önce, sonra önümüzdeki hafta
  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);
  const shows = calendar(snap).filter((e) => e.date <= dayKey(weekOut));
  const freshCount = shows.filter((e) => e.date === dayKey()).length;
  useEffect(() => {
    if (freshCount) markNewsSeen();
  }, [freshCount]);
  const week = weekStats(snap);

  const tiles = useTiles();
  const hasShows = !!snap;
  const visibleTiles = tiles.slice(0, hasShows ? 6 : 9);

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.25, ease: easeOut } }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      {/* Üst çubuk */}
      <div className="absolute inset-x-5 top-0 z-20 flex items-center justify-between" style={{ height: BRIEF.header }}>
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-label-2">
          <Sparkles size={13} strokeWidth={2.2} style={{ color: tintText(ACCENT.yellow) }} />
          Günün özeti
          <span className="text-label-3">· {now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {update && (
            <button
              onClick={() => progress === null && void installUpdate()}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium"
              style={{ background: tintBg(ACCENT.blue, 16), borderColor: tintBg(ACCENT.blue, 40), color: tintText(ACCENT.blue) }}
            >
              <Download size={12} strokeWidth={2.4} />
              {progress === null ? `Yeni sürüm ${update} · Güncelle` : `Güncelleniyor %${progress}`}
            </button>
          )}
          <button
            onClick={closeBrief}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-label-3 transition-colors hover:bg-well-hi hover:text-label"
          >
            Kapat
            <X size={12} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Kahraman kartı: Nook (adanın kendisi), selam, söz, hava */}
      <motion.div className="absolute" style={{ left: BRIEF.hero.x, top: BRIEF.hero.y, width: BRIEF.hero.w, height: BRIEF.hero.h }} {...enter(0)}>
        <Card className="relative flex h-full w-full flex-col overflow-hidden px-5 pb-4" style={{ paddingTop: 128 }}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[160px]"
            style={{ background: `radial-gradient(70% 90% at 50% 0%, ${tintBg(ACCENT.yellow, 20)} 0%, transparent 70%)` }}
          />
          <h2 className="relative text-center font-display text-[21px] font-semibold leading-tight tracking-[-0.02em] text-label">
            {greet}
            {s.settings.userName ? `, ${s.settings.userName}` : ""}!
          </h2>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-2">
            {line !== "" && (line || s.settings.geminiKey) ? (
              <p
                className="rounded-[14px] px-3 py-2 text-center text-[11.5px] leading-snug"
                style={{ background: tintBg(ACCENT.yellow, 10), color: tintText(ACCENT.yellow) }}
              >
                {line ?? "Bugünü düşünüyorum…"}
              </p>
            ) : (
              <p className="text-center text-[11.5px] leading-snug text-label-3">Bugün senin için neler var, bir bakalım</p>
            )}
          </div>

          <div className="relative shrink-0">
            {w ? (
              <div className="rounded-[16px] border px-3.5 py-2.5" style={{ background: tintBg(ACCENT.yellow, 7), borderColor: tintBg(ACCENT.yellow, 20) }}>
                <div className="flex items-end justify-between gap-2">
                  <span className="font-display text-[34px] font-semibold leading-none tracking-[-0.04em] text-label tabular-nums">{w.temp}°</span>
                  <span className="min-w-0 text-right leading-tight">
                    <span className="block text-[12px] font-medium text-label">{SKY_LABEL[w.sky]}</span>
                    <span className="block text-[10.5px] text-label-3">{w.city}</span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px] tabular-nums">
                  <Chip color={ACCENT.orange}>↑ {w.high}°</Chip>
                  <Chip color={ACCENT.teal}>↓ {w.low}°</Chip>
                  <Chip color={ACCENT.blue}>{w.rainChance >= 50 ? `Şemsiye al · %${w.rainChance}` : `Yağış %${w.rainChance}`}</Chip>
                </div>
              </div>
            ) : (
              !s.focus && (
                <button
                  onClick={() => {
                    startFocus("work", 0);
                    closeBrief();
                  }}
                  className="w-full rounded-full border py-2 text-[12px] font-medium"
                  style={{ background: tintBg(ACCENT.red, 14), borderColor: tintBg(ACCENT.red, 38), color: tintText(ACCENT.red) }}
                >
                  Güne bir odak turuyla başla
                </button>
              )
            )}
          </div>
        </Card>
      </motion.div>

      {/* İçerik: diziler + küçük kartlar */}
      <div className="absolute flex flex-col gap-2.5" style={{ left: BRIEF.content.x, top: BRIEF.content.y, width: BRIEF.content.w, height: BRIEF.content.h }}>
        {hasShows && (
          <motion.div {...enter(1)}>
            <Card className="px-3.5 pb-3 pt-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12.5px] font-medium text-label">
                  <MiniNook color={ACCENT.orange} size={22} eyes={shows.length ? "happy" : "closed"} />
                  {freshCount ? `Bugün ${freshCount} yeni bölüm` : shows.length ? "Bu hafta çıkacaklar" : "Bu hafta yeni bölüm yok"}
                </span>
                {week && (week.episodes > 0 || week.movies > 0) && (
                  <span className="text-[10.5px] text-label-3">
                    Son 7 günde {[week.episodes && `${week.episodes} bölüm`, week.movies && `${week.movies} film`].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {shows.slice(0, 4).map((e, i) => (
                  <Poster key={`${e.item.id}-${e.ep.season}-${e.ep.episode}`} e={e} i={i} />
                ))}
                {!shows.length && (
                  <p className="col-span-4 py-6 text-center text-[11.5px] text-label-3">Takip ettiğin dizilerde önümüzdeki hafta yeni bölüm görünmüyor</p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-2.5" style={{ gridAutoRows: "1fr" }}>
          {visibleTiles.map((t, i) => (
            <motion.div key={t.label} {...enter(2 + i)} className="min-h-0">
              <Tile {...t} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full px-2 py-[2px]" style={{ background: tintBg(color, 14), color: tintText(color) }}>
      {children}
    </span>
  );
}

/** Dizi afişi: üstünde gün rozeti, altında ad ve bölüm. */
function Poster({ e, i }: { e: CalendarEntry; i: number }) {
  const src = posterSrc(e.item);
  const today = e.date === dayKey();
  const d = new Date(`${e.date}T12:00:00`);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const weekday = d.toLocaleDateString("tr-TR", { weekday: "long" });
  const badge = today ? "Bugün" : e.date === dayKey(tomorrow) ? "Yarın" : e.date === dayKey(nextWeek) ? `Haftaya ${weekday}` : weekday;
  const hue = [ACCENT.orange, ACCENT.purple, ACCENT.blue, ACCENT.pink][i % 4];
  return (
    <div className="min-w-0 cursor-pointer transition-transform hover:-translate-y-0.5" role="button" title="Argus'ta aç" onClick={() => openTab("argus")}>
      <div className="relative h-[88px] overflow-hidden rounded-[12px]" style={{ background: `linear-gradient(160deg, ${tintBg(hue, 34)} 0%, ${tintBg(hue, 8)} 100%)` }}>
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MiniNook color={hue} size={34} eyes="happy" />
          </div>
        )}
        <span
          className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-px text-[9.5px] font-semibold"
          style={today ? { background: "var(--color-orange)", color: "#000" } : { background: "rgb(0 0 0 / 0.62)", color: "#ececee" }}
        >
          {badge}
        </span>
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-px text-[9.5px] font-medium tabular-nums text-label">{epLabel(e.ep)}</span>
      </div>
      <p className="mt-1.5 text-[11.5px] font-medium leading-snug text-label">{e.item.title}</p>
      <p className="text-[10px] leading-snug text-label-3">{e.ep.name || `${e.ep.season}. sezon ${e.ep.episode}. bölüm`}</p>
    </div>
  );
}

interface TileData {
  label: string;
  value: string;
  color: string;
  eyes?: "open" | "happy" | "closed" | "side";
  icon?: LucideIcon;
  /** Sağdaki + düğmesi (ör. bir bardak su) */
  action?: () => void;
  /** Karta basınca açılacak bölüm */
  open?: Tab;
}

/** Özeti kapatıp adayı o bölümle aç (imleç zaten adada — ada açık kalır) */
function openTab(tab: Tab) {
  closeBrief();
  const s = useNook.getState();
  s.setPendingTab(tab);
  s.setTab(tab);
}

function Tile({ label, value, color, eyes = "open", action, open }: TileData) {
  return (
    <div
      role={open ? "button" : undefined}
      onClick={open ? () => openTab(open) : undefined}
      className={`flex h-full min-h-0 items-center gap-2.5 rounded-[16px] border px-3 transition-[filter,transform] ${open ? "cursor-pointer hover:brightness-125 active:scale-[0.98]" : ""}`}
      style={{ background: `linear-gradient(180deg, ${tintBg(color, 11)} 0%, ${tintBg(color, 5)} 100%)`, borderColor: tintBg(color, 24) }}
    >
      <MiniNook color={color} size={30} eyes={eyes} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[10.5px] text-label-3">{label}</span>
        <span className="block text-[12.5px] font-medium leading-snug" style={{ color: tintText(color) }}>
          {value}
        </span>
      </span>
      {action && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            action();
          }}
          title="Ekle"
          className="flex size-6 shrink-0 items-center justify-center rounded-full border"
          style={{ background: tintBg(color, 18), borderColor: tintBg(color, 40), color: tintText(color) }}
        >
          <Plus size={13} strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}

/** Küçük kartlar: önemli olan önce (Argus yoksa daha çoğu görünür). */
function useTiles(): TileData[] {
  const s = useNook();
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const alarms = s.alarms.filter((a) => a.enabled && a.next !== null && a.next <= endOfDay.getTime()).sort((a, b) => a.next! - b.next!);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = s.days[dayKey(y)];
  const water = s.days[dayKey()]?.water ?? 0;
  const night = s.notifications.filter((n) => n.at > Date.now() - 12 * 3600_000).length;
  const wd = now.getDay();
  const devs = [s.devices?.headset && { name: "Kulaklık", pct: s.devices.headset.percent }, s.devices?.mouse && { name: "Mouse", pct: s.devices.mouse.percent }].filter(
    (d): d is { name: string; pct: number } => !!d,
  );
  const lowest = Math.min(s.devices?.headset?.percent ?? 100, s.devices?.mouse?.percent ?? 100);

  const tiles: TileData[] = [
    {
      label: "Alarm",
      value: alarms.length ? alarms.map((a) => `${clock(a)}${alarms.length === 1 && a.label ? ` ${a.label}` : ""}`).join(", ") : "Bugün yok",
      color: ACCENT.orange,
      eyes: alarms.length ? "open" : "closed",
      open: "alarm",
    },
    { label: "Su", value: water ? `${water} bardak içtin` : "Henüz içmedin", color: ACCENT.blue, eyes: water ? "happy" : "side", action: drankWater },
    {
      label: "Dün",
      value: [yesterday?.focus && `${mins(yesterday.focus)} odak`, yesterday?.game && `${mins(yesterday.game)} oyun`].filter(Boolean).join(" · ") || "Dinlenme günüydü",
      color: ACCENT.red,
      open: "report",
    },
    { label: "Gece", value: night ? `${night} bildirim geldi` : "Sessizdi", color: ACCENT.purple, eyes: night ? "open" : "closed", open: "notify" },
  ];
  if (devs.length) tiles.push({ label: devs.map((d) => d.name).join(" · "), value: devs.map((d) => `%${d.pct}`).join(" · "), color: lowest <= 20 ? ACCENT.red : ACCENT.teal, eyes: lowest <= 20 ? "closed" : "open", open: "devices" });
  tiles.push({
    label: "Hafta sonu",
    value: wd === 0 || wd === 6 ? "Keyfini çıkar" : wd === 5 ? "Yarın başlıyor" : `${6 - wd} gün kaldı`,
    color: ACCENT.yellow,
    eyes: wd === 0 || wd === 5 || wd === 6 ? "happy" : "open",
  });
  if (yesterday?.active) tiles.push({ label: "Dün ekranda", value: mins(yesterday.active), color: ACCENT.green, open: "report" });
  if (!s.focus) tiles.push({ label: "Pomodoro", value: "Bir tur başlat", color: ACCENT.pink, action: () => (startFocus("work", 0), closeBrief()) });
  if (yesterday?.music) tiles.push({ label: "Dün müzik", value: mins(yesterday.music), color: ACCENT.pink, eyes: "happy", open: "media" });
  return tiles;
}
