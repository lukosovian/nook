import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCheck, MessageCircleQuestion, SquareTerminal, X, type LucideIcon } from "lucide-react";
import { answer, CLAUDE_COLOR, fitsCard, openAsk, useClaude, type ClaudeAsk } from "../../lib/claude";
import { spring } from "../../lib/motion";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/**
 * Claude Code izin istiyor ya da soru soruyor: kart cevaplanana kadar adada durur.
 * Terminal öndeyken gelmez (orada zaten soruluyor); "Terminalde" deyince Claude Code kendi sorar.
 */
export function ClaudeView() {
  const ask = useClaude((s) => s.asks[0]);
  const more = useClaude((s) => s.asks.length - 1);
  if (!ask) return null;

  return (
    <motion.div
      className="absolute inset-y-0 left-[76px] right-3 flex items-center gap-2"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={ask.askId}
          className="flex min-w-0 flex-1 items-center gap-2"
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.18 }}
        >
          <Body ask={ask} more={more} />
          <Actions ask={ask} />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function Body({ ask, more }: { ask: ClaudeAsk; more: number }) {
  const q = ask.questions?.[0];
  const title = ask.questions ? (ask.questions.length > 1 ? tt("{0} soru soruyor", ask.questions.length) : q?.question || ask.title) : ask.title;
  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 text-[10px] font-medium leading-none" style={{ color: tintText(CLAUDE_COLOR) }}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: CLAUDE_COLOR }} />
        <span className="truncate">Claude · {ask.project}</span>
        {more > 0 && <span className="shrink-0 rounded-full px-1.5 py-[1px] text-[9px]" style={{ background: tintBg(CLAUDE_COLOR, 22) }}>+{more}</span>}
      </p>
      <p className={`mt-1 text-[13px] font-medium leading-tight text-label ${ask.detail ? "truncate" : "line-clamp-2"}`} title={title}>
        {title}
      </p>
      {ask.detail && (
        <p className="mt-1 line-clamp-2 break-all rounded-[6px] bg-white/[0.06] px-1.5 py-[2px] font-mono text-[10.5px] leading-snug text-label-2" title={ask.detail}>
          {ask.detail}
        </p>
      )}
    </div>
  );
}

function Actions({ ask }: { ask: ClaudeAsk }) {
  // Soru: seçenekler düğme olur (tek soru, tek seçim, en fazla 4); fazlası büyük adada
  if (ask.questions) {
    const q = ask.questions[0];
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        {fitsCard(ask) ? (
          <div className="grid max-w-[250px] grid-cols-2 gap-1">
            {q.options.map((o) => (
              <Action key={o.label} label={o.label} title={o.description ?? o.label} color={CLAUDE_COLOR} onClick={() => answer(ask, { answers: { [q.question]: o.label } })} small />
            ))}
          </div>
        ) : (
          <Action icon={MessageCircleQuestion} label={tt("Cevapla")} title={tt("Soruları büyük adada aç")} color={CLAUDE_COLOR} onClick={() => openAsk(ask)} strong />
        )}
        <Ghost onClick={() => answer(ask, "")} />
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Action icon={X} title={tt("Reddet")} color={ACCENT.red} onClick={() => answer(ask, "deny")} />
      {ask.canAlways && <Action icon={CheckCheck} label={tt("Her zaman")} title={tt("İzin ver ve bu tür istekleri bir daha sorma")} color={ACCENT.green} onClick={() => answer(ask, "always")} />}
      <Action icon={Check} label={tt("İzin ver")} title={tt("Bu sefer izin ver")} color={ACCENT.green} onClick={() => answer(ask, "allow")} strong />
      <Ghost onClick={() => answer(ask, "")} />
    </div>
  );
}

/** "Terminalde cevaplayacağım": kart kapanır, Claude Code terminalde sorar */
function Ghost({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={spring.pop}
      onClick={onClick}
      title={tt("Terminalde cevaplayacağım")}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-white/[0.08] hover:text-label"
    >
      <SquareTerminal size={14} strokeWidth={2.2} />
    </motion.button>
  );
}

function Action({ icon: Icon, label, title, color, onClick, strong, small }: { icon?: LucideIcon; label?: string; title: string; color: string; onClick: () => void; strong?: boolean; small?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      onClick={onClick}
      title={title}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full border font-medium ${small ? "h-7 min-w-0 px-2.5 text-[11px]" : label ? "h-9 px-3 text-[12px]" : "h-9 w-9"}`}
      style={{
        background: tintBg(color, strong ? 26 : 12),
        borderColor: tintBg(color, strong ? 60 : 32),
        color: tintText(color),
        boxShadow: strong ? `0 0 16px -4px ${color}` : undefined,
      }}
    >
      {Icon && <Icon size={13} strokeWidth={2.5} />}
      {label && <span className="truncate">{label}</span>}
    </motion.button>
  );
}
