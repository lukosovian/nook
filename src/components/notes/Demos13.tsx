/**
 * 0.3.0 yama notunun dördüncü bölümünün görselleri: kapalı ada ayarları (her kartta kendi önizlemesi;
 * parçalar tek tek açılıp kapanır, kapsül canlı küçülür) ve adada güncelleme (kurulum penceresi yok). Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Clock, Music } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

const WHITE = "#F4F4F6";
const PINK = ACCENT.pink;
const GREEN = ACCENT.green;
const BLUE = ACCENT.blue;

// ---------------------------------------------------------------- Kapalı ada ayarları

/**
 * Her kartın içinde kendi kapalı adası: sırayla şarkı adı kapanır (sanatçı üste çıkar), sanatçı da kapanır
 * (kapsül plak + Nook + dalgaya küçülür), hepsi geri gelir; sonra saate tarih eklenir.
 */
function CapsuleCfgDemo() {
  const n = useTick(700);
  const p = n % 14;
  const title = !(p >= 2 && p < 8);
  const artist = !(p >= 4 && p < 8);
  const date = p >= 10;
  const text = title || artist;
  const musicW = text ? 150 : 74;
  const infoW = 92 + (date ? 30 : 0);
  // Basılan çip bir an parlar
  const pressed = p === 2 ? "title" : p === 4 ? "artist" : p === 8 ? "all" : p === 10 ? "date" : null;
  const chip = (id: string, label: string, on: boolean, color: string) => (
    <motion.span
      key={id}
      className="rounded-full border px-[5px] py-[1.5px] text-[5.5px] font-bold"
      animate={{ scale: pressed === id || (pressed === "all" && (id === "title" || id === "artist")) ? [1, 0.85, 1] : 1 }}
      transition={{ duration: 0.3 }}
      style={on ? { background: tintBg(color, 22), borderColor: tintBg(color, 50), color: tintText(color) } : { borderColor: "rgb(255 255 255 / 0.12)", color: "#888" }}
    >
      {on ? "✓ " : ""}
      {label}
    </motion.span>
  );
  const head = (icon: React.ReactNode, label: string, color: string) => (
    <div className="flex items-center gap-[4px]">
      <span className="flex h-[13px] w-[13px] items-center justify-center rounded-[4px]" style={{ background: tintBg(color, 22), color: tintText(color) }}>
        {icon}
      </span>
      <span className="flex-1 text-[7px] font-bold text-white">{label}</span>
      <span className="h-[8px] w-[14px] rounded-full p-[1px]" style={{ background: color }}>
        <span className="block h-[6px] w-[6px] rounded-full bg-white" style={{ marginLeft: 6 }} />
      </span>
    </div>
  );
  // Kartın içindeki önizleme alanı: ekranın üst kenarı ve ona yapışık ada
  const stage = (children: React.ReactNode) => (
    <div className="relative mt-[5px] flex h-[34px] justify-center rounded-[6px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_75%)]">
      <span className="absolute inset-x-0 top-0 h-px bg-white/10" />
      {children}
    </div>
  );
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 grid grid-cols-2 gap-[6px] rounded-[14px] bg-[#0d0d10] p-[8px]">
          <div className="rounded-[9px] border p-[6px]" style={{ background: tintBg(PINK, 9), borderColor: tintBg(PINK, 28) }}>
            {head(<Music size={7} strokeWidth={2.6} />, tt("Müzik"), PINK)}
            {stage(
              <motion.div className="relative h-[22px] overflow-hidden rounded-b-[10px] bg-black" animate={{ width: musicW }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
                <motion.span
                  className="absolute left-[4px] top-[4px] h-[14px] w-[14px] rounded-full"
                  style={{ background: `conic-gradient(${PINK}, ${ACCENT.purple}, ${PINK})` }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <span className="absolute left-[21px] top-[3px]">
                  <NookFigure look={DEFAULT_LOOK} color={WHITE} size={15} />
                </span>
                <AnimatePresence mode="popLayout">
                  {text && (
                    <motion.div key={title ? "t" : "a"} className="absolute left-[40px] top-1/2 -translate-y-1/2 leading-[1.1]" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <p className="whitespace-nowrap text-[6.5px] font-bold text-white">{title ? "Blinding Lights" : "The Weeknd"}</p>
                      {title && artist && (
                        <p className="text-[5px]" style={{ color: tintText(PINK) }}>
                          The Weeknd
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="absolute right-[6px] top-1/2 flex -translate-y-1/2 items-center gap-[1.5px]">
                  {[PINK, ACCENT.purple, BLUE, ACCENT.teal].map((c, i) => (
                    <motion.span key={c} className="w-[2px] rounded-full" style={{ background: c }} animate={{ height: [3, 8, 3] }} transition={{ duration: 0.6 + i * 0.13, repeat: Infinity }} />
                  ))}
                </span>
              </motion.div>,
            )}
            <div className="mt-[5px] flex flex-wrap gap-[3px]">
              {chip("cover", tt("Kapak"), true, PINK)}
              {chip("title", tt("Şarkı adı"), title, PINK)}
              {chip("artist", tt("Sanatçı"), artist, PINK)}
              {chip("wave", tt("Dalga"), true, PINK)}
            </div>
          </div>
          <div className="rounded-[9px] border p-[6px]" style={{ background: tintBg(GREEN, 9), borderColor: tintBg(GREEN, 28) }}>
            {head(<Clock size={7} strokeWidth={2.6} />, tt("Saat ve hava"), GREEN)}
            {stage(
              <motion.div className="relative h-[20px] overflow-hidden rounded-b-[9px] bg-black" animate={{ width: infoW }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
                <span className="absolute left-[4px] top-[3px]">
                  <NookFigure look={DEFAULT_LOOK} color={WHITE} size={14} />
                </span>
                <span className="absolute right-[6px] top-1/2 flex -translate-y-1/2 items-baseline gap-[4px] tabular-nums">
                  <AnimatePresence>
                    {date && (
                      <motion.span key="d" className="whitespace-nowrap text-[5.5px] font-semibold text-white/60" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                        {tt("Per 16 Eki")}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span className="text-[5.5px] font-semibold text-white/60">18°</span>
                  <span className="text-[7.5px] font-extrabold text-white">19:42</span>
                </span>
              </motion.div>,
            )}
            <div className="mt-[5px] flex flex-wrap gap-[3px]">
              {chip("clock", tt("Saat"), true, GREEN)}
              {chip("weather", tt("Hava"), true, GREEN)}
              {chip("date", tt("Tarih"), date, GREEN)}
              {chip("sec", tt("Saniye"), false, GREEN)}
            </div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Adada güncelleme

/** İndir (halka dolar) → "Yeniden başlıyorum" ✓ ve pırıltılar → ada kapanır → yeni sürümle geri gelir */
function Update03Demo() {
  const n = useTick(300);
  const p = n % 26;
  const progress = Math.min(100, Math.max(0, (p - 1) * 9));
  const restarting = p >= 12 && p < 17;
  const gone = p >= 17 && p < 19;
  const back = p >= 19;
  const r = 7;
  const c = 2 * Math.PI * r;
  const color = restarting ? GREEN : BLUE;
  return (
    <Stage>
      <Fit w={300} h={124}>
        <div className="absolute inset-0 overflow-hidden rounded-[14px]" style={{ background: "linear-gradient(160deg, #1c2733, #12161d)" }}>
          {/* Masaüstü: kurulum penceresi açılmıyor */}
          <div className="absolute bottom-[10px] left-[10px] flex items-center gap-[4px] rounded-full border border-white/[0.08] bg-black/40 px-[6px] py-[2px] text-[6px] font-semibold text-white/60">
            <span className="relative inline-block h-[8px] w-[10px] rounded-[1.5px] border border-white/40">
              <span className="absolute left-1/2 top-1/2 h-[1px] w-[14px] -translate-x-1/2 -translate-y-1/2 rotate-[-35deg] bg-[#ff5c5c]" />
            </span>
            {tt("Kurulum penceresi yok")}
          </div>
          <AnimatePresence mode="wait">
            {!gone && (
              <motion.div
                key={back ? "back" : "upd"}
                className="absolute left-1/2 top-0 h-[26px] -translate-x-1/2 overflow-hidden rounded-b-[12px] bg-black"
                initial={{ width: 40, opacity: 0 }}
                animate={{ width: back ? 92 : 168, opacity: 1 }}
                exit={{ width: 20, opacity: 0, transition: { duration: 0.35 } }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
              >
                <motion.span className="absolute top-[4px]" style={{ left: back ? 38 : 6 }} animate={back ? { y: [0, -3, 0] } : {}} transition={{ duration: 0.5, repeat: back ? 2 : 0 }}>
                  <NookFigure look={DEFAULT_LOOK} color={WHITE} size={18} expression={back || restarting ? "happy" : "idle"} />
                </motion.span>
                {!back && (
                  <>
                    <div className="absolute left-[30px] top-1/2 -translate-y-1/2 leading-[1.15]">
                      <p className="whitespace-nowrap text-[7px] font-bold text-white">{restarting ? tt("Yeniden başlıyorum") : tt("Güncelleniyor")}</p>
                      <p className="whitespace-nowrap text-[5.5px] font-semibold tabular-nums" style={{ color: tintText(color) }}>
                        {restarting ? tt("{0} birazdan burada", "v0.3.1") : `v0.3.1 · %${progress}`}
                      </p>
                    </div>
                    <span className="absolute right-[6px] top-1/2 flex h-[18px] w-[18px] -translate-y-1/2 items-center justify-center">
                      <svg width={18} height={18} className="absolute inset-0 -rotate-90">
                        <circle cx={9} cy={9} r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="2" />
                        <motion.circle cx={9} cy={9} r={r} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - progress / 100) }} transition={{ duration: 0.3 }} />
                      </svg>
                      {restarting ? (
                        <motion.svg width={8} height={8} viewBox="0 0 12 12" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      ) : (
                        <ArrowDown size={7} strokeWidth={3} style={{ color }} />
                      )}
                    </span>
                    {!restarting && (
                      <span className="absolute bottom-[2px] left-[30px] right-[28px] h-[1.5px] overflow-hidden rounded-full bg-white/10">
                        <motion.span className="block h-full rounded-full" style={{ background: color }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                      </span>
                    )}
                    {restarting &&
                      [0, 1, 2, 3, 4, 5].map((i) => {
                        const a = (i / 6) * Math.PI * 2;
                        return (
                          <motion.span
                            key={i}
                            className="absolute text-[6px] font-black"
                            style={{ left: 13, top: 9, color: [ACCENT.yellow, PINK, GREEN][i % 3] }}
                            initial={{ x: 0, y: 0, opacity: 0 }}
                            animate={{ x: Math.cos(a) * 15, y: Math.sin(a) * 9, opacity: [0, 1, 0] }}
                            transition={{ duration: 0.9, delay: i * 0.04, repeat: Infinity, repeatDelay: 0.2 }}
                          >
                            ✦
                          </motion.span>
                        );
                      })}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Geri gelince: yeni sürüm balonu */}
          <AnimatePresence>
            {back && (
              <motion.div
                key="hello"
                className="absolute left-1/2 top-[34px] -translate-x-1/2 whitespace-nowrap rounded-[7px] bg-white px-[7px] py-[2px] text-[7px] font-bold text-black"
                initial={{ opacity: 0, y: -4, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.25 }}
              >
                {tt("Yeni sürüm: 0.3.1 ✨")}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS13 = {
  capsulecfg: CapsuleCfgDemo,
  update03: Update03Demo,
};
