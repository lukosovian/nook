/**
 * 0.3.10 yama notu demoları: oyunda dinlenen "Hey Nook", kalkan sahnelerinde baştan yerinde duran
 * Nook'lar, hafifleyen açılış ve arka plan.
 */
import { motion } from "motion/react";
import { Check, CloudRain, MemoryStick, Moon, Download, Feather, Gamepad2, MessageSquareWarning, Mic, MicOff, Monitor, MousePointer2, Settings2, Zap } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

/** Masaüstünde mikrofon dinler; oyun açılınca dinleme durur, oyun kapanınca geri gelir */
function WakeRestDemo() {
  const n = useTick(1700);
  const game = n % 2 === 1;
  const color = game ? ACCENT.orange : ACCENT.green;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <div className="absolute left-[6px] top-[6px] h-[66px] w-[112px] overflow-hidden rounded-[8px] border border-white/15" style={{ background: game ? "linear-gradient(160deg, #1b2440, #4a2c5e)" : "linear-gradient(160deg, #1d1d22, #2a2a31)" }}>
          <motion.div key={String(game)} className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
            {game ? <Gamepad2 size={26} color="#fff" strokeWidth={1.6} /> : <Monitor size={24} color="rgb(255 255 255 / 0.5)" strokeWidth={1.6} />}
          </motion.div>
        </div>
        <p className="absolute left-[6px] top-[78px] w-[112px] text-center text-[9.5px] font-semibold text-label">{game ? tt("Tam ekran oyun") : tt("Masaüstü")}</p>
        <div className="absolute left-[136px] top-[14px] flex h-[40px] w-[40px] items-center justify-center rounded-full" style={{ background: tintBg(color, 22) }}>
          {!game && (
            <motion.span className="absolute inset-0 rounded-full border" style={{ borderColor: tintBg(color, 60) }} animate={{ scale: [1, 1.35], opacity: [0.8, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }} />
          )}
          {game ? <MicOff size={18} color={tintText(color)} /> : <Mic size={18} color={tintText(color)} />}
        </div>
        <div className="absolute left-[184px] top-[20px]">
          <MiniNook color={ACCENT.blue} size={26} eyes={game ? "closed" : "open"} />
        </div>
        <motion.span key={`l${game}`} className="absolute left-[128px] top-[66px] w-[106px] rounded-full px-2 py-[2px] text-center text-[9px] font-medium" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} style={{ background: tintBg(color, 22), color: tintText(color) }}>
          {game ? tt("Dinleme durdu") : tt("\"Hey Nook\" dinliyor")}
        </motion.span>
      </Fit>
    </Stage>
  );
}

const CAST = [ACCENT.blue, ACCENT.pink, ACCENT.yellow];

/** Sahne açılır: Nook'lar önce düz küre olarak yerinde, sonra 3B gövdeleri gelir; eller hiç gövdesiz kalmaz */
function SceneCastDemo() {
  const n = useTick(1500);
  const ready = n % 3 !== 0;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <div className="absolute left-1/2 top-[4px] h-[70px] w-[190px] -translate-x-1/2 overflow-hidden rounded-[9px] border border-white/15" style={{ background: "linear-gradient(180deg, #26375e, #e9a26b)" }}>
          <div className="absolute inset-x-0 bottom-0 h-[18px] bg-black/30" />
          {CAST.map((c, i) => (
            <div key={c} className="absolute bottom-[12px]" style={{ left: 30 + i * 54 }}>
              <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 1.6 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}>
                {ready ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: i * 0.12 }}>
                    <MiniNook color={c} size={24} eyes={i === 1 ? "happy" : "open"} />
                  </motion.div>
                ) : (
                  <span className="block h-[24px] w-[24px] rounded-full" style={{ background: `color-mix(in srgb, ${c} 55%, #8a8a94)` }} />
                )}
                {/* Eller hep gövdenin yanında */}
                <span className="absolute -left-[4px] bottom-[3px] h-[6px] w-[6px] rounded-full bg-white" />
                <span className="absolute -right-[4px] bottom-[3px] h-[6px] w-[6px] rounded-full bg-white" />
              </motion.div>
            </div>
          ))}
        </div>
        <motion.span key={String(ready)} className="absolute left-1/2 top-[80px] -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-[2px] text-[9px] font-medium" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} style={{ background: tintBg(ready ? ACCENT.green : ACCENT.yellow, 22), color: tintText(ready ? ACCENT.green : ACCENT.yellow) }}>
          {ready ? tt("Sahnenin malzemesi ve renkleriyle") : tt("Sahne açıldı, herkes yerinde")}
        </motion.span>
      </Fit>
    </Stage>
  );
}

const LIGHT = [
  { icon: Zap, label: tt("Açılış") },
  { icon: Download, label: tt("İndirilenler takibi") },
  { icon: Settings2, label: tt("Ayar sayfaları") },
];

/** Üç iş sırayla hafifler: yük çubuğu iner, yanına onay gelir */
function LightStartDemo() {
  const n = useTick(1100);
  const done = n % (LIGHT.length + 2);
  return (
    <Stage>
      <Fit w={230} h={96}>
        {LIGHT.map((row, i) => {
          const ok = done > i;
          const Icon = row.icon;
          return (
            <div key={row.label} className="absolute left-[8px] flex h-[24px] w-[214px] items-center gap-[7px] rounded-[8px] bg-white/[0.05] px-[8px]" style={{ top: 6 + i * 29 }}>
              <Icon size={12} color={tintText(ok ? ACCENT.green : ACCENT.orange)} />
              <span className="w-[86px] text-[9.5px] text-label">{row.label}</span>
              <span className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.span className="absolute inset-y-0 left-0 rounded-full" animate={{ width: ok ? "18%" : "82%", background: ok ? ACCENT.green : ACCENT.orange }} transition={{ duration: 0.5, ease: "easeInOut" }} />
              </span>
              <motion.span animate={{ opacity: ok ? 1 : 0, scale: ok ? 1 : 0.5 }} transition={{ duration: 0.25 }}>
                <Check size={11} color={tintText(ACCENT.green)} />
              </motion.span>
            </div>
          );
        })}
      </Fit>
    </Stage>
  );
}

/** Ayarlar › Genel › Performans: anahtar açılınca kare hızı 30'a iner, hava efekti ve gezinti söner */
function LightModeDemo() {
  const n = useTick(1800);
  const on = n % 2 === 1;
  const c = on ? ACCENT.green : ACCENT.gray;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[8px] flex h-[30px] w-[224px] items-center gap-[8px] rounded-[9px] bg-white/[0.06] px-[10px]">
          <Feather size={13} color={tintText(c)} />
          <span className="flex-1 text-[10.5px] font-semibold text-label">{tt("Hafif kip")}</span>
          <span className="relative h-[14px] w-[26px] rounded-full" style={{ background: on ? ACCENT.green : "rgb(255 255 255 / 0.16)" }}>
            <motion.span className="absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white" animate={{ left: on ? 14 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
          </span>
        </div>
        <div className="absolute left-[8px] top-[48px] flex w-[224px] gap-[6px]">
          <span className="flex h-[38px] flex-1 flex-col items-center justify-center rounded-[8px] bg-white/[0.05]">
            <motion.b key={String(on)} className="text-[13px] leading-none" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} style={{ color: tintText(on ? ACCENT.green : ACCENT.orange) }}>
              {on ? 30 : 60}
            </motion.b>
            <i className="mt-[3px] text-[7.5px] not-italic text-label-3">{tt("kare / sn")}</i>
          </span>
          <span className="flex h-[38px] flex-1 flex-col items-center justify-center gap-[3px] rounded-[8px] bg-white/[0.05]">
            <CloudRain size={13} color={on ? "rgb(255 255 255 / 0.25)" : tintText(ACCENT.blue)} />
            <i className="text-[7.5px] not-italic text-label-3">{on ? tt("Hava efekti kapalı") : tt("Hava efekti")}</i>
          </span>
          <span className="flex h-[38px] flex-1 flex-col items-center justify-center gap-[2px] rounded-[8px] bg-white/[0.05]">
            <motion.span animate={on ? { y: 0 } : { y: [0, -4, 0] }} transition={on ? { duration: 0.2 } : { duration: 0.9, repeat: Infinity, ease: "easeInOut" }}>
              <MiniNook color={ACCENT.blue} size={15} eyes={on ? "closed" : "open"} />
            </motion.span>
            <i className="text-[7.5px] not-italic text-label-3">{on ? tt("Gezinti yok") : tt("Gezintiler")}</i>
          </span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Ada bir an donar, sonra kart çıkar; imleç karta dokununca Studio'da Geribildirim açılır */
function FreezeCardDemo() {
  const n = useTick(1300);
  const phase = n % 4; // 0 takıldı · 1-2 kart · 3 geribildirim açıldı
  return (
    <Stage>
      <Fit w={240} h={96}>
        {phase < 3 ? (
          <>
            <div className="absolute left-1/2 top-[6px] flex h-[34px] w-[200px] -translate-x-1/2 items-center gap-[8px] rounded-full bg-black px-[10px] ring-1 ring-white/10">
              <MiniNook color={ACCENT.blue} size={20} eyes={phase === 0 ? "closed" : "open"} />
              {phase === 0 ? (
                <span className="text-[9px] text-label-3">{tt("…")}</span>
              ) : (
                <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="min-w-0">
                  <p className="truncate text-[9.5px] font-semibold" style={{ color: tintText(ACCENT.orange) }}>{tt("Az önce {0} saniye takıldım", 8)}</p>
                  <p className="truncate text-[7.5px] text-label-2">{tt("Dokun: günlükle birlikte geribildirim gönder")}</p>
                </motion.div>
              )}
            </div>
            {phase === 2 && (
              <motion.span className="absolute left-[150px] top-[30px]" initial={{ x: 30, y: 26, opacity: 0 }} animate={{ x: 0, y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                <MousePointer2 size={14} color="#fff" fill="#fff" />
              </motion.span>
            )}
            <p className="absolute left-0 top-[66px] w-full text-center text-[8.5px] text-label-3">{phase === 0 ? tt("Ada bir an yanıt vermedi") : tt("Günde en çok bir kez sorar")}</p>
          </>
        ) : (
          <motion.div className="absolute left-1/2 top-[8px] w-[190px] -translate-x-1/2 rounded-[10px] bg-white/[0.06] p-[9px]" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="flex items-center gap-[6px]">
              <MessageSquareWarning size={12} color={tintText(ACCENT.orange)} />
              <b className="text-[10px] text-label">{tt("Geribildirim")}</b>
            </div>
            <div className="mt-[7px] h-[18px] rounded-[5px] bg-white/[0.07]" />
            <div className="mt-[6px] flex items-center gap-[5px]">
              <Check size={10} color={tintText(ACCENT.green)} />
              <span className="text-[8px] text-label-2">{tt("Günlük kayıtlarını ekle")}</span>
              <span className="ml-auto rounded-full px-[7px] py-[2px] text-[8px] font-semibold" style={{ background: tintBg(ACCENT.blue, 26), color: tintText(ACCENT.blue) }}>{tt("Gönder")}</span>
            </div>
          </motion.div>
        )}
      </Fit>
    </Stage>
  );
}

const MEM = [
  { icon: Monitor, label: tt("Kullanırken"), fill: 86 },
  { icon: Gamepad2, label: tt("Oyunda gizliyken"), fill: 34 },
  { icon: Moon, label: tt("Başında değilken"), fill: 28 },
];

/** Üç durum sırayla: kullanırken bellek çubuğu dolu, oyunda ve uzaktayken Nook belleğini bırakır */
function LowMemDemo() {
  const n = useTick(1600);
  const at = n % MEM.length;
  const m = MEM[at];
  const Icon = m.icon;
  const c = at === 0 ? ACCENT.orange : ACCENT.green;
  return (
    <Stage>
      <Fit w={230} h={96}>
        <div className="absolute left-[8px] top-[8px] flex w-[214px] gap-[5px]">
          {MEM.map((x, i) => (
            <span key={x.label} className="flex-1 rounded-full border px-[4px] py-[2px] text-center text-[7.5px]" style={i === at ? { background: tintBg(c, 20), borderColor: tintBg(c, 50), color: tintText(c) } : { borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-3)" }}>
              {x.label}
            </span>
          ))}
        </div>
        <div className="absolute left-[8px] top-[36px] flex h-[40px] w-[214px] items-center gap-[9px] rounded-[10px] bg-white/[0.05] px-[10px]">
          <motion.span key={at} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}>
            <Icon size={16} color={tintText(c)} />
          </motion.span>
          <MemoryStick size={13} color="rgb(255 255 255 / 0.45)" />
          <span className="relative h-[8px] flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.span className="absolute inset-y-0 left-0 rounded-full" animate={{ width: `${m.fill}%`, background: c }} transition={{ duration: 0.6, ease: "easeInOut" }} />
          </span>
        </div>
        <p className="absolute left-0 top-[81px] w-full text-center text-[8.5px] text-label-3">{at === 0 ? tt("Bellek kullanımda") : tt("Bellek Windows'a geri verildi")}</p>
      </Fit>
    </Stage>
  );
}

export const DEMOS30 = {
  lowmem: LowMemDemo,
  lightmode: LightModeDemo,
  freezecard: FreezeCardDemo,
  wakerest: WakeRestDemo,
  scenecast: SceneCastDemo,
  lightstart: LightStartDemo,
};
