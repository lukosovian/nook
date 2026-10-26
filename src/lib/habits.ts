/**
 * Alışkanlıklar ve Sağlık Takibi (Habits & Health Tracker).
 * - Günlük su takibi (bardak sayısı, hedef, tek tıkla "+1 Bardak İçtim").
 * - Göz dinlendirme (20-20-20 kuralı), duruş/esneme ve hareket alışkanlıkları.
 * - PC ve Nook Mobil arasında iki yönlü anlık senkronizasyon.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useNook } from "../store/nook";
import { playSfx } from "./sfx";
import { tt } from "./i18n";
import { drankWater } from "../hooks/useFeatures";

export interface HabitItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  intervalMin: number;
  targetDaily: number;
  enabled: boolean;
  lastDoneAt: number;
}

export interface DayHabitStats {
  water: number; // bardak
  custom: Record<string, number>; // habitId -> count
}

interface HabitsStore {
  waterGoal: number; // Varsayılan 8 bardak (2000 ml)
  habits: HabitItem[];
  history: Record<string, DayHabitStats>; // YYYY-MM-DD -> stats
  drinkGlass: () => void;
  undoGlass: () => void;
  completeHabit: (id: string) => void;
  setWaterGoal: (goal: number) => void;
  toggleHabit: (id: string, enabled?: boolean) => void;
  setHabitInterval: (id: string, min: number) => void;
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
    lastDoneAt: 0,
  },
  {
    id: "eyes",
    title: tt("Göz Dinlendir"),
    desc: tt("20 dakikada bir 20 saniye uzağa bak"),
    icon: "👀",
    color: "#9B7BFF",
    intervalMin: 20,
    targetDaily: 12,
    enabled: true,
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
    lastDoneAt: 0,
  },
  {
    id: "walk",
    title: tt("Ayağa Kalk & Yürü"),
    desc: tt("Kısa bir tur at, bacakları esnet"),
    icon: "🚶",
    color: "#3CCF6E",
    intervalMin: 120,
    targetDaily: 3,
    enabled: false,
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
        const k = todayKey();
        const prev = get().history[k] ?? { water: 0, custom: {} };
        const newWater = prev.water + 1;

        set({
          history: {
            ...get().history,
            [k]: { ...prev, water: newWater },
          },
          habits: get().habits.map((h) => (h.id === "water" ? { ...h, lastDoneAt: Date.now() } : h)),
        });

        // Nook ana motorundaki su sayacını da senkronize et
        try {
          drankWater();
        } catch {
          // ignore
        }
        playSfx("pop", true);
      },

      undoGlass: () => {
        const k = todayKey();
        const prev = get().history[k] ?? { water: 0, custom: {} };
        if (prev.water <= 0) return;
        set({
          history: {
            ...get().history,
            [k]: { ...prev, water: Math.max(0, prev.water - 1) },
          },
        });
        playSfx("pop", true);
      },

      completeHabit: (id: string) => {
        if (id === "water") {
          get().drinkGlass();
          return;
        }
        const k = todayKey();
        const prev = get().history[k] ?? { water: 0, custom: {} };
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
    }),
    {
      name: "nook-habits",
    },
  ),
);

/** Bugün içilen su miktarı (bardak) */
export function getTodayWater(): number {
  const k = todayKey();
  const hist = useHabits.getState().history[k];
  if (hist) return hist.water;
  // Geriye dönük uyumluluk: useNook içindeki günün verisine bak
  const d = useNook.getState().days[k];
  return d?.water ?? 0;
}
