import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  LockKeyhole,
  Bell,
  Bluetooth,
  Coffee,
  Droplet,
  Eye,
  Gamepad2,
  Globe,
  Languages,
  Target,
  WifiOff,
  BatteryCharging,
  BatteryLow,
  BatteryWarning,
  Camera,
  Clapperboard,
  Download,
  Fan,
  Headphones,
  MessageCircle,
  Mic,
  PlugZap,
  Reply,
  SendHorizontal,
  Usb,
  Video,
  X,
  type LucideIcon,
  Heart,
  Fish,
  ShieldCheck,
  Gauge,
  CalendarClock,
  ClipboardList,
  Inbox,
  Radio,
  Bot,
  Smartphone,
  Power,
} from "lucide-react";
import { setInteractive, type SysEventKind } from "../../lib/bridge";
import { isLive, useNook } from "../../store/nook";
import { tt } from "../../lib/i18n";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { CLAUDE_COLOR } from "../../lib/claude";
import { replyToNotification, useWhatsApp, WA_COLOR } from "../../lib/whatsapp";

export const STYLE: Record<SysEventKind, { icon: LucideIcon; color: string }> = {
  sensitive: { icon: LockKeyhole, color: ACCENT.yellow },
  charging: { icon: BatteryCharging, color: ACCENT.green },
  unplugged: { icon: PlugZap, color: ACCENT.orange },
  "battery-low": { icon: BatteryLow, color: ACCENT.red },
  "usb-in": { icon: Usb, color: ACCENT.blue },
  "usb-out": { icon: Usb, color: ACCENT.gray },
  audio: { icon: Headphones, color: ACCENT.purple },
  screenshot: { icon: Camera, color: ACCENT.teal },
  "device-low": { icon: BatteryWarning, color: ACCENT.red },
  "headset-charging": { icon: BatteryCharging, color: ACCENT.green },
  fan: { icon: Fan, color: ACCENT.blue },
  mic: { icon: Mic, color: ACCENT.orange },
  camera: { icon: Video, color: ACCENT.green },
  download: { icon: Download, color: ACCENT.blue },
  chat: { icon: MessageCircle, color: ACCENT.purple },
  online: { icon: Globe, color: ACCENT.green },
  offline: { icon: WifiOff, color: ACCENT.red },
  "bt-in": { icon: Bluetooth, color: ACCENT.blue },
  "bt-out": { icon: Bluetooth, color: ACCENT.gray },
  notify: { icon: Bell, color: ACCENT.blue },
  translate: { icon: Languages, color: ACCENT.purple },
  focus: { icon: Target, color: ACCENT.red },
  break: { icon: Coffee, color: ACCENT.teal },
  eye: { icon: Eye, color: ACCENT.teal },
  water: { icon: Droplet, color: ACCENT.blue },
  game: { icon: Gamepad2, color: ACCENT.green },
  play: { icon: Gamepad2, color: ACCENT.pink },
  update: { icon: Download, color: ACCENT.green },
  argus: { icon: Clapperboard, color: ACCENT.orange },
  welcome: { icon: Heart, color: ACCENT.pink },
  fish: { icon: Fish, color: ACCENT.yellow },
  guard: { icon: ShieldCheck, color: ACCENT.green },
  alert: { icon: Gauge, color: ACCENT.orange },
  calendar: { icon: CalendarClock, color: ACCENT.blue },
  clip: { icon: ClipboardList, color: ACCENT.purple },
  shelf: { icon: Inbox, color: ACCENT.teal },
  live: { icon: Radio, color: ACCENT.red },
  claude: { icon: Bot, color: CLAUDE_COLOR },
  phone: { icon: Smartphone, color: ACCENT.blue },
  power: { icon: Power, color: ACCENT.red },
};

/** Sistem olayı kartı: solda Nook (rozetli), ortada metin, sağda renkli mini avatar. */
/** Yayında içeriği gizlenen kartlar (bildirim, çeviri, hassas veri, etkinlik, pano) */
const LIVE_MASKED = new Set<SysEventKind>(["notify", "translate", "sensitive", "calendar", "clip", "claude"]);

export function ToastView() {
  const raw = useNook((s) => s.toasts[0]);
  const live = useNook(isLive);
  const waReady = useWhatsApp((s) => s.web.status === "ready");
  const masked = !!(raw && live && LIVE_MASKED.has(raw.kind));
  const toast = masked
    ? { ...raw!, title: raw!.kind === "notify" ? tt("Yeni bildirim") : tt("Yeni olay"), detail: tt("Yayındayken gizli"), icon: null, replyKey: null, whatsappChat: null }
    : raw;

  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReplying(false);
    setText("");
    setSending(false);
  }, [toast?.id]);

  useEffect(() => {
    if (!replying) return;
    void setInteractive(true);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      void setInteractive(false);
    };
  }, [replying]);

  const canReply = !masked && !!(toast?.replyKey || (toast?.whatsappChat && waReady));
  const isWa = !masked && !!toast?.whatsappChat;
  const accentColor = isWa ? WA_COLOR : toast ? STYLE[toast.kind].color : ACCENT.blue;

  const openWaChat = () => {
    if (!toast?.whatsappChat) return;
    useWhatsApp.getState().selectChat(toast.whatsappChat);
    const s = useNook.getState();
    s.noteModuleUse("whatsapp");
    s.setTab("whatsapp");
    s.shiftToast();
  };

  const sendReply = async () => {
    if (!toast || !text.trim() || sending) return;
    setSending(true);
    const ok = await replyToNotification(
      { title: toast.title, app: toast.whatsappChat ? "WhatsApp" : "", replyKey: toast.replyKey },
      text.trim(),
    );
    setSending(false);
    if (ok) {
      useNook.getState().shiftToast();
    }
  };

  return (
    <motion.div
      className="absolute inset-y-0 left-[52px] right-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.18 } }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {toast && (
          <motion.div
            key={toast.id}
            className="flex h-full items-center gap-2.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {replying ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  placeholder={tt("{0} kişisine yanıt yaz…", toast.title)}
                  onChange={(e) => setText(e.target.value)}
                  onPointerDown={() => inputRef.current?.focus()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendReply();
                    else if (e.key === "Escape") setReplying(false);
                  }}
                  className="h-7 min-w-0 flex-1 rounded-full border border-white/10 bg-well px-3 text-[11.5px] text-label outline-none placeholder:text-label-3 focus:border-white/25 focus:bg-well-hi"
                />
                <button
                  disabled={!text.trim() || sending}
                  onClick={() => void sendReply()}
                  title={tt("Gönder")}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border disabled:opacity-35"
                  style={{
                    background: tintBg(accentColor, 22),
                    borderColor: tintBg(accentColor, 50),
                    color: tintText(accentColor),
                  }}
                >
                  <SendHorizontal size={12} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setReplying(false)}
                  title={tt("Vazgeç")}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label"
                >
                  <X size={12} strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              <>
                <div
                  className={`min-w-0 flex-1 ${isWa ? "cursor-pointer" : ""}`}
                  onClick={isWa ? openWaChat : undefined}
                  title={isWa ? tt("WhatsApp sohbetini aç") : undefined}
                >
                  <p className="truncate text-[13px] font-medium leading-tight" style={{ color: tintText(accentColor) }}>
                    {toast.title}
                  </p>
                  {toast.detail && <p className="mt-0.5 truncate text-[11px] leading-tight text-label-2">{toast.detail}</p>}
                </div>

                {(canReply || isWa) && (
                  <div className="flex shrink-0 items-center gap-1">
                    {canReply && (
                      <button
                        onClick={() => setReplying(true)}
                        className="flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition-transform active:scale-95"
                        style={{
                          background: tintBg(accentColor, 18),
                          borderColor: tintBg(accentColor, 44),
                          color: tintText(accentColor),
                        }}
                      >
                        <Reply size={11.5} strokeWidth={2.5} />
                        {tt("Yanıtla")}
                      </button>
                    )}
                    {isWa && (
                      <button
                        onClick={openWaChat}
                        title={tt("WhatsApp sekmesinde aç")}
                        className="flex h-7 items-center rounded-full bg-well px-2 text-[10.5px] font-medium text-label-2 hover:bg-well-hi hover:text-label"
                      >
                        {tt("Aç")}
                      </button>
                    )}
                    <button
                      onClick={() => useNook.getState().shiftToast()}
                      title={tt("Kapat")}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-label-3 hover:bg-white/10 hover:text-label"
                    >
                      <X size={11.5} strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                <motion.span initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 16 }}>
                  {toast.icon ? (
                    <img src={toast.icon} alt="" draggable={false} className="h-7 w-7 rounded-[8px] object-contain" />
                  ) : (
                    <MiniNook color={accentColor} size={28} icon={STYLE[toast.kind].icon} />
                  )}
                </motion.span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
