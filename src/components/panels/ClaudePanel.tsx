import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileCode2, Link2, SquareTerminal, Unlink } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { ago, answer, CLAUDE_COLOR, connect, disconnect, effectivePct, planColor, refreshSetup, resetLabel, useClaude, type ClaudeAsk, type ClaudeSession, type PlanWindow } from "../../lib/claude";
import { useNook } from "../../store/nook";
import { ACCENT, Bar, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const STATE_COLOR: Record<ClaudeSession["state"], string> = {
  working: CLAUDE_COLOR,
  waiting: ACCENT.yellow,
  done: ACCENT.green,
  idle: ACCENT.gray,
};

/** Claude Code: plan kullanımı, açık oturumlar, bekleyen sorular ve bağlantı. */
export function ClaudePanel() {
  const setup = useClaude((s) => s.setup);
  const sessions = useClaude((s) => s.sessions);
  const asks = useClaude((s) => s.asks);
  const opened = asks.filter((a) => a.opened);
  const list = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("claude", scroller);
  // Göreli zamanlar aksın
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    void refreshSetup();
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  if (setup && !setup.hooked) return <Connect />;

  return (
    <div ref={scroller} className="-mr-1.5 flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto pr-1.5">
      <Plan now={now} />
      {opened.map((a) => (
        <Questions key={a.askId} ask={a} />
      ))}
      {list.length ? (
        list.map((s) => <SessionRow key={s.id} s={s} now={now} />)
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-center">
          <MiniNook color={CLAUDE_COLOR} size={26} eyes="side" />
          <p className="text-[12px] font-medium text-label">{tt("Açık oturum yok")}</p>
          <p className="max-w-[300px] text-[10.5px] text-label-3">{tt("Claude Code'da bir şey iste, burada canlı görünsün. İzin isterse adada sorarım.")}</p>
        </div>
      )}
      <Footer />
    </div>
  );
}

function Plan({ now }: { now: number }) {
  const plan = useClaude((s) => s.plan);
  const statusline = useClaude((s) => s.setup?.statusline);
  if (!plan) {
    return (
      <p className="rounded-[12px] bg-well px-2.5 py-1.5 text-[10.5px] text-label-3">
        {statusline === "other"
          ? tt("Kendi durum satırın olduğu için plan göstergesi kapalı.")
          : tt("Plan kullanımı Claude Code'un ilk cevabından sonra görünür (Pro ve Max planlarında).")}
      </p>
    );
  }
  return (
    <div className="grid shrink-0 grid-cols-2 gap-1.5">
      <Gauge label={tt("5 saat")} w={plan.fiveHour} weekly={false} now={now} />
      <Gauge label={tt("Hafta")} w={plan.sevenDay} weekly now={now} />
    </div>
  );
}

function Gauge({ label, w, weekly, now }: { label: string; w?: PlanWindow; weekly: boolean; now: number }) {
  const pct = w ? effectivePct(w, now) : null;
  const color = pct == null ? ACCENT.gray : planColor(pct);
  return (
    <div className="rounded-[14px] border px-2.5 py-1.5" style={{ background: tintBg(color, 8), borderColor: tintBg(color, 22) }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-label-2">{label}</span>
        <span className="font-display text-[16px] font-medium tabular-nums leading-none" style={{ color: tintText(color) }}>
          {pct == null ? "—" : `%${Math.round(pct)}`}
        </span>
      </div>
      <Bar pct={pct ?? 0} color={color} className="mt-1" />
      <p className="mt-1 truncate text-[9.5px] text-label-3">{w ? tt("Sıfırlanma {0}", resetLabel(w, weekly, now)) : tt("Bilgi yok")}</p>
    </div>
  );
}

const STATE_LABEL = (s: ClaudeSession["state"]) => (s === "working" ? tt("Çalışıyor") : s === "waiting" ? tt("Seni bekliyor") : s === "done" ? tt("Bitti") : tt("Boşta"));

function SessionRow({ s, now }: { s: ClaudeSession; now: number }) {
  const color = STATE_COLOR[s.state];
  const text = s.state === "done" && s.reply ? s.reply : s.action;
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border px-2.5 py-1.5" style={{ background: tintBg(color, 8), borderColor: tintBg(color, 22) }}>
      <motion.span
        className="flex shrink-0"
        animate={s.state === "working" ? { rotate: [-6, 6, -6], y: [0, -1.5, 0] } : s.state === "waiting" ? { y: [0, -3, 0] } : { rotate: 0, y: 0 }}
        transition={s.state === "idle" || s.state === "done" ? { duration: 0.3 } : { duration: s.state === "working" ? 1.6 : 0.9, repeat: Infinity, ease: "easeInOut" }}
      >
        <MiniNook color={color} size={26} eyes={s.state === "idle" ? "closed" : "open"} />
      </motion.span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[12px] font-medium text-label" title={s.cwd}>
            {s.project}
          </span>
          <span className="shrink-0 text-[10px] font-medium" style={{ color: tintText(color) }}>
            {STATE_LABEL(s.state)} · {ago(s.updatedAt, now)}
          </span>
        </div>
        {s.prompt && <p className="truncate text-[10.5px] text-label-2">“{s.prompt}”</p>}
        <p className="truncate text-[10px] text-label-3" title={text}>
          {text}
        </p>
        {(s.edits > 0 || s.commands > 0) && (
          <p className="mt-0.5 flex items-center gap-2 truncate text-[9.5px] text-label-3">
            {s.edits > 0 && (
              <span className="flex min-w-0 items-center gap-1">
                <FileCode2 size={10} className="shrink-0" />
                <span className="truncate">{tt("{0} düzenleme", s.edits)}{s.files.length ? ` · ${s.files.slice(0, 3).join(", ")}` : ""}</span>
              </span>
            )}
            {s.commands > 0 && (
              <span className="flex shrink-0 items-center gap-1">
                <SquareTerminal size={10} />
                {tt("{0} komut", s.commands)}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/** Küçük adaya sığmayan sorular (birden çok soru ya da çoklu seçim) */
function Questions({ ask }: { ask: ClaudeAsk }) {
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const qs = ask.questions ?? [];
  const done = qs.every((q) => picks[q.question]?.length);
  const toggle = (q: string, label: string, multi: boolean) =>
    setPicks((p) => {
      const cur = p[q] ?? [];
      return { ...p, [q]: multi ? (cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]) : [label] };
    });
  const send = (decision: Parameters<typeof answer>[1]) => {
    answer(ask, decision);
    useNook.getState().setPinned(false);
  };
  return (
    <div className="shrink-0 rounded-[14px] border px-2.5 py-2" style={{ background: tintBg(CLAUDE_COLOR, 10), borderColor: tintBg(CLAUDE_COLOR, 40) }}>
      <p className="text-[10px] font-medium" style={{ color: tintText(CLAUDE_COLOR) }}>
        Claude · {ask.project}
      </p>
      {qs.map((q) => (
        <div key={q.question} className="mt-1.5">
          <p className="text-[12px] font-medium leading-tight text-label">
            {q.question}
            {q.multiSelect && <span className="ml-1 text-[10px] font-normal text-label-3">{tt("(birden çok seçebilirsin)")}</span>}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {q.options.map((o) => {
              const on = picks[q.question]?.includes(o.label);
              return (
                <button
                  key={o.label}
                  title={o.description}
                  onClick={() => toggle(q.question, o.label, q.multiSelect)}
                  className="rounded-full border px-2.5 py-[3px] text-[11px] font-medium transition-colors"
                  style={{ background: tintBg(CLAUDE_COLOR, on ? 30 : 8), borderColor: tintBg(CLAUDE_COLOR, on ? 70 : 25), color: on ? tintText(CLAUDE_COLOR) : undefined }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <button onClick={() => send("")} className="rounded-full px-2.5 py-1 text-[11px] text-label-3 hover:bg-white/[0.08] hover:text-label">
          {tt("Terminalde cevapla")}
        </button>
        <button
          disabled={!done}
          onClick={() => send({ answers: Object.fromEntries(qs.map((q) => [q.question, q.multiSelect ? picks[q.question] : picks[q.question][0]])) })}
          className="rounded-full border px-3 py-1 text-[11px] font-medium disabled:opacity-35"
          style={{ background: tintBg(CLAUDE_COLOR, 26), borderColor: tintBg(CLAUDE_COLOR, 60), color: tintText(CLAUDE_COLOR) }}
        >
          {tt("Gönder")}
        </button>
      </div>
    </div>
  );
}

/** Altta: bağlantı durumu; kaldırma iki adımlı */
function Footer() {
  const setup = useClaude((s) => s.setup);
  const busy = useClaude((s) => s.busy);
  const error = useClaude((s) => s.error);
  const fresh = useClaude((s) => !!s.backup);
  const [confirm, setConfirm] = useState(false);
  if (!setup) return null;
  return (
    <div className="mt-auto flex shrink-0 items-center gap-1.5 pt-0.5 text-[10px] text-label-3">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: setup.stale ? ACCENT.orange : ACCENT.green }} />
      <span className="min-w-0 flex-1 truncate">{error ?? (setup.stale ? tt("Bağlantı eski bir Nook kopyasını gösteriyor") : fresh ? tt("Bağlandı · açık Claude Code oturumlarını yeniden başlat") : tt("Claude Code'a bağlı"))}</span>
      {setup.stale && (
        <button disabled={busy} onClick={() => void connect()} className="rounded-full px-2 py-[2px] text-label-2 hover:bg-white/[0.08] hover:text-label">
          {tt("Yeniden bağla")}
        </button>
      )}
      <button
        disabled={busy}
        onClick={() => (confirm ? void disconnect() : setConfirm(true))}
        onMouseLeave={() => setConfirm(false)}
        className={`flex items-center gap-1 rounded-full px-2 py-[2px] ${confirm ? "bg-red/15 text-red/90" : "hover:bg-white/[0.08] hover:text-label-2"}`}
      >
        <Unlink size={10} />
        {confirm ? tt("Emin misin? Kaldır") : tt("Bağlantıyı kaldır")}
      </button>
    </div>
  );
}

/** Henüz bağlı değil: ne yapılacağını açıkça söyle, onayla yaz */
function Connect() {
  const busy = useClaude((s) => s.busy);
  const error = useClaude((s) => s.error);
  const backup = useClaude((s) => s.backup);
  const statusline = useClaude((s) => s.setup?.statusline);
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="flex items-center gap-2.5 rounded-[16px] border px-3 py-2" style={{ background: tintBg(CLAUDE_COLOR, 9), borderColor: tintBg(CLAUDE_COLOR, 28) }}>
        <MiniNook color={CLAUDE_COLOR} size={30} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium" style={{ color: tintText(CLAUDE_COLOR) }}>
            {tt("Claude Code'u Nook'a bağla")}
          </p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-label-2">{tt("Oturumların ne yaptığını burada gör, izin isteklerini adadan cevapla, plan limitini takip et.")}</p>
        </div>
      </div>
      <ul className="space-y-0.5 px-1 text-[10.5px] leading-snug text-label-3">
        <Li>{tt("~/.claude/settings.json'a Nook'un hook'ları eklenir, önce yedeği alınır; seninkilere dokunulmaz.")}</Li>
        <Li>{statusline === "other" ? tt("Kendi durum satırın korunur; plan göstergesi bu yüzden kapalı kalır.") : tt("Plan göstergesi için durum satırı Nook'a bağlanır (terminale bir şey yazmaz).")}</Li>
        <Li>{tt("Terminal öndeyken izin orada sorulur, başka yerdeysen adaya gelir. Nook kapalıysa Claude Code hiç beklemez.")}</Li>
      </ul>
      <div className="mt-auto flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={busy}
          onClick={() => void connect()}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[12px] font-medium disabled:opacity-40"
          style={{ background: tintBg(CLAUDE_COLOR, 26), borderColor: tintBg(CLAUDE_COLOR, 60), color: tintText(CLAUDE_COLOR), boxShadow: `0 0 16px -4px ${CLAUDE_COLOR}` }}
        >
          <Link2 size={13} strokeWidth={2.5} />
          {busy ? tt("Bağlanıyor…") : tt("Bağla")}
        </motion.button>
        <AnimatePresence>
          {(error || backup) && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`min-w-0 flex-1 truncate text-[10px] ${error ? "text-red/90" : "text-label-3"}`} title={error ?? backup ?? ""}>
              {error ?? tt("Yedek: {0}", backup!.split(/[\\/]/).pop()!)}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-1.5">
      <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ background: CLAUDE_COLOR }} />
      <span>{children}</span>
    </li>
  );
}
