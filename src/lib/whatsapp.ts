/**
 * WhatsApp entegrasyonu (Bildirim Köprüsü + WhatsApp Web Köprüsü):
 * - Nook Mobil (Android RemoteInput) ve Windows bildirimlerinden gelen WhatsApp mesajlarını sohbet
 *   bazında birleştirir; telefon bildirimlerine doğrudan RemoteInput ile yanıt gönderir.
 * - İsteyen kullanıcı WhatsApp Web'i bağladığında son sohbetler ve mesaj geçmişi canlı eşitlenir;
 *   bildirim gelmesini beklemeden her sohbete mesaj yazılabilir.
 */
import { useEffect } from "react";
import { create } from "zustand";
import {
  EVENTS,
  inTauri,
  isPrimary,
  replyNotification,
  subscribe,
  waConnect,
  waDisconnect,
  waSelectChat,
  waSend,
  waState,
  type NotificationPayload,
  type WaChat,
  type WaMessage,
  type WaState,
} from "./bridge";
import { locale } from "./i18n";

export const WA_COLOR = "#25D366";

export interface LocalWaChat {
  title: string;
  lastText: string;
  time: string;
  unread: number;
  updatedAt: number;
  replyKey: string | null;
  icon: string | null;
  messages: WaMessage[];
}

interface WhatsAppStore {
  web: WaState;
  localChats: Record<string, LocalWaChat>;
  selectedChat: string | null;
  sending: boolean;
  error: string | null;
  setWeb: (web: WaState) => void;
  selectChat: (title: string | null) => void;
  ingestNotification: (n: NotificationPayload) => void;
  recordOutgoing: (title: string, text: string) => void;
  markRead: (title: string) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
}

const nowHm = () => new Date().toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });

export function isWhatsAppNotif(n: { app?: string; appId?: string }): boolean {
  const app = (n.app ?? "").toLowerCase();
  const id = (n.appId ?? "").toLowerCase();
  return app.includes("whatsapp") || id.includes("whatsapp");
}

export const useWhatsApp = create<WhatsAppStore>((set) => ({
  web: {
    status: "disconnected",
    qr: null,
    chats: [],
    activeChat: null,
    messages: [],
    windowVisible: false,
    enabled: false,
  },
  localChats: {},
  selectedChat: null,
  sending: false,
  error: null,
  setWeb: (web) =>
    set((s) => ({
      web,
      selectedChat: s.selectedChat ?? web.activeChat ?? web.chats[0]?.title ?? null,
    })),
  selectChat: (title) => {
    set((s) => {
      if (!title) return { selectedChat: null, error: null };
      const cur = s.localChats[title];
      return {
        selectedChat: title,
        error: null,
        localChats: cur ? { ...s.localChats, [title]: { ...cur, unread: 0 } } : s.localChats,
      };
    });
    if (title) void waSelectChat(title).catch(() => {});
  },
  ingestNotification: (n) =>
    set((s) => {
      if (!isWhatsAppNotif(n)) return {};
      const title = (n.title || "WhatsApp").trim();
      const rawText = (n.body || "").trim();
      if (!rawText) return {};

      // Kullanıcının kendi gönderdiği mesajları tanı ("Sen: ...", "Siz: ..." veya "You: ...")
      const isMe = /^(sen|siz|you)\s*:/i.test(rawText);
      const text = isMe ? rawText.replace(/^(sen|siz|you)\s*:\s*/i, "") : rawText;

      const prev = s.localChats[title];
      const time = nowHm();
      const msg: WaMessage = {
        id: `notif_${n.id || Date.now()}`,
        sender: isMe ? "Sen" : title,
        text,
        time,
        fromMe: isMe,
      };
      const existing = prev?.messages ?? [];
      const dup = existing.length > 0 && existing[existing.length - 1].text === text && existing[existing.length - 1].fromMe === isMe;
      const messages = dup ? existing : [...existing, msg].slice(-40);
      const chat: LocalWaChat = {
        title,
        lastText: text,
        time,
        unread: isMe || s.selectedChat === title ? 0 : (prev?.unread ?? 0) + (dup ? 0 : 1),
        updatedAt: Date.now(),
        replyKey: n.replyKey ?? prev?.replyKey ?? null,
        icon: n.icon ?? prev?.icon ?? null,
        messages,
      };
      return {
        localChats: { ...s.localChats, [title]: chat },
        selectedChat: s.selectedChat ?? title,
      };
    }),
  recordOutgoing: (title, text) =>
    set((s) => {
      const prev = s.localChats[title];
      const time = nowHm();
      const msg: WaMessage = {
        id: `me_${Date.now()}`,
        sender: "Sen",
        text,
        time,
        fromMe: true,
      };
      const chat: LocalWaChat = {
        title,
        lastText: text,
        time,
        unread: 0,
        updatedAt: Date.now(),
        replyKey: prev?.replyKey ?? null,
        icon: prev?.icon ?? null,
        messages: [...(prev?.messages ?? []), msg].slice(-40),
      };
      return {
        localChats: { ...s.localChats, [title]: chat },
      };
    }),
  markRead: (title) =>
    set((s) => {
      const prev = s.localChats[title];
      if (!prev || !prev.unread) return {};
      return { localChats: { ...s.localChats, [title]: { ...prev, unread: 0 } } };
    }),
  setSending: (sending) => set({ sending }),
  setError: (error) => set({ error }),
}));

export interface UnifiedWaChat extends WaChat {
  replyKey: string | null;
  fromNotif: boolean;
}

/** Hem bildirimlerden gelen hem de WhatsApp Web'deki sohbetleri tek listede birleştirir */
export function useUnifiedWaChats(): UnifiedWaChat[] {
  const webChats = useWhatsApp((s) => s.web.chats);
  const localChats = useWhatsApp((s) => s.localChats);

  const map = new Map<string, UnifiedWaChat>();
  const localSorted = Object.values(localChats).sort((a, b) => b.updatedAt - a.updatedAt);

  for (const loc of localSorted) {
    map.set(loc.title.toLowerCase(), {
      id: loc.title,
      title: loc.title,
      lastText: loc.lastText,
      time: loc.time,
      unread: loc.unread,
      avatar: loc.icon,
      replyKey: loc.replyKey,
      fromNotif: true,
    });
  }

  for (const wc of webChats) {
    const key = wc.title.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...wc,
        unread: Math.max(wc.unread, existing.unread),
        lastText: wc.lastText || existing.lastText,
        time: wc.time || existing.time,
        avatar: wc.avatar || existing.avatar,
        replyKey: existing.replyKey,
        fromNotif: true,
      });
    } else {
      map.set(key, {
        ...wc,
        replyKey: null,
        fromNotif: false,
      });
    }
  }

  return Array.from(map.values());
}

/** Seçili sohbetin mesajları (WhatsApp Web açıksa oradan, değilse bildirim geçmişinden) */
export function useActiveWaMessages(title: string | null): WaMessage[] {
  const web = useWhatsApp((s) => s.web);
  const local = useWhatsApp((s) => (title ? s.localChats[title] : undefined));
  if (!title) return [];
  const webMatches =
    web.status === "ready" &&
    web.activeChat &&
    web.activeChat.toLowerCase() === title.toLowerCase() &&
    web.messages.length > 0;
  if (webMatches) {
    const base = web.messages;
    const localMsgs = local?.messages ?? [];
    const lastLocal = localMsgs[localMsgs.length - 1];
    if (lastLocal?.fromMe && !base.some((m) => m.fromMe && m.text === lastLocal.text)) {
      return [...base, lastLocal];
    }
    return base;
  }
  return local?.messages ?? [];
}

/** WhatsApp sohbetine yanıt gönder (WhatsApp Web ya da Nook Mobil RemoteInput üzerinden) */
export async function sendWhatsAppMessage(title: string, text: string, explicitReplyKey?: string | null): Promise<boolean> {
  const clean = text.trim();
  if (!clean || !title.trim()) return false;
  const st = useWhatsApp.getState();
  const rk = explicitReplyKey ?? st.localChats[title]?.replyKey ?? null;
  st.setSending(true);
  st.setError(null);
  try {
    await waSend(title, clean, rk);
    st.recordOutgoing(title, clean);
    if (!inTauri) {
      // Tarayıcı önizlemesinde de anında görünsün
      const cur = useWhatsApp.getState().web;
      if (cur.activeChat === title) {
        useWhatsApp.getState().setWeb({
          ...cur,
          messages: [...cur.messages, { id: `dev_${Date.now()}`, sender: "Sen", text: clean, time: nowHm(), fromMe: true }],
        });
      }
    }
    return true;
  } catch (e) {
    st.setError(e instanceof Error ? e.message : String(e));
    return false;
  } finally {
    useWhatsApp.getState().setSending(false);
  }
}

/** Herhangi bir telefon bildirimine (WhatsApp, Telegram, Mesajlar…) doğrudan yanıt gönder */
export async function replyToNotification(
  n: { title: string; app?: string; appId?: string; replyKey?: string | null },
  text: string,
): Promise<boolean> {
  const clean = text.trim();
  if (!clean) return false;
  if (isWhatsAppNotif(n)) {
    return sendWhatsAppMessage(n.title, clean, n.replyKey);
  }
  if (!n.replyKey) return false;
  try {
    await replyNotification(n.replyKey, clean);
    return true;
  } catch {
    return false;
  }
}

export async function connectWhatsAppWeb(showWindow = false) {
  const st = await waConnect(showWindow);
  useWhatsApp.getState().setWeb(st);
}

export async function disconnectWhatsAppWeb() {
  const st = await waDisconnect();
  useWhatsApp.getState().setWeb(st);
}

/** Ana adada WhatsApp Web durumunu dinler */
export function useWhatsAppFeed() {
  useEffect(() => {
    void waState().then((st) => useWhatsApp.getState().setWeb(st)).catch(() => {});
    if (!isPrimary) return;
    return subscribe<WaState>(EVENTS.whatsapp, (st) => {
      useWhatsApp.getState().setWeb(st);
    });
  }, []);
}
