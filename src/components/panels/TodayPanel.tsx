import { useEffect, useState, useRef } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AlarmClock, Bell, CalendarDays, Clapperboard, CloudSun, Download, Droplet, Gamepad2, Headphones, Mouse, Sparkles, Target, Tv, Umbrella, type LucideIcon } from "lucide-react";
import { calendar, dayLabel, epLabel, markNewsSeen, useArgus, weekStats } from "../../lib/argus";
import { installUpdate, useUpdate } from "../../lib/update";
import { drankWater } from "../../hooks/useFeatures";
import { generateOnce, pickQuickModel } from "../../lib/ai";
import { systemPrompt } from "../../lib/aiTools";
import { clock } from "../../lib/alarm";
import { modelsFor } from "../../hooks/useGemini";
import { startFocus } from "../../lib/focus";
import { SKY_LABEL } from "../../lib/weather";
import { dayKey, useNook } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";

const LINE_KEY = "nook-today-line";

/** Günün tek cümlelik yorumu — Gemini'den günde bir kez (anahtar yoksa yerel bir selam). */
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

/** Günün özeti: selam, hava, yeni/yaklaşan bölümler, alarmlar, bildirimler, cihaz pilleri, dün, güncelleme. */
export function TodayPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("today", scroller);
  const s = useNook();
  const line = useTodayLine();
  const now = new Date();
  const h = now.getHours();
  const greet = h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const alarms = s.alarms.filter((a) => a.enabled && a.next !== null && a.next <= endOfDay.getTime()).sort((a, b) => a.next! - b.next!);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = s.days[dayKey(y)];
  const w = s.weather;
  const argus = useArgus((st) => st.snap);

  const update = useUpdate((u) => u.available);
  const updating = useUpdate((u) => u.progress !== null);

  type Item = { icon: LucideIcon; color: string; text: string; action?: { label: string; run: () => void } };
  const items: Item[] = [];
  if (w) items.push({ icon: CloudSun, color: ACCENT.yellow, text: `${w.city ? `${w.city} ` : ""}${w.temp}° ${SKY_LABEL[w.sky].toLocaleLowerCase("tr")} · ${w.high}°/${w.low}° · yağış %${w.rainChance}` });
  if (w && w.rainChance >= 50) items.push({ icon: Umbrella, color: ACCENT.blue, text: "Bugün yağmur bekleniyor, şemsiyeni al" });

  // Argus: bugün çıkanlar tek tek, sonra önümüzdeki hafta
  const cal = calendar(argus);
  const fresh = cal.filter((e) => e.date === dayKey());
  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);
  const soon = cal.filter((e) => e.date !== dayKey() && e.date <= dayKey(weekOut)).slice(0, 4);
  for (const e of fresh)
    items.push({ icon: Clapperboard, color: ACCENT.orange, text: `Bugün yeni: ${e.item.title} ${epLabel(e.ep)}${e.ep.name ? ` · ${e.ep.name}` : ""}` });
  // Bir hafta içinde: "Yarın", gün adı ("Çarşamba"), tam bir hafta sonrası "Haftaya Cumartesi"
  const soonLabel = (date: string) => {
    if (dayLabel(date) === "Yarın") return "Yarın";
    const name = new Date(`${date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long" });
    return date === dayKey(weekOut) ? `Haftaya ${name}` : name;
  };
  for (const e of soon) items.push({ icon: CalendarDays, color: ACCENT.orange, text: `${soonLabel(e.date)}: ${e.item.title} ${epLabel(e.ep)}` });
  if (argus && !fresh.length && !soon.length) items.push({ icon: Clapperboard, color: ACCENT.orange, text: "Bu hafta takip ettiğin dizilerde yeni bölüm yok" });
  const week = weekStats(argus);
  if (week && (week.episodes || week.movies))
    items.push({ icon: Tv, color: ACCENT.orange, text: `Son 7 günde ${[week.episodes && `${week.episodes} bölüm`, week.movies && `${week.movies} film`].filter(Boolean).join(", ")} izledin` });

  items.push({
    icon: AlarmClock,
    color: ACCENT.orange,
    text: alarms.length ? `Bugün ${alarms.map((a) => `${clock(a)}${a.label ? ` ${a.label}` : ""}`).join(", ")}` : "Bugün alarm yok",
  });
  if (s.notifications.length) {
    const since = s.notifications.filter((n) => n.at > Date.now() - 12 * 3600_000).length;
    if (since) items.push({ icon: Bell, color: ACCENT.purple, text: `Gece ${since} bildirim geldi` });
  }
  if (s.devices?.headset) items.push({ icon: Headphones, color: ACCENT.blue, text: `Kulaklık %${s.devices.headset.percent}` });
  if (s.devices?.mouse) items.push({ icon: Mouse, color: ACCENT.blue, text: `Mouse %${s.devices.mouse.percent}` });
  const water = s.days[dayKey()]?.water ?? 0;
  items.push({
    icon: Droplet,
    color: ACCENT.blue,
    text: water ? `Bugün ${water} bardak su içtin` : "Bugün henüz su içmedin",
    action: { label: "İçtim", run: drankWater },
  });
  if (yesterday?.focus) items.push({ icon: Target, color: ACCENT.red, text: `Dün ${yesterday.focus} dk odaklandın (${yesterday.pomodoros} tur)` });
  if (yesterday?.game) items.push({ icon: Gamepad2, color: ACCENT.purple, text: `Dün ${yesterday.game >= 60 ? `${Math.floor(yesterday.game / 60)} sa ${yesterday.game % 60} dk` : `${yesterday.game} dk`} oyun oynadın` });
  const wd = now.getDay();
  items.push({ icon: Sparkles, color: ACCENT.yellow, text: wd === 0 || wd === 6 ? "Hafta sonu, keyfini çıkar" : wd === 5 ? "Bugün cuma, hafta sonu kapıda" : `Hafta sonuna ${6 - wd} gün` });
  // Güncelleme en üstte — gözden kaçmasın
  if (update)
    items.unshift({
      icon: Download,
      color: ACCENT.blue,
      text: updating ? "Güncelleniyor…" : `Nook'un yeni sürümü hazır: ${update}`,
      action: updating ? undefined : { label: "Güncelle", run: () => void installUpdate() },
    });

  // Bugünün bölümleri burada görüldü — ayrıca haber kartı çıkmasın
  const freshCount = fresh.length;
  useEffect(() => {
    if (freshCount) markNewsSeen();
  }, [freshCount]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium tracking-tight text-label">
            {greet}
            {s.settings.userName ? `, ${s.settings.userName}` : ""}!
          </p>
          <p className="text-[10.5px] text-label-3">{now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        {!s.focus && (
          <button
            onClick={() => {
              startFocus("work", 0);
              s.setTab("focus");
            }}
            title="Güne bir odak turuyla başla"
            className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
            style={{ background: tintBg(ACCENT.red, 14), borderColor: tintBg(ACCENT.red, 38), color: tintText(ACCENT.red) }}
          >
            <Target size={11} strokeWidth={2.5} />
            Odak turu
          </button>
        )}
      </div>
      {line !== "" && (line || s.settings.geminiKey) && (
        <p className="rounded-[12px] px-2.5 py-1.5 text-[11.5px] leading-snug" style={{ background: tintBg(ACCENT.yellow, 9), color: tintText(ACCENT.yellow) }}>
          {line ?? "…"}
        </p>
      )}
      <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-[11.5px] text-label-2">
            <it.icon size={12} strokeWidth={2.4} style={{ color: it.color }} className="shrink-0" />
            <span className="truncate">{it.text}</span>
            {it.action && (
              <button
                onClick={it.action.run}
                className="ml-auto shrink-0 rounded-full border px-2 py-px text-[10.5px] font-medium"
                style={{ background: tintBg(it.color, 14), borderColor: tintBg(it.color, 36), color: tintText(it.color) }}
              >
                {it.action.label === "Güncelle" ? "" : "+ "}{it.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
