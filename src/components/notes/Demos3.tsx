/**
 * 0.2.47 yama notlarının görselleri: Hum (çalan şarkıyı bul), Otomatik Hum ve geçmişi, alarm düzenleme,
 * kapatılana kadar bekleyen alarm ve arkasında sıraya giren bildirimler. Hepsi kendi kendine döner.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, Check, Gamepad2, MessageCircle, MousePointer2, Pencil, X } from "lucide-react";
import { normalizeColor, normalizeLook } from "../../lib/look";
import { useNook } from "../../store/nook";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

function useTick(ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setN((x) => x + 1), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return n;
}

function useFace() {
  const s = useNook((st) => st.settings);
  return { look: normalizeLook(s.look), color: normalizeColor(s.faceColor) };
}

const Stage = ({ children, bg }: { children: React.ReactNode; bg?: string }) => (
  <div className="relative h-full w-full overflow-hidden rounded-[14px]" style={{ background: bg ?? "radial-gradient(120% 100% at 50% 0%, #1d2031 0%, #0f1015 75%)" }}>
    {children}
  </div>
);

const HUM = ["#ff4fa3", "#9b7bff", "#3fd8ff"];
const COVER = "linear-gradient(135deg, #ff4fa3 0%, #9b7bff 55%, #3fd8ff 100%)";

/** Çubukların yüksekliği: ritimli, sahte ses */
function useBars(count: number, on: boolean) {
  const t = useTick(110);
  return Array.from({ length: count }, (_, i) => (on ? 0.25 + 0.75 * Math.abs(Math.sin(t * 0.9 + i * 1.3) * Math.cos(t * 0.37 + i * 0.6)) : 0.12));
}

/** Hum: kısayola basılır, Nook kulaklığı takıp dinler, ada etrafında dalga; şarkı kapağıyla gelir */
function HumDemo() {
  const face = useFace();
  const n = useTick(900);
  const phase = n % 9; // 0 kapalı · 1-4 dinliyor · 5-8 buldu
  const listening = phase >= 1 && phase <= 4;
  const found = phase >= 5;
  const bars = useBars(14, listening);
  const look = { ...face.look, head: "headphones" as const };
  return (
    <Stage bg="radial-gradient(120% 100% at 50% 0%, #241a33 0%, #0e0c13 75%)">
      {/* Arkada bir video oynuyor */}
      <div className="absolute inset-x-6 bottom-4 top-[96px] overflow-hidden rounded-[10px] border border-white/[0.06] bg-white/[0.03]">
        <span className="absolute bottom-[3px] left-2 text-[8px] leading-none text-white/40">▶</span>
        <div className="absolute bottom-1.5 left-5 right-2 h-[3px] rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-white/40" animate={{ width: `${20 + (n % 9) * 6}%` }} />
        </div>
      </div>
      {/* Kısayol */}
      <AnimatePresence>
        {phase === 0 && (
          <motion.span className="absolute top-[42px] left-1/2 -translate-x-1/2 rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[9px] text-white" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            Ctrl + Alt + M
          </motion.span>
        )}
      </AnimatePresence>
      <div className="absolute left-1/2 top-3 -translate-x-1/2">
        <div className="relative">
          {/* Sese duyarlı dalga */}
          {listening && (
            <motion.div
              className="pointer-events-none absolute -inset-[5px] rounded-[22px]"
              animate={{ opacity: [0.5, 1, 0.6, 0.9], boxShadow: HUM.map((c) => `0 0 ${10 + bars[3] * 14}px 2px ${c}`) }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ border: `2px solid ${HUM[1]}` }}
            />
          )}
          <motion.div
            className="relative flex items-center overflow-hidden bg-black"
            animate={{ width: phase === 0 ? 84 : 232, height: phase === 0 ? 24 : 48 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ borderRadius: 18 }}
          >
            <motion.span
              className="ml-2 flex shrink-0"
              animate={listening ? { rotate: [-8, 8, -8], y: [0, 2, 0] } : { rotate: 0, y: 0 }}
              transition={listening ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" } : undefined}
            >
              <NookFigure look={phase === 0 ? face.look : look} color={face.color} size={phase === 0 ? 18 : 30} expression={listening ? "djNod" : found ? "hum" : "idle"} />
            </motion.span>
            <AnimatePresence mode="wait">
              {listening && (
                <motion.div key="l" className="ml-2 flex flex-1 items-center gap-2 pr-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <span className="text-[9.5px] font-medium" style={{ color: tintText(ACCENT.purple) }}>
                    {tt("Dinliyor…")}
                  </span>
                  <span className="flex h-6 flex-1 items-center justify-end gap-[2px]">
                    {bars.map((h, i) => (
                      <span key={i} className="w-[3px] rounded-full transition-[height] duration-100" style={{ height: `${h * 100}%`, background: HUM[i % 3] }} />
                    ))}
                  </span>
                </motion.div>
              )}
              {found && (
                <motion.div key="f" className="ml-2 flex min-w-0 flex-1 items-center gap-2 pr-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <motion.span className="h-9 w-9 shrink-0 rounded-[8px]" style={{ background: COVER }} initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[10.5px] font-semibold text-white">Blinding Lights</span>
                    <span className="block truncate text-[9px] text-white/60">The Weeknd</span>
                    <span className="block truncate text-[8px] text-white/35">After Hours · 2020</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </Stage>
  );
}

const LOG = [
  { title: "Blinding Lights", artist: "The Weeknd", auto: false, at: tt("şimdi") },
  { title: "Bir Derdim Var", artist: "mor ve ötesi", auto: true, at: "21:40" },
  { title: "Gülpembe", artist: "Barış Manço", auto: true, at: "20:15" },
  { title: "Do I Wanna Know?", artist: "Arctic Monkeys", auto: true, at: tt("dün") },
];

/** Otomatik Hum: ada kapalıyken arkada dinler, bulduğu her şarkı Hum çipindeki geçmişe düşer */
function HumLogDemo() {
  const n = useTick(1100);
  const shown = Math.min(LOG.length, (n % 7) + 1);
  // En yenisi üstte; kart kısa olduğundan en fazla üç satır
  const rows = LOG.slice(LOG.length - shown, LOG.length - shown + 3);
  return (
    <Stage>
      <div className="absolute left-4 right-4 top-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-label">Hum</span>
        <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8.5px] font-medium" style={{ background: tintBg(ACCENT.purple, 16), color: tintText(ACCENT.purple) }}>
          <motion.span className="h-1.5 w-1.5 rounded-full" style={{ background: HUM[1] }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
          {tt("Otomatik · arkada dinliyor")}
        </span>
      </div>
      <div className="absolute inset-x-4 top-10 flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <motion.div
              key={r.title}
              layout
              className="flex items-center gap-2 rounded-[8px] px-1.5 py-1"
              style={{ background: i === 0 ? tintBg(ACCENT.purple, 10) : "transparent" }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span className="h-6 w-6 shrink-0 rounded-[6px]" style={{ background: COVER, filter: `hue-rotate(${LOG.indexOf(r) * 70}deg)` }} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[10px] font-medium text-label">{r.title}</span>
                <span className="block truncate text-[8.5px] text-label-3">
                  {r.artist} · {r.at}
                </span>
              </span>
              {r.auto && (
                <span className="rounded-full px-1.5 py-[1px] text-[7.5px] font-medium" style={{ background: tintBg(ACCENT.purple, 18), color: tintText(ACCENT.purple) }}>
                  {tt("oto")}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Stage>
  );
}

/** Alarm düzenleme: saate tıkla, değiştir, kaydet */
function AlarmEditDemo() {
  const n = useTick(850);
  const phase = n % 8; // 0 liste · 1 tıklama · 2-4 saat değişiyor · 5 kaydet · 6-7 güncel
  const editing = phase >= 1 && phase <= 5;
  const saved = phase >= 6;
  const time = phase <= 1 ? "07:30" : phase === 2 ? "07:45" : phase === 3 ? "08:00" : "08:15";
  const C = ACCENT.orange;
  return (
    <Stage>
      {/* Seçici */}
      <div className="absolute inset-x-4 top-3 flex items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.04] px-3 py-2">
        <motion.span key={editing ? time : "--"} className="font-display text-[20px] font-semibold tabular-nums text-label" initial={{ y: -6 }} animate={{ y: 0 }}>
          {editing ? time : "--:--"}
        </motion.span>
        <span className="flex-1 truncate text-[10px] text-label-3">{editing ? tt("İşe kalk") : tt("Alarm adı")}</span>
        <motion.span
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[9.5px] font-medium"
          animate={{ scale: phase === 5 ? [1, 0.86, 1] : 1 }}
          style={{ background: tintBg(C, editing ? 30 : 16), color: tintText(C) }}
        >
          {editing ? <Check size={10} /> : null}
          {editing ? tt("Kaydet") : tt("Ekle")}
        </motion.span>
        {editing && <X size={11} className="text-label-3" />}
      </div>
      {/* Alarm listesi */}
      <div className="absolute inset-x-4 top-[66px] flex flex-col gap-1">
        {[
          { t: saved ? "08:15" : "07:30", l: tt("İşe kalk"), me: true },
          { t: "13:00", l: tt("Öğle ilacı"), me: false },
        ].map((a) => (
          <motion.div
            key={a.l}
            className="flex items-center gap-2 rounded-[9px] px-2 py-1.5"
            animate={{ background: a.me && (editing || saved) ? tintBg(C, saved ? 22 : 12) : "rgba(255,255,255,0.03)" }}
          >
            <AlarmClock size={12} style={{ color: tintText(C) }} />
            <motion.span key={a.t} className="font-display text-[13px] font-semibold tabular-nums text-label" initial={{ scale: a.me && saved ? 1.25 : 1 }} animate={{ scale: 1 }}>
              {a.t}
            </motion.span>
            <span className="flex-1 truncate text-[9.5px] text-label-3">{a.l}</span>
            {a.me && phase === 0 && <Pencil size={10} className="text-label-3" />}
            <span className="h-3.5 w-6 rounded-full p-[2px]" style={{ background: tintBg(ACCENT.green, 60) }}>
              <span className="ml-auto block h-2.5 w-2.5 rounded-full bg-white" />
            </span>
          </motion.div>
        ))}
      </div>
      <motion.span
        className="absolute text-white"
        initial={false}
        animate={phase <= 1 ? { left: 58, top: 76, opacity: 1 } : phase === 5 ? { left: "72%", top: 22, opacity: 1 } : { left: "60%", top: 40, opacity: phase >= 6 ? 0 : 0.6 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <MousePointer2 size={13} fill="white" />
      </motion.span>
    </Stage>
  );
}

/** Oyundayken çalan alarm sen kapatana kadar adada kalır; o sırada gelen bildirimler sonra sırayla gelir */
function AlarmWaitDemo() {
  const face = useFace();
  const n = useTick(1000);
  const phase = n % 10; // 0-2 oyunda (bildirimler birikir) · 3-5 alarm bekliyor · 6 kapat · 7-9 bildirimler
  const game = phase <= 2;
  const ringing = phase >= 3 && phase <= 6;
  const queued = Math.min(2, phase);
  const toast = phase === 7 || phase === 8 ? 0 : phase === 9 ? 1 : -1;
  const toasts = [
    { app: "Discord", text: tt("Oyuna geliyor musun?"), c: ACCENT.purple },
    { app: tt("Takvim"), text: tt("Toplantı 15 dk sonra"), c: ACCENT.blue },
  ];
  const C = ACCENT.orange;
  return (
    <Stage bg={game ? "linear-gradient(160deg, #13324a 0%, #0b1a2a 60%, #050a12 100%)" : undefined}>
      <AnimatePresence>
        {game && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Gamepad2 size={26} className="text-white/50" />
            <span className="text-[9.5px] text-white/45">{tt("Tam ekran oyundasın")}</span>
            <div className="mt-1 flex items-center gap-1.5 text-[8.5px] text-white/40">
              <AlarmClock size={10} /> {tt("alarm çaldı")}
              {queued > 0 && (
                <span className="flex items-center gap-1">
                  · <MessageCircle size={10} /> {tt("{0} bildirim bekliyor", queued)}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!game && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2">
          <motion.div
            className="flex items-center overflow-hidden bg-black"
            initial={{ width: 84, height: 24 }}
            animate={{ width: ringing ? 220 : toast >= 0 ? 214 : 84, height: ringing ? 46 : toast >= 0 ? 38 : 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ borderRadius: 18 }}
          >
            <motion.span className="ml-2 flex shrink-0" animate={ringing ? { rotate: [-6, 6, -6] } : { rotate: 0 }} transition={ringing ? { duration: 0.3, repeat: Infinity } : undefined}>
              <NookFigure look={face.look} color={face.color} size={ringing ? 28 : 20} expression={ringing ? "surprised" : "idle"} />
            </motion.span>
            <AnimatePresence mode="wait">
              {ringing && (
                <motion.div key="alarm" className="ml-2 flex min-w-0 flex-1 items-center gap-2 pr-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block font-display text-[13px] font-semibold tabular-nums" style={{ color: tintText(C) }}>
                      07:30
                    </span>
                    <span className="block truncate text-[8.5px] text-white/55">{tt("İşe kalk · bekliyor")}</span>
                  </span>
                  <motion.span
                    className="flex h-6 items-center rounded-full px-2.5 text-[9px] font-medium"
                    animate={{ scale: phase === 6 ? [1, 0.85, 1] : 1 }}
                    style={{ background: tintBg(C, phase === 6 ? 40 : 24), color: tintText(C) }}
                  >
                    {tt("Kapat")}
                  </motion.span>
                </motion.div>
              )}
              {toast >= 0 && (
                <motion.div key={toast} className="ml-2 min-w-0 flex-1 pr-3 leading-tight" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <p className="truncate text-[9px] font-medium" style={{ color: tintText(toasts[toast].c) }}>
                    {toasts[toast].app}
                  </p>
                  <p className="truncate text-[9.5px] text-white/80">{toasts[toast].text}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {/* Sırada kalanlar */}
          {(ringing || toast === 0) && (
            <p className="mt-1.5 text-center text-[8.5px] text-label-3">{ringing ? tt("{0} bildirim sırada", 2) : tt("{0} bildirim sırada", 1)}</p>
          )}
        </div>
      )}
      {!game && (
        <motion.span
          className="absolute text-white"
          initial={false}
          animate={phase >= 5 && phase <= 6 ? { left: "70%", top: 36, opacity: 1 } : { left: "62%", top: 120, opacity: phase === 4 ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <MousePointer2 size={13} fill="white" />
        </motion.span>
      )}
    </Stage>
  );
}

export const DEMOS3 = {
  hum: HumDemo,
  humlog: HumLogDemo,
  alarmedit: AlarmEditDemo,
  alarmwait: AlarmWaitDemo,
} as const;
