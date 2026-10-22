/**
 * PC kapalıyken yapılanlar (not yazma, PC'nin panosuna gönderme, Hum dinlemesi) burada bekler; PC'ye
 * ulaşılınca sırayla gönderilir. Not çakışırsa (PC'de de aynı not değiştiyse) hiçbir şey ezilmez:
 * telefondaki hâli "(telefon)" adlı yeni bir not olarak eklenir.
 */
import { cache, cached, getNotes, humRecognize, noteOp, PcError, sendToPcClipboard, type HumTrack, type NoteOp, type Pairing, type PcPad } from "./pc";

export type Pending =
  | { kind: "note"; op: NoteOp; base?: string; at: number }
  | { kind: "clip"; text: string; at: number }
  | { kind: "hum"; pcm: string; at: number };

const KEY = "nook.outbox";
/** Hum kaydı büyük (~400 KB): en çok bu kadar bekler */
const MAX_HUMS = 3;
/** Tanınamayan (PC hazır değil, Shazam'a ulaşılamadı) Hum kaydı bu kadar süre yeniden denenir */
const HUM_KEEP_MS = 3 * 86_400_000;

function load(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Pending[];
  } catch {
    return [];
  }
}

function save(list: Pending[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* yer yoksa en eski Hum kayıtları atılır */
    const trimmed = list.filter((x, i) => x.kind !== "hum" || i === list.length - 1);
    try {
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      /* vazgeç */
    }
  }
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function onOutbox(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export const pending = (kind?: Pending["kind"]) => load().filter((x) => !kind || x.kind === kind).length;

export function queue(item: Pending) {
  let list = load();
  if (item.kind === "note" && item.op.op === "set") {
    // Aynı nota art arda yazılanlar tek kayıt: ilk "PC'deki hâli" (base) korunur
    const id = item.op.id;
    const prev = list.find((x): x is Extract<Pending, { kind: "note" }> => x.kind === "note" && x.op.op === "set" && x.op.id === id);
    if (prev) {
      prev.op = item.op;
      prev.at = item.at;
      return save(list);
    }
  }
  if (item.kind === "hum") {
    const hums = list.filter((x) => x.kind === "hum");
    if (hums.length >= MAX_HUMS) list = list.filter((x) => x !== hums[0]);
  }
  list.push(item);
  save(list);
}

// ---------------------------------------------------------------- Notlar (çevrimdışı)

export type NotesState = { pads: PcPad[] | null; padId: string | null };

/** Notu telefonda değiştirir (önbellek) ve PC'ye gönderilmek üzere sıraya koyar */
export function noteOffline(op: NoteOp) {
  const st = cached<NotesState>("notes") ?? { pads: [], padId: null };
  const pads = [...(st.pads ?? [])];
  let base: string | undefined;
  if (op.op === "set") {
    const i = pads.findIndex((p) => p.id === op.id);
    if (i >= 0) {
      base = pads[i].text;
      pads[i] = { ...pads[i], text: op.text, at: Date.now() };
    }
  } else if (op.op === "add") {
    pads.push({ id: op.id ?? "", title: op.title ?? `Not ${pads.length + 1}`, text: "", at: Date.now() });
  } else if (op.op === "remove") {
    const i = pads.findIndex((p) => p.id === op.id);
    if (i >= 0) pads.splice(i, 1);
  } else if (op.op === "rename") {
    const i = pads.findIndex((p) => p.id === op.id);
    if (i >= 0) pads[i] = { ...pads[i], title: op.title };
  }
  cache("notes", { ...st, pads });
  queue({ kind: "note", op, base, at: Date.now() });
  return pads;
}

export function newNoteId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------- Gönderme

let flushing: Promise<FlushResult> | null = null;

export interface FlushResult {
  sent: number;
  /** PC kapalıyken dinlenip şimdi bulunan şarkılar */
  found: HumTrack[];
  /** PC kapalıyken dinlenip şarkısı bulunamayanlar */
  missed: number;
}

/** Bekleyenleri sırayla gönderir; PC'ye ulaşılamazsa kalanlar bekler */
export function flush(p: Pairing): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = run(p).finally(() => (flushing = null));
  return flushing;
}

async function run(p: Pairing): Promise<FlushResult> {
  const out: FlushResult = { sent: 0, found: [], missed: 0 };
  let list = load();
  if (!list.length) return out;
  // Çakışma denetimi için PC'deki notların şu anki hâli
  let pcPads: PcPad[] | null = null;
  if (list.some((x) => x.kind === "note")) {
    try {
      pcPads = (await getNotes(p)).pads ?? [];
    } catch (e) {
      if (e instanceof PcError && e.kind === "offline") return out;
    }
  }
  while (list.length) {
    const item = list[0];
    try {
      if (item.kind === "clip") await sendToPcClipboard(p, item.text);
      else if (item.kind === "hum") {
        const bytes = Uint8Array.from(atob(item.pcm), (c) => c.charCodeAt(0));
        const r = await humRecognize(p, new Int16Array(bytes.buffer), Date.now() - item.at);
        // Shazam'a ulaşılamadı (PC yeni açılmış, internet daha gelmemiş olabilir): kayıt kalsın, sonra yeniden
        if (r.status === "error") throw new PcError(r.message, "server");
        if (r.status === "found") out.found.push(r.track);
        else out.missed++;
      } else await sendNote(p, item, pcPads);
      out.sent++;
    } catch (e) {
      // Ulaşılamıyorsa sonra; PC reddettiyse (ör. silinmiş not) bu kayıttan vazgeç
      if (e instanceof PcError && e.kind === "offline") break;
      // Hum kaydı kolay kolay atılmaz: PC'deki Nook hazır olunca yeniden denenir
      if (item.kind === "hum" && Date.now() - item.at < HUM_KEEP_MS) break;
    }
    list = load().filter((x) => !(x.at === item.at && x.kind === item.kind));
    save(list);
  }
  return out;
}

async function sendNote(p: Pairing, item: Extract<Pending, { kind: "note" }>, pcPads: PcPad[] | null) {
  const op = item.op;
  if (op.op !== "set") {
    await noteOp(p, op);
    return;
  }
  const pc = pcPads?.find((x) => x.id === op.id);
  const conflict = pcPads && (!pc || (item.base !== undefined && pc.text !== item.base && pc.text !== op.text));
  if (!conflict) {
    await noteOp(p, op);
    return;
  }
  // PC'de de değişmiş (ya da silinmiş): ikisini de koru
  const local = cached<NotesState>("notes")?.pads?.find((x) => x.id === op.id);
  const id = newNoteId();
  await noteOp(p, { op: "add", id, title: `${local?.title ?? pc?.title ?? "Not"} (telefon)` });
  await noteOp(p, { op: "set", id, text: op.text });
}

/** Hum dinlemesini sonraya saklamak için */
export function pcmBase64(pcm: Int16Array) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
