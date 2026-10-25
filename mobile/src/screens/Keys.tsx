import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AppWindow, ArrowRight, Play, Zap } from "lucide-react";
import { DECK_ICONS } from "@nook/lib/deckIcons";
import { cached, getDeck, runPcAuto, runPcKey, setPcAuto, type Pairing, type PcAuto, type PcDeck, type PcKey } from "../lib/pc";
import { errText, tintBg, tintText, TopBar, useBackButton, useToast } from "../ui";
import type { Conn } from "../App";

const BLUE = "#2B8CFF";

/** PC'deki kısayollar: tuşlar ve otomasyonlar (beş saniyede bir tazelenir; PC kapalıyken son görülen) */
export function useDeck(pairing: Pairing, online: boolean) {
  const [deck, setDeck] = useState<PcDeck | null>(() => cached<PcDeck>("deck"));
  useEffect(() => {
    if (!online) return;
    let alive = true;
    const load = () =>
      getDeck(pairing)
        .then((d) => alive && setDeck(d))
        .catch(() => {});
    void load();
    const t = window.setInterval(load, 5000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [pairing, online]);
  return [deck, setDeck] as const;
}

/**
 * Kısayollar: PC'deki tuşlar (dokun, PC'de çalışsın; kapatma/uyku ikinci dokunuşta) ve otomasyonlar
 * (dokunup istediğin zaman çalıştır ya da sağdaki anahtarla otomatik tetiklenmesini aç/kapa).
 * Tuşlar ve otomasyonlar PC'de, Nook Studio › Kısayollar'da kurulur.
 */
export function KeysScreen({ pairing, conn, onBack }: { pairing: Pairing; conn: Conn; onBack: () => void }) {
  useBackButton(onBack);
  const online = conn === "online";
  const [toast, say] = useToast();
  const [deck, setDeck] = useDeck(pairing, online);
  const [runningId, setRunningId] = useState<string | null>(null);

  const toggle = async (a: PcAuto) => {
    setDeck((d) => d && { ...d, autos: d.autos.map((x) => (x.id === a.id ? { ...x, on: !a.on } : x)) });
    try {
      await setPcAuto(pairing, a.id, !a.on);
    } catch (e) {
      say(errText(e));
    }
  };

  const runAuto = async (a: PcAuto) => {
    if (!online) return say("PC açılınca");
    setRunningId(a.id);
    window.setTimeout(() => setRunningId((cur) => (cur === a.id ? null : cur)), 700);
    try {
      await runPcAuto(pairing, a.id);
      say(`Çalıştırıldı: ${a.label}`);
    } catch (e) {
      say(errText(e));
    }
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4 pb-6">
      <TopBar title="Kısayollar" nook="apps" onBack={() => history.back()} />
      <p className="-mt-1 px-1 text-[13px] leading-snug text-label-3">Dokun, PC'de çalışsın. Tuşları ve otomasyonları PC'de Nook Studio › Kısayollar'dan kurarsın.</p>

      {deck && !deck.keys.length && <p className="px-1 text-[14px] text-label-2">PC'de hiç tuş yok.</p>}
      <section className="grid grid-cols-3 gap-2.5">
        {(deck?.keys ?? []).map((k) => (
          <KeyButton
            key={k.id}
            k={k}
            pairing={pairing}
            online={online}
            say={say}
            onRan={() => {
              window.setTimeout(() => {
                void getDeck(pairing).then(setDeck).catch(() => {});
              }, 350);
            }}
          />
        ))}
      </section>

      {!!deck?.autos.length && (
        <>
          <div className="-mb-1 mt-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Otomasyonlar</h2>
            <span className="text-[11px] text-label-3">Dokun: şimdi çalıştır · Anahtar: otomatik</span>
          </div>
          <section className="flex flex-col gap-2">
            {deck.autos.map((a) => {
              const Icon = DECK_ICONS[a.icon] ?? Zap;
              const hit = runningId === a.id;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-3xl border p-3 transition-colors ${a.on ? "" : "opacity-75"}`}
                  style={{
                    background: hit ? tintBg(a.color, 22) : "var(--color-card)",
                    borderColor: hit ? tintBg(a.color, 55) : "rgb(255 255 255 / 0.05)",
                  }}
                >
                  <button
                    type="button"
                    disabled={!online || a.steps === 0}
                    onClick={() => void runAuto(a)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: tintBg(a.color, 20), color: tintText(a.color) }}>
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{a.label}</span>
                      <span className="flex items-center gap-1 truncate text-[12.5px] text-label-3">
                        <span style={{ color: tintText(a.color) }}>{a.when}</span>
                        <ArrowRight size={11} className="shrink-0" />
                        {a.steps} adım
                      </span>
                    </span>
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    disabled={!online || a.steps === 0}
                    onClick={() => void runAuto(a)}
                    aria-label={`${a.label} çalıştır`}
                    title="Şimdi çalıştır"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border disabled:opacity-40"
                    style={{
                      background: tintBg(a.color, hit ? 34 : 16),
                      borderColor: tintBg(a.color, 42),
                      color: tintText(a.color),
                    }}
                  >
                    <Play size={14} fill="currentColor" />
                  </motion.button>
                  <Switch on={a.on} color={a.color} disabled={!online} onChange={() => void toggle(a)} />
                </div>
              );
            })}
          </section>
        </>
      )}
      {toast}
    </div>
  );
}

function Switch({ on, color, disabled, onChange }: { on: boolean; color: string; disabled: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-40 ${on ? "justify-end" : "justify-start"}`}
      style={{ background: on ? color : "rgb(255 255 255 / 0.1)" }}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 700, damping: 34 }} className="h-5 w-5 rounded-full bg-white" />
    </button>
  );
}

/** Basılabilir tuş: rengine boyanmış kart; uygulama tuşu kendi simgesiyle. `small`: ana ekrandaki sıra */
export function KeyButton({
  k,
  pairing,
  online,
  say,
  small,
  onRan,
}: {
  k: PcKey;
  pairing: Pairing;
  online: boolean;
  say: (m: string) => void;
  small?: boolean;
  onRan?: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [hit, setHit] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  const app = k.icon === "app" && k.steps === 1;
  const color = armed ? "#f0545c" : app ? BLUE : k.color;
  const Icon = DECK_ICONS[k.icon] ?? Zap;
  const press = async () => {
    if (!online) return say("PC açılınca");
    if (k.danger && !armed) return setArmed(true);
    setArmed(false);
    setHit(true);
    window.setTimeout(() => setHit(false), 500);
    try {
      await runPcKey(pairing, k.id);
      onRan?.();
    } catch (e) {
      say(errText(e));
    }
  };
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={() => void press()}
      className={`relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-3xl border ${small ? "h-[74px] px-1" : "h-[92px] px-2"} ${online ? "" : "opacity-50"}`}
      style={{ background: hit ? tintBg(color, 30) : tintBg(color, 12), borderColor: tintBg(color, armed ? 70 : 32), transition: "background 0.3s" }}
    >
      <span className={`flex items-center justify-center rounded-2xl ${small ? "h-8 w-8" : "h-10 w-10"}`} style={k.appIcon ? undefined : { background: tintBg(color, 22), color: tintText(color) }}>
        {k.appIcon ? <img src={k.appIcon} alt="" className={small ? "h-7 w-7" : "h-8 w-8"} /> : app ? <AppWindow size={small ? 16 : 19} /> : <Icon size={small ? 16 : 19} strokeWidth={2.3} />}
      </span>
      <span className={`w-full truncate text-center font-semibold ${small ? "text-[11.5px]" : "text-[12.5px]"}`} style={{ color: tintText(color) }}>
        {armed ? "Tekrar dokun" : k.label}
      </span>
      {k.steps > 1 && (
        <span className="absolute right-2.5 top-2 rounded-full px-1.5 text-[10px] font-bold" style={{ background: tintBg(color, 24), color: tintText(color) }}>
          {k.steps}
        </span>
      )}
    </motion.button>
  );
}
