import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Download, EyeOff, Lock, Monitor, MonitorOff, MonitorSmartphone, Moon, Plus, Power, RefreshCw, RotateCcw, Share2, Timer, Upload, X, type LucideIcon } from "lucide-react";
import { power, screenshot, sendFile, setPowerTimer, setShield, wakePc, type Pairing, type PowerAction, type PowerTimer, type ShotTarget, type Status, type TimerAction } from "../lib/pc";
import { blobBase64, native } from "../lib/native";
import { Ball, errText, Sheet, tintBg, tintText, TopBar, useBackButton, useToast } from "../ui";
import { ZoomImage } from "../Zoom";
import { SetupView } from "./Setup";
import { RemoteView } from "./Remote";
import type { Conn } from "../App";

interface Action {
  id: PowerAction | "shot" | "remote" | "shield";
  label: string;
  icon: LucideIcon;
  color: string;
  /** Onay ister (geri alınamaz ya da PC'yi kullanılmaz bırakır) */
  confirm?: string;
}

const SCREEN_OFF: Action = { id: "screen-off", label: "Ekranı kapat", icon: MonitorOff, color: "#8f6bff" };
const SCREEN_ON: Action = { id: "screen-on", label: "Ekranı aç", icon: Monitor, color: "#8f6bff" };

const ACTIONS: Action[] = [
  { id: "remote", label: "Uzaktan kontrol", icon: MonitorSmartphone, color: "#2b8cff" },
  { id: "shot", label: "Ekran görüntüsü", icon: Camera, color: "#3fbfa5" },
  { id: "lock", label: "Kilitle", icon: Lock, color: "#ffd23f" },
  { id: "shield", label: "Kalkanı aç", icon: EyeOff, color: "#9b7bff" },
  SCREEN_OFF,
  { id: "sleep", label: "Uyku", icon: Moon, color: "#3d8bff", confirm: "PC uyku moduna alınsın mı?" },
  { id: "restart", label: "Yeniden başlat", icon: RotateCcw, color: "#f2a33a", confirm: "PC yeniden başlatılsın mı? Kaydedilmemiş işler kaybolabilir." },
  { id: "shutdown", label: "Kapat", icon: Power, color: "#f0545c", confirm: "PC kapatılsın mı? Kaydedilmemiş işler kaybolabilir." },
];

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}

/** Bilgisayar: ekran görüntüsü, kilit, ekranı kapatma/açma, uyku, yeniden başlatma, kapatma; uzaktan açma rehberi */
export function PcScreen({ pairing, status, conn, onBack, onOffline }: { pairing: Pairing; status: Status | null; conn: Conn; onBack: () => void; onOffline: () => void }) {
  useBackButton(onBack);
  const [toast, say] = useToast();
  const [ask, setAsk] = useState<Action | null>(null);
  const [shot, setShot] = useState<{ url: string; blob: Blob; target?: ShotTarget } | null>(null);
  // Önizleme: ?demo=pc&pick → ekran seçimi açık
  const [pickShot, setPickShot] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).has("pick"));
  const [shooting, setShooting] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [waking, setWaking] = useState(false);
  const [remote, setRemote] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).has("rc"));
  // Ekranı kapattıktan sonra PC'nin durumu gelene kadar düğme hemen "Ekranı aç" olsun
  const [screenOff, setScreenOff] = useState<boolean | null>(null);
  useEffect(() => setScreenOff(null), [status?.screenOff]);
  const online = conn === "online";
  const monitors = status?.monitors ?? [];
  const off = screenOff ?? !!status?.screenOff;

  useEffect(() => () => void (shot && URL.revokeObjectURL(shot.url)), [shot]);

  const takeShot = async (target?: ShotTarget) => {
    setPickShot(false);
    setShooting(true);
    try {
      const blob = await screenshot(pairing, target);
      setShot({ url: URL.createObjectURL(blob), blob, target });
    } catch (e) {
      say(errText(e));
    } finally {
      setShooting(false);
    }
  };

  const run = async (a: Action) => {
    setAsk(null);
    if (a.id === "remote") {
      if (status?.control === undefined) say("Önce PC'deki Nook'u güncelle");
      else if (!status.control) say("PC'de Nook › Ayarlar › Telefon › “Telefondan uzaktan kontrol”ü aç");
      else setRemote(true);
      return;
    }
    if (a.id === "shield") {
      try {
        await setShield(pairing, !status?.shield);
        say(status?.shield ? "Kalkan kapandı" : "Kalkan açıldı: PC'nin ekranı gizli");
      } catch (e) {
        say(errText(e));
      }
      return;
    }
    if (a.id === "shot") {
      // Birden çok ekran varsa hangisi olduğunu sor
      if (monitors.length > 1) setPickShot(true);
      else void takeShot();
      return;
    }
    try {
      await power(pairing, a.id);
      say(a.id === "shutdown" ? "PC kapanıyor" : a.id === "restart" ? "PC yeniden başlıyor" : a.id === "sleep" ? "PC uyuyor" : a.id === "screen-off" ? "Ekran kapandı" : a.id === "screen-on" ? "Ekran açıldı" : "Tamam");
      if (a.id === "screen-off") setScreenOff(true);
      if (a.id === "screen-on") setScreenOff(false);
      if (a.id === "shutdown" || a.id === "sleep" || a.id === "restart") onOffline();
    } catch (e) {
      say(errText(e));
    }
  };

  const wake = async () => {
    setWaking(true);
    try {
      await wakePc(pairing, status?.mac);
      say("Uyandırma gönderildi; PC birkaç saniyede açılır");
    } catch (e) {
      say(errText(e));
    }
    window.setTimeout(() => setWaking(false), 60_000);
  };

  const name = () => `Nook ekran ${stamp()}.jpg`;
  const saveToPhone = async () => {
    if (!shot) return;
    setSaving("phone");
    try {
      if (native) {
        const err = native.saveImage(await blobBase64(shot.blob), name());
        say(err || "Galeriye kaydedildi (Resimler › Nook)");
      } else {
        const a = document.createElement("a");
        a.href = shot.url;
        a.download = name();
        a.click();
      }
    } catch (e) {
      say(errText(e));
    } finally {
      setSaving(null);
    }
  };
  const share = async () => {
    if (!shot || !native) return;
    try {
      native.shareImage(await blobBase64(shot.blob), name());
    } catch (e) {
      say(errText(e));
    }
  };
  const saveToPc = async () => {
    if (!shot) return;
    setSaving("pc");
    try {
      await sendFile(pairing, name(), new Uint8Array(await shot.blob.arrayBuffer()), "shots");
      say("PC'de Ekran görüntüleri klasörüne kaydedildi");
    } catch (e) {
      say(errText(e));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4 pb-6">
      <TopBar title="Bilgisayar" nook="control" onBack={() => history.back()} />
      {!online && (
        <div className="rounded-3xl bg-card p-4">
          <p className="text-[13.5px] text-label-2">PC'ye şu an ulaşılamıyor. Kapalıysa buradan açabilirsin.</p>
          <button
            disabled={waking || !(status?.mac || pairing.mac)}
            onClick={() => void wake()}
            className="mt-3 w-full rounded-2xl py-3.5 text-[15px] font-bold text-black disabled:opacity-50"
            style={{ background: "#8FE03A" }}
          >
            {waking ? "Açılıyor…" : "PC'yi aç"}
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map((x) => {
          const a = x.id === "screen-off" && off ? SCREEN_ON : x.id === "shield" && status?.shield ? { ...x, label: "Kalkanı kapat" } : x;
          return (
            <motion.button
              key={x.id}
              whileTap={{ scale: 0.95 }}
              disabled={!online || (a.id === "shot" && shooting)}
              onClick={() => (a.confirm ? setAsk(a) : void run(a))}
              className={`flex items-center gap-3 rounded-3xl bg-card p-3.5 text-left disabled:opacity-40 ${a.id === "remote" || a.id === "shutdown" ? "col-span-2" : ""}`}
            >
              <Ball color={a.color} icon={a.icon} />
              <span className="text-[14px] font-medium leading-tight">{a.id === "shot" && shooting ? "Alınıyor…" : a.label}</span>
            </motion.button>
          );
        })}
      </section>

      <TimerCard pairing={pairing} status={status} online={online} say={say} />

      <h2 className="-mb-2 mt-1 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Uzaktan açma ve bağlantı</h2>
      <SetupView pairing={pairing} online={online} mac={status?.mac} />

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
              <button onClick={() => setShot(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card">
                <X size={20} />
              </button>
            </div>
            <ZoomImage key={shot.url} src={shot.url} className={`min-h-0 flex-1 transition-opacity ${shooting ? "opacity-50" : ""}`} />
            <p className="py-1.5 text-center text-[11.5px] text-label-3">İki parmakla yakınlaştır · iki kez dokun</p>
            <div className="grid grid-cols-3 gap-2 px-4 pb-3">
              <ShotButton icon={Download} label={saving === "phone" ? "Kaydediliyor…" : "Telefona kaydet"} disabled={!!saving} onClick={() => void saveToPhone()} />
              <ShotButton icon={Share2} label="Paylaş" disabled={!native} onClick={() => void share()} />
              <ShotButton icon={Upload} label={saving === "pc" ? "Gönderiliyor…" : "PC'ye kaydet"} disabled={!!saving || !online} onClick={() => void saveToPc()} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{remote && <RemoteView key="rc" pairing={pairing} status={status} onClose={() => setRemote(false)} />}</AnimatePresence>
      {toast}
    </div>
  );
}

function ShotButton({ icon: Icon, label, disabled, onClick }: { icon: LucideIcon; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl bg-card py-2.5 text-[12px] font-medium text-label-2 disabled:opacity-40"
    >
      <Icon size={19} />
      {label}
    </motion.button>
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

const TIMER_ACTIONS: { id: TimerAction; label: string; icon: LucideIcon; color: string }[] = [
  { id: "shutdown", label: "Kapat", icon: Power, color: "#f0545c" },
  { id: "restart", label: "Yeniden başlat", icon: RotateCcw, color: "#f2a33a" },
  { id: "sleep", label: "Uyku", icon: Moon, color: "#3d8bff" },
];
const TIMER_PRESETS = [15, 30, 60, 90, 120, 180];
const VERB: Record<TimerAction, string> = { shutdown: "kapanacak", restart: "yeniden başlayacak", sleep: "uyuyacak" };

function leftText(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} sn`;
  const m = Math.ceil(s / 60);
  return m < 60 ? `${m} dk` : `${Math.floor(m / 60)} sa ${String(m % 60).padStart(2, "0")} dk`;
}

/**
 * Zamanlı kapatma: hazır sürelerden ya da saat seçerek PC'yi kapat / yeniden başlat / uyut. PC'deki adada
 * kurulan zamanlayıcı da burada görünür; buradan uzatılır ya da iptal edilir.
 */
function TimerCard({ pairing, status, online, say }: { pairing: Pairing; status: Status | null; online: boolean; say: (t: string) => void }) {
  // PC'nin durumu birkaç saniyede bir gelir: kurunca/iptal edince hemen görünsün
  const [local, setLocal] = useState<PowerTimer | null | undefined>(undefined);
  useEffect(() => setLocal(undefined), [status?.powerTimer?.at, status?.powerTimer === null]);
  const timer = local !== undefined ? local : (status?.powerTimer ?? null);
  const [action, setAction] = useState<TimerAction>("shutdown");
  const [clock, setClock] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  // Eski PC sürümü: zamanlayıcıyı bilmiyor
  const supported = status ? "powerTimer" in status : true;
  const set = async (at: number | null, act: TimerAction = action) => {
    try {
      const t = await setPowerTimer(pairing, at, act);
      setLocal(t);
      say(t ? `PC ${new Date(t.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}'de ${VERB[t.action]}` : "Zamanlı kapatma iptal edildi");
    } catch (e) {
      say(errText(e));
    }
  };
  const atClock = () => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(clock);
    if (!m) return;
    const d = new Date();
    d.setHours(+m[1], +m[2], 0, 0);
    if (d.getTime() <= Date.now() + 10_000) d.setDate(d.getDate() + 1);
    void set(d.getTime());
  };
  const color = TIMER_ACTIONS.find((a) => a.id === (timer?.action ?? action))!.color;
  return (
    <section className="rounded-3xl bg-card p-4">
      <div className="flex items-center gap-3">
        <Ball color={color} icon={Timer} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Zamanlı kapatma</p>
          <p className="text-[12.5px] text-label-3">
            {!supported ? "PC'deki Nook'u güncelle" : timer ? `${new Date(timer.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}'de ${VERB[timer.action]}${timer.from === "pc" ? " · PC'den kuruldu" : ""}` : "Belli bir süre sonra kapat, yeniden başlat ya da uyut"}
          </p>
        </div>
      </div>
      {supported && timer && (
        <div className="mt-3 flex items-center gap-2">
          <span className="font-round text-[30px] font-extrabold tabular-nums" style={{ color: tintText(color) }}>
            {leftText(timer.at - now)}
          </span>
          <span className="flex-1" />
          <motion.button whileTap={{ scale: 0.95 }} disabled={!online} onClick={() => void set(timer.at + 15 * 60_000, timer.action)} className="flex items-center gap-1 rounded-full bg-well px-3 py-2 text-[13px] font-semibold disabled:opacity-40">
            <Plus size={14} /> 15 dk
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} disabled={!online} onClick={() => void set(null)} className="flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-semibold text-black disabled:opacity-40" style={{ background: color }}>
            <X size={14} /> Vazgeç
          </motion.button>
        </div>
      )}
      {supported && !timer && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {TIMER_ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAction(a.id)}
                className="flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[12.5px] font-semibold"
                style={a.id === action ? { background: tintBg(a.color, 22), color: tintText(a.color) } : { background: "rgb(255 255 255 / 0.05)", color: "#8e8e93" }}
              >
                <a.icon size={14} /> {a.label}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {TIMER_PRESETS.map((m) => (
              <motion.button key={m} whileTap={{ scale: 0.95 }} disabled={!online} onClick={() => void set(Date.now() + m * 60_000)} className="rounded-2xl bg-well py-3 text-[14px] font-bold disabled:opacity-40">
                {m < 60 ? `${m} dk` : m % 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m / 60} sa`}
              </motion.button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input type="time" value={clock} onChange={(e) => setClock(e.target.value)} className="min-w-0 flex-1 rounded-2xl bg-well px-4 py-3 text-[15px] font-semibold text-label outline-none [color-scheme:dark]" />
            <motion.button whileTap={{ scale: 0.95 }} disabled={!online || !clock} onClick={atClock} className="rounded-2xl px-4 text-[14px] font-bold text-black disabled:opacity-40" style={{ background: color }}>
              Bu saatte
            </motion.button>
          </div>
        </>
      )}
    </section>
  );
}
