import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Lock, MonitorOff, Moon, Power, RefreshCw, RotateCcw, X, type LucideIcon } from "lucide-react";
import { power, screenshot, type Pairing, type PowerAction, type ShotTarget, type Status } from "../lib/pc";
import { Ball, errText, Sheet, TopBar, useBackButton, useToast } from "../ui";
import type { Conn } from "../App";

interface Action {
  id: PowerAction | "shot";
  label: string;
  icon: LucideIcon;
  color: string;
  /** Onay ister (geri alınamaz ya da PC'yi kullanılmaz bırakır) */
  confirm?: string;
}

const ACTIONS: Action[] = [
  { id: "shot", label: "Ekran görüntüsü", icon: Camera, color: "#3fbfa5" },
  { id: "lock", label: "Kilitle", icon: Lock, color: "#ffd23f" },
  { id: "screen-off", label: "Ekranı kapat", icon: MonitorOff, color: "#8f6bff" },
  { id: "sleep", label: "Uyku", icon: Moon, color: "#3d8bff", confirm: "PC uyku moduna alınsın mı?" },
  { id: "restart", label: "Yeniden başlat", icon: RotateCcw, color: "#f2a33a", confirm: "PC yeniden başlatılsın mı? Kaydedilmemiş işler kaybolabilir." },
  { id: "shutdown", label: "Kapat", icon: Power, color: "#f0545c", confirm: "PC kapatılsın mı? Kaydedilmemiş işler kaybolabilir." },
];

/** Bilgisayar: ekran görüntüsü, kilit, ekranı kapatma, uyku, yeniden başlatma, kapatma */
export function PcScreen({ pairing, status, conn, onBack, onOffline }: { pairing: Pairing; status: Status | null; conn: Conn; onBack: () => void; onOffline: () => void }) {
  useBackButton(onBack);
  const [toast, say] = useToast();
  const [ask, setAsk] = useState<Action | null>(null);
  const [shot, setShot] = useState<{ url: string; target?: ShotTarget } | null>(null);
  // Önizleme: ?demo=pc&pick → ekran seçimi açık
  const [pickShot, setPickShot] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).has("pick"));
  const [shooting, setShooting] = useState(false);
  const online = conn === "online";
  const monitors = status?.monitors ?? [];

  const takeShot = async (target?: ShotTarget) => {
    setPickShot(false);
    setShooting(true);
    try {
      const url = await screenshot(pairing, target);
      setShot((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { url, target };
      });
    } catch (e) {
      say(errText(e));
    } finally {
      setShooting(false);
    }
  };

  const run = async (a: Action) => {
    setAsk(null);
    if (a.id === "shot") {
      // Birden çok ekran varsa hangisi olduğunu sor
      if (monitors.length > 1) setPickShot(true);
      else void takeShot();
      return;
    }
    try {
      await power(pairing, a.id);
      say(a.id === "shutdown" ? "PC kapanıyor" : a.id === "restart" ? "PC yeniden başlıyor" : a.id === "sleep" ? "PC uyuyor" : "Tamam");
      if (a.id === "shutdown" || a.id === "sleep" || a.id === "restart") onOffline();
    } catch (e) {
      say(errText(e));
    }
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4">
      <TopBar title="Bilgisayar" nook="control" onBack={() => history.back()} />
      {!online && <p className="rounded-3xl bg-card p-4 text-[13.5px] text-label-2">PC'ye şu an ulaşılamıyor.</p>}

      <section className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map((a) => (
          <motion.button
            key={a.id}
            whileTap={{ scale: 0.95 }}
            disabled={!online || (a.id === "shot" && shooting)}
            onClick={() => (a.confirm ? setAsk(a) : void run(a))}
            className="flex items-center gap-3 rounded-3xl bg-card p-3.5 text-left disabled:opacity-40"
          >
            <Ball color={a.color} icon={a.icon} />
            <span className="text-[14px] font-medium leading-tight">{a.id === "shot" && shooting ? "Alınıyor…" : a.label}</span>
          </motion.button>
        ))}
      </section>

      <AnimatePresence>
        {ask && (
          <Sheet key="ask" onClose={() => setAsk(null)}>
            <p className="px-1 text-center text-[16px] font-semibold">{ask.confirm}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button onClick={() => setAsk(null)} className="rounded-2xl bg-well py-3.5 font-medium text-label">
                Vazgeç
              </button>
              <button onClick={() => void run(ask)} className="rounded-2xl py-3.5 font-semibold text-black" style={{ background: ask.color }}>
                {ask.label}
              </button>
            </div>
          </Sheet>
        )}
        {pickShot && (
          <Sheet key="shot" onClose={() => setPickShot(false)}>
            <p className="px-1 text-center text-[16px] font-semibold">Hangi ekran?</p>
            <ScreenPicker monitors={monitors} onPick={(t) => void takeShot(t)} />
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="safe fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex items-center gap-2 px-4 pb-2">
              {monitors.length > 1 ? (
                <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                  {[...monitors.map((_, i) => i as ShotTarget), "all" as const].map((t) => (
                    <button
                      key={t}
                      disabled={shooting}
                      onClick={() => void takeShot(t)}
                      className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium ${shot.target === t || (shot.target === undefined && t !== "all" && monitors[t]?.primary) ? "bg-blue text-white" : "bg-card text-label-2"}`}
                    >
                      {t === "all" ? "Hepsi" : `Ekran ${t + 1}`}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="flex-1 text-[14px] text-label-2">Ekran görüntüsü</span>
              )}
              <button onClick={() => void takeShot(shot.target)} disabled={shooting} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-label-2">
                <RefreshCw size={18} className={shooting ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => {
                  URL.revokeObjectURL(shot.url);
                  setShot(null);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-1 items-center overflow-auto">
              <img src={shot.url} alt="" className={`w-full transition-opacity ${shooting ? "opacity-50" : ""}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {toast}
    </div>
  );
}

/** Ekranları masadaki gibi yan yana küçük dikdörtgenler olarak gösterir; altında "Hepsi" */
function ScreenPicker({ monitors, onPick }: { monitors: NonNullable<Status["monitors"]>; onPick: (t: ShotTarget) => void }) {
  const maxW = Math.max(...monitors.map((m) => m.width));
  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <div className="flex items-end justify-center gap-3">
        {monitors.map((m, i) => (
          <motion.button key={i} whileTap={{ scale: 0.94 }} onClick={() => onPick(i)} className="flex flex-col items-center gap-1.5">
            <span
              className="flex items-center justify-center rounded-[10px] border-2 font-round text-[22px] font-extrabold"
              style={{
                width: (130 * m.width) / maxW,
                height: (130 * m.height) / maxW,
                borderColor: m.primary ? "#3d8bff" : "rgb(255 255 255 / 0.18)",
                background: m.primary ? "rgb(61 139 255 / 0.15)" : "rgb(255 255 255 / 0.05)",
                color: m.primary ? "#8ab8ff" : "#ececee",
              }}
            >
              {i + 1}
            </span>
            <span className="text-[12px] text-label-3">{m.primary ? "Ana ekran" : `${m.width}×${m.height}`}</span>
          </motion.button>
        ))}
      </div>
      <button onClick={() => onPick("all")} className="rounded-2xl bg-well py-3.5 font-medium text-label">
        Hepsi birlikte
      </button>
    </div>
  );
}
