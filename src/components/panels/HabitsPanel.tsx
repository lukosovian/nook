/**
 * Alışkanlıklar ve Sağlık Modülü (HabitsPanel).
 * - Günlük su takibi (+1 bardak, geri al, hedef) ve su hatırlatıcısı.
 * - 20-20-20 göz molası ve duruş & esneme: aç/kapa ve adada hemen başlat.
 * - Özel alışkanlıklar: hatırlatma aralığı (Kapalı = hatırlatma yok).
 * Su, göz ve esneme ayarlardan yönetilir (waterEvery, eyeBreak, stretchBreak); her satırda tek denetim var.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Check,
  Droplet,
  Dumbbell,
  Eye,
  Footprints,
  GlassWater,
  Leaf,
  PersonStanding,
  Pill,
  Play,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { BUILTIN_HABITS, useHabits, getTodayHabitCount, habitOn, type HabitItem } from "../../lib/habits";
import { triggerReminder } from "../../hooks/useFeatures";
import { tt } from "../../lib/i18n";
import { playSfx } from "../../lib/sfx";
import { dayKey, useNook } from "../../store/nook";
import { ACCENT, Dropdown, MiniNook, Segmented, tintBg, tintText, Toggle } from "../ui/primitives";

const WATER_C = "#2FD4C0";

/** Simge anahtarı → ikon (eski kayıtlardaki emoji bilinmediği için Sparkles olur) */
const HABIT_ICONS: Record<string, LucideIcon> = {
  water: Droplet,
  eye: Eye,
  stretch: PersonStanding,
  walk: Footprints,
  sparkle: Sparkles,
  pill: Pill,
  breath: Wind,
  book: BookOpen,
  sport: Dumbbell,
  sun: Sun,
  leaf: Leaf,
};
/** Yeni alışkanlıkta seçilebilenler */
const PICK = ["sparkle", "pill", "breath", "book", "sport", "sun", "leaf", "walk"];
/** Hazır kayıtların simgesi kimliğinden (eski kayıtta emoji olabilir) */
const ID_ICON: Record<string, string> = { water: "water", eyes: "eye", stretch: "stretch", walk: "walk" };
const iconOf = (h: HabitItem) => HABIT_ICONS[ID_ICON[h.id] ?? h.icon] ?? Sparkles;

const WATER = [
  { id: 0, label: tt("Kapalı") },
  { id: 45, label: tt("45 dk") },
  { id: 60, label: tt("1 sa") },
  { id: 90, label: tt("90 dk") },
];

const INTERVALS = [
  { id: 0, label: tt("Kapalı") },
  { id: 20, label: tt("20 dk") },
  { id: 30, label: tt("30 dk") },
  { id: 45, label: tt("45 dk") },
  { id: 60, label: tt("1 saat") },
  { id: 90, label: tt("1,5 saat") },
  { id: 120, label: tt("2 saat") },
];

export function HabitsPanel() {
  const habits = useHabits((s) => s.habits);
  const waterGoal = useHabits((s) => s.waterGoal);
  const { drinkGlass, undoGlass, completeHabit, updateHabit, addHabit, removeHabit } = useHabits.getState();
  const settings = useNook((s) => s.settings);
  const update = useNook((s) => s.updateSettings);
  // Bugünün sayaçları (su useNook.days'te, diğerleri useHabits.history'de) değişince yeniden çizilsin
  const todayWater = useNook((s) => s.days[dayKey()]?.water ?? 0);
  useHabits((s) => s.history);

  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState("sparkle");
  const [newInterval, setNewInterval] = useState(60);

  const startSession = (id: "eyes" | "stretch") => {
    setActiveSession(id);
    playSfx("happy", true);
    triggerReminder(id === "eyes" ? "eye" : "stretch");
    window.setTimeout(() => setActiveSession(null), 4000);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addHabit({ title: newTitle.trim(), desc: "", icon: newIcon, color: ACCENT.teal, intervalMin: newInterval, targetDaily: 1 });
    setNewTitle("");
    setShowAdd(false);
  };

  const done = todayWater >= waterGoal;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto pr-1">
      {/* Su takibi */}
      <div className="nook-card rounded-[18px] p-3">
        <div className="flex items-center gap-3">
          <MiniNook color={WATER_C} size={36} icon={Droplet} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-label">{tt("Su")}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: tintBg(WATER_C, 18), color: tintText(WATER_C) }}>
                {tt("{0} / {1} bardak", todayWater, waterGoal)}
              </span>
            </div>
            <span className="text-[11px] text-label-3">
              {done ? tt("Bugünkü hedef tamam") : tt("{0} bardak daha", waterGoal - todayWater)}
            </span>
          </div>
          {todayWater > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={undoGlass}
              className="rounded-full bg-well px-2.5 py-1 text-[10.5px] font-medium text-label-2 hover:bg-well-hi hover:text-label"
            >
              {tt("Geri al")}
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={drinkGlass}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold"
            style={{ background: tintBg(WATER_C, 24), borderColor: tintBg(WATER_C, 55), color: tintText(WATER_C) }}
          >
            <GlassWater size={13} strokeWidth={2.4} />
            {tt("İçtim")}
          </motion.button>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          {/* Bardaklar: sonuncuya basınca geri alınır, ilk boşa basınca eklenir */}
          <div className="flex min-w-0 flex-wrap items-center gap-[3px]">
            {Array.from({ length: Math.max(waterGoal, todayWater) }, (_, i) => {
              const filled = i < todayWater;
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => {
                    if (i === todayWater - 1) undoGlass();
                    else if (i === todayWater) drinkGlass();
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-md border transition-colors"
                  style={
                    filled
                      ? { background: tintBg(WATER_C, 22), borderColor: tintBg(WATER_C, 50), color: tintText(WATER_C) }
                      : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.06)", color: "rgb(255 255 255 / 0.25)" }
                  }
                >
                  <Droplet size={10} strokeWidth={2.4} fill={filled ? "currentColor" : "none"} />
                </motion.button>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[10.5px] text-label-3">{tt("Hatırlat")}</span>
            <Segmented id="habits-water" options={WATER} value={settings.waterEvery} onChange={(v) => update({ waterEvery: v })} color={WATER_C} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-[12px] font-semibold text-label">{tt("Molalar ve alışkanlıklar")}</span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 rounded-full bg-well px-2.5 py-0.5 text-[10.5px] font-medium text-label-2 hover:bg-well-hi hover:text-label"
        >
          <Plus size={11} strokeWidth={2.5} />
          {tt("Yeni")}
        </button>
      </div>

      {/* Yeni alışkanlık */}
      <AnimatePresence initial={false}>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={add}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex flex-col gap-2 rounded-[14px] bg-well p-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder={tt("Alışkanlık adı (örn: İlaç al, Nefes egzersizi)")}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-8 min-w-0 flex-1 rounded-full border border-white/10 bg-well px-3 text-[11.5px] text-label outline-none placeholder:text-label-3 focus:border-white/25"
                />
                <Dropdown options={INTERVALS} value={newInterval} onChange={setNewInterval} />
                <button type="button" onClick={() => setShowAdd(false)} className="px-1.5 text-[10.5px] text-label-3 hover:text-label">
                  {tt("Vazgeç")}
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="rounded-full border px-3 py-1 text-[11px] font-semibold disabled:opacity-35"
                  style={{ background: tintBg(ACCENT.teal, 24), borderColor: tintBg(ACCENT.teal, 55), color: tintText(ACCENT.teal) }}
                >
                  {tt("Ekle")}
                </button>
              </div>
              <div className="flex items-center gap-1">
                {PICK.map((k) => {
                  const Icon = HABIT_ICONS[k];
                  const on = newIcon === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setNewIcon(k)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
                      style={
                        on
                          ? { background: tintBg(ACCENT.teal, 24), borderColor: tintBg(ACCENT.teal, 55), color: tintText(ACCENT.teal) }
                          : { background: "transparent", borderColor: "rgb(255 255 255 / 0.06)", color: "rgb(255 255 255 / 0.45)" }
                      }
                    >
                      <Icon size={13} strokeWidth={2.3} />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-1.5">
        {habits
          .filter((h) => h.id !== "water")
          .map((h) => {
            const builtin = BUILTIN_HABITS.has(h.id);
            const on = h.id === "eyes" ? settings.eyeBreak : h.id === "stretch" ? settings.stretchBreak !== false : habitOn(h);
            const color = h.id === "eyes" ? ACCENT.purple : h.id === "stretch" ? ACCENT.pink : h.color || ACCENT.teal;
            const desc = h.id === "eyes" ? tt("20 dakikada bir 20 saniye uzağa bak") : h.id === "stretch" ? tt("90 dakikada bir dik dur, omuzlarını aç") : h.desc;
            const count = getTodayHabitCount(h.id);
            return (
              <div key={h.id} className={`flex items-center gap-2.5 rounded-[14px] bg-well px-2.5 py-2 transition-opacity ${on ? "" : "opacity-60"}`}>
                <MiniNook color={color} size={28} icon={iconOf(h)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12px] font-semibold text-label">{h.title}</span>
                    {count > 0 && (
                      <span className="shrink-0 rounded-full bg-white/10 px-1.5 text-[9.5px] font-medium text-label-2">{tt("bugün {0}", count)}</span>
                    )}
                  </div>
                  {desc && <span className="block truncate text-[10.5px] text-label-3">{desc}</span>}
                </div>

                {(h.id === "eyes" || h.id === "stretch") && (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => startSession(h.id as "eyes" | "stretch")}
                    title={tt("Adada şimdi başlat")}
                    className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2.5 text-[10.5px] font-medium text-label-2 hover:bg-white/10 hover:text-label"
                  >
                    {activeSession === h.id ? <Check size={11} strokeWidth={2.8} /> : <Play size={10} strokeWidth={2.6} fill="currentColor" />}
                    {activeSession === h.id ? tt("Başladı") : tt("Başlat")}
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => completeHabit(h.id)}
                  title={tt("Bugün için +1")}
                  className="flex h-7 shrink-0 items-center rounded-full bg-white/[0.06] px-2.5 text-[10.5px] font-medium text-label-2 hover:bg-white/10 hover:text-label"
                >
                  {tt("Yaptım")}
                </motion.button>

                {/* Tek denetim: hazır molalarda aç/kapa, kendi alışkanlıklarında aralık (Kapalı = hatırlatma yok) */}
                {builtin ? (
                  <Toggle
                    on={on}
                    onChange={(v) => update(h.id === "eyes" ? { eyeBreak: v } : { stretchBreak: v })}
                    color={color}
                  />
                ) : (
                  <Dropdown
                    options={INTERVALS}
                    value={on ? h.intervalMin : 0}
                    onChange={(v) => updateHabit(h.id, { intervalMin: v, enabled: v > 0 })}
                    maxWidth={90}
                  />
                )}
                {h.isCustom && (
                  <button
                    onClick={() => removeHabit(h.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-red-500/20 hover:text-red-400"
                    title={tt("Sil")}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
