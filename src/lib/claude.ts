/**
 * Claude Code: Nook'un hook köprüsünden (bkz. src-tauri/src/claude.rs) gelen olaylar.
 *  - Oturumlar: hangi projede, şu an ne yapıyor (komut, dosya düzenleme…), bitti mi
 *  - İzin istekleri: adada kart (İzin ver / Her zaman / Reddet) ve Claude'un soruları
 *  - Plan kullanımı: 5 saatlik ve haftalık limit (Claude Code'un durum satırından)
 * Claude Code olmayan bilgisayarda (`present: false`) modül gizli kalır.
 */
import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { claudeConnect, claudeDecide, claudeDisconnect, claudeSetup, EVENTS, isPrimary, subscribe, type ClaudeSetup } from "./bridge";
import { useNook } from "../store/nook";
import { playAntic } from "../hooks/useAntics";
import { tt, locale } from "./i18n";

/** Claude'un kiremit turuncusu */
export const CLAUDE_COLOR = "#D97757";

export type SessionState = "working" | "waiting" | "done" | "idle";

export interface ClaudeSession {
  id: string;
  project: string;
  cwd: string;
  state: SessionState;
  /** Şu an ne yapıyor: "Düzenliyor · Panels.tsx" */
  action: string;
  /** Son istek (kısaltılmış) */
  prompt: string;
  /** Son cevabın ilk paragrafı */
  reply: string;
  startedAt: number;
  updatedAt: number;
  /** Bu turun başlangıcı (istek gönderildiğinde) */
  turnAt: number;
  edits: number;
  commands: number;
  /** Son düzenlenen dosyalar (en yenisi başta) */
  files: string[];
}

export interface ClaudeQuestion {
  question: string;
  header?: string;
  multiSelect: boolean;
  options: { label: string; description?: string }[];
}

export interface ClaudeAsk {
  askId: number;
  session: string;
  project: string;
  tool: string;
  /** Kartın başlığı: "Komut çalıştırmak istiyor" */
  title: string;
  /** Komutun/dosyanın kendisi */
  detail: string;
  /** AskUserQuestion ise sorular */
  questions: ClaudeQuestion[] | null;
  /** "Her zaman izin ver" önerisi var mı */
  canAlways: boolean;
  at: number;
  /** Kart küçük adada çözülemiyor (çok sorulu): büyük adada açıldı */
  opened?: boolean;
}

export interface PlanWindow {
  /** 0–100 */
  usedPct: number;
  /** ms */
  resetsAt: number;
}

export interface ClaudePlan {
  fiveHour?: PlanWindow;
  sevenDay?: PlanWindow;
  updatedAt: number;
}

interface ClaudeState {
  setup: ClaudeSetup | null;
  sessions: Record<string, ClaudeSession>;
  asks: ClaudeAsk[];
  plan: ClaudePlan | null;
  /** Bildirilen limit eşikleri ("5h:<sıfırlanma>:80") — aynı uyarı iki kez gelmesin */
  warned: string[];
  busy: boolean;
  error: string | null;
  /** Son kurulumda alınan yedeğin yolu */
  backup: string | null;
}

export const useClaude = create<ClaudeState>()(
  persist(
    () => ({ setup: null, sessions: {}, asks: [], plan: null, warned: [], busy: false, error: null, backup: null }) as ClaudeState,
    {
      name: "nook-claude",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ plan: s.plan, warned: s.warned }),
    },
  ),
);

/** Ada kartı: kuyruğun başındaki istek küçük adada çözülebiliyorsa göster */
useClaude.subscribe((s, prev) => {
  if (s.asks === prev.asks) return;
  const head = s.asks[0];
  const card = !!head && !head.opened;
  if (useNook.getState().claudeCard !== card) useNook.getState().setClaudeCard(card);
});

const base = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p;
const firstLine = (s: string, max = 140) => {
  const line = s.split("\n").find((l) => l.trim())?.trim() ?? "";
  return line.length > max ? line.slice(0, max - 1) + "…" : line;
};
/** Son cevabın ilk anlamlı paragrafı, markdown işaretleri olmadan */
const firstParagraph = (s: string) =>
  firstLine(
    s
      .split(/\n\s*\n/)
      .find((p) => p.trim() && !p.trim().startsWith("```"))
      ?.replace(/[#*`>_]/g, "")
      .replace(/\s+/g, " ") ?? "",
    220,
  );

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Aracın kısa anlatımı: [fiil, nesne] */
export function describeTool(tool: string, input: Input): [string, string] {
  const file = base(str(input.file_path) || str(input.notebook_path) || str(input.path));
  switch (tool) {
    case "Bash":
    case "PowerShell":
      return [tt("Komut"), firstLine(str(input.description) || str(input.command), 90)];
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return [tt("Düzenliyor"), file];
    case "Write":
      return [tt("Yazıyor"), file];
    case "Read":
      return [tt("Okuyor"), file];
    case "Grep":
    case "Glob":
      return [tt("Arıyor"), firstLine(str(input.pattern), 60)];
    case "WebFetch":
      return [tt("Sayfa okuyor"), str(input.url).replace(/^https?:\/\//, "").slice(0, 60)];
    case "WebSearch":
      return [tt("Web'de arıyor"), firstLine(str(input.query), 60)];
    case "Task":
    case "Agent":
      return [tt("Alt ajan"), firstLine(str(input.description), 60)];
    case "TodoWrite":
      return [tt("Plan yapıyor"), ""];
    case "AskUserQuestion":
      return [tt("Soru soruyor"), ""];
    default: {
      const mcp = tool.match(/^mcp__(.+?)__(.+)$/);
      return mcp ? [mcp[1], mcp[2].replace(/_/g, " ")] : [tool, ""];
    }
  }
}

const actionOf = (tool: string, input: Input) => describeTool(tool, input).filter(Boolean).join(" · ");

/** İzin kartının başlığı ve ayrıntısı */
function askText(tool: string, input: Input): { title: string; detail: string } {
  const file = str(input.file_path) || str(input.notebook_path);
  switch (tool) {
    case "Bash":
    case "PowerShell":
      return { title: tt("Komut çalıştırmak istiyor"), detail: firstLine(str(input.command), 200) };
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return { title: tt("Dosya düzenlemek istiyor"), detail: base(file) };
    case "Write":
      return { title: tt("Dosya yazmak istiyor"), detail: base(file) };
    case "WebFetch":
      return { title: tt("Sayfa okumak istiyor"), detail: str(input.url) };
    case "WebSearch":
      return { title: tt("Web'de aramak istiyor"), detail: str(input.query) };
    case "AskUserQuestion":
      return { title: tt("Sana soruyor"), detail: "" };
    case "ExitPlanMode":
      return { title: tt("Planını onaylamanı bekliyor"), detail: firstLine(str(input.plan), 200) };
    default: {
      const [verb, what] = describeTool(tool, input);
      const first = Object.values(input).find((v) => typeof v === "string") as string | undefined;
      return { title: tt("{0} kullanmak istiyor", verb), detail: what || firstLine(first ?? "", 200) };
    }
  }
}

function parseQuestions(input: Input): ClaudeQuestion[] | null {
  const list = Array.isArray(input.questions) ? input.questions : null;
  if (!list?.length) return null;
  return list.map((q: Input) => ({
    question: str(q.question),
    header: str(q.header) || undefined,
    multiSelect: q.multiSelect === true,
    options: (Array.isArray(q.options) ? q.options : []).map((o: Input) => ({ label: str(o.label), description: str(o.description) || undefined })),
  }));
}

/** Kart küçük adada çözülebilir mi: tek soru, tek seçim, en fazla 4 seçenek */
export const fitsCard = (a: ClaudeAsk) => !a.questions || (a.questions.length === 1 && !a.questions[0].multiSelect && a.questions[0].options.length <= 4);

// ---------------------------------------------------------------------------
// Olaylar
// ---------------------------------------------------------------------------

interface HookEvent extends Input {
  hook_event_name: string;
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Input;
  prompt?: string;
  message?: string;
  notification_type?: string;
  last_assistant_message?: string;
  permission_suggestions?: unknown[];
  at: number;
  away: boolean;
  askId?: number;
}

function touch(id: string, ev: HookEvent, patch: (s: ClaudeSession) => Partial<ClaudeSession>) {
  useClaude.setState((st) => {
    const cwd = ev.cwd || st.sessions[id]?.cwd || "";
    const cur: ClaudeSession = st.sessions[id] ?? {
      id,
      project: base(cwd) || "Claude",
      cwd,
      state: "idle",
      action: "",
      prompt: "",
      reply: "",
      startedAt: ev.at,
      updatedAt: ev.at,
      turnAt: ev.at,
      edits: 0,
      commands: 0,
      files: [],
    };
    return { sessions: { ...st.sessions, [id]: { ...cur, ...patch(cur), updatedAt: ev.at } } };
  });
}

function handle(ev: HookEvent) {
  const id = ev.session_id || "?";
  const tool = ev.tool_name ?? "";
  const input = ev.tool_input ?? {};
  switch (ev.hook_event_name) {
    case "SessionStart":
      touch(id, ev, () => ({ state: "idle", action: tt("Hazır") }));
      break;
    case "UserPromptSubmit":
      touch(id, ev, () => ({ state: "working", action: tt("Düşünüyor"), prompt: firstLine(ev.prompt ?? "", 160), reply: "", turnAt: ev.at }));
      break;
    case "PreToolUse":
      touch(id, ev, () => ({ state: "working", action: actionOf(tool, input) }));
      break;
    case "PostToolUse":
      touch(id, ev, (s) => {
        const edit = ["Edit", "MultiEdit", "Write", "NotebookEdit"].includes(tool);
        const file = str(input.file_path) || str(input.notebook_path);
        return {
          state: s.state === "waiting" ? "working" : s.state,
          edits: s.edits + (edit ? 1 : 0),
          commands: s.commands + (tool === "Bash" || tool === "PowerShell" ? 1 : 0),
          files: edit && file ? [base(file), ...s.files.filter((f) => f !== base(file))].slice(0, 5) : s.files,
        };
      });
      break;
    case "PermissionRequest": {
      const [verb, what] = describeTool(tool, input);
      touch(id, ev, () => ({ state: "waiting", action: tt("Onay bekliyor · {0}", what || verb) }));
      if (ev.askId == null) break;
      const project = useClaude.getState().sessions[id]?.project ?? (base(ev.cwd ?? "") || "Claude");
      const ask: ClaudeAsk = {
        askId: ev.askId,
        session: id,
        project,
        tool,
        ...askText(tool, input),
        questions: tool === "AskUserQuestion" ? parseQuestions(input) : null,
        canAlways: !!ev.permission_suggestions?.length,
        at: ev.at,
      };
      useClaude.setState((st) => ({ asks: [...st.asks.filter((a) => a.askId !== ask.askId), ask] }));
      playAntic("surprised");
      break;
    }
    case "Notification":
      if (ev.notification_type === "permission_prompt") touch(id, ev, (s) => ({ state: "waiting", action: s.state === "waiting" ? s.action : tt("Onay bekliyor") }));
      else if (ev.notification_type === "idle_prompt") touch(id, ev, () => ({ state: "idle", action: tt("Seni bekliyor") }));
      break;
    case "Stop": {
      const reply = firstParagraph(ev.last_assistant_message ?? "");
      touch(id, ev, () => ({ state: "done", action: tt("Bitti"), reply }));
      // Terminal öndeyse zaten görüyorsun; değilse adada haber ver
      if (ev.away) {
        const s = useClaude.getState().sessions[id];
        const mins = s ? Math.round((ev.at - s.turnAt) / 60000) : 0;
        useNook.getState().pushToast({
          kind: "claude",
          title: mins >= 1 ? tt("Claude bitirdi · {0} · {1} dk", s?.project ?? "", mins) : tt("Claude bitirdi · {0}", s?.project ?? ""),
          detail: reply || tt("Cevabı terminalde"),
          ms: 7000,
        });
        playAntic("hop");
      }
      break;
    }
    case "SessionEnd":
      useClaude.setState((st) => {
        const { [id]: _gone, ...rest } = st.sessions;
        return { sessions: rest, asks: st.asks.filter((a) => a.session !== id) };
      });
      break;
  }
}

function parseWindow(raw: unknown): PlanWindow | undefined {
  const w = raw as { used_percentage?: unknown; resets_at?: unknown } | null;
  const pct = w?.used_percentage;
  const at = w?.resets_at;
  if (typeof pct !== "number" || typeof at !== "number" || pct < 0 || pct > 200 || at <= 0) return undefined;
  // saniye; çok büyükse zaten milisaniye
  return { usedPct: Math.min(100, pct), resetsAt: at > 1e12 ? at : at * 1000 };
}

function handlePlan(p: { rateLimits: Record<string, unknown>; at: number }) {
  const fiveHour = parseWindow(p.rateLimits?.five_hour);
  const sevenDay = parseWindow(p.rateLimits?.seven_day);
  if (!fiveHour && !sevenDay) return;
  useClaude.setState({ plan: { fiveHour, sevenDay, updatedAt: p.at } });
  // Eşik uyarıları: %80 ve dolunca, her pencerede bir kez
  for (const [key, w, name] of [["5h", fiveHour, tt("5 saatlik")], ["7d", sevenDay, tt("haftalık")]] as const) {
    if (!w) continue;
    const level = w.usedPct >= 100 ? 100 : w.usedPct >= 80 ? 80 : 0;
    if (!level) continue;
    const tag = `${key}:${w.resetsAt}:${level}`;
    const st = useClaude.getState();
    if (st.warned.includes(tag)) continue;
    useClaude.setState({ warned: [...st.warned, tag].slice(-20) });
    useNook.getState().pushToast({
      kind: "claude",
      title: level === 100 ? tt("Claude {0} limitin doldu", name) : tt("Claude {0} limitin %{1}", name, Math.round(w.usedPct)),
      detail: tt("Sıfırlanma: {0}", resetLabel(w, key === "7d")),
      ms: 8000,
    });
  }
}

/** Uygulama boyunca bir kez (yalnızca ana ada): olayları dinle, kurulumu oku */
export function useClaudeFeed() {
  useEffect(() => {
    if (!isPrimary) return;
    void refreshSetup();
    const offs = [
      subscribe<HookEvent>(EVENTS.claude, handle),
      subscribe<{ askId: number }>(EVENTS.claudeResolved, ({ askId }) => dropAsk(askId)),
      subscribe<{ rateLimits: Record<string, unknown>; at: number }>(EVENTS.claudePlan, handlePlan),
    ];
    // Uzun süre ses çıkmayan oturumlar (terminal kapatılmış) listeden düşer
    const t = window.setInterval(() => {
      const cutoff = Date.now() - 3 * 3600_000;
      const st = useClaude.getState();
      if (Object.values(st.sessions).some((s) => s.updatedAt < cutoff)) {
        useClaude.setState({ sessions: Object.fromEntries(Object.entries(st.sessions).filter(([, s]) => s.updatedAt >= cutoff)) });
      }
    }, 60_000);
    return () => {
      offs.forEach((off) => off());
      window.clearInterval(t);
    };
  }, []);
}

// ---------------------------------------------------------------------------
// Eylemler
// ---------------------------------------------------------------------------

function dropAsk(askId: number) {
  useClaude.setState((st) => ({ asks: st.asks.filter((a) => a.askId !== askId) }));
}

/** "allow" | "always" | "deny" | "" (terminalde cevaplayacağım) ya da soru cevapları */
export function answer(ask: ClaudeAsk, decision: "allow" | "always" | "deny" | "" | { answers: Record<string, string | string[]> }) {
  void claudeDecide(ask.askId, typeof decision === "string" ? decision : JSON.stringify(decision));
  dropAsk(ask.askId);
  useClaude.setState((st) => {
    const s = st.sessions[ask.session];
    if (!s) return {};
    const working = decision !== "" && decision !== "deny";
    return { sessions: { ...st.sessions, [ask.session]: { ...s, state: working ? "working" : s.state, action: working ? tt("Devam ediyor") : decision === "deny" ? tt("Reddedildi") : tt("Terminalde bekliyor") } } };
  });
  if (decision === "deny") playAntic("annoyed");
}

/** Çok sorulu istek: büyük adada Claude bölümünde aç */
export function openAsk(ask: ClaudeAsk) {
  useClaude.setState((st) => ({ asks: st.asks.map((a) => (a.askId === ask.askId ? { ...a, opened: true } : a)) }));
  const s = useNook.getState();
  s.setPendingTab("claude");
  s.setTab("claude");
  s.setPinned(true);
}

export async function refreshSetup() {
  try {
    useClaude.setState({ setup: await claudeSetup() });
  } catch {
    useClaude.setState({ setup: null });
  }
}

export async function connect() {
  useClaude.setState({ busy: true, error: null });
  try {
    const backup = await claudeConnect();
    useClaude.setState({ backup });
  } catch (e) {
    useClaude.setState({ error: String(e) });
  }
  await refreshSetup();
  useClaude.setState({ busy: false });
}

export async function disconnect() {
  useClaude.setState({ busy: true, error: null });
  try {
    await claudeDisconnect();
  } catch (e) {
    useClaude.setState({ error: String(e) });
  }
  await refreshSetup();
  useClaude.setState({ busy: false, backup: null });
}

// ---------------------------------------------------------------------------
// Plan yardımcıları
// ---------------------------------------------------------------------------

/** Sıfırlanma zamanı geçtiyse pencere boşalmıştır */
export const effectivePct = (w: PlanWindow, now = Date.now()) => (w.resetsAt <= now ? 0 : w.usedPct);

export function planColor(pct: number) {
  return pct < 50 ? "var(--color-green)" : pct < 80 ? "var(--color-orange)" : "var(--color-red)";
}

/** "1 sa 20 dk sonra" (5 saatlik), "Pzt 09:00" (haftalık) */
export function resetLabel(w: PlanWindow, weekly: boolean, now = Date.now()) {
  const secs = (w.resetsAt - now) / 1000;
  if (secs <= 0) return tt("sıfırlandı");
  if (weekly && secs > 86_400) {
    const d = new Date(w.resetsAt);
    return `${d.toLocaleDateString(locale(), { weekday: "short" })} ${d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}`;
  }
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? tt("{0} sa {1} dk sonra", h, m) : tt("{0} dk sonra", Math.max(1, m));
}

/** Çipteki kısa özet: "5 sa %23 · hafta %41" */
export function planShort(plan: ClaudePlan | null, now = Date.now()) {
  if (!plan) return null;
  const parts = [];
  if (plan.fiveHour) parts.push(tt("5 sa %{0}", Math.round(effectivePct(plan.fiveHour, now))));
  if (plan.sevenDay) parts.push(tt("hafta %{0}", Math.round(effectivePct(plan.sevenDay, now))));
  return parts.join(" · ") || null;
}

/** "az önce", "12 dk önce" */
export function ago(at: number, now = Date.now()) {
  const m = Math.floor((now - at) / 60000);
  return m < 1 ? tt("az önce") : m < 60 ? tt("{0} dk önce", m) : tt("{0} sa önce", Math.floor(m / 60));
}
