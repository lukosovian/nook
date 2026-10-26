import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Bell, BellOff, ExternalLink, Link2, MessageCircle, QrCode, SendHorizontal, Smartphone, Unlink } from "lucide-react";
import { useNook } from "../../store/nook";
import {
  connectWhatsAppWeb,
  disconnectWhatsAppWeb,
  sendWhatsAppMessage,
  useActiveWaMessages,
  useUnifiedWaChats,
  useWhatsApp,
  WA_COLOR,
} from "../../lib/whatsapp";
import { spring } from "../../lib/motion";
import { tt } from "../../lib/i18n";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";

export function WhatsAppPanel() {
  const web = useWhatsApp((s) => s.web);
  const selected = useWhatsApp((s) => s.selectedChat);
  const selectChat = useWhatsApp((s) => s.selectChat);
  const sending = useWhatsApp((s) => s.sending);
  const error = useWhatsApp((s) => s.error);
  const whatsappNotify = useNook((s) => s.settings.whatsappNotify);
  const chats = useUnifiedWaChats();
  const activeChat = selected ?? chats[0]?.title ?? null;
  const activeInfo = chats.find((c) => c.title.toLowerCase() === (activeChat ?? "").toLowerCase()) ?? null;
  const messages = useActiveWaMessages(activeChat);

  const [draft, setDraft] = useState("");
  const [showQrPane, setShowQrPane] = useState(false);
  const msgScroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selected && chats[0]) {
      selectChat(chats[0].title);
    }
  }, [selected, chats, selectChat]);

  useEffect(() => {
    const el = msgScroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activeChat]);

  useEffect(() => {
    if (web.status === "ready") setShowQrPane(false);
  }, [web.status]);

  const canReply = web.status === "ready" || !!activeInfo?.replyKey;

  const submit = async () => {
    if (!activeChat || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft("");
    const ok = await sendWhatsAppMessage(activeChat, text, activeInfo?.replyKey);
    if (!ok) setDraft(text);
    else inputRef.current?.focus();
  };

  const handleConnectClick = () => {
    setShowQrPane(true);
    void connectWhatsAppWeb(false);
  };

  return (
    <div className="flex h-full min-h-0 gap-2">
      {/* Sol sütun: sohbet listesi ve bağlantı durumu */}
      <div className="flex w-[192px] shrink-0 flex-col gap-1.5 border-r border-white/[0.06] pr-2">
        <div className="flex items-center justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: tintText(WA_COLOR) }}>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${web.status === "loading" || web.status === "qr" ? "animate-pulse" : ""}`}
              style={{
                background:
                  web.status === "ready"
                    ? WA_COLOR
                    : web.status === "qr" || web.status === "loading"
                      ? ACCENT.yellow
                      : ACCENT.gray,
              }}
            />
            <span className="truncate">
              {web.status === "ready"
                ? tt("WhatsApp Web")
                : web.status === "qr"
                  ? tt("QR bekleniyor")
                  : web.status === "loading"
                    ? tt("Bağlanıyor…")
                    : tt("Bildirim köprüsü")}
            </span>
          </span>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => useNook.getState().updateSettings({ whatsappNotify: !whatsappNotify })}
              title={whatsappNotify ? tt("WhatsApp bildirim kartlarını sessize al") : tt("WhatsApp bildirim kartlarını aç")}
              className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                whatsappNotify
                  ? "bg-well text-label-2 hover:bg-well-hi hover:text-label"
                  : "bg-red/15 text-red hover:bg-red/25"
              }`}
            >
              {whatsappNotify ? <Bell size={10.5} strokeWidth={2.4} /> : <BellOff size={10.5} strokeWidth={2.4} />}
            </button>
            {web.enabled ? (
              <>
                <button
                  onClick={() => void connectWhatsAppWeb(true)}
                  title={tt("WhatsApp Web penceresini aç")}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-well text-label-2 transition-colors hover:bg-well-hi hover:text-label"
                >
                  <ExternalLink size={10.5} strokeWidth={2.4} />
                </button>
                <button
                  onClick={() => {
                    setShowQrPane(false);
                    void disconnectWhatsAppWeb();
                  }}
                  title={tt("WhatsApp Web bağlantısını kes")}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-well text-label-3 transition-colors hover:bg-red/20 hover:text-red"
                >
                  <Unlink size={10.5} strokeWidth={2.4} />
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectClick}
                title={tt("Tüm sohbetleri görmek için WhatsApp Web'i bağla")}
                className="flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10px] font-semibold transition-colors"
                style={{ background: tintBg(WA_COLOR, 14), borderColor: tintBg(WA_COLOR, 36), color: tintText(WA_COLOR) }}
              >
                <Link2 size={10} strokeWidth={2.5} />
                {tt("Web bağla")}
              </button>
            )}
          </div>
        </div>

        {chats.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-2 text-center">
            <MiniNook color={WA_COLOR} size={24} eyes="side" />
            <p className="text-[11px] font-medium text-label-2">{tt("Henüz sohbet yok")}</p>
            <p className="text-[9.5px] leading-snug text-label-3">
              {tt("Telefondan gelen WhatsApp bildirimleri burada görünür; tüm sohbetler için Web bağla.")}
            </p>
          </div>
        ) : (
          <div className="-mr-1 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {chats.map((c) => {
              const active = !showQrPane && activeChat?.toLowerCase() === c.title.toLowerCase();
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setShowQrPane(false);
                    selectChat(c.title);
                  }}
                  className="flex w-full items-center gap-2 rounded-[12px] border px-2 py-1.5 text-left transition-colors"
                  style={{
                    background: active ? tintBg(WA_COLOR, 15) : "rgb(255 255 255 / 0.025)",
                    borderColor: active ? tintBg(WA_COLOR, 42) : "rgb(255 255 255 / 0.05)",
                  }}
                >
                  {c.avatar ? (
                    <img src={c.avatar} alt="" draggable={false} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{ background: tintBg(WA_COLOR, 22), color: tintText(WA_COLOR) }}
                    >
                      {c.title.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="truncate text-[11.5px] font-semibold text-label">{c.title}</span>
                      {c.time && <span className="shrink-0 text-[9.5px] tabular-nums text-label-3">{c.time}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[10px] text-label-3">{c.lastText || tt("Mesaj yok")}</span>
                      {c.unread > 0 ? (
                        <span
                          className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[9.5px] font-bold text-black"
                          style={{ background: WA_COLOR }}
                        >
                          {c.unread}
                        </span>
                      ) : c.replyKey ? (
                        <span title={tt("Telefondan hızlı yanıt hazır")} className="inline-flex">
                          <Smartphone size={9.5} className="shrink-0 text-label-3" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sağ sütun: QR ekranı ya da seçili sohbetin mesajları */}
      <div className="flex min-w-0 flex-1 flex-col">
        {showQrPane || (web.enabled && web.status === "qr") ? (
          <QrConnectView
            qr={web.qr}
            status={web.status}
            onOpenWindow={() => void connectWhatsAppWeb(true)}
            onClose={() => setShowQrPane(false)}
          />
        ) : !activeChat ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <MiniNook color={WA_COLOR} size={30} icon={MessageCircle} />
            <div>
              <p className="text-[12.5px] font-semibold text-label">{tt("WhatsApp adada hazır")}</p>
              <p className="mt-0.5 max-w-[280px] text-[10.5px] leading-snug text-label-3">
                {tt("Nook Mobil'den gelen WhatsApp bildirimlerini doğrudan yanıtlayabilir ya da WhatsApp Web'i bağlayarak tüm sohbetlerine ulaşabilirsin.")}
              </p>
            </div>
            {!web.enabled && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                transition={spring.pop}
                onClick={handleConnectClick}
                className="mt-1 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold"
                style={{ background: tintBg(WA_COLOR, 16), borderColor: tintBg(WA_COLOR, 42), color: tintText(WA_COLOR) }}
              >
                <QrCode size={12} strokeWidth={2.4} />
                {tt("WhatsApp Web'i bağla")}
              </motion.button>
            )}
          </div>
        ) : (
          <>
            {/* Sohbet başlığı */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: tintBg(WA_COLOR, 22), color: tintText(WA_COLOR) }}
                >
                  {activeChat.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold leading-tight text-label">{activeChat}</p>
                  <p className="truncate text-[9.5px] leading-tight text-label-3">
                    {web.status === "ready"
                      ? tt("WhatsApp Web üzerinden bağlı")
                      : activeInfo?.replyKey
                        ? tt("Nook Mobil · Bildirimden hızlı yanıt")
                        : tt("Yalnızca bildirim özeti")}
                  </p>
                </div>
              </div>
              {web.enabled && web.status !== "ready" && (
                <button
                  onClick={() => setShowQrPane(true)}
                  className="flex items-center gap-1 rounded-full bg-well px-2 py-0.5 text-[10px] font-medium text-label-2 hover:bg-well-hi hover:text-label"
                >
                  <QrCode size={10.5} />
                  {tt("QR Kodu")}
                </button>
              )}
            </div>

            {/* Mesaj geçmişi */}
            <div ref={msgScroller} className="-mr-1 min-h-0 flex-1 space-y-1.5 overflow-y-auto py-2 pr-1">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                  <p className="text-[11px] text-label-3">
                    {activeInfo?.lastText ? activeInfo.lastText : tt("Bu sohbetin mesajları yükleniyor…")}
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.fromMe ? "items-end" : "items-start"}`}>
                    <div
                      className="max-w-[85%] rounded-[13px] border px-2.5 py-1.5 text-[11.5px] leading-snug"
                      style={
                        m.fromMe
                          ? { background: tintBg(WA_COLOR, 16), borderColor: tintBg(WA_COLOR, 38), color: "var(--color-label)" }
                          : { background: "rgb(255 255 255 / 0.05)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label)" }
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      {m.time && (
                        <span className="mt-0.5 block text-right text-[9px] tabular-nums text-label-3">{m.time}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {error && <p className="mb-1 truncate text-[10px] text-red">{error}</p>}

            {/* Yanıt kutusu */}
            {canReply ? (
              <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  placeholder={tt("{0} kişisine mesaj yaz…", activeChat)}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submit()}
                  className="h-8 min-w-0 flex-1 rounded-full border border-white/[0.08] bg-well px-3 text-[11.5px] text-label outline-none placeholder:text-label-3 focus:border-white/20 focus:bg-well-hi"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  transition={spring.pop}
                  disabled={!draft.trim() || sending}
                  onClick={() => void submit()}
                  title={tt("Gönder")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border disabled:opacity-35"
                  style={{
                    background: tintBg(WA_COLOR, 22),
                    borderColor: tintBg(WA_COLOR, 50),
                    color: tintText(WA_COLOR),
                  }}
                >
                  <SendHorizontal size={13} strokeWidth={2.5} />
                </motion.button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center justify-between gap-2 rounded-[12px] bg-well px-2.5 py-1.5">
                <span className="truncate text-[10.5px] text-label-3">
                  {tt("Bu bildirime yanıt yazmak için WhatsApp Web'i bağla")}
                </span>
                <button
                  onClick={handleConnectClick}
                  className="shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: tintBg(WA_COLOR, 14), borderColor: tintBg(WA_COLOR, 36), color: tintText(WA_COLOR) }}
                >
                  {tt("Bağla")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function QrConnectView({
  qr,
  status,
  onOpenWindow,
  onClose,
}: {
  qr: string | null;
  status: string;
  onOpenWindow: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
      {qr ? (
        <div className="rounded-[14px] bg-white p-2 shadow-lg">
          <img src={qr} alt="WhatsApp QR" draggable={false} className="h-[132px] w-[132px] object-contain" />
        </div>
      ) : (
        <div className="flex h-[132px] w-[132px] flex-col items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-well p-3">
          <MiniNook color={WA_COLOR} size={28} eyes="open" />
          <span className="text-[10px] text-label-3">
            {status === "loading" ? tt("QR kodu hazırlanıyor…") : tt("WhatsApp Web açılıyor…")}
          </span>
        </div>
      )}
      <div>
        <p className="text-[11.5px] font-semibold text-label">{tt("WhatsApp › Bağlı Cihazlar › Cihaz Bağla")}</p>
        <p className="mt-0.5 text-[10px] text-label-3">
          {tt("QR kodu telefonunla okut ya da pencereyi açıp doğrudan giriş yap.")}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenWindow}
          className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
          style={{ background: tintBg(WA_COLOR, 16), borderColor: tintBg(WA_COLOR, 42), color: tintText(WA_COLOR) }}
        >
          <ExternalLink size={11} strokeWidth={2.4} />
          {tt("Pencereyi aç")}
        </button>
        <button
          onClick={onClose}
          className="rounded-full bg-well px-2.5 py-1 text-[10.5px] font-medium text-label-2 hover:bg-well-hi hover:text-label"
        >
          {tt("Geri")}
        </button>
      </div>
    </div>
  );
}
