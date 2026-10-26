/**
 * Alışkanlıklar ve Sağlık Modülü (HabitsPanel).
 * - Günlük su takibi (+1 Bardak İçtim, Geri Al, hedef göstergesi).
 * - 20-20-20 Göz Molası ve Duruş & Esneme canlı başlatıcıları.
 * - Özel alışkanlık ekleme, aralık belirleme ve telefona bildirim seçeneği.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Smartphone, Check, Clock } from "lucide-react";
import { useHabits, getTodayWater, getTodayHabitCount, type HabitItem } from "../../lib/habits";
import { triggerReminder } from "../../hooks/useFeatures";
import { tt } from "../../lib/i18n";
import { playSfx } from "../../lib/sfx";

const INTERVALS = [
  { val: 0, label: tt("Kapalı") },
  { val: 20, label: tt("20 dk") },
  { val: 30, label: tt("30 dk") },
  { val: 45, label: tt("45 dk") },
  { val: 60, label: tt("1 saat") },
  { val: 90, label: tt("1,5 sa") },
  { val: 120, label: tt("2 saat") },
];

export function HabitsPanel() {
  const habits = useHabits((s) => s.habits);
  const waterGoal = useHabits((s) => s.waterGoal);
  const drinkGlass = useHabits((s) => s.drinkGlass);
  const undoGlass = useHabits((s) => s.undoGlass);
  const completeHabit = useHabits((s) => s.completeHabit);
  const updateHabit = useHabits((s) => s.updateHabit);
  const addHabit = useHabits((s) => s.addHabit);
  const removeHabit = useHabits((s) => s.removeHabit);

  const todayWater = getTodayWater();
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Yeni Alışkanlık Form Durumu
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("⭐");
  const [newInterval, setNewInterval] = useState(60);
  const [newMobile, setNewMobile] = useState(true);

  const handleStartSession = (h: HabitItem) => {
    setActiveSession(h.id);
    playSfx("happy", true);
    if (h.id === "eyes") triggerReminder("eye");
    else if (h.id === "stretch") triggerReminder("stretch");
    else if (h.id === "water") triggerReminder("water");

    window.setTimeout(() => setActiveSession(null), 4000);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addHabit({
      title: newTitle.trim(),
      desc: newDesc.trim() || tt("Günlük sağlıklı alışkanlık"),
      icon: newIcon,
      color: "#2FD4C0",
      intervalMin: newInterval,
      targetDaily: 1,
      notifyOnMobile: newMobile,
    });
    setNewTitle("");
    setNewDesc("");
    setShowAdd(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
      {/* Su Takibi Büyük Bento Kartı */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-black/40 to-black/60 p-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 text-2xl shadow-inner">
              💧
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-white">{tt("Su Takibi")}</span>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[9.5px] font-semibold text-cyan-300">
                  {todayWater * 250} / {waterGoal * 250} ml
                </span>
              </div>
              <span className="text-[11px] text-white/60">
                {todayWater >= waterGoal
                  ? tt("Tebrikler! Günlük su hedefini tamamladın 🎉")
                  : tt("Günde en az {0} bardak taze su içmelisin", waterGoal)}
              </span>
            </div>
          </div>

          {/* Düğmeler */}
          <div className="flex items-center gap-2">
            {todayWater > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={undoGlass}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10.5px] font-medium text-white/70 hover:bg-white/10 hover:text-white"
              >
                {tt("Geri al")}
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={drinkGlass}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-bold text-black shadow-lg"
              style={{ background: "#2FD4C0", boxShadow: "0 2px 12px rgba(47,212,192,0.35)" }}
            >
              <span>+1</span>
              <span>{tt("Bardak İçtim")}</span>
            </motion.button>
          </div>
        </div>

        {/* Bardak Göstergeleri */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
                className={`flex h-7 w-7 items-center justify-center rounded-xl text-[14px] transition-all ${
                  filled
                    ? "border border-cyan-400/50 bg-cyan-500/25 shadow-[0_0_10px_rgba(47,212,192,0.25)]"
                    : "border border-white/5 bg-white/5 opacity-40 hover:opacity-70"
                }`}
                title={filled ? tt("{0}. bardak içildi", i + 1) : tt("{0}. bardak", i + 1)}
              >
                {filled ? "💧" : "⚪"}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Alışkanlıklar Listesi & Ekleme */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[12px] font-bold text-white">{tt("Sağlıklı Alışkanlıklar & Molalar")}</span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Plus size={11} />
          <span>{tt("Yeni Alışkanlık")}</span>
        </button>
      </div>

      {/* Yeni Alışkanlık Formu */}
      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddHabit}
            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value.slice(0, 2))}
                className="h-8 w-10 rounded-lg border border-white/10 bg-black/40 text-center text-sm text-white outline-none"
                title={tt("Simge")}
              />
              <input
                type="text"
                placeholder={tt("Alışkanlık adı (örn: İlaç al, Nefes egzersizi)")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-8 flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white placeholder-white/30 outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-white/70">
                <Clock size={12} />
                <span>{tt("Hatırlatma:")}</span>
                <select
                  value={newInterval}
                  onChange={(e) => setNewInterval(Number(e.target.value))}
                  className="rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-xs text-white outline-none"
                >
                  {INTERVALS.map((it) => (
                    <option key={it.val} value={it.val} className="bg-neutral-900 text-white">
                      {it.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-white/70">
                <Smartphone size={12} />
                <span>{tt("Telefona bildir:")}</span>
                <input
                  type="checkbox"
                  checked={newMobile}
                  onChange={(e) => setNewMobile(e.target.checked)}
                  className="rounded accent-teal-400"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded-lg px-2.5 py-1 text-[10px] text-white/50 hover:text-white"
                >
                  {tt("Vazgeç")}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-teal-500 px-3 py-1 text-[10.5px] font-bold text-black"
                >
                  {tt("Kaydet")}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Kartlar */}
      <div className="flex flex-col gap-2">
        {habits.filter((h) => h.id !== "water").map((h) => {
          const count = getTodayHabitCount(h.id);
          const isSessionActive = activeSession === h.id;

          return (
            <div
              key={h.id}
              className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
                h.enabled
                  ? "border-white/10 bg-white/[0.03] hover:border-white/20"
                  : "border-white/5 bg-white/[0.01] opacity-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg">
                  {h.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12px] font-bold text-white">{h.title}</span>
                    {count > 0 && (
                      <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] font-semibold text-white/80">
                        {count} {tt("kez yapıldı")}
                      </span>
                    )}
                  </div>
                  <span className="block truncate text-[10px] text-white/50">{h.desc}</span>
                </div>
              </div>

              {/* Kontroller */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Aralık Seçimi */}
                <select
                  value={h.intervalMin}
                  onChange={(e) => updateHabit(h.id, { intervalMin: Number(e.target.value) })}
                  className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[10px] text-white/80 outline-none"
                  title={tt("Hatırlatma aralığı")}
                >
                  {INTERVALS.map((it) => (
                    <option key={it.val} value={it.val} className="bg-neutral-900 text-white">
                      {it.label}
                    </option>
                  ))}
                </select>

                {/* Mobil Bildirim Simgesi */}
                <button
                  type="button"
                  onClick={() => updateHabit(h.id, { notifyOnMobile: !h.notifyOnMobile })}
                  className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                    h.notifyOnMobile ? "bg-teal-500/20 text-teal-300" : "bg-white/5 text-white/30"
                  }`}
                  title={h.notifyOnMobile ? tt("Telefona bildirim gönderilir") : tt("Telefona bildirim kapalı")}
                >
                  <Smartphone size={11} />
                </button>

                {/* Başlat Düğmesi */}
                {(h.id === "eyes" || h.id === "stretch") && (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleStartSession(h)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10.5px] font-bold transition-all ${
                      isSessionActive
                        ? "bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                        : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {isSessionActive ? (
                      <>
                        <Check size={11} strokeWidth={2.8} />
                        <span>{tt("Adada Başladı!")}</span>
                      </>
                    ) : (
                      <span>{tt("Başlat ▶")}</span>
                    )}
                  </motion.button>
                )}

                {/* Tamamla Düğmesi */}
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => completeHabit(h.id)}
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/80 hover:bg-white/10 hover:text-white"
                  title={tt("Bugün için +1 tamamla")}
                >
                  <span>+1 {tt("Yaptım")}</span>
                </motion.button>

                {/* Özel ise Sil Düğmesi */}
                {h.isCustom && (
                  <button
                    onClick={() => removeHabit(h.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-white/30 hover:bg-red-500/20 hover:text-red-400"
                    title={tt("Sil")}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
