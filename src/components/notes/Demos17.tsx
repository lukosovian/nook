/**
 * 0.3.1 yama notunun kısayol görselleri: otomasyonlar, uygulama tuşlarının tuşlara katılması, ana sayfada
 * tuşlar, varsayılan tuşların geri gelmesi ve rutinlerin yeni adımları. Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Clock, Gamepad2, Hourglass, Layers, Lock, MessageCircle, Mic, Monitor, Moon, Music2, Plus, RotateCcw, Sun, Volume1, Volume2 } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { pct, tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const WHITE = "#F4F4F6";
const SPOTIFY = "#1DB954";
const DISCORD = "#5865F2";

/** Küçük tuş (Kısayollar'ın tuşlarıyla aynı dil) */
function Key({ icon: Icon, label, color, app, lit }: { icon: typeof Mic; label: string; color: string; app?: boolean; lit?: boolean }) {
  return (
    <span
      className="relative flex h-[44px] flex-col items-center justify-center gap-[3px] rounded-[10px] border"
      style={app ? { background: "rgb(255 255 255 / 0.04)", borderColor: "rgb(255 255 255 / 0.08)" } : { background: tintBg(color, lit ? 30 : 13), borderColor: tintBg(color, lit ? 60 : 28) }}
    >
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[6px]" style={app ? { background: color, color: "#fff" } : { background: tintBg(color, 22), color: tintText(color) }}>
        <Icon size={10} strokeWidth={2.4} />
      </span>
      <span className="w-full truncate px-[2px] text-center text-[6.5px] font-semibold" style={{ color: app ? "rgb(255 255 255 / 0.7)" : tintText(color) }}>
        {label}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- Otomasyonlar

/** Saat 22:59'dan 23:00'e geçince "Gece modu" çalışıyor: adımlar sırayla işaretleniyor, Nook söylüyor */
function AutomationsDemo() {
  const p = useTick(650) % 12;
  const fired = p >= 3;
  const steps = [
    { icon: Moon, label: tt("Karanlık mod: aç"), color: ACCENT.purple },
    { icon: Sun, label: tt("Parlaklık {0}", pct(30)), color: ACCENT.yellow },
    { icon: Volume1, label: tt("Ses seviyesi {0}", pct(20)), color: ACCENT.red },
  ];
  return (
    <Stage>
      <Fit w={300} h={140}>
        <div className="absolute inset-0 grid grid-cols-[1fr_118px] gap-[6px] rounded-[12px] bg-[#0d0d10] p-[8px]">
          <div className="flex flex-col gap-[5px]">
            {/* Otomasyon kartı: ne zaman → ne */}
            <motion.div
              className="flex items-center gap-[6px] rounded-[9px] border px-[6px] py-[5px]"
              animate={{ background: fired ? tintBg(ACCENT.yellow, 16) : "rgb(255 255 255 / 0.03)", borderColor: fired ? tintBg(ACCENT.yellow, 50) : "rgb(255 255 255 / 0.07)" }}
            >
              <span className="flex h-[20px] w-[20px] items-center justify-center rounded-[6px]" style={{ background: tintBg(ACCENT.yellow, 24), color: tintText(ACCENT.yellow) }}>
                <Clock size={11} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[8.5px] font-bold text-white">{tt("Gece modu")}</span>
                <span className="flex items-center gap-[3px] text-[6.5px] text-white/45">
                  <span style={{ color: tintText(ACCENT.yellow) }}>{tt("Her gün 23:00")}</span>
                  <ArrowRight size={6} />
                  {tt("{0} adım", 3)}
                </span>
              </span>
              <span className="flex h-[10px] w-[18px] items-center justify-end rounded-full p-[1.5px]" style={{ background: tintBg(ACCENT.yellow, 40) }}>
                <span className="h-[7px] w-[7px] rounded-full bg-white" />
              </span>
            </motion.div>
            {steps.map((s, i) => {
              const done = p >= 4 + i * 1.5;
              return (
                <div key={s.label} className="flex items-center gap-[5px] rounded-[7px] bg-white/[0.03] px-[6px] py-[3.5px]">
                  <span className="flex h-[14px] w-[14px] items-center justify-center rounded-[4px]" style={{ background: tintBg(s.color, 22), color: tintText(s.color) }}>
                    <s.icon size={8} />
                  </span>
                  <span className="flex-1 text-[7px] text-white/75">{s.label}</span>
                  <AnimatePresence>
                    {done && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex h-[11px] w-[11px] items-center justify-center rounded-full" style={{ background: ACCENT.green, color: "#000" }}>
                        <Check size={7} strokeWidth={3.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          {/* Sağda saat ve ekran */}
          <motion.div className="flex flex-col items-center justify-center gap-[6px] rounded-[9px]" animate={{ background: p >= 4 ? "#08080c" : "#2a3242" }} transition={{ duration: 0.6 }}>
            <span className="font-round text-[22px] font-extrabold tabular-nums text-white">{fired ? "23:00" : "22:59"}</span>
            <AnimatePresence>
              {p >= 8 && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-[4px] rounded-full bg-black px-[6px] py-[3px]">
                  <NookFigure look={DEFAULT_LOOK} color={WHITE} size={14} expression="sleepy" />
                  <span className="text-[6.5px] text-white/85">{tt("Gece moduna geçtim")}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Uygulama tuşları tuşların arasında

/** Altta ayrı duran uygulama tuşları yukarı, öbür tuşların yanına katılıyor */
function DeckAppsDemo() {
  const merged = useTick(1800) % 2 === 1;
  const apps = [
    { icon: Music2, label: "Spotify", color: SPOTIFY },
    { icon: Gamepad2, label: "Discord", color: DISCORD },
  ];
  return (
    <Stage>
      <Fit w={300} h={140}>
        <div className="absolute inset-0 flex flex-col gap-[6px] rounded-[12px] bg-[#0d0d10] p-[8px]">
          <span className="text-[8px] font-bold text-white">{tt("Tuşların")}</span>
          <motion.div layout className="grid grid-cols-6 gap-[5px]">
            <Key icon={Mic} label={tt("Mikrofon")} color="#f2a33a" />
            <Key icon={Volume2} label={tt("Ses")} color="#f0545c" />
            <Key icon={Monitor} label={tt("Masaüstü")} color="#3d8bff" />
            <Key icon={Lock} label={tt("Kilitle")} color="#3fbfa5" />
            {merged &&
              apps.map((a) => (
                <motion.div key={a.label} layoutId={`app-${a.label}`} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
                  <Key icon={a.icon} label={a.label} color={a.color} app />
                </motion.div>
              ))}
          </motion.div>
          <AnimatePresence>
            {!merged && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-auto flex flex-col gap-[4px] rounded-[9px] border border-dashed border-white/[0.1] p-[5px]">
                <span className="text-[7px] font-semibold text-white/40 line-through">{tt("Uygulama tuşları")}</span>
                <div className="grid grid-cols-6 gap-[5px]">
                  {apps.map((a) => (
                    <motion.div key={a.label} layoutId={`app-${a.label}`} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
                      <Key icon={a.icon} label={a.label} color={a.color} app />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Ana sayfada tuşlar

/** "Ana sayfada göster" açılıyor; ana sayfanın alt sırasında tuşlar beliriyor, Mikrofon'a basılıyor */
function HomeKeysDemo() {
  const p = useTick(700) % 10;
  const on = p >= 2;
  const press = p >= 6 && p < 8;
  const keys = [
    { icon: Mic, label: tt("Mikrofon"), color: "#f2a33a" },
    { icon: Layers, label: tt("Oyun modu"), color: "#8f6bff" },
    { icon: Music2, label: "Spotify", color: SPOTIFY, app: true },
  ];
  return (
    <Stage>
      <Fit w={300} h={140}>
        <div className="absolute inset-0 grid grid-cols-[96px_1fr] gap-[6px] rounded-[12px] bg-[#0d0d10] p-[8px]">
          {/* Studio'daki anahtar */}
          <div className="flex flex-col gap-[5px]">
            <Key icon={Mic} label={tt("Mikrofon")} color="#f2a33a" lit={on} />
            <div className="flex items-center gap-[4px] rounded-[8px] bg-white/[0.04] px-[5px] py-[4px]">
              <span className="flex-1 text-[6.5px] font-semibold leading-tight text-white/80">{tt("Ana sayfada göster")}</span>
              <motion.span className="flex h-[10px] w-[18px] items-center rounded-full p-[1.5px]" animate={{ background: on ? ACCENT.blue : "rgb(255 255 255 / 0.12)", justifyContent: on ? "flex-end" : "flex-start" }}>
                <motion.span layout className="h-[7px] w-[7px] rounded-full bg-white" />
              </motion.span>
            </div>
          </div>
          {/* Adanın ana sayfası */}
          <div className="flex flex-col gap-[4px] rounded-[10px] bg-black p-[5px]">
            <div className="grid flex-1 grid-cols-2 gap-[4px]">
              <span className="rounded-[7px]" style={{ background: tintBg(ACCENT.pink, 16) }} />
              <span className="rounded-[7px]" style={{ background: tintBg(ACCENT.green, 16) }} />
            </div>
            <div className="grid h-[24px] grid-cols-4 gap-[4px]">
              {[ACCENT.purple, ACCENT.orange, ACCENT.teal, ACCENT.yellow].map((c) => (
                <span key={c} className="rounded-[6px] bg-white/[0.04]" style={{ borderLeft: `2px solid ${tintBg(c, 50)}` }} />
              ))}
            </div>
            <div className="flex h-[22px] items-center gap-[3px] rounded-[7px] border border-white/[0.06] bg-white/[0.025] p-[2px]">
              <AnimatePresence mode="popLayout" initial={false}>
                {on
                  ? keys.map((k, i) => (
                      <motion.span
                        key={k.label}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0, scale: press && i === 0 ? 0.9 : 1, background: k.app ? "rgb(255 255 255 / 0.05)" : tintBg(k.color, press && i === 0 ? 40 : 12) }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex h-full items-center gap-[2px] rounded-[5px] pl-[2px] pr-[4px]"
                      >
                        <span className="flex h-[12px] w-[12px] items-center justify-center rounded-[4px]" style={k.app ? { background: k.color, color: "#fff" } : { background: tintBg(k.color, 24), color: tintText(k.color) }}>
                          <k.icon size={7} />
                        </span>
                        <span className="text-[6px] font-semibold" style={{ color: k.app ? "rgb(255 255 255 / 0.7)" : tintText(k.color) }}>
                          {k.label}
                        </span>
                      </motion.span>
                    ))
                  : [ACCENT.blue, ACCENT.red, ACCENT.green].map((c) => <motion.span key={c} exit={{ opacity: 0 }} className="h-full w-[34px] rounded-[5px]" style={{ background: tintBg(c, 12) }} />)}
              </AnimatePresence>
              <span className="ml-auto h-full w-[40px] rounded-[5px]" style={{ background: tintBg(ACCENT.purple, 16) }} />
            </div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Varsayılanlar geri gelir

/** Tuşlar tek tek siliniyor; boş kalınca "Varsayılanları geri getir" basılıyor ve dört tuş geri geliyor */
function DeckResetDemo() {
  const p = useTick(600) % 12;
  const keys = [
    { icon: Mic, label: tt("Mikrofon"), color: "#f2a33a" },
    { icon: Volume2, label: tt("Ses"), color: "#f0545c" },
    { icon: Monitor, label: tt("Masaüstü"), color: "#3d8bff" },
    { icon: Lock, label: tt("Kilitle"), color: "#3fbfa5" },
  ];
  // 1–4: birer birer silinir; 5–7: boş; 8+: geri gelir
  const left = p < 1 ? 4 : p < 5 ? 4 - p : p < 8 ? 0 : 4;
  const pressed = p === 7;
  return (
    <Stage>
      <Fit w={300} h={120}>
        <div className="absolute inset-0 flex flex-col gap-[6px] rounded-[12px] bg-[#0d0d10] p-[8px]">
          <span className="text-[8px] font-bold text-white">{tt("Kısayollar")}</span>
          <div className="grid grid-cols-5 gap-[5px]">
            <AnimatePresence>
              {keys.slice(0, left).map((k) => (
                <motion.div key={k.label} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1, rotate: p >= 1 && p < 5 ? [0, -2, 2, 0] : 0 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ rotate: { duration: 0.4, repeat: Infinity } }}>
                  <Key icon={k.icon} label={k.label} color={k.color} />
                </motion.div>
              ))}
            </AnimatePresence>
            <span className="flex h-[44px] flex-col items-center justify-center gap-[2px] rounded-[10px] border border-dashed border-white/[0.12] text-white/40">
              <Plus size={10} />
              <span className="text-[6.5px]">{tt("Ekle")}</span>
            </span>
            <AnimatePresence>
              {left === 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: pressed ? 0.92 : 1 }}
                  exit={{ opacity: 0 }}
                  className="col-span-2 flex h-[44px] items-center justify-center gap-[4px] rounded-[10px] border text-[7px] font-semibold"
                  style={{ background: tintBg(ACCENT.blue, pressed ? 28 : 12), borderColor: tintBg(ACCENT.blue, 40), color: tintText(ACCENT.blue) }}
                >
                  <RotateCcw size={9} />
                  {tt("Varsayılanları geri getir")}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Rutinlerin yeni adımları

/** Rutin düzenleyicisi: aç/kapa adımı "aç"a, sonra "kapat"a dönüyor; ses kaydırılıyor; Nook'un sözü yazılıyor */
function NewStepsDemo() {
  const p = useTick(500) % 16;
  const mode = p < 4 ? 0 : p < 8 ? 1 : 2;
  const words = [tt("aç/kapa"), tt("aç"), tt("kapat")];
  const level = p < 6 ? 60 : 60 - Math.min(40, (p - 6) * 10);
  const say = tt("Toplantı başlıyor, sessize aldım");
  const typed = say.slice(0, Math.max(0, Math.min(say.length, (p - 3) * 5)));
  return (
    <Stage>
      <Fit w={300} h={140}>
        <div className="absolute inset-0 flex flex-col gap-[4px] rounded-[12px] bg-[#0d0d10] p-[8px]">
          <span className="text-[8px] font-bold text-white">{tt("Rutin: {0} adım, sırayla", 4)}</span>
          <Row n={1} icon={Mic} color="#f2a33a" label={tt("Mikrofon")}>
            <motion.span key={mode} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="rounded-full border px-[5px] text-[6.5px] font-semibold" style={{ background: tintBg("#f2a33a", 14), borderColor: tintBg("#f2a33a", 40), color: tintText("#f2a33a") }}>
              {words[mode]}
            </motion.span>
          </Row>
          <Row n={2} icon={Volume1} color={ACCENT.red} label={tt("Ses seviyesi {0}", pct(level))}>
            <span className="relative h-[3px] w-[60px] rounded-full bg-white/[0.1]">
              <motion.span className="absolute inset-y-0 left-0 rounded-full" animate={{ width: `${level}%` }} style={{ background: ACCENT.red }} />
            </span>
          </Row>
          <Row n={3} icon={MessageCircle} color={ACCENT.purple} label={tt("Nook söylesin")}>
            <span className="w-[110px] truncate rounded-[4px] bg-white/[0.05] px-[4px] py-[1px] text-[6.5px] text-white/80">
              {typed}
              <span className="opacity-60">|</span>
            </span>
          </Row>
          <Row n={4} icon={Hourglass} color="#8e8e93" label={tt("{0} sn bekle", 5)} />
        </div>
      </Fit>
    </Stage>
  );
}

function Row({ n, icon: Icon, color, label, children }: { n: number; icon: typeof Mic; color: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[5px] rounded-[7px] bg-white/[0.03] px-[5px] py-[3px]">
      <span className="w-[6px] text-[6.5px] font-bold text-white/35">{n}</span>
      <span className="flex h-[14px] w-[14px] items-center justify-center rounded-[4px]" style={{ background: tintBg(color, 22), color: tintText(color) }}>
        <Icon size={8} />
      </span>
      <span className="flex-1 truncate text-[7px] text-white/80">{label}</span>
      {children}
    </div>
  );
}

export const DEMOS17 = {
  automations: AutomationsDemo,
  deckapps: DeckAppsDemo,
  homekeys: HomeKeysDemo,
  deckreset: DeckResetDemo,
  newsteps: NewStepsDemo,
};
