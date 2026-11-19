import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, AppWindow, ArrowUp, Brain, Check, CircleAlert, Clapperboard, ExternalLink, Globe, MessageCircle, Mic, Monitor, Music, Sparkles, Square, StickyNote, Target, ToggleRight, X, type LucideIcon } from "lucide-react";
import { toggleVoice } from "../../hooks/useFeatures";
import { useAi } from "../../hooks/useGemini";
import { isPinnedBottom, useScrollMemory } from "../../hooks/useScrollMemory";
import { openPath, setInteractive } from "../../lib/bridge";
import { isStudio } from "../../lib/studio";
import { prettyKeys } from "../../lib/shortcuts";
import { KeyInput } from "./SettingsPanel";
import type { ToolNote } from "../../lib/aiTools";
import { sendChat, stopChat } from "../../lib/chat";
import { spring } from "../../lib/motion";
import { useNook, type ChatItem } from "../../store/nook";
import { ek, useNookName } from "../../lib/look";
import { ACCENT, Segmented, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

const SCREEN_SUGGESTIONS = [tt("Bu ne?"), tt("Özetle"), tt("Bu hatayı nasıl çözerim?"), tt("Türkçeye çevir")];

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

/** Gemini ile sohbet. `autoFocus`: açılınca yazma kutusu odaklansın (Studio ana sayfasında kapalı) */
export function ChatPanel({ autoFocus = true }: { autoFocus?: boolean }) {
  const chat = useNook((s) => s.chat);
  const busy = useNook((s) => s.chatBusy);
  const attachment = useNook((s) => s.attachment);
  const listening = useNook((s) => s.listening);
  const name = useNookName();
  const [draft, setDraft] = useState("");
  const gemini = useAi();
  const model = gemini.model;
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const askKeys = useNook((s) => s.settings.askShortcut);
  const voiceKeys = useNook((s) => s.settings.voiceShortcut);
  // Geliştirmede ?aiok: anahtar varmış gibi (boş sohbetin önizlemesi)
  const status = import.meta.env.DEV && new URLSearchParams(location.search).has("aiok") ? "ok" : gemini.status;
  // Kurulum kartı bu açılışta göründüyse anahtar tutunca bir an "Bağlandı" der, sonra sohbete geçer
  const [setup, setSetup] = useState(status === "nokey" || status === "error");
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (status === "nokey" || status === "error") return setSetup(true);
    if (status !== "ok" || !setup) return;
    setSetup(false);
    setConnected(true);
    const t = window.setTimeout(() => setConnected(false), 1400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const t = autoFocus ? window.setTimeout(() => input.current?.focus(), 160) : 0;
    window.addEventListener("blur", unpin);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("blur", unpin);
    };
  }, []);

  // Kapanıp açılınca kaldığı yer korunur (ilk açılışta en alt)
  useScrollMemory("chat", list, true);
  // Yeni mesaj gelince en alta kaydır; cevap akarken yalnızca kullanıcı zaten en alttaysa
  const last = chat[chat.length - 1];
  const seen = useRef({ n: chat.length, mounted: false });
  useEffect(() => {
    const first = !seen.current.mounted;
    const added = chat.length !== seen.current.n;
    seen.current = { n: chat.length, mounted: true };
    if (first || (!added && !isPinnedBottom("chat"))) return;
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, last?.text, last?.notes?.length]);

  const send = (text = draft) => {
    if ((!text.trim() && !attachment) || busy) return;
    setDraft("");
    const image = attachment;
    useNook.getState().setAttachment(null);
    void sendChat(text, { image });
  };

  const ready = status === "ok" && (!!model || status !== gemini.status);

  const starters: { icon: LucideIcon; color: string; title: string; text: string; keys?: string; run?: () => void }[] = [
    { icon: MessageCircle, color: ACCENT.purple, title: tt("Sor"), text: tt("Bana bir şaka anlat"), run: () => send(tt("Bana bir şaka anlat")) },
    {
      icon: Sparkles,
      color: ACCENT.yellow,
      title: tt("Yaptır"),
      text: tt("Yarın 8'de alarm kur"),
      run: () => {
        setDraft(tt("Yarın 8'de alarm kur"));
        input.current?.focus();
      },
    },
    { icon: Monitor, color: ACCENT.blue, title: tt("Ekrana sor"), text: tt("Ekranındakini sor"), keys: askKeys },
    { icon: Mic, color: ACCENT.pink, title: tt("Sesle"), text: tt("Bas, konuş, yine bas"), keys: voiceKeys, run: () => void toggleVoice() },
  ];

  return (
    <div className="flex h-full flex-col gap-2">
      <div ref={list} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {status !== "ok" || connected ? (
          setup || connected ? (
            <SetupCard state={gemini} connected={connected} />
          ) : (
            <p className="flex h-full items-center justify-center text-[12px] text-label-2">{tt("{0} bağlanıyor…", gemini.provider === "claude" ? "Claude" : "Gemini")}</p>
          )
        ) : attachment ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-[11px] text-label-3">{tt("Ekranına baktım — ne sormak istersin?")}</p>
            <div className="flex flex-wrap justify-center gap-1">
              {SCREEN_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full bg-well px-2.5 py-0.5 text-[11px] text-label-2 transition-colors hover:bg-well-hi hover:text-label">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : !chat.length ? (
          // Boş sohbet: dört başlangıç kartı (sor, yaptır, ekrana sor, sesle)
          <div className="grid h-full grid-cols-2 content-center gap-2">
            {starters.map((c, i) => (
              <motion.button
                key={c.title}
                onClick={c.run}
                disabled={!c.run}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={c.run ? { scale: 0.97 } : undefined}
                transition={{ type: "spring", stiffness: 460, damping: 32, delay: i * 0.03 }}
                className={`flex min-w-0 items-center gap-2.5 rounded-[16px] border px-3 py-2.5 text-left ${c.run ? "" : "cursor-default"}`}
                style={{ background: `linear-gradient(150deg, ${tintBg(c.color, 13)} 0%, ${tintBg(c.color, 4)} 100%)`, borderColor: tintBg(c.color, 32) }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]" style={{ background: tintBg(c.color, 22), color: tintText(c.color) }}>
                  <c.icon size={17} strokeWidth={2.3} />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="flex items-center gap-1.5">
                    <span className="whitespace-nowrap text-[13px] font-bold" style={{ color: tintText(c.color) }}>
                      {c.title}
                    </span>
                    {c.keys && <span className="truncate rounded-[6px] bg-black/30 px-1.5 py-[1px] text-[10px] font-semibold text-label-2">{prettyKeys(c.keys).replace(/ \+ /g, "+")}</span>}
                  </span>
                  <span className="mt-[3px] block truncate text-[11.5px] text-label-2">{c.keys || !c.run ? c.text : `“${c.text}”`}</span>
                </span>
              </motion.button>
            ))}
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
            <img src={attachment} alt={tt("Ekran görüntüsü")} className="h-full w-full object-cover" />
            <button
              onClick={() => useNook.getState().setAttachment(null)}
              title={tt("Görüntüyü kaldır")}
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
          placeholder={!ready ? tt("Yapay zekâ hazır değil") : listening ? tt("Dinliyorum… bitince tekrar bas") : attachment ? tt("Ekran hakkında sor…") : tt("{0} yaz…", ek(name, "a"))}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-label outline-none placeholder:text-label-3"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={spring.pop}
          onClick={() => void toggleVoice()}
          disabled={!ready || busy}
          title={listening ? tt("Bitir ve gönder") : tt("Sesle sor")}
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
          title={busy ? tt("Durdur") : tt("Gönder")}
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

/**
 * Anahtar yokken sohbetin içindeki üç adımlı kurulum: anahtarı al, buraya yapıştır, dene.
 * Üstte Gemini / Claude seçimi; anahtar tutunca "Bağlandı" der ve sohbet açılır.
 */
function SetupCard({ state, connected }: { state: ReturnType<typeof useAi>; connected: boolean }) {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const claude = state.provider === "claude";
  const status = connected ? "ok" : state.status;
  const site = claude ? "console.anthropic.com" : "aistudio.google.com";
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-label">{tt("Konuşabilmem için bir anahtar lazım")}</p>
        <Segmented
          id="chat-ai"
          color={ACCENT.purple}
          value={state.provider}
          onChange={(v) => update({ aiProvider: v })}
          options={[
            { id: "gemini", label: "Gemini" },
            { id: "claude", label: "Claude" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <SetupStep n={1} title={tt("Anahtarı al")} hint={claude ? tt("Hesabınla gir → \"Create Key\"") : tt("Google hesabınla gir → \"Create API key\"")}>
          <button
            onClick={() => void openPath(claude ? "https://console.anthropic.com/settings/keys" : "https://aistudio.google.com/apikey")}
            className="flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11px] font-medium"
            style={{ background: tintBg(ACCENT.blue, 16), borderColor: tintBg(ACCENT.blue, 40), color: tintText(ACCENT.blue) }}
          >
            {site}
            <ExternalLink size={11} strokeWidth={2.4} />
          </button>
        </SetupStep>
        <SetupStep n={2} title={tt("Buraya yapıştır")} hint={status === "error" ? state.error || tt("Bu anahtar çalışmadı") : tt("Yalnızca bu bilgisayarda saklanır.")} bad={status === "error"}>
          {claude ? <KeyInput key="claude" value={s.claudeKey} placeholder="sk-ant-…" onChange={(v) => update({ claudeKey: v })} /> : <KeyInput key="gemini" value={s.geminiKey} onChange={(v) => update({ geminiKey: v })} />}
        </SetupStep>
        <SetupStep
          n={3}
          title={tt("Dene")}
          done={status === "ok"}
          hint={status === "ok" ? tt("Artık konuşabiliriz.") : status === "error" ? tt("Anahtarı kontrol edip yeniden yapıştır.") : tt("Yapıştırınca kendim denerim.")}
        >
          <p className="flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold" style={{ color: status === "ok" ? tintText(ACCENT.green) : "var(--color-label-2)" }}>
            {status === "ok" && <Check size={13} strokeWidth={3} />}
            {status === "ok" ? tt("Bağlandı") : status === "checking" ? tt("Deneniyor…") : status === "error" ? tt("Olmadı") : tt("Bekliyorum")}
          </p>
        </SetupStep>
      </div>
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-[10.5px] leading-snug text-label-3">
          {claude ? tt("Claude için ücretli bir Anthropic API anahtarı gerekir; Gemini ücretsizdir.") : tt("Gemini anahtarı ücretsiz, bir dakikada alınır. Anahtarsız da Nook'un gerisi çalışır.")}
        </p>
        {!isStudio && (
          <button onClick={() => useNook.getState().setTab("home")} className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium text-label-3 transition-colors hover:bg-well-hi hover:text-label">
            {tt("Şimdilik geç")}
          </button>
        )}
      </div>
    </div>
  );
}

function SetupStep({ n, title, hint, done, bad, children }: { n: number; title: string; hint: string; done?: boolean; bad?: boolean; children: React.ReactNode }) {
  const c = done ? ACCENT.green : ACCENT.purple;
  return (
    <div className="flex min-h-[40px] min-w-0 items-center gap-2.5 rounded-[14px] border px-2.5 py-1.5" style={{ background: tintBg(c, 7), borderColor: tintBg(c, 26) }}>
      <p className="flex w-[124px] shrink-0 items-center gap-1.5 text-[12.5px] font-bold text-label">
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10.5px]" style={{ background: tintBg(c, 28), color: tintText(c) }}>
          {n}
        </span>
        {title}
      </p>
      <div className="shrink-0">{children}</div>
      <p className="line-clamp-2 min-w-0 flex-1 break-words text-[10.5px] leading-snug" style={{ color: bad ? "var(--color-red)" : "var(--color-label-3)" }}>
        {hint}
      </p>
    </div>
  );
}
