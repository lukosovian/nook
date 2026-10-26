/**
 * Alışkanlıklar ve Sağlık Takibi (Habits & Health Tracker).
 * - Günlük su takibi (bardak sayısı, hedef, tek tıkla "+1 Bardak İçtim", geri alma).
 * - Göz dinlendirme (20-20-20), duruş/esneme, yürüyüş ve kullanıcının özel alışkanlıkları.
 * - Hatırlatma aralığı belirleme, doğrudan adada canlı başlatma.
 * - PC ve Nook Mobil arasında iki yönlü anlık bildirim ve senkronizasyon.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useNook, dayKey } from "../store/nook";
import { playSfx } from "./sfx";
import { tt } from "./i18n";
import { drankWater } from "../hooks/useFeatures";

export interface HabitItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  intervalMin: number; // 0 = otomatik hatırlatma yok, >0 = dakika
  targetDaily: number;
  enabled: boolean;
  notifyOnMobile: boolean; // Telefona da bildirim fırlatılsın mı?
  lastDoneAt: number;
  isCustom?: boolean;
}

export interface DayHabitStats {
  custom: Record<string, number>; // habitId -> kaç kez yapıldı
}

interface HabitsStore {
  waterGoal: number; // Varsayılan 8 bardak (2000 ml)
  habits: HabitItem[];
  history: Record<string, DayHabitStats>; // YYYY-MM-DD -> stats
  drinkGlass: () => void;
  undoGlass: () => void;
  completeHabit: (id: string) => void;
  undoHabit: (id: string) => void;
  setWaterGoal: (goal: number) => void;
  toggleHabit: (id: string, enabled?: boolean) => void;
  setHabitInterval: (id: string, min: number) => void;
  addHabit: (item: { title: string; desc: string; icon: string; color: string; intervalMin: number; targetDaily: number; notifyOnMobile?: boolean }) => void;
  removeHabit: (id: string) => void;
  updateHabit: (id: string, patch: Partial<HabitItem>) => void;
}

export const DEFAULT_HABITS: HabitItem[] = [
  {
    id: "water",
    title: tt("Su İç"),
    desc: tt("Günde en az 8 bardak taze su"),
    icon: "💧",
    color: "#2FD4C0",
    intervalMin: 60,
    targetDaily: 8,
    enabled: true,
    notifyOnMobile: true,
    lastDoneAt: 0,
  },
  {
    id: "eyes",
    title: tt("Göz Dinlendir"),
    desc: tt("20 dakikada bir 20 saniye uzağa bak (20-20-20)"),
    icon: "👀",
    color: "#9B7BFF",
    intervalMin: 20,
    targetDaily: 12,
    enabled: true,
    notifyOnMobile: false,
    lastDoneAt: 0,
  },
  {
    id: "stretch",
    title: tt("Duruş & Esneme"),
    desc: tt("Omuzları geriye at, dik dur ve derin nefes al"),
    icon: "🧘",
    color: "#FF5C8A",
    intervalMin: 90,
    targetDaily: 4,
    enabled: true,
    notifyOnMobile: false,
    lastDoneAt: 0,
  },
  {
    id: "walk",
    title: tt("Ayağa Kalk & Yürü"),
    desc: tt("Kısa bir tur at, bacakları ve omurgayı hareket ettir"),
    icon: "🚶",
    color: "#3CCF6E",
    intervalMin: 120,
    targetDaily: 3,
    enabled: false,
    notifyOnMobile: false,
    lastDoneAt: 0,
  },
];

export const useHabits = create<HabitsStore>()(
  persist(
    (set, get) => ({
      waterGoal: 8,
      habits: DEFAULT_HABITS,
      history: {},

      drinkGlass: () => {
        // Nook'un merkezi su takip ve animasyon fonksiyonunu çağırır
        drankWater();
        set({
          habits: get().habits.map((h) => (h.id === "water" ? { ...h, lastDoneAt: Date.now() } : h)),
        });
        playSfx("pop", true);
      },

      undoGlass: () => {
        const s = useNook.getState();
        const current = getTodayWater();
        if (current <= 0) return;
        s.track({ water: -1 });
        playSfx("pop", true);
      },

      completeHabit: (id: string) => {
        if (id === "water") {
          get().drinkGlass();
          return;
        }
        const k = dayKey();
        const prev = get().history[k] ?? { custom: {} };
        const count = (prev.custom[id] ?? 0) + 1;

        set({
          history: {
            ...get().history,
            [k]: {
              ...prev,
              custom: { ...prev.custom, [id]: count },
            },
          },
          habits: get().habits.map((h) => (h.id === id ? { ...h, lastDoneAt: Date.now() } : h)),
        });
        playSfx("happy", true);
      },

      undoHabit: (id: string) => {
        if (id === "water") {
          get().undoGlass();
          return;
        }
        const k = dayKey();
        const prev = get().history[k] ?? { custom: {} };
        const current = prev.custom[id] ?? 0;
        if (current <= 0) return;
        set({
          history: {
            ...get().history,
            [k]: {
              ...prev,
              custom: { ...prev.custom, [id]: current - 1 },
            },
          },
        });
        playSfx("pop", true);
      },

      setWaterGoal: (waterGoal: number) => set({ waterGoal }),

      toggleHabit: (id: string, enabled?: boolean) => {
        set({
          habits: get().habits.map((h) => (h.id === id ? { ...h, enabled: enabled ?? !h.enabled } : h)),
        });
      },

      setHabitInterval: (id: string, intervalMin: number) => {
        set({
          habits: get().habits.map((h) => (h.id === id ? { ...h, intervalMin } : h)),
        });
      },

      addHabit: (item) => {
        const id = "custom_" + Date.now();
        const newHabit: HabitItem = {
          id,
          title: item.title,
          desc: item.desc,
          icon: item.icon || "⭐",
          color: item.color || "#2FD4C0",
          intervalMin: item.intervalMin,
          targetDaily: item.targetDaily || 1,
          enabled: true,
          notifyOnMobile: item.notifyOnMobile ?? true,
          lastDoneAt: 0,
          isCustom: true,
        };
        set({ habits: [...get().habits, newHabit] });
        playSfx("pop", true);
      },

      removeHabit: (id: string) => {
        set({ habits: get().habits.filter((h) => h.id !== id) });
        playSfx("pop", true);
      },

      updateHabit: (id: string, patch: Partial<HabitItem>) => {
        set({
          habits: get().habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        });
      },
    }),
    {
      name: "nook-habits",
    },
  ),
);

/** Bugün içilen su miktarı (bardak) — tek ve güvenilir kaynak useNook.days */
export function getTodayWater(): number {
  const k = dayKey();
  const d = useNook.getState().days[k];
  return d?.water ?? 0;
}

/** Belirli bir alışkanlığın bugün kaç kez yapıldığı */
export function getTodayHabitCount(id: string): number {
  if (id === "water") return getTodayWater();
  const k = dayKey();
  const hist = useHabits.getState().history[k];
  return hist?.custom?.[id] ?? 0;
}
