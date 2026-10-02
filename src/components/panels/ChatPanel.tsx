import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, AppWindow, ArrowUp, Brain, CircleAlert, Clapperboard, Globe, Mic, Music, Square, StickyNote, Target, ToggleRight, X, type LucideIcon } from "lucide-react";
import { toggleVoice } from "../../hooks/useFeatures";
import { useGemini } from "../../hooks/useGemini";
import { setInteractive } from "../../lib/bridge";
import type { ToolNote } from "../../lib/aiTools";
import { sendChat, stopChat } from "../../lib/chat";
import { spring } from "../../lib/motion";
import { useNook, type ChatItem } from "../../store/nook";
import { ACCENT, tintBg, tintText } from "../ui/primitives";

const SUGGESTIONS = ["Bana bir şaka anlat", "Yarın 8'de alarm kur", "25 dakika odaklanalım", "Mikrofonumu kapat", "Şu an ne çalıyor?"];
const SCREEN_SUGGESTIONS = ["Bu ne?", "Özetle", "Bu hatayı nasıl çözerim?", "Türkçeye çevir"];

const NOTE_STYLE: Record<ToolNote["icon"], { icon: LucideIcon; color: string }> = {
  alarm: { icon: AlarmClock, color: ACCENT.yellow },
  toggle: { icon: ToggleRight, color: ACCENT.green },
  note: { icon: StickyNote, color: ACCENT.orange },
  music: { icon: Music, color: ACCENT.pink },
  app: { icon: AppWindow, color: ACCENT.blue },
  web: { icon: Globe, color: ACCENT.blue },
  memory: { icon: Brain, color: ACCENT.purple },
  error: { icon: CircleAlert, color: ACCENT.red },
  focus: { icon: Target, color: ACCENT.red },
  argus: { icon: Clapperboard, color: ACCENT.orange },
};

/** "Ekrana sor" adayı fare dışarıdayken de açık tutar; başka yere tıklayınca ya da Esc ile kapanır. */
function unpin() {
  const s = useNook.getState();
  if (!s.pinned) return;
  s.setPinned(false);
  void setInteractive(false);
}

/** Yerel yapay zekâ ile sohbet — her şey bilgisayarında kalır. */
export function ChatPanel() {
  const chat = useNook((s) => s.chat);
  const busy = useNook((s) => s.chatBusy);
  const model = useNook((s) => s.settings.aiModel);
  const attachment = useNook((s) => s.attachment);
  const listening = useNook((s) => s.listening);
  const [draft, setDraft] = useState("");
  const gemini = useGemini();
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => input.current?.focus(), 160);
    window.addEventListener("blur", unpin);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("blur", unpin);
    };
  }, []);

  // Yeni mesaj/kelime gelince en alta kaydır
  const last = chat[chat.length - 1];
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, last?.text, last?.notes?.length]);

  const send = (text = draft) => {
    if ((!text.trim() && !attachment) || busy) return;
    setDraft("");
    const image = attachment;
    useNook.getState().setAttachment(null);
    void sendChat(text, { image });
  };

  const ready = gemini.status === "ok" && !!model;

  return (
    <div className="flex h-full flex-col gap-2">
      <div ref={list} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {gemini.status !== "ok" ? (
          <NotReady state={gemini} />
        ) : !chat.length || attachment ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-[11px] text-label-3">{attachment ? "Ekranına baktım — ne sormak istersin?" : "Bana bir şey sor ya da bir iş ver"}</p>
            <div className="flex flex-wrap justify-center gap-1">
              {(attachment ? SCREEN_SUGGESTIONS : SUGGESTIONS).map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full bg-well px-2.5 py-0.5 text-[11px] text-label-2 transition-colors hover:bg-well-hi hover:text-label">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {chat.map((m) => (
              <Message key={m.id} m={m} pending={busy && m === last && !m.text} />
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-well pl-1.5 pr-1 focus-within:bg-well-hi">
        {attachment ? (
          <span className="relative h-7 w-10 shrink-0 overflow-hidden rounded-[8px] ring-1 ring-white/15">
            <img src={attachment} alt="Ekran görüntüsü" className="h-full w-full object-cover" />
            <button
              onClick={() => useNook.getState().setAttachment(null)}
              title="Görüntüyü kaldır"
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
            >
              <X size={11} strokeWidth={3} />
            </button>
          </span>
        ) : (
          <span className="w-2" />
        )}
        <input
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
            if (e.key === "Escape") {
              if (draft) setDraft("");
              else unpin();
            }
          }}
          disabled={!ready}
          spellCheck={false}
          placeholder={!ready ? "Yapay zekâ hazır değil" : listening ? "Dinliyorum… bitince tekrar bas" : attachment ? "Ekran hakkında sor…" : "Nook'a yaz…"}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-label outline-none placeholder:text-label-3"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={spring.pop}
          onClick={() => void toggleVoice()}
          disabled={!ready || busy}
          title={listening ? "Bitir ve gönder" : "Sesle sor"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          style={listening ? { background: tintBg(ACCENT.red, 30), color: tintText(ACCENT.red) } : { color: "var(--color-label-2)" }}
        >
          <Mic size={13} strokeWidth={2.5} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={spring.pop}
          onClick={() => (busy ? stopChat() : send())}
          disabled={!ready || (!busy && !draft.trim() && !attachment)}
          title={busy ? "Durdur" : "Gönder"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-30"
          style={{ background: busy ? tintBg(ACCENT.red, 30) : ACCENT.purple, color: busy ? tintText(ACCENT.red) : "white" }}
        >
          {busy ? <Square size={10} fill="currentColor" /> : <ArrowUp size={14} strokeWidth={2.8} />}
        </motion.button>
      </div>
    </div>
  );
}

function Message({ m, pending }: { m: ChatItem; pending: boolean }) {
  const mine = m.role === "user";
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
    >
      {m.image && <img src={m.image} alt="" className="mb-1 max-h-16 rounded-[10px] ring-1 ring-white/10" />}
      {(m.text || pending) && (
        <div
          className={`max-w-[88%] whitespace-pre-wrap break-words text-[12.5px] leading-snug ${
            mine ? "rounded-[14px] rounded-br-[4px] bg-white/[0.1] px-3 py-1.5 text-label" : m.error ? "text-red/90" : "text-label"
          }`}
          style={mine ? undefined : { userSelect: "text" }}
        >
          {pending ? <Typing /> : m.voice ? (
            <span className="inline-flex items-start gap-1">
              <Mic size={10} strokeWidth={2.6} className="mt-[3px] shrink-0 text-label-3" />
              {m.text}
            </span>
          ) : (
            m.text
          )}
        </div>
      )}
      {!!m.notes?.length && (
        <div className="mt-1 flex flex-wrap gap-1">
          {m.notes.map((n, i) => {
            const st = NOTE_STYLE[n.icon];
            return (
              <span
                key={i}
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
                style={{ background: tintBg(st.color, 12), borderColor: tintBg(st.color, 34), color: tintText(st.color) }}
              >
                <st.icon size={10} strokeWidth={2.6} />
                {n.text}
              </span>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function Typing() {
  return (
    <span className="flex h-4 items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-label-3"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/** Anahtar yok / geçersiz / kontrol ediliyor */
function NotReady({ state }: { state: ReturnType<typeof useGemini> }) {
  const go = () => useNook.getState().setTab("settings");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-[12px] leading-relaxed text-label-2">
        {state.status === "checking"
          ? "Gemini'ye bağlanıyorum…"
          : state.status === "error"
            ? `Gemini'ye bağlanamadım: ${state.error}`
            : "Konuşabilmem için Ayarlar'a Gemini API anahtarını yapıştırman lazım."}
      </p>
      {state.status !== "checking" && (
        <button
          onClick={go}
          className="rounded-full border px-3 py-1 text-[11.5px] font-medium"
          style={{ background: tintBg(ACCENT.purple, 16), borderColor: tintBg(ACCENT.purple, 40), color: tintText(ACCENT.purple) }}
        >
          Ayarlar'a git
        </button>
      )}
    </div>
  );
}
