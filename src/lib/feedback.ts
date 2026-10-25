/**
 * Nook Kullanıcı Geribildirim Sistemi (GitHub Issues entegrasyonu).
 * - Kullanıcıların uygulama içinden Hata Bildirimi veya Özellik İsteği / Öneri göndermesini sağlar.
 * - Sürüm, işletim sistemi ve son hata kayıtları isteğe bağlı olarak tek tıkla mesaja eklenir.
 * - lukosovian/nook deposundaki açık ve çözülmüş bildirimleri Studio içinde canlı listeler.
 * - Yorumları ve geliştirici yanıtlarını doğrudan Nook içinden okumayı sağlar.
 */
import { create } from "zustand";
import { openPath, recentLogs } from "./bridge";
import { REPO_URL } from "./supporters";
import { useNook } from "../store/nook";
import { latestNote } from "./notes";
import { lang, locale } from "./i18n";

export const ISSUES_API = "https://api.github.com/repos/lukosovian/nook/issues";
const STORE_KEY = "nook.feedback.cache";
const MINE_KEY = "nook.feedback.mine";

export type FeedbackKind = "bug" | "idea" | "other";
export type IssueState = "open" | "closed";

export interface FeedbackIssue {
  id: number;
  number: number;
  title: string;
  cleanTitle: string;
  body: string;
  state: IssueState;
  kind: FeedbackKind;
  author: string;
  avatar: string;
  url: string;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  labels: { name: string; color: string }[];
  isMine?: boolean;
}

export interface IssueComment {
  id: number;
  author: string;
  avatar: string;
  body: string;
  createdAt: string;
  url: string;
}

interface FeedbackStore {
  issues: FeedbackIssue[];
  loading: boolean;
  lastFetchedAt: number | null;
  error: string | null;
  selectedNumber: number | null;
  comments: Record<number, IssueComment[]>;
  loadingComments: Record<number, boolean>;
  filterState: "all" | "open" | "closed";
  filterKind: "all" | "bug" | "idea";
  searchQuery: string;
  setFilterState: (s: "all" | "open" | "closed") => void;
  setFilterKind: (k: "all" | "bug" | "idea") => void;
  setSearchQuery: (q: string) => void;
  setSelectedNumber: (n: number | null) => void;
}

function loadSavedMine(): number[] {
  try {
    return JSON.parse(localStorage.getItem(MINE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveMine(num: number) {
  try {
    const mine = loadSavedMine();
    if (!mine.includes(num)) {
      mine.push(num);
      localStorage.setItem(MINE_KEY, JSON.stringify(mine));
    }
  } catch {}
}

export function recordSubmittedIssueTitle(title: string) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem("nook.feedback.submitted_titles") ?? "[]");
    list.push(title.trim().toLowerCase());
    localStorage.setItem("nook.feedback.submitted_titles", JSON.stringify(list.slice(-30)));
  } catch {}
}

function isMySubmitted(title: string, num: number): boolean {
  if (loadSavedMine().includes(num)) return true;
  try {
    const list: string[] = JSON.parse(localStorage.getItem("nook.feedback.submitted_titles") ?? "[]");
    const clean = title.replace(/^\[(Hata|Öneri|Bug|Feature)\]\s*/i, "").trim().toLowerCase();
    const hit = list.some((t) => t.includes(clean) || clean.includes(t));
    if (hit) saveMine(num);
    return hit;
  } catch {
    return false;
  }
}

function parseKind(title: string, labels: { name: string }[]): FeedbackKind {
  const lbl = labels.map((l) => l.name.toLowerCase());
  if (lbl.some((l) => l.includes("bug") || l.includes("hata"))) return "bug";
  if (lbl.some((l) => l.includes("enhancement") || l.includes("feature") || l.includes("öneri") || l.includes("istek"))) return "idea";
  if (/^\[hata\]/i.test(title)) return "bug";
  if (/^\[(öneri|istek)\]/i.test(title)) return "idea";
  return "other";
}

function parseCleanTitle(title: string): string {
  return title.replace(/^\[(Hata|Öneri|İstek|Bug|Feature)\]\s*/i, "").trim();
}

function loadCachedIssues(): FeedbackIssue[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export const useFeedback = create<FeedbackStore>((set, get) => ({
  issues: loadCachedIssues(),
  loading: false,
  lastFetchedAt: null,
  error: null,
  selectedNumber: null,
  comments: {},
  loadingComments: {},
  filterState: "all",
  filterKind: "all",
  searchQuery: "",
  setFilterState: (filterState) => set({ filterState }),
  setFilterKind: (filterKind) => set({ filterKind }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedNumber: (selectedNumber) => {
    set({ selectedNumber });
    if (selectedNumber && !get().comments[selectedNumber]) {
      void fetchComments(selectedNumber);
    }
  },
}));

export async function refreshIssues(force = false) {
  const st = useFeedback.getState();
  if (st.loading) return;
  if (!force && st.lastFetchedAt && Date.now() - st.lastFetchedAt < 45_000) return;

  useFeedback.setState({ loading: true, error: null });
  try {
    const res = await fetch(`${ISSUES_API}?state=all&per_page=40&sort=updated`, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    interface GhIssue {
      id: number;
      number: number;
      title: string;
      body: string | null;
      state: "open" | "closed";
      html_url: string;
      comments: number;
      created_at: string;
      updated_at: string;
      closed_at: string | null;
      user: { login: string; avatar_url: string };
      labels: { name: string; color: string }[];
      pull_request?: unknown;
    }

    const raw: GhIssue[] = await res.json();
    const parsed: FeedbackIssue[] = raw
      .filter((it) => !it.pull_request) // Pull request'leri filtrele
      .map((it) => {
        const kind = parseKind(it.title, it.labels);
        return {
          id: it.id,
          number: it.number,
          title: it.title,
          cleanTitle: parseCleanTitle(it.title),
          body: it.body ?? "",
          state: it.state,
          kind,
          author: it.user?.login ?? "anonim",
          avatar: it.user?.avatar_url ?? "",
          url: it.html_url,
          commentsCount: it.comments ?? 0,
          createdAt: it.created_at,
          updatedAt: it.updated_at,
          closedAt: it.closed_at,
          labels: it.labels?.map((l) => ({ name: l.name, color: l.color })) ?? [],
          isMine: isMySubmitted(it.title, it.number),
        };
      });

    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
    } catch {}

    useFeedback.setState({
      issues: parsed,
      loading: false,
      lastFetchedAt: Date.now(),
      error: null,
    });
  } catch (e) {
    useFeedback.setState({
      loading: false,
      error: String(e),
    });
  }
}

export async function fetchComments(issueNumber: number) {
  useFeedback.setState((s) => ({
    loadingComments: { ...s.loadingComments, [issueNumber]: true },
  }));
  try {
    const res = await fetch(`${ISSUES_API}/${issueNumber}/comments`, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    interface GhComment {
      id: number;
      body: string;
      created_at: string;
      html_url: string;
      user: { login: string; avatar_url: string };
    }
    const raw: GhComment[] = await res.json();
    const list: IssueComment[] = raw.map((c) => ({
      id: c.id,
      author: c.user?.login ?? "anonim",
      avatar: c.user?.avatar_url ?? "",
      body: c.body ?? "",
      createdAt: c.created_at,
      url: c.html_url,
    }));

    useFeedback.setState((s) => ({
      comments: { ...s.comments, [issueNumber]: list },
      loadingComments: { ...s.loadingComments, [issueNumber]: false },
    }));
  } catch {
    useFeedback.setState((s) => ({
      loadingComments: { ...s.loadingComments, [issueNumber]: false },
    }));
  }
}

/** Sistem ve hata günlüğü tanılama bloğunu üretir */
export async function buildDiagnostics(includeLogs: boolean): Promise<string> {
  const s = useNook.getState().settings;
  const note = latestNote();
  const v = note?.version ?? "0.3.2";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Bilinmiyor";

  let lines: string[] = [
    `### Sistem ve Nook Bilgisi`,
    `- **Nook Sürümü:** v${v}`,
    `- **Arayüz Dili:** ${lang} (${locale()})`,
    `- **Ekran Modu:** ${s.monitorMode}`,
    `- **Arayüz Ölçeği:** %${Math.round(s.uiScale * 100)}`,
    `- **Webview / Tarayıcı:** \`${userAgent}\``,
    `- **Tarih:** ${new Date().toISOString()}`,
  ];

  if (includeLogs) {
    try {
      const logs = await recentLogs(25);
      if (logs.length > 0) {
        lines.push(
          "",
          `<details>`,
          `<summary><b>Son Hata ve Olay Kayıtları (${logs.length} satır)</b></summary>`,
          "",
          "```log",
          ...logs,
          "```",
          "</details>",
        );
      }
    } catch {}
  }

  return lines.join("\n");
}

export interface FeedbackDraft {
  kind: FeedbackKind;
  title: string;
  description: string;
  stepsToReproduce?: string;
  includeDiag: boolean;
}

/** GitHub'da yeni Issue açma bağlantısını oluşturup tarayıcıda açar */
export async function openNewIssue(draft: FeedbackDraft) {
  const prefix = draft.kind === "bug" ? "[Hata]" : "[Öneri]";
  const fullTitle = `${prefix} ${draft.title.trim()}`;
  const label = draft.kind === "bug" ? "bug" : "enhancement";

  const diag = draft.includeDiag ? await buildDiagnostics(draft.kind === "bug") : "";

  let bodyParts: string[] = [];
  if (draft.description.trim()) {
    bodyParts.push(`### Açıklama\n${draft.description.trim()}`);
  }
  if (draft.kind === "bug" && draft.stepsToReproduce?.trim()) {
    bodyParts.push(`### Tekrarlama Adımları\n${draft.stepsToReproduce.trim()}`);
  }
  if (diag) {
    bodyParts.push(diag);
  }

  const fullBody = bodyParts.join("\n\n");

  recordSubmittedIssueTitle(fullTitle);

  const url = `${REPO_URL}/issues/new?title=${encodeURIComponent(fullTitle)}&labels=${encodeURIComponent(label)}&body=${encodeURIComponent(fullBody)}`;
  await openPath(url);

  // 15 sn ve 45 sn sonra otomatik kontrol et ki yeni açılan issue listeye düşsün
  window.setTimeout(() => void refreshIssues(true), 15_000);
  window.setTimeout(() => void refreshIssues(true), 45_000);
}
