import { useEffect, useState } from "react";
import { AlarmClock, Bell, Clapperboard, CloudSun, Headphones, Mouse, Target, type LucideIcon } from "lucide-react";
import { calendar, dayLabel, epLabel, useArgus } from "../../lib/argus";
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

/** Günün özeti: selam, hava, bugünkü alarmlar, bildirimler, cihaz pilleri, dünkü odak. */
export function TodayPanel() {
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

  const items: { icon: LucideIcon; color: string; text: string }[] = [];
  if (w) items.push({ icon: CloudSun, color: ACCENT.yellow, text: `${w.temp}° ${SKY_LABEL[w.sky].toLocaleLowerCase("tr")} · ${w.high}°/${w.low}° · yağış %${w.rainChance}` });
  items.push({
    icon: AlarmClock,
    color: ACCENT.orange,
    text: alarms.length ? `Bugün ${alarms.map((a) => `${clock(a)}${a.label ? ` ${a.label}` : ""}`).join(", ")}` : "Bugün alarm yok",
  });
  const shows = calendar(argus).slice(0, 3);
  if (shows.length) {
    const first = shows[0].date;
    const same = shows.filter((e) => e.date === first);
    items.push({
      icon: Clapperboard,
      color: ACCENT.orange,
      text: `${dayLabel(first)} yeni bölüm: ${same.map((e) => `${e.item.title} ${epLabel(e.ep)}`).join(", ")}`,
    });
  }
  if (s.notifications.length) {
    const since = s.notifications.filter((n) => n.at > Date.now() - 12 * 3600_000).length;
    if (since) items.push({ icon: Bell, color: ACCENT.purple, text: `Gece ${since} bildirim geldi` });
  }
  if (s.devices?.headset) items.push({ icon: Headphones, color: ACCENT.blue, text: `Kulaklık %${s.devices.headset.percent}` });
  if (s.devices?.mouse) items.push({ icon: Mouse, color: ACCENT.blue, text: `Mouse %${s.devices.mouse.percent}` });
  if (yesterday?.focus) items.push({ icon: Target, color: ACCENT.red, text: `Dün ${yesterday.focus} dk odaklandın (${yesterday.pomodoros} tur)` });

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
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-[11.5px] text-label-2">
            <it.icon size={12} strokeWidth={2.4} style={{ color: it.color }} className="shrink-0" />
            <span className="truncate">{it.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
