/**
 * 0.3.0 yama notunun altıncı bölümünün görselleri: güncelleme animasyonları, Nook'un günlüğü, çeviri ve
 * telefon bağlantısı düzeltmeleri. Hepsi kendi kendine döner.
 */
import { AnimatePresence, motion } from "motion/react";
import { BatteryCharging, BookOpen, Languages, PenLine, Power, Shield, Smartphone, Wifi } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { UPDATE_ANIMS, UpdateBody, useFakeUpdate } from "../overlays/UpdateAnims";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Phone, Stage, useTick } from "./Demos6";

const WHITE = "#F4F4F6";

// ---------------------------------------------------------------- Güncelleme animasyonları

/** Kapalı ada güncelleme kapsülü: her turda başka bir animasyon (roket, pil, filiz…) baştan sona oynar */
function UpdateAnims03Demo() {
  // useFakeUpdate 6 sn'lik tur: her turda sıradaki animasyon
  const turn = Math.floor(useTick(6000));
  const anim = UPDATE_ANIMS[(turn + 1) % UPDATE_ANIMS.length];
  const fake = useFakeUpdate(turn);
  return (
    <Stage>
      <Fit w={330} h={110}>
        <div className="absolute inset-0 flex flex-col items-center">
          <span className="h-px w-full bg-white/10" />
          <div className="relative h-10 w-[300px] overflow-hidden rounded-b-[18px] bg-black shadow-[0_10px_26px_-8px_rgba(0,0,0,0.95)]">
            <div className="absolute left-[13px] top-1/2 -translate-y-1/2">
              <NookFigure look={DEFAULT_LOOK} color={WHITE} size={26} expression={fake.done ? "happy" : "downloading"} />
            </div>
            <UpdateBody key={anim.id} anim={anim.id} p={fake.p} done={fake.done} version="0.3.1" />
          </div>
          {/* Altta hepsinin adı, oynayan parlıyor */}
          <div className="mt-4 flex flex-wrap justify-center gap-[4px] px-2">
            {UPDATE_ANIMS.map((a) => (
              <motion.span
                key={a.id}
                className="rounded-full border px-[6px] py-[2px] text-[7.5px] font-semibold"
                animate={{ opacity: a.id === anim.id ? 1 : 0.45, scale: a.id === anim.id ? 1.08 : 1 }}
                style={a.id === anim.id ? { background: tintBg(a.color, 22), borderColor: tintBg(a.color, 50), color: tintText(a.color) } : { borderColor: "rgb(255 255 255 / 0.1)", color: "rgb(255 255 255 / 0.6)" }}
              >
                {a.label}
              </motion.span>
            ))}
          </div>
          <p className="mt-2 text-[7.5px] text-white/45">{tt("Sırayla · Karışık · ya da hep aynısı")}</p>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Nook'un günlüğü

/** Nook kalemle günlüğe yazar; satırlar tek tek belirir, yanında günün sayıları */
function Diary03Demo() {
  const p = useTick(130) % 120;
  const text = tt("Bugün Luko saatlerce Figma'da tasarım yaptı, farenin pilini %7'ye kadar sömürdü. Araya bir bölüm Mehmed sıkıştırdı; imleç 1,3 km yürüdü. Neyse ki suyu unutmadı.");
  const shown = text.slice(0, Math.min(text.length, Math.max(0, p - 8) * 2));
  const writing = shown.length < text.length && p > 8;
  const facts = [
    { k: "Figma", v: tt("{0} sa", 4), c: ACCENT.pink },
    { k: "Argus", v: tt("1 bölüm"), c: ACCENT.orange },
    { k: tt("Fare"), v: "%7", c: ACCENT.red },
    { k: tt("Su"), v: tt("{0} bardak", 5), c: ACCENT.blue },
  ];
  return (
    <Stage>
      <Fit w={300} h={130}>
        <div className="absolute inset-0 grid grid-cols-[86px_1fr] gap-[6px] rounded-[12px] bg-[#0d0d10] p-[6px]">
          <div className="flex flex-col gap-[4px] rounded-[10px] bg-white/[0.04] p-[6px]">
            {facts.map((f, i) => (
              <motion.div key={f.k} className="flex items-center justify-between rounded-[6px] px-[5px] py-[3px]" style={{ background: tintBg(f.c, 14) }} initial={{ opacity: 0, x: -6 }} animate={{ opacity: p > i * 2 ? 1 : 0, x: 0 }}>
                <span className="text-[7px] text-white/70">{f.k}</span>
                <span className="text-[7px] font-bold" style={{ color: tintText(f.c) }}>
                  {f.v}
                </span>
              </motion.div>
            ))}
            <div className="mt-auto flex justify-center">
              <NookFigure look={DEFAULT_LOOK} color={WHITE} size={30} expression={writing ? "writing" : "happy"} />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[10px] p-[8px]" style={{ background: `linear-gradient(160deg, ${tintBg(ACCENT.purple, 16)}, ${tintBg(ACCENT.purple, 5)})` }}>
            <p className="flex items-center gap-[4px] text-[8px] font-bold" style={{ color: tintText(ACCENT.purple) }}>
              <BookOpen size={8} />
              {tt("Nook'un günlüğü")} <span className="font-medium text-white/40">· {tt("Bugün")}</span>
            </p>
            <p className="mt-[5px] text-[8px] leading-[1.5] text-white/85">
              {shown}
              {writing && (
                <motion.span className="ml-[1px] inline-block align-middle" animate={{ rotate: [-12, 8, -12], y: [0, -1, 0] }} transition={{ duration: 0.4, repeat: Infinity }} style={{ color: tintText(ACCENT.purple) }}>
                  <PenLine size={8} />
                </motion.span>
              )}
            </p>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Çeviri ve telefon bağlantısı

/** Almanca metin kopyalanır, Türkçesi gelir; sonra telefondan gelen bildirim Tailscale üstünden adaya düşer */
function Fixes03bDemo() {
  const p = useTick(700) % 12;
  const phase = p < 6 ? "translate" : "phone";
  return (
    <Stage>
      <Fit w={300} h={120}>
        <AnimatePresence mode="wait">
          {phase === "translate" ? (
            <motion.div key="t" className="absolute inset-0 flex flex-col items-center justify-center gap-[8px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-[8px] border border-white/10 bg-white/[0.05] px-[10px] py-[5px] text-[10px] text-white">
                <span className="rounded-[2px] px-[1px]" style={{ background: p >= 1 ? tintBg(ACCENT.blue, 45) : "transparent" }}>
                  Schön, dich zu sehen!
                </span>
              </div>
              <motion.div
                className="flex items-center gap-[6px] rounded-b-[14px] bg-black px-[10px] py-[6px]"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: p >= 2 ? 1 : 0, y: p >= 2 ? 0 : -6 }}
              >
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[6px]" style={{ background: tintBg(ACCENT.purple, 24), color: tintText(ACCENT.purple) }}>
                  <Languages size={10} />
                </span>
                <span className="leading-tight">
                  <span className="block text-[7px] font-semibold text-white/50">{tt("Çeviri · Almanca")}</span>
                  <span className="block text-[9.5px] font-bold text-white">{p >= 3 ? tt("Seni görmek güzel!") : "…"}</span>
                </span>
              </motion.div>
              <p className="text-[7.5px] text-white/45">{tt("ö, ü, ç'li Almanca ve Fransızca da artık yabancı sayılıyor")}</p>
            </motion.div>
          ) : (
            <motion.div key="p" className="absolute inset-0 flex items-center justify-center gap-[14px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex h-[78px] w-[44px] flex-col items-center justify-center gap-[4px] rounded-[9px] border border-white/15 bg-white/[0.04]">
                <Smartphone size={14} className="text-white/70" />
                <span className="rounded-[4px] px-[4px] py-[1px] text-[6px] font-bold" style={{ background: tintBg(ACCENT.green, 22), color: tintText(ACCENT.green) }}>
                  WhatsApp
                </span>
              </div>
              <div className="relative h-[2px] w-[70px] rounded-full bg-white/10">
                <motion.span className="absolute -top-[3px] h-[8px] w-[8px] rounded-full" style={{ background: ACCENT.green }} animate={{ left: ["0%", "90%"] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }} />
                <span className="absolute -top-[14px] left-1/2 flex -translate-x-1/2 items-center gap-[2px] whitespace-nowrap text-[6.5px] font-semibold" style={{ color: tintText(ACCENT.blue) }}>
                  <Wifi size={7} /> Tailscale
                </span>
                <motion.span className="absolute top-[6px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[6px] text-white/45" animate={{ opacity: p >= 7 ? 1 : 0 }}>
                  {tt("kendiliğinden yeniden bağlandı")}
                </motion.span>
              </div>
              <motion.div className="flex items-center gap-[6px] rounded-b-[14px] bg-black px-[10px] py-[6px]" animate={{ scale: p >= 8 ? [0.9, 1.04, 1] : 0.9, opacity: p >= 8 ? 1 : 0.2 }}>
                <NookFigure look={DEFAULT_LOOK} color={WHITE} size={18} expression={p >= 8 ? "surprised" : "idle"} />
                <span className="leading-tight">
                  <span className="block text-[7px] font-semibold text-white/50">WhatsApp · {tt("Telefon")}</span>
                  <span className="block text-[9px] font-bold text-white">{tt("Annem: Eve gelirken ekmek al")}</span>
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Nook Mobil 0.3

/** Nook Mobil 0.3: zamanlı kapatma, kalkan, günlük, Argus rengi, pil kısıtlaması — sırayla telefonda */
function Mobile03Demo() {
  const scene = Math.floor(useTick(1600)) % 4; // 0 zamanlı kapat · 1 kalkan · 2 günlük · 3 pil
  const R = ACCENT.red;
  const P = ACCENT.purple;
  const O = "#FFB547";
  return (
    <Stage>
      <Fit w={260} h={110}>
        <Phone>
            {scene === 0 && (
              <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="flex items-center gap-[2px] text-[6px] font-bold" style={{ color: tintText(R) }}>
                  <Power size={6} /> {tt("Zamanlı kapat")}
                </p>
                <div className="mt-[3px] grid grid-cols-2 gap-[2px]">
                  {["15 dk", "30 dk", "1 sa", "2 sa"].map((x, i) => (
                    <span key={x} className="rounded-[3px] py-[2px] text-center text-[4.5px] font-semibold" style={i === 1 ? { background: tintBg(R, 30), color: tintText(R) } : { background: "rgb(255 255 255 / 0.06)", color: "rgb(255 255 255 / 0.7)" }}>
                      {x}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
            {scene === 1 && (
              <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between rounded-[4px] bg-white/[0.06] px-[4px] py-[4px]">
                <span className="flex items-center gap-[2px] text-[5px] font-semibold text-label">
                  <Shield size={6} style={{ color: tintText(ACCENT.green) }} /> {tt("Gizlilik kalkanı")}
                </span>
                <span className="relative h-[6px] w-[11px] rounded-full" style={{ background: ACCENT.green }}>
                  <span className="absolute right-[1px] top-[1px] h-[4px] w-[4px] rounded-full bg-white" />
                </span>
              </motion.div>
            )}
            {scene === 2 && (
              <motion.div key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[4px] p-[4px]" style={{ background: tintBg(P, 16) }}>
                <p className="flex items-center gap-[2px] text-[5px] font-bold" style={{ color: tintText(P) }}>
                  <BookOpen size={5} /> {tt("Nook'un günlüğü")}
                </p>
                <p className="mt-[2px] text-[4.2px] leading-[1.4] text-label-2">{tt("Bugün Luko saatlerce tasarım yaptı, neyse ki suyu unutmadı.")}</p>
              </motion.div>
            )}
            {scene === 3 && (
              <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="flex items-center gap-[2px] text-[5px] font-semibold" style={{ color: tintText(O) }}>
                  <BatteryCharging size={6} /> {tt("Bildirimler anında gitsin")}
                </p>
                <span className="mt-[3px] block rounded-[3px] py-[2px] text-center text-[4.5px] font-bold text-black" style={{ background: O }}>
                  {tt("Pil kısıtlamasını kaldır")}
                </span>
              </motion.div>
            )}
        </Phone>
        <Pc w={150}>
          <div className="flex h-full items-center justify-center">
            <span className="rounded-full bg-black px-[8px] py-[3px] text-[6.5px] font-semibold text-label">
              {scene === 0 ? tt("30 dk sonra kapanıyor") : scene === 1 ? tt("Kalkan açık") : scene === 2 ? tt("Günlük telefonda") : tt("Telefon · WhatsApp")}
            </span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Yatırımcı rozeti

/** Destekçiler: yatırımcı altın halkası ve rozetiyle en başa kayıyor, ötekiler yanında */
function Investor03Demo() {
  const n = useTick(1100);
  const first = n % 4 !== 0;
  const people = [
    { c: ACCENT.blue, name: "ugur" },
    { c: ACCENT.green, name: "ayse" },
    { c: ACCENT.purple, name: "hasan", star: true },
    { c: ACCENT.orange, name: "mert" },
  ];
  const order = first ? [people[2], people[0], people[1], people[3]] : people;
  return (
    <Stage>
      <div className="absolute inset-x-6 bottom-4 top-6 flex flex-col gap-2">
        <span className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-label-3">{tt("Destekçiler")}</span>
        <div className="flex gap-2.5">
          {order.map((p) => (
            <motion.span key={p.name} layout transition={{ type: "spring", stiffness: 380, damping: 26 }} className="flex flex-col items-center gap-0.5">
              <span
                className="h-8 w-8 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${p.c}, color-mix(in srgb, ${p.c} 60%, black))`,
                  boxShadow: p.star && first ? `0 0 0 2px ${ACCENT.yellow}` : "0 0 0 1px rgba(255,255,255,0.1)",
                }}
              />
              <span className="text-[8.5px] text-label-3">{p.name}</span>
              <AnimatePresence>
                {p.star && first && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="rounded-full px-1.5 text-[8px] font-semibold" style={{ background: tintBg(ACCENT.yellow), color: tintText(ACCENT.yellow) }}>
                    {tt("Yatırımcı")}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.span>
          ))}
        </div>
      </div>
    </Stage>
  );
}

export const DEMOS15 = {
  investor: Investor03Demo,
  updateanims03: UpdateAnims03Demo,
  diary03: Diary03Demo,
  fixes03b: Fixes03bDemo,
  mobile03: Mobile03Demo,
};
