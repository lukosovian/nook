/**
 * 0.3.6 yama notu demoları: gün gün tutulan, saatli günlük kayıtları ve eskilerin silinmesi.
 */
import { AnimatePresence, motion } from "motion/react";
import { FileText, Folder } from "lucide-react";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Stage, useTick } from "./Demos6";

const DAYS = ["2026-11-03", "2026-11-02", "2026-11-01", "2026-10-31", "2026-10-30", "2026-10-29"];
const KEEP = [
  { id: 14, label: tt("2 hafta") },
  { id: 3, label: tt("3 gün") },
];

/** Bugünün dosyasına saatli satırlar düşer; "3 gün" seçilince eski günler silinir */
function LogsDemo() {
  const n = useTick(650);
  const phase = n % 16; // 0-8 satırlar akar · 9 ayar 3 güne · 10-15 eskiler silinmiş
  const keep = phase >= 9 ? 3 : 14;
  const lines = [
    { t: "19:35:14", lv: tt("bilgi"), msg: tt("Nook açıldı"), color: "" },
    { t: "19:35:14", lv: tt("bilgi"), msg: tt("ekranlar (2): 1920x1080 · 2560x1440"), color: "" },
    { t: "19:35:15", lv: tt("bilgi"), msg: tt("ada yerleşti: üst orta"), color: "" },
    { t: "19:38:02", lv: tt("uyarı"), msg: tt("DONMA: arayüz 6 sn takıldı"), color: ACCENT.orange },
    { t: "19:46:05", lv: tt("bilgi"), msg: tt("ada açıldı"), color: "" },
    { t: "23:58:40", lv: tt("bilgi"), msg: tt("Nook kapandı"), color: "" },
  ].slice(0, Math.min(6, phase + 1));
  return (
    <Stage>
      <Fit w={250} h={100}>
        <Pc w={240} dark>
          <div className="flex h-full">
            {/* Gün dosyaları */}
            <div className="w-[64px] shrink-0 border-r border-white/10 px-[4px] py-[4px]">
              <div className="mb-[3px] flex items-center gap-[3px] text-[5.5px] font-bold text-label-2">
                <Folder size={6} style={{ color: ACCENT.blue }} /> logs
              </div>
              <AnimatePresence initial={false}>
                {DAYS.filter((_, i) => i < keep).map((d, i) => (
                  <motion.div
                    key={d}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -14, transition: { duration: 0.35 } }}
                    className="mb-[1.5px] flex items-center gap-[2px] rounded-[3px] px-[2px] py-[1px] text-[5px]"
                    style={{ background: i === 0 ? tintBg(ACCENT.blue, 22) : "transparent", color: i === 0 ? tintText(ACCENT.blue) : "rgba(255,255,255,.55)" }}
                  >
                    <FileText size={5} /> {d}.log
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {/* Bugünün satırları */}
            <div className="min-w-0 flex-1 px-[5px] py-[4px] font-mono">
              {lines.map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="truncate text-[5px] leading-[8px]" style={{ color: l.color || "rgba(255,255,255,.75)" }}>
                  <span className="text-white/40">{l.t}</span> <span className="font-bold">{l.lv}</span> {l.msg}
                </motion.div>
              ))}
              {/* Kaç gün saklansın */}
              <div className="absolute bottom-[5px] right-[6px] flex items-center gap-[3px]">
                <span className="text-[5px] text-white/50 font-sans">{tt("Kaç gün saklansın")}</span>
                <div className="flex rounded-full bg-white/10 p-[1.5px] font-sans">
                  {KEEP.map((k) => (
                    <span key={k.id} className="rounded-full px-[4px] py-[1px] text-[5px] font-bold" style={{ background: keep === k.id ? "rgba(255,255,255,.85)" : "transparent", color: keep === k.id ? "#000" : "rgba(255,255,255,.6)" }}>
                      {k.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

export const DEMOS23 = {
  logs: LogsDemo,
};
