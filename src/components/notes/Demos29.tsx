/**
 * 0.3.8 yama notu demoları (altıncı bölüm): kalkanın 12 yeni sahnesi ve sahneye özgü sanat tarzları.
 */
import { motion } from "motion/react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { StyleFilters } from "../shield/styles";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

/** Yeni sahneler ve her birinin gökyüzü renkleri */
const NEW_SCENES: { label: string; sky: [string, string]; nook: string }[] = [
  { label: tt("Deniz feneri"), sky: ["#26375e", "#e9a26b"], nook: ACCENT.blue },
  { label: tt("Ay kampı"), sky: ["#07081a", "#2b2f55"], nook: ACCENT.yellow },
  { label: tt("Ramen tezgâhı"), sky: ["#2a1424", "#b2443a"], nook: ACCENT.orange },
  { label: tt("Masal kitabı"), sky: ["#f2e6c8", "#c9a978"], nook: ACCENT.green },
  { label: tt("Akvaryum"), sky: ["#062a44", "#1d7fa8"], nook: ACCENT.orange },
  { label: tt("Sonbahar ormanı"), sky: ["#f0b56b", "#a2431f"], nook: ACCENT.red },
  { label: tt("Fener festivali"), sky: ["#140d2c", "#6b2a55"], nook: ACCENT.yellow },
  { label: tt("Dağ evi"), sky: ["#1b2a44", "#7c9cc4"], nook: ACCENT.red },
  { label: tt("Şelale"), sky: ["#2f6b62", "#a9dccb"], nook: ACCENT.purple },
  { label: tt("Retro metro"), sky: ["#1a1a22", "#c9a43b"], nook: ACCENT.green },
  { label: tt("Kek mutfağı"), sky: ["#f8d3d8", "#e8a07e"], nook: ACCENT.pink },
  { label: tt("Çatı katı"), sky: ["#251d3d", "#ff8a5c"], nook: ACCENT.blue },
];

/** Yeni sahneler sırayla küçük bir kalkan ekranında açılır; altta 34'e çıkan liste */
function ShieldScenesDemo() {
  const n = useTick(1300);
  const at = n % NEW_SCENES.length;
  const s = NEW_SCENES[at];
  return (
    <Stage>
      <Fit w={260} h={104}>
        <div className="absolute left-0 top-[4px] h-[64px] w-[112px] overflow-hidden rounded-[8px] border border-white/15">
          <motion.div key={at} className="absolute inset-0" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} style={{ background: `linear-gradient(180deg, ${s.sky[0]}, ${s.sky[1]})` }}>
            <div className="absolute inset-x-0 bottom-0 h-[16px] bg-black/30" />
            <motion.div className="absolute bottom-[10px] left-1/2 -translate-x-1/2" animate={{ y: [0, -3, 0] }} transition={{ duration: 1.3, repeat: Infinity }}>
              <MiniNook color={s.nook} size={22} />
            </motion.div>
          </motion.div>
        </div>
        <p className="absolute left-0 top-[74px] w-[112px] text-center text-[10px] font-semibold text-label">{s.label}</p>
        <span className="absolute left-0 top-[89px] w-[112px] text-center text-[8px] text-label-3">{tt("Toplam 34 sahne")}</span>
        <div className="absolute right-0 top-[4px] flex w-[140px] flex-wrap gap-[3px]">
          {NEW_SCENES.map((x, i) => (
            <span
              key={x.label}
              className="rounded-full border px-[5px] py-[1px] text-[7.5px]"
              style={i === at ? { background: tintBg(ACCENT.yellow, 20), borderColor: tintBg(ACCENT.yellow, 50), color: tintText(ACCENT.yellow) } : { borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-3)" }}
            >
              {x.label}
            </span>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

/** Kalkanın gerçek tarz süzgeçleri: aynı küçük manzara sırayla her tarzda çizilir */
const STYLES: { id: string; label: string }[] = [
  { id: "st-wc", label: tt("Suluboya") },
  { id: "st-clay", label: tt("Oyun hamuru") },
  { id: "st-pencil", label: tt("Karakalem") },
  { id: "st-oil", label: tt("Yağlı boya") },
  { id: "st-gouache", label: tt("Guaj") },
  { id: "st-paper", label: tt("Kâğıt kolaj") },
  { id: "st-felt", label: tt("Keçe") },
  { id: "st-riso", label: tt("Risograf") },
  { id: "st-soft3d", label: tt("Yumuşak 3B") },
  { id: "st-pixel", label: tt("Piksel sanat") },
];

function ShieldArtDemo() {
  const n = useTick(1500);
  const st = STYLES[n % STYLES.length];
  return (
    <Stage>
      <Fit w={240} h={104}>
        <svg className="absolute left-1/2 top-[2px] -translate-x-1/2 overflow-hidden rounded-[10px]" width={170} height={80} viewBox="0 0 340 160">
          <StyleFilters />
          <g filter={`url(#${st.id})`}>
            <rect width="340" height="160" fill="#8ec5e8" />
            <circle cx="262" cy="46" r="24" fill="#ffd36b" />
            <path d="M0 112 Q70 70 150 104 T340 92 V160 H0 Z" fill="#5fae5a" />
            <path d="M0 132 Q110 112 210 132 T340 128 V160 H0 Z" fill="#3f8a45" />
            <circle cx="120" cy="116" r="20" fill="#2b8cff" />
            <ellipse cx="113" cy="113" rx="3" ry="5" fill="#fff" />
            <ellipse cx="127" cy="113" rx="3" ry="5" fill="#fff" />
          </g>
        </svg>
        <motion.span
          key={st.id}
          className="absolute left-1/2 top-[86px] -translate-x-1/2 rounded-full px-2 py-[2px] text-[9.5px] font-medium"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: tintBg(ACCENT.purple, 24), color: tintText(ACCENT.purple) }}
        >
          {st.label}
        </motion.span>
      </Fit>
    </Stage>
  );
}

export const DEMOS29 = {
  shieldscenes: ShieldScenesDemo,
  shieldart: ShieldArtDemo,
};
