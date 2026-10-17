/**
 * Tanıtımın 0.3 çizimleri: yeni ada (solda dikey çubuk, durum çubuğu, ana sayfa kartları) ve Nook Studio
 * penceresi. İkisi de kendi kendine döner: çubukta sırayla bir bölüm seçilir, içerik ona göre değişir.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Bell, Keyboard, LayoutGrid, Layers, Maximize2, MessageCircle, Mic, Monitor, Moon, Music, Newspaper, Search, Settings, Shirt, Sparkles, Target, Timer, Volume2, type LucideIcon } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { MyNook, NookFigure } from "../mascot/Figure";
import { COLLECTION } from "../../lib/look";
import { tt } from "../../lib/i18n";
import { Tip } from "./TourArt";

function useCycle(n: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => window.clearInterval(t);
  }, [n, ms]);
  return i;
}

const fade = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 }, transition: { duration: 0.22 } };

// ---------------------------------------------------------------- Ada

const DOCK: { icon: LucideIcon; color: string; label: string }[] = [
  { icon: Sparkles, color: ACCENT.purple, label: tt("Ana sayfa") },
  { icon: LayoutGrid, color: ACCENT.green, label: tt("Modüller") },
  { icon: MessageCircle, color: ACCENT.blue, label: tt("Sohbet") },
  { icon: Search, color: ACCENT.teal, label: tt("Ara") },
];

const SMALL: { label: string; color: string; icon: LucideIcon }[] = [
  { label: tt("Not"), color: ACCENT.orange, icon: Newspaper },
  { label: tt("Alarm"), color: ACCENT.yellow, icon: Bell },
  { label: tt("Kontrol"), color: ACCENT.green, icon: Volume2 },
  { label: tt("Raf"), color: ACCENT.teal, icon: Layers },
];

const GRID = [
  { label: tt("Medya"), color: ACCENT.pink },
  { label: "Hum", color: ACCENT.purple },
  { label: "Pomodoro", color: ACCENT.red },
  { label: tt("Raf"), color: ACCENT.teal },
  { label: tt("Pano"), color: ACCENT.purple },
  { label: tt("Not"), color: ACCENT.orange },
  { label: tt("Alarm"), color: ACCENT.yellow },
  { label: tt("Hatırlatıcı"), color: ACCENT.orange },
  { label: tt("Takvim"), color: ACCENT.blue },
  { label: tt("Kısayollar"), color: ACCENT.blue },
  { label: tt("Kontrol"), color: ACCENT.green },
  { label: tt("Sistem"), color: ACCENT.red },
];

/** Açık adanın küçük bir kopyası; `tab` dışarıdan verilmezse çubukta sırayla gezer */
export function MiniIsland({ tab: fixed, height = 262 }: { tab?: number; height?: number }) {
  const cycled = useCycle(DOCK.length, 2200);
  const tab = fixed ?? cycled;
  const cur = DOCK[tab];
  return (
    <div className="flex gap-2 overflow-hidden rounded-[24px] border border-white/[0.08] bg-black p-2" style={{ height }}>
      {/* Dikey çubuk */}
      <div className="flex w-[30px] shrink-0 flex-col items-center gap-1.5 pt-1">
        {DOCK.map((d, k) => (
          <span key={k} className="relative flex h-[26px] w-[26px] items-center justify-center rounded-[9px] text-[#777]">
            {k === tab && <motion.span layoutId="tour-dock" className="absolute inset-0 rounded-[9px]" style={{ background: d.color }} transition={{ type: "spring", stiffness: 480, damping: 34 }} />}
            <d.icon size={13} strokeWidth={2.3} className="relative" style={k === tab ? { color: "#fff" } : undefined} />
          </span>
        ))}
        <span className="flex-1" />
        <Shirt size={12} className="mb-1.5 text-[#666]" />
        <Settings size={12} className="mb-1 text-[#666]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Durum çubuğu */}
        <div className="flex h-[22px] shrink-0 items-center gap-1.5 px-0.5">
          {tab !== 0 && (
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/[0.08] text-label-2">
              <ArrowLeft size={10} strokeWidth={2.6} />
            </span>
          )}
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cur.color }} />
          <span className="text-[11.5px] font-bold text-label">{cur.label}</span>
          <span className="ml-auto flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[9.5px] font-bold" style={{ background: tintBg(ACCENT.yellow, 18), color: tintText(ACCENT.yellow) }}>
            <Bell size={9} strokeWidth={2.6} /> 07:30
          </span>
          <span className="rounded-full bg-white/[0.07] px-1.5 py-[1px] text-[9.5px] text-label-2">18°</span>
          <span className="rounded-full bg-white/[0.07] px-1.5 py-[1px] text-[10px] font-extrabold text-label">23:30</span>
          <Maximize2 size={10} className="text-label-3" />
        </div>
        <div className="relative min-h-0 flex-1">
          <AnimatePresence initial={false}>
            {tab === 0 && (
              <motion.div key="home" className="absolute inset-0 grid grid-cols-[0.8fr_1fr_1fr] grid-rows-[1.25fr_1fr] gap-1.5" {...fade}>
                <div className="row-span-2 flex flex-col items-center justify-center gap-2 rounded-[14px] bg-white/[0.05]">
                  <MyNook size={46} expression="happy" />
                  <span className="flex items-center gap-1 rounded-full px-1.5 py-[2px] text-[9px] font-semibold" style={{ background: tintBg(ACCENT.pink, 18), color: tintText(ACCENT.pink) }}>
                    <Music size={8} /> Blinding Lights
                  </span>
                </div>
                <BigCard color={ACCENT.pink} label={tt("Medya")} value="2:14" bar={0.55} />
                <BigCard color={ACCENT.red} label="Pomodoro" value="18:42" bar={0.35} />
                <div className="col-span-2 grid grid-cols-2 gap-1.5">
                  {SMALL.map((s) => (
                    <span key={s.label} className="flex items-center gap-1.5 rounded-[11px] border px-2" style={{ background: tintBg(s.color, 10), borderColor: tintBg(s.color, 24) }}>
                      <span className="flex h-5 w-5 items-center justify-center rounded-[6px]" style={{ background: tintBg(s.color, 22), color: tintText(s.color) }}>
                        <s.icon size={10} />
                      </span>
                      <span className="text-[10.5px] font-semibold" style={{ color: tintText(s.color) }}>
                        {s.label}
                      </span>
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
            {tab === 1 && (
              <motion.div key="mods" className="absolute inset-0 grid grid-cols-3 content-start gap-1.5" {...fade}>
                {GRID.map((m, i) => (
                  <motion.span
                    key={m.label}
                    className="flex h-[34px] items-center gap-1.5 rounded-[12px] border pl-1 pr-2"
                    style={{ background: tintBg(m.color, 10), borderColor: tintBg(m.color, 26) }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.025 }}
                  >
                    <MiniNook color={m.color} size={22} />
                    <span className="truncate text-[10.5px] font-semibold" style={{ color: tintText(m.color) }}>
                      {m.label}
                    </span>
                  </motion.span>
                ))}
              </motion.div>
            )}
            {tab === 2 && (
              <motion.div key="chat" className="absolute inset-0 flex flex-col justify-end gap-1.5 rounded-[14px] bg-white/[0.04] p-2.5" {...fade}>
                <span className="self-end rounded-[12px] rounded-br-[4px] px-2.5 py-1.5 text-[11px] text-white" style={{ background: ACCENT.blue }}>
                  {tt("Yarın 9'a alarm kur")}
                </span>
                <span className="flex items-end gap-1.5 self-start">
                  <MyNook size={18} expression="happy" />
                  <span className="rounded-[12px] rounded-bl-[4px] bg-white/[0.09] px-2.5 py-1.5 text-[11px] text-label">{tt("Kurdum: yarın 09:00 ⏰")}</span>
                </span>
                <span className="mt-1 flex h-7 items-center rounded-full bg-white/[0.06] px-3 text-[10.5px] text-label-3">{tt("Bir şey sor…")}</span>
              </motion.div>
            )}
            {tab === 3 && (
              <motion.div key="search" className="absolute inset-0 flex flex-col gap-1.5" {...fade}>
                <span className="flex h-8 items-center gap-2 rounded-full border px-3 text-[11.5px] text-label" style={{ background: tintBg(ACCENT.teal, 10), borderColor: tintBg(ACCENT.teal, 30) }}>
                  <Search size={12} style={{ color: tintText(ACCENT.teal) }} />
                  {tt("spot")}
                  <motion.span className="h-3 w-[1.5px] bg-white" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                </span>
                {[
                  { t: "Spotify", s: tt("Uygulama"), c: ACCENT.green },
                  { t: tt("Spotify'ı kapat"), s: tt("Eylem"), c: ACCENT.red },
                  { t: "spotify.com", s: tt("Site"), c: ACCENT.blue },
                ].map((r, i) => (
                  <span key={r.t} className="flex h-8 items-center gap-2 rounded-[11px] px-2.5 text-[11px]" style={i === 0 ? { background: "rgb(255 255 255 / 0.08)" } : undefined}>
                    <span className="h-4 w-4 rounded-[5px]" style={{ background: tintBg(r.c, 40) }} />
                    <span className="text-label">{r.t}</span>
                    <span className="ml-auto text-[9.5px] text-label-3">{r.s}</span>
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function BigCard({ color, label, value, bar }: { color: string; label: string; value: string; bar: number }) {
  return (
    <div className="flex flex-col justify-between rounded-[14px] border p-2" style={{ background: `linear-gradient(150deg, ${tintBg(color, 14)}, ${tintBg(color, 3)})`, borderColor: tintBg(color, 26) }}>
      <span className="flex items-center justify-between">
        <span className="text-[10px] font-semibold" style={{ color: tintText(color) }}>
          {label}
        </span>
        <span className="text-[13px] font-extrabold tabular-nums text-label">{value}</span>
      </span>
      <span className="h-[4px] overflow-hidden rounded-full bg-white/[0.08]">
        <motion.span className="block h-full rounded-full" style={{ background: color }} initial={{ width: `${bar * 80}%` }} animate={{ width: `${bar * 100}%` }} transition={{ duration: 2.2, ease: "linear" }} />
      </span>
    </div>
  );
}

export function ModulesArt() {
  return (
    <div className="flex h-full flex-col gap-3">
      <MiniIsland />
      <div className="mt-auto flex gap-2">
        <Tip icon={LayoutGrid} color={ACCENT.green}>
          {tt("Soldaki çubuk:")} <b className="font-medium text-label">{tt("ana sayfa, modüller, sohbet, ara")}</b>
        </Tip>
        <Tip icon={ArrowLeft} color={ACCENT.purple}>
          {tt("Modülden")} <b className="font-medium text-label">{tt("sol üstteki okla")}</b> {tt("dön")}
        </Tip>
        <Tip icon={Maximize2} color={ACCENT.teal}>
          {tt("Sağ üstten")} <b className="font-medium text-label">{tt("tam ekran")}</b>
        </Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Studio

const SNAV: { icon: LucideIcon; color: string; label: string }[] = [
  { icon: Sparkles, color: ACCENT.purple, label: tt("Ana sayfa") },
  { icon: Shirt, color: ACCENT.pink, label: tt("Görünüm") },
  { icon: Keyboard, color: ACCENT.blue, label: tt("Kısayollar") },
  { icon: Newspaper, color: ACCENT.orange, label: tt("Yama notları") },
  { icon: Settings, color: ACCENT.gray, label: tt("Ayarlar") },
];
/** Döngüde gösterilen sayfalar (SNAV sırasıyla) */
const SHOWN = [1, 2, 4];

export function StudioArt() {
  const n = useCycle(SHOWN.length, 2600);
  const page = SHOWN[n];
  const looks = COLLECTION.slice(0, 8);
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex h-[262px] flex-col overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#0e0e10]">
        {/* Başlık çubuğu */}
        <div className="flex h-7 shrink-0 items-center gap-2 border-b border-white/[0.05] px-2.5">
          <MyNook size={13} />
          <span className="text-[10.5px] font-extrabold text-label">
            Nook <span style={{ color: tintText(ACCENT.purple) }}>Studio</span>
          </span>
          <span className="text-[9.5px] text-label-3">/ {SNAV[page].label}</span>
          <span className="ml-auto flex gap-2.5 text-label-3">
            <span className="h-[1.5px] w-2 self-center bg-current" />
            <span className="h-2 w-2 border border-current" />
            <span className="text-[10px] leading-none">✕</span>
          </span>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex w-[118px] shrink-0 flex-col gap-0.5 border-r border-white/[0.05] p-1.5">
            {SNAV.map((s, k) => {
              const on = k === page;
              return (
                <span key={k} className="relative flex items-center gap-1.5 rounded-[8px] px-1.5 py-1">
                  {on && <motion.span layoutId="tour-snav" className="absolute inset-0 rounded-[8px]" style={{ background: tintBg(s.color, 14), boxShadow: `inset 0 0 0 1px ${tintBg(s.color, 34)}` }} transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                  <span className="relative flex h-[18px] w-[18px] items-center justify-center rounded-[6px]" style={on ? { background: s.color, color: "#fff" } : { background: tintBg(s.color, 14), color: tintText(s.color) }}>
                    <s.icon size={10} strokeWidth={2.4} />
                  </span>
                  <span className={`relative truncate text-[10px] font-semibold ${on ? "text-label" : "text-label-3"}`}>{s.label}</span>
                </span>
              );
            })}
          </div>
          <div className="relative min-w-0 flex-1 p-2.5">
            <AnimatePresence initial={false}>
              {page === 1 && (
                <motion.div key="look" className="absolute inset-2.5 flex gap-2.5" {...fade}>
                  <div className="flex w-[96px] shrink-0 items-center justify-center rounded-[12px]" style={{ background: `radial-gradient(circle at 50% 40%, ${tintBg(ACCENT.pink, 26)}, transparent 70%)` }}>
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                      <NookFigure look={looks[1].look} color={looks[1].color} size={52} expression="happy" />
                    </motion.span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex gap-1">
                      {[tt("Koleksiyon"), tt("Gövde"), tt("Başlık")].map((t, i) => (
                        <span key={t} className="rounded-[6px] px-1.5 py-[2px] text-[9px] font-semibold" style={i === 0 ? { background: tintBg(ACCENT.pink, 20), color: tintText(ACCENT.pink) } : { color: "var(--color-label-3)" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {looks.map((o, i) => (
                        <span key={o.name} className="flex h-[42px] items-center justify-center rounded-[9px] border" style={i === 1 ? { background: tintBg(ACCENT.pink, 14), borderColor: tintBg(ACCENT.pink, 50) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.06)" }}>
                          <NookFigure look={o.look} color={o.color} size={22} />
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              {page === 2 && (
                <motion.div key="keys" className="absolute inset-2.5 grid grid-cols-3 content-start gap-1.5" {...fade}>
                  {[
                    { l: tt("Mikrofon"), c: ACCENT.orange, i: Mic },
                    { l: tt("Ses"), c: ACCENT.pink, i: Volume2 },
                    { l: tt("Masaüstü"), c: ACCENT.blue, i: Monitor },
                    { l: tt("Odak"), c: ACCENT.red, i: Target },
                    { l: tt("Uyku"), c: ACCENT.purple, i: Moon },
                    { l: tt("Oyun modu"), c: ACCENT.green, i: Layers },
                  ].map((k, i) => (
                    <motion.span
                      key={k.l}
                      className="flex h-[54px] flex-col items-center justify-center gap-1 rounded-[12px] border"
                      style={{ background: `linear-gradient(150deg, ${tintBg(k.c, 14)}, ${tintBg(k.c, 3)})`, borderColor: tintBg(k.c, 28) }}
                      animate={i === 5 ? { scale: [1, 0.92, 1] } : undefined}
                      transition={{ duration: 0.5, delay: 1, repeat: Infinity, repeatDelay: 1.6 }}
                    >
                      <span className="flex h-[20px] w-[20px] items-center justify-center rounded-[6px]" style={{ background: tintBg(k.c, 22), color: tintText(k.c) }}>
                        <k.i size={11} />
                      </span>
                      <span className="text-[9.5px] font-semibold" style={{ color: tintText(k.c) }}>
                        {k.l}
                      </span>
                    </motion.span>
                  ))}
                </motion.div>
              )}
              {page === 4 && (
                <motion.div key="set" className="absolute inset-2.5 space-y-1.5" {...fade}>
                  {[
                    { l: tt("Göz molası"), s: tt("20 dakikada bir"), c: ACCENT.teal, on: true },
                    { l: tt("Su hatırlatıcı"), s: tt("Saatte bir"), c: ACCENT.blue, on: true },
                    { l: tt("Gizlilik kalkanı"), s: tt("Ctrl+Alt+H"), c: ACCENT.red, on: false },
                    { l: "Hey Nook", s: tt("Sesle çağır"), c: ACCENT.yellow, on: true },
                  ].map((r, i) => (
                    <span key={r.l} className="flex h-[38px] items-center gap-2 rounded-[11px] border border-white/[0.06] bg-white/[0.03] px-2.5">
                      <span className="h-5 w-5 rounded-[6px]" style={{ background: tintBg(r.c, 24) }} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-[10.5px] font-semibold text-label">{r.l}</span>
                        <span className="block text-[9px] text-label-3">{r.s}</span>
                      </span>
                      <motion.span
                        className="flex h-[14px] w-[24px] items-center rounded-full p-[2px]"
                        initial={false}
                        animate={{ background: r.on || i === 2 ? r.c : "rgb(255 255 255 / 0.15)" }}
                        transition={{ delay: i === 2 ? 1.2 : 0 }}
                      >
                        <motion.span className="h-[10px] w-[10px] rounded-full bg-white" initial={false} animate={{ x: r.on ? 10 : [0, 0, 10] }} transition={{ duration: 1.4, times: [0, 0.85, 1] }} />
                      </motion.span>
                    </span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="mt-auto flex gap-2">
        <Tip icon={Settings} color={ACCENT.gray}>
          {tt("Adadaki dişli:")} <b className="font-medium text-label">{tt("Studio açılır")}</b>
        </Tip>
        <Tip icon={Shirt} color={ACCENT.pink}>
          <b className="font-medium text-label">{tt("Görünüm, tuşlar,")}</b> {tt("bütün ayarlar")}
        </Tip>
        <Tip icon={Timer} color={ACCENT.orange}>
          {tt("Karne, yıl özeti,")} <b className="font-medium text-label">{tt("yenilikler")}</b>
        </Tip>
      </div>
    </div>
  );
}
