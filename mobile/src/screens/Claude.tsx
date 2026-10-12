import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, FileCode2, Terminal, X } from "lucide-react";
import { cached, claudeDecide, getClaude, type ClaudeAskInfo, type ClaudeInfo, type ClaudeQuestionInfo, type ClaudeSessionInfo, type ClaudeWindow, type Pairing } from "../lib/pc";
import { errText, tintBg, tintText, TopBar, useBackButton, useToast } from "../ui";
import type { Conn } from "../App";

const CLAUDE = "#D97757";
const POLL_MS = 2000;

const STATE: Record<ClaudeSessionInfo["state"], { label: string; color: string }> = {
  working: { label: "Çalışıyor", color: "#3d8bff" },
  waiting: { label: "Onay bekliyor", color: CLAUDE },
  done: { label: "Bitti", color: "#3ccf6e" },
  idle: { label: "Seni bekliyor", color: "#9a9aa2" },
};

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60_000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} sa önce` : `${Math.round(h / 24)} gün önce`;
}

function resetIn(w: ClaudeWindow) {
  const min = Math.max(0, Math.round((w.resetsAt - Date.now()) / 60_000));
  if (min < 60) return `${min} dk sonra sıfırlanır`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} sa ${min % 60} dk sonra sıfırlanır` : `${Math.round(h / 24)} gün sonra sıfırlanır`;
}

/**
 * Claude: PC'deki Claude Code oturumları, bekleyen onaylar ve plan kullanımı. PC'nin başında
 * değilken Claude bir komut için izin isterse buradan izin verilir ya da reddedilir; soru sorarsa
 * buradan cevaplanır. PC kapalıyken son görülen durum gösterilir.
 */
export function ClaudeScreen({ pairing, conn, onBack }: { pairing: Pairing; conn: Conn; onBack: () => void }) {
  useBackButton(onBack);
  const online = conn === "online";
  const [toast, say] = useToast();
  const [info, setInfo] = useState<ClaudeInfo | null>(() => cached<ClaudeInfo>("claude"));
  // Cevaplanan istekler bir sonraki tazelemede tekrar görünmesin
  const answered = useRef(new Set<number>());

  useEffect(() => {
    if (!online) return;
    let alive = true;
    const load = () =>
      getClaude(pairing)
        .then((c) => alive && setInfo(c))
        .catch(() => {});
    void load();
    const t = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [pairing, online]);

  const decide = async (ask: ClaudeAskInfo, decision: Parameters<typeof claudeDecide>[2]) => {
    answered.current.add(ask.askId);
    setInfo((c) => (c ? { ...c, asks: c.asks.filter((a) => a.askId !== ask.askId) } : c));
    try {
      await claudeDecide(pairing, ask.askId, decision);
      say(decision === "deny" ? "Reddedildi" : "Gönderildi; Claude devam ediyor");
    } catch (e) {
      answered.current.delete(ask.askId);
      say(errText(e));
    }
  };

  const asks = (info?.asks ?? []).filter((a) => !answered.current.has(a.askId));
  const sessions = info?.sessions ?? [];

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4 pb-8">
      <TopBar title="Claude" nook="claude" onBack={() => history.back()} />

      {info && !info.present ? (
        <Note>Bu bilgisayarda Claude Code bulunamadı.</Note>
      ) : info && !info.hooked ? (
        <Note>PC'de Nook › Claude bölümünden “Bağlan”a bas; sonra açtığın Claude Code oturumları burada görünür.</Note>
      ) : null}
      {!online && <p className="-mt-1 px-1 text-[12px] text-label-3">PC'ye ulaşılamıyor; son görülen durum. Onaylar PC açıkken verilebilir.</p>}

      {info?.plan && (info.plan.fiveHour || info.plan.sevenDay) && (
        <section className="grid grid-cols-2 gap-2.5">
          {info.plan.fiveHour && <PlanCard label="5 saatlik" w={info.plan.fiveHour} />}
          {info.plan.sevenDay && <PlanCard label="Haftalık" w={info.plan.sevenDay} />}
        </section>
      )}

      <AnimatePresence initial={false}>
        {asks.map((a) => (
          <motion.div key={a.askId} initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}>
            <AskCard ask={a} disabled={!online} onDecide={(d) => void decide(a, d)} />
          </motion.div>
        ))}
      </AnimatePresence>

      {sessions.length > 0 && (
        <>
          <h2 className="-mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Oturumlar</h2>
          {sessions.map((s) => (
            <SessionCard key={s.id} s={s} />
          ))}
        </>
      )}
      {info && info.hooked && sessions.length === 0 && asks.length === 0 && <Note>Şu an açık bir Claude Code oturumu yok.</Note>}
      {!info && <Note>{online ? "Yükleniyor…" : "PC açılınca Claude oturumların burada görünür."}</Note>}
      {toast}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-3xl bg-card p-4 text-[13.5px] leading-snug text-label-2">{children}</p>;
}

function PlanCard({ label, w }: { label: string; w: ClaudeWindow }) {
  const pct = w.resetsAt <= Date.now() ? 0 : Math.round(w.usedPct);
  const color = pct >= 90 ? "#f0545c" : pct >= 70 ? "#f2a33a" : CLAUDE;
  return (
    <div className="rounded-3xl bg-card p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] text-label-2">{label}</span>
        <span className="font-round text-[18px] font-bold" style={{ color: tintText(color) }}>
          %{pct}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/30">
        <div className="h-full rounded-full" style={{ width: `${Math.max(3, pct)}%`, background: color }} />
      </div>
      <p className="mt-1.5 text-[11px] text-label-3">{resetIn(w)}</p>
    </div>
  );
}

/** Onay isteği: komut/dosya, izin ver · her zaman · reddet; ya da Claude'un sorusu ve seçenekleri */
function AskCard({ ask, disabled, onDecide }: { ask: ClaudeAskInfo; disabled: boolean; onDecide: (d: Parameters<typeof claudeDecide>[2]) => void }) {
  const qs = ask.questions ?? [];
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const ready = qs.length > 0 && qs.every((q) => (picks[q.question] ?? []).length > 0);
  const pick = (q: ClaudeQuestionInfo, label: string) => {
    // Tek soru, tek seçim: dokununca hemen gönder
    if (qs.length === 1 && !q.multiSelect) return onDecide({ answers: { [q.question]: label } });
    setPicks((p) => {
      const cur = p[q.question] ?? [];
      const next = q.multiSelect ? (cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]) : [label];
      return { ...p, [q.question]: next };
    });
  };
  return (
    <section className="rounded-3xl p-4" style={{ background: tintBg(CLAUDE, 12), border: `1px solid ${tintBg(CLAUDE, 34)}` }}>
      <p className="text-[12px] font-medium" style={{ color: tintText(CLAUDE) }}>
        {ask.project} · {ago(ask.at)}
      </p>
      <p className="mt-0.5 text-[16px] font-bold">{ask.title}</p>
      {ask.detail && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-2xl bg-black/35 p-3 font-mono text-[12px] leading-snug text-label-2">{ask.detail}</pre>}

      {qs.length > 0 ? (
        <div className="mt-3 space-y-3">
          {qs.map((q) => (
            <div key={q.question}>
              <p className="text-[13.5px] font-semibold">{q.question}</p>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {q.options.map((o) => {
                  const on = (picks[q.question] ?? []).includes(o.label);
                  return (
                    <motion.button
                      key={o.label}
                      whileTap={{ scale: 0.98 }}
                      disabled={disabled}
                      onClick={() => pick(q, o.label)}
                      className="rounded-2xl px-3.5 py-2.5 text-left disabled:opacity-40"
                      style={{ background: on ? tintBg(CLAUDE, 30) : "rgba(0,0,0,0.25)", border: `1px solid ${on ? CLAUDE : "transparent"}` }}
                    >
                      <span className="block text-[14px] font-semibold">{o.label}</span>
                      {o.description && <span className="mt-0.5 block text-[12px] leading-snug text-label-3">{o.description}</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
          {!(qs.length === 1 && !qs[0].multiSelect) && (
            <button
              disabled={disabled || !ready}
              onClick={() => onDecide({ answers: Object.fromEntries(qs.map((q) => [q.question, q.multiSelect ? picks[q.question] : picks[q.question][0]])) })}
              className="w-full rounded-2xl py-3 text-[15px] font-bold text-black disabled:opacity-40"
              style={{ background: CLAUDE }}
            >
              Gönder
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Btn label="İzin ver" icon={<Check size={16} strokeWidth={3} />} primary disabled={disabled} onClick={() => onDecide("allow")} />
          {ask.canAlways && <Btn label="Her zaman" disabled={disabled} onClick={() => onDecide("always")} />}
          <Btn label="Reddet" icon={<X size={16} strokeWidth={3} />} danger disabled={disabled} onClick={() => onDecide("deny")} />
        </div>
      )}
    </section>
  );
}

function Btn({ label, icon, primary, danger, disabled, onClick }: { label: string; icon?: React.ReactNode; primary?: boolean; danger?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-[14.5px] font-bold disabled:opacity-40 ${primary ? "text-black" : danger ? "bg-red/15 text-red" : "bg-black/25 text-label"}`}
      style={primary ? { background: CLAUDE } : undefined}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function SessionCard({ s }: { s: ClaudeSessionInfo }) {
  const st = STATE[s.state];
  return (
    <section className="rounded-3xl bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: st.color, boxShadow: s.state === "working" ? `0 0 8px ${st.color}` : undefined }} />
        <span className="min-w-0 flex-1 truncate text-[15.5px] font-bold">{s.project}</span>
        <span className="shrink-0 text-[11.5px] text-label-3">{ago(s.updatedAt)}</span>
      </div>
      <p className="mt-1 text-[12.5px] font-medium" style={{ color: tintText(st.color) }}>
        {s.action || st.label}
      </p>
      {s.prompt && <p className="mt-2 rounded-2xl bg-well px-3 py-2 text-[13px] leading-snug text-label-2">{s.prompt}</p>}
      {s.reply && <p className="mt-2 text-[13px] leading-snug text-label">{s.reply}</p>}
      {(s.edits > 0 || s.commands > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-label-3">
          {s.edits > 0 && (
            <span className="flex items-center gap-1">
              <FileCode2 size={12} /> {s.edits} düzenleme
            </span>
          )}
          {s.commands > 0 && (
            <span className="flex items-center gap-1">
              <Terminal size={12} /> {s.commands} komut
            </span>
          )}
          {s.files.length > 0 && <span className="truncate">{s.files.slice(0, 3).join(", ")}</span>}
        </div>
      )}
    </section>
  );
}
