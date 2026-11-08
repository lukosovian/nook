/**
 * 0.3.8 yama notu demoları: oyunda alarm, alarmda gün seçimi, "yarın 21:00", su oyunda susar,
 * telefon eşleştirme (canlı durum, güvenlik duvarı), Argus tek kartta.
 */
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, BellRing, Check, Droplet, Gamepad2, ShieldCheck, Smartphone } from "lucide-react";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Stage, useTick } from "./Demos6";

/** Oyun ekranı: renkli bir sahne ve nişangâh */
const Game = ({ dim = false }: { dim?: boolean }) => (
  <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #3a2a6a 0%, #1b3d5c 55%, #234a2c 100%)", opacity: dim ? 0.7 : 1 }}>
    <div className="absolute bottom-0 left-0 right-0 h-[30px]" style={{ background: "linear-gradient(0deg, #1a2a1a, transparent)" }} />
    <span className="absolute left-1/2 top-1/2 h-[8px] w-[1px] -translate-x-1/2 -translate-y-1/2 bg-white/80" />
    <span className="absolute left-1/2 top-1/2 h-[1px] w-[8px] -translate-x-1/2 -translate-y-1/2 bg-white/80" />
  </div>
);

/** Klavye tuşu */
const Key = ({ label, down }: { label: string; down: boolean }) => (
  <motion.span
    animate={{ y: down ? 2 : 0, boxShadow: down ? "0 0 0 rgba(0,0,0,0)" : "0 2px 0 rgba(255,255,255,.25)" }}
    className="flex h-[16px] min-w-[20px] items-center justify-center rounded-[4px] border border-white/25 bg-white/10 px-[4px] text-[6px] font-bold text-label"
  >
    {label}
  </motion.span>
);

// ---------------------------------------------------------------- Oyunda alarm

/** Oyun sürerken alarm çalar: ada oyunun üstüne iner, Esc'ye basınca susar ve oyun sürer */
function GameAlarmDemo() {
  const n = useTick(600);
  const phase = n % 12; // 0-2 oyun · 3-8 alarm · 8 Esc · 9-11 oyun sürer
  const ringing = phase >= 3 && phase <= 8;
  return (
    <Stage>
      <Fit w={250} h={100}>
        <div className="absolute left-[8px] top-[36px] flex flex-col items-center gap-[4px]">
          <Key label="Esc" down={phase === 8} />
          <span className="text-[5px] text-label-3">{phase === 8 ? tt("Susturuldu") : ""}</span>
        </div>
        <Pc w={200} dark>
          <Game />
          <AnimatePresence>
            {ringing && (
              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="absolute left-1/2 top-[4px] flex w-[120px] -translate-x-1/2 items-center gap-[5px] rounded-[12px] bg-black px-[6px] py-[4px]"
              >
                <motion.span animate={{ rotate: [0, -16, 16, -16, 0] }} transition={{ duration: 0.6, repeat: Infinity }} style={{ color: tintText(ACCENT.yellow) }}>
                  <AlarmClock size={10} />
                </motion.span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block font-round text-[8px] font-bold tabular-nums" style={{ color: tintText(ACCENT.yellow) }}>
                    10:00
                  </span>
                  <span className="block truncate text-[5.5px] text-label-2">{tt("Matematik dersi")}</span>
                  <span className="block truncate text-[4.5px] text-label-3">{tt("Esc ya da dokun: kapat")}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Alarmda gün seçimi

const WEEK = [tt("Pt"), tt("Sa"), tt("Ça"), tt("Pe"), tt("Cu"), tt("Ct"), tt("Pz")];

/** Gün düğmelerine basılır: salı ve perşembe seçilir, alarm her hafta o günlerde çalar */
function AlarmDaysDemo() {
  const n = useTick(700);
  const phase = n % 10; // 0-1 boş · 2 salı · 4 perşembe · 5-9 kuruldu
  const on = (i: number) => (i === 1 && phase >= 2) || (i === 3 && phase >= 4);
  const set = phase >= 5;
  return (
    <Stage>
      <Fit w={220} h={96}>
        <div className="absolute inset-x-[20px] top-[8px] rounded-[12px] border p-[8px]" style={{ background: tintBg(ACCENT.yellow, 7), borderColor: tintBg(ACCENT.yellow, 22) }}>
          <p className="text-center font-round text-[18px] font-bold tabular-nums text-label">10:00</p>
          <div className="mt-[5px] flex gap-[2px]">
            {WEEK.map((d, i) => (
              <motion.span
                key={d}
                animate={{ scale: (i === 1 && phase === 2) || (i === 3 && phase === 4) ? 0.85 : 1 }}
                className="flex h-[14px] flex-1 items-center justify-center rounded-[4px] border text-[6px] font-bold"
                style={{
                  background: on(i) ? tintBg(ACCENT.yellow, 30) : "rgb(0 0 0 / 0.3)",
                  borderColor: on(i) ? tintBg(ACCENT.yellow, 60) : "transparent",
                  color: on(i) ? tintText(ACCENT.yellow) : "rgba(255,255,255,.45)",
                }}
              >
                {d}
              </motion.span>
            ))}
          </div>
          <motion.p animate={{ opacity: set ? 1 : 0 }} className="mt-[6px] text-center text-[6.5px] font-semibold" style={{ color: tintText(ACCENT.yellow) }}>
            {tt("Her hafta Sa, Pe · 10:00")}
          </motion.p>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Hatırlatıcıda "yarın"

/** "yarın 21:00 sunum" yazılır; altında ertesi günün 21:00'i belirir */
function RemindTomorrowDemo() {
  const n = useTick(120);
  const text = tt("yarın 21:00 sunum");
  const phase = n % 60;
  const typed = text.slice(0, Math.min(text.length, Math.max(0, phase - 4)));
  const done = typed.length === text.length;
  return (
    <Stage>
      <Fit w={220} h={80}>
        <div className="absolute inset-x-[16px] top-[10px]">
          <div className="flex h-[20px] items-center rounded-[8px] bg-white/[0.07] px-[7px] text-[8px] text-label">
            {typed}
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} className="ml-[1px] h-[9px] w-[1px] bg-white/70" />
          </div>
          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-[7px] flex items-center gap-[5px] rounded-[8px] border px-[7px] py-[5px]" style={{ background: tintBg(ACCENT.orange, 12), borderColor: tintBg(ACCENT.orange, 34) }}>
                <BellRing size={9} style={{ color: tintText(ACCENT.orange) }} />
                <span className="text-[7.5px] font-semibold text-label">{tt("sunum")}</span>
                <span className="ml-auto text-[7px] font-bold" style={{ color: tintText(ACCENT.orange) }}>
                  {tt("Yarın 21:00")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Su oyunda susar

/** Oyun sürerken su vakti gelir ama kart çıkmaz; oyundan çıkınca adada bekler */
function WaterQuietDemo() {
  const n = useTick(650);
  const phase = n % 12; // 0-6 oyun (su vakti geldi, sessiz) · 7-11 masaüstü, su kartı
  const game = phase <= 6;
  return (
    <Stage>
      <Fit w={250} h={100}>
        <Pc w={200} dark>
          {game ? (
            <>
              <Game />
              <span className="absolute right-[6px] top-[6px] flex items-center gap-[3px] rounded-full bg-black/60 px-[5px] py-[2px] text-[5.5px] text-label-2">
                <Gamepad2 size={7} /> {tt("Oyunda: su hatırlatması bekliyor")}
              </span>
            </>
          ) : (
            <motion.div
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute left-1/2 top-[6px] flex -translate-x-1/2 items-center gap-[5px] rounded-[12px] bg-black px-[8px] py-[5px]"
            >
              <Droplet size={10} style={{ color: tintText(ACCENT.blue) }} />
              <span className="text-[7px] font-semibold text-label">{tt("Su içme vakti")}</span>
            </motion.div>
          )}
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Telefon eşleştirme

/** Telefon bekleniyor → güvenlik duvarına izin ver → telefon bağlanır, durum kendiliğinden yeşile döner */
function PhonePairDemo() {
  const n = useTick(700);
  const phase = n % 11; // 0-2 bekleniyor · 3 İzin ver · 4-5 izin verildi · 6-10 bağlı
  const allowed = phase >= 4;
  const live = phase >= 6;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute inset-x-[14px] top-[8px] flex flex-col gap-[5px]">
          <div className="flex items-center gap-[6px] rounded-[8px] border border-white/10 bg-white/[0.04] px-[7px] py-[5px]">
            <motion.span
              animate={{ background: live ? "#3ccf6e" : "#ffd23f", boxShadow: live ? "0 0 6px #3ccf6e" : "0 0 0 transparent" }}
              className="h-[6px] w-[6px] rounded-full"
            />
            <span className="text-[7px] font-bold text-label">{live ? tt("Telefon Bağlı (Canlı)") : tt("Telefon bekleniyor")}</span>
            <Smartphone size={9} className="ml-auto text-label-3" />
          </div>
          <AnimatePresence>
            {!live && (
              <motion.div exit={{ opacity: 0, height: 0 }} className="flex items-center gap-[6px] rounded-[8px] px-[7px] py-[4px]">
                <span className="min-w-0 flex-1 text-[6px] leading-tight text-label-2">{tt("Telefon bu PC'yi bulamıyor mu? Güvenlik duvarı engelliyor olabilir")}</span>
                {allowed ? (
                  <span className="flex items-center gap-[2px] text-[6px] text-label-2">
                    <Check size={7} style={{ color: ACCENT.green }} /> {tt("İzin verildi")}
                  </span>
                ) : (
                  <motion.span animate={{ scale: phase === 3 ? 0.88 : 1 }} className="flex items-center gap-[2px] rounded-full px-[6px] py-[2px] text-[6px] font-bold" style={{ background: tintBg(ACCENT.blue, 22), color: tintText(ACCENT.blue) }}>
                    <ShieldCheck size={7} /> {tt("İzin ver")}
                  </motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <p className="px-[2px] text-[5.5px] leading-tight text-label-3">{tt("Kodu telefonun kamerasıyla değil, Nook Mobil'in içinden okut.")}</p>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Argus tek kartta

/** Argus kurulu değilken yalnızca Modüller'deki kartında tanıtılır; "Gösterme" deyince kart kalkar */
function ArgusOneDemo() {
  const n = useTick(800);
  const phase = n % 8; // 0-3 kart · 4 Gösterme · 5-7 kart yok
  const shown = phase <= 4;
  const tiles = [ACCENT.blue, ACCENT.green, ACCENT.pink, ACCENT.orange, ACCENT.purple];
  return (
    <Stage>
      <Fit w={230} h={90}>
        <div className="absolute inset-x-[12px] top-[8px] grid grid-cols-3 gap-[4px]">
          {tiles.map((c, i) => (
            <motion.span key={i} layout className="h-[30px] rounded-[7px]" style={{ background: tintBg(c, 14), border: `1px solid ${tintBg(c, 30)}` }} />
          ))}
          <AnimatePresence>
            {shown && (
              <motion.span layout exit={{ opacity: 0, scale: 0.8 }} className="flex h-[30px] flex-col justify-center rounded-[7px] border px-[5px]" style={{ background: tintBg("#1a8cff", 16), borderColor: tintBg("#1a8cff", 40) }}>
                <span className="text-[6.5px] font-bold" style={{ color: tintText("#1a8cff") }}>
                  Argus
                </span>
                <motion.span animate={{ scale: phase === 4 ? 0.85 : 1 }} className="mt-[2px] self-start rounded-full bg-white/10 px-[4px] text-[5px] text-label-2">
                  {tt("Gösterme")}
                </motion.span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS24 = {
  gamealarm: GameAlarmDemo,
  alarmdays: AlarmDaysDemo,
  remindtomorrow: RemindTomorrowDemo,
  waterquiet: WaterQuietDemo,
  phonepair: PhonePairDemo,
  argusone: ArgusOneDemo,
};
