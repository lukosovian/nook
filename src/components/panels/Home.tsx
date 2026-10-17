/**
 * Ana sayfa (0.3 bento): en çok açtığın iki bölüm üstte büyük kartlarda (canlı değer, çubuk), sonraki
 * dördü küçük kartlarda, kalanların birkaçı altta hızlı çip olarak; yanında "Tüm modüller".
 * Sıra kullanımına göre (ilk hafta senin dizdiğin sıra), seçili profil uygulanır.
 */
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useNook } from "../../store/nook";
import { allProfiles } from "../../lib/profiles";
import { tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import {
  Breath,
  byProfile,
  byUse,
  ChipNook,
  NEWCOMER_DAYS,
  openModule,
  useAvailable,
  useExplain,
  useModuleStatus,
  type ChipState,
  type ModuleDef,
  type Status,
} from "./moduleData";

const SPRING = { type: "spring", stiffness: 460, damping: 32 } as const;

export function HomeBento() {
  const available = useAvailable();
  const hidden = useNook((s) => s.settings.homeHidden);
  const profileId = useNook((s) => s.settings.homeProfile);
  const profiles = useNook((s) => s.settings.profiles);
  const use = useNook((s) => s.moduleUse);
  const newcomer = useNook((s) => Object.keys(s.days).length <= NEWCOMER_DAYS);
  const sub = useModuleStatus();
  const profile = allProfiles(profiles).find((p) => p.id === profileId);
  const shown = byProfile(available.filter((m) => !hidden.includes(m.id)), profile);
  const ranked = byUse(shown, use, newcomer);
  const big = ranked.slice(0, 2);
  const small = ranked.slice(2, 6);
  const rest = ranked.slice(6);

  return (
    <div className="grid h-full min-h-0 gap-2" style={{ gridTemplateRows: "minmax(0,1.12fr) minmax(0,1fr) 38px" }}>
      <div className="grid min-h-0 grid-cols-2 gap-2">
        {big.map((m, i) => (
          <BigCard key={m.id} m={m} st={sub[m.id]} delay={i * 0.03} />
        ))}
      </div>
      <div className="grid min-h-0 grid-cols-4 gap-2">
        {small.map((m, i) => (
          <SmallCard key={m.id} m={m} st={sub[m.id]} delay={0.06 + i * 0.025} />
        ))}
      </div>
      <QuickRow rest={rest} total={available.length} />
    </div>
  );
}

/** Büyük kart: Nook, ad ve canlı bilgi; sağ üstte değer, altta açıklama ve çubuk */
function BigCard({ m, st, delay }: { m: ModuleDef; st: Status | undefined; delay: number }) {
  const state: ChipState = st?.state ?? "idle";
  const on = state === "active" || state === "alert";
  const explain = useExplain(m.id) && !on;
  const progress = st?.progress;
  return (
    <motion.button
      onClick={() => openModule(m.id)}
      title={m.desc}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.97 }}
      transition={{ ...SPRING, delay }}
      className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[18px] border px-3 pb-2.5 pt-2.5 text-left"
      style={{
        background: `linear-gradient(150deg, ${tintBg(m.color, on ? 20 : 13)} 0%, ${tintBg(m.color, 4)} 100%)`,
        borderColor: tintBg(m.color, on ? 60 : 34),
      }}
    >
      {on && <Breath color={m.color} alert={state === "alert"} radius={18} />}
      <div className="flex min-w-0 items-start gap-2">
        <ChipNook id={m.id} color={m.color} state={state} soon={!!st?.soon} size={28} />
        <span className="min-w-0 flex-1 pt-[1px] leading-tight">
          <span className="block truncate text-[14px] font-bold tracking-tight" style={{ color: tintText(m.color) }}>
            {m.label}
          </span>
          <span className="mt-[2px] block truncate text-[10.5px] text-label-2">{explain ? m.desc : st?.text}</span>
        </span>
        {st?.value && !explain && (
          <span className="shrink-0 rounded-[8px] px-1.5 py-[1px] text-[11px] font-bold tabular-nums" style={{ background: tintBg(m.color, 22), color: tintText(m.color) }}>
            {st.value}
          </span>
        )}
      </div>
      <div className="mt-auto">
        {st?.foot && (
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[9.5px]">
            <span className="truncate text-label-3">{st.foot[0]}</span>
            {st.foot[1] && (
              <span className="shrink-0 font-medium" style={{ color: tintText(m.color) }}>
                {st.foot[1]}
              </span>
            )}
          </div>
        )}
        <span className="block h-[4px] overflow-hidden rounded-full bg-white/[0.07]">
          <motion.span
            className="block h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${m.color}, color-mix(in srgb, ${m.color} 55%, white))` }}
            initial={false}
            animate={{ width: progress != null ? `${Math.max(3, Math.min(100, progress * 100))}%` : "0%" }}
            transition={{ duration: 0.5 }}
          />
        </span>
      </div>
    </motion.button>
  );
}

/** Küçük kart: Nook ve değer üstte, ad ve kısa bilgi altta */
function SmallCard({ m, st, delay }: { m: ModuleDef; st: Status | undefined; delay: number }) {
  const state: ChipState = st?.state ?? "idle";
  const on = state === "active" || state === "alert";
  const explain = useExplain(m.id) && !on;
  return (
    <motion.button
      onClick={() => openModule(m.id)}
      title={st?.text ? `${m.desc} · ${st.text}` : m.desc}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: state === "empty" ? 0.72 : 1, y: 0 }}
      whileHover={{ y: -1.5 }}
      whileTap={{ scale: 0.96 }}
      transition={{ ...SPRING, delay }}
      className="relative flex min-h-0 min-w-0 flex-col justify-between overflow-hidden rounded-[16px] border px-2.5 pb-2 pt-2 text-left"
      style={{ background: on ? tintBg(m.color, 12) : "rgb(255 255 255 / 0.035)", borderColor: on ? tintBg(m.color, 50) : "rgb(255 255 255 / 0.065)" }}
    >
      {on && <Breath color={m.color} alert={state === "alert"} radius={16} />}
      <div className="flex items-start justify-between gap-1">
        <ChipNook id={m.id} color={m.color} state={state} soon={!!st?.soon} size={22} />
        {st?.value && !explain && (
          <span className="truncate rounded-[7px] px-1.5 py-[1px] text-[10px] font-bold tabular-nums" style={{ background: tintBg(m.color, 18), color: tintText(m.color) }}>
            {st.value}
          </span>
        )}
      </div>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[12.5px] font-bold" style={{ color: tintText(m.color) }}>
          {m.label}
        </span>
        <span className="block truncate text-[9.5px] text-label-3">{explain ? m.desc : st?.text}</span>
      </span>
    </motion.button>
  );
}

/** Alt sıra: kalan bölümlerden birkaçı hızlı çip; sağda bütün modüller */
function QuickRow({ rest, total }: { rest: ModuleDef[]; total: number }) {
  const sub = useModuleStatus();
  const quick = rest.slice(0, 3);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.16 }}
      className="flex min-w-0 items-center gap-1.5 rounded-[16px] border border-white/[0.06] bg-white/[0.025] p-[5px]"
    >
      {quick.map((m) => {
        const st = sub[m.id];
        const state = st?.state ?? "idle";
        return (
          <motion.button
            key={m.id}
            onClick={() => openModule(m.id)}
            title={st?.text ? `${m.desc} · ${st.text}` : m.desc}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-full min-w-0 items-center gap-1 rounded-[11px] border py-0.5 pl-0.5 pr-2.5"
            style={{ background: tintBg(m.color, 10), borderColor: tintBg(m.color, 30) }}
          >
            <ChipNook id={m.id} color={m.color} state={state} soon={!!st?.soon} size={18} />
            <span className="truncate text-[11px] font-semibold" style={{ color: tintText(m.color) }}>
              {m.label}
            </span>
          </motion.button>
        );
      })}
      <motion.button
        onClick={() => useNook.getState().setTab("modules")}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        className="ml-auto flex h-full shrink-0 items-center gap-1.5 rounded-[11px] border px-2.5 text-[11px] font-semibold"
        style={{ background: tintBg("var(--color-purple)", 16), borderColor: tintBg("var(--color-purple)", 40), color: tintText("var(--color-purple)") }}
      >
        {tt("Tüm {0} modül", total)}
        <ArrowRight size={12} strokeWidth={2.6} />
      </motion.button>
    </motion.div>
  );
}
