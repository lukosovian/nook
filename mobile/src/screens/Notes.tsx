import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { MoreHorizontal, Plus } from "lucide-react";
import { cached, getNotes, noteOp, type NoteOp, type Pairing, type PcPad } from "../lib/pc";
import { flush, newNoteId, noteOffline, pending, type NotesState } from "../lib/outbox";
import { errText, Sheet, tintBg, TopBar, useBackButton, useToast } from "../ui";
import type { Conn } from "../App";

const ORANGE = "#FF6A3D";
const SAVE_MS = 700;

/** Not: PC'deki not sekmeleri. Yazdıkça (kısa bir aradan sonra) PC'ye kaydedilir; PC'de değişen de buraya gelir.
 *  PC kapalıyken son görülen notlar açılır; yazılanlar telefonda saklanır ve PC açılınca gönderilir. */
export function NotesScreen({ pairing, conn, onBack }: { pairing: Pairing; conn: Conn; onBack: () => void }) {
  const online = conn === "online";
  const onlineRef = useRef(online);
  onlineRef.current = online;
  useBackButton(onBack);
  const [toast, say] = useToast();
  const [pads, setPads] = useState<PcPad[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState(true);
  // Yazılan ama henüz gönderilmemiş metin varken PC'den gelen eski hâli üstüne yazılmasın
  const dirty = useRef(false);
  const focused = useRef(false);
  const timer = useRef(0);
  const currentRef = useRef<string | null>(null);
  currentRef.current = current;

  const show = (r: NotesState, first: boolean) => {
    const list = r.pads ?? [];
    setPads(list);
    const id = first ? (r.padId && list.some((p) => p.id === r.padId) ? r.padId : list[0]?.id ?? null) : currentRef.current;
    if (first) setCurrent(id);
    if (!dirty.current && !focused.current) setText(list.find((p) => p.id === id)?.text ?? "");
  };

  const load = async (first = false) => {
    if (!onlineRef.current) {
      const c = cached<NotesState>("notes");
      if (c) show(c, first);
      else if (first) setPads([]);
      return;
    }
    try {
      // PC kapalıyken yazılanlar önce gitsin (yoksa PC'deki eski hâli üstüne yazılır)
      if (pending("note")) await flush(pairing);
      show(await getNotes(pairing), first);
    } catch (e) {
      const c = cached<NotesState>("notes");
      if (c) show(c, first);
      else say(errText(e));
    }
  };

  useEffect(() => {
    void load(true);
    const t = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing, online]);

  /** Çevrimdışıyken (ya da PC'ye o an ulaşılamazsa) değişiklik telefonda saklanır, PC açılınca gider */
  const apply = async (op: NoteOp) => {
    if (onlineRef.current) {
      try {
        return await noteOp(pairing, op);
      } catch {
        /* aşağıda sıraya */
      }
    }
    const list = noteOffline(op);
    setPads(list);
    return { ok: true, id: op.op === "add" ? (op.id ?? null) : null };
  };

  const save = async (id: string, value: string) => {
    try {
      await apply({ op: "set", id, text: value });
      dirty.current = false;
      setSaved(true);
      setPads((ps) => ps?.map((p) => (p.id === id ? { ...p, text: value } : p)) ?? ps);
    } catch (e) {
      say(errText(e));
    }
  };

  const edit = (value: string) => {
    setText(value);
    if (!current) return;
    dirty.current = true;
    setSaved(false);
    window.clearTimeout(timer.current);
    const id = current;
    timer.current = window.setTimeout(() => void save(id, value), SAVE_MS);
  };

  const switchTo = (id: string) => {
    // Bekleyen kaydı önce gönder
    if (dirty.current && current) {
      window.clearTimeout(timer.current);
      void save(current, text);
    }
    setCurrent(id);
    setText(pads?.find((p) => p.id === id)?.text ?? "");
  };

  const add = async () => {
    try {
      const r = await apply({ op: "add", id: newNoteId(), title: `Not ${(pads?.length ?? 0) + 1}` });
      await load();
      if (r.id) {
        setCurrent(r.id);
        setText("");
      }
    } catch (e) {
      say(errText(e));
    }
  };

  const cur = pads?.find((p) => p.id === current);

  return (
    <div className="safe flex h-screen flex-col gap-3 px-4">
      <TopBar
        title="Not"
        nook="note"
        onBack={() => history.back()}
        right={<span className="text-[12px] text-label-3">{!saved ? "Yazılıyor…" : online ? "Kaydedildi" : "Telefonda saklandı"}</span>}
      />
      {!online && (
        <p className="-mt-1 rounded-2xl bg-card px-3.5 py-2.5 text-[12.5px] leading-snug text-label-2">
          PC kapalı: son görülen notlar açık. Yazdıkların telefonda saklanır, PC açılınca gönderilir.
        </p>
      )}

      <div className="no-scrollbar -mx-4 flex shrink-0 gap-1.5 overflow-x-auto px-4">
        {pads?.map((p) => (
          <button
            key={p.id}
            onClick={() => switchTo(p.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${p.id === current ? "text-black" : "bg-card text-label-2"}`}
            style={p.id === current ? { background: ORANGE } : undefined}
          >
            {p.title}
          </button>
        ))}
        <button onClick={() => void add()} className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-card text-label-2">
          <Plus size={17} />
        </button>
        {cur && (
          <button
            onClick={() => {
              setTitle(cur.title);
              setMenu(true);
            }}
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-card text-label-2"
          >
            <MoreHorizontal size={17} />
          </button>
        )}
      </div>

      {pads && !pads.length && <p className="py-8 text-center text-[13px] text-label-3">PC'de not yok. + ile yeni bir not aç.</p>}
      {cur && (
        <textarea
          value={text}
          onChange={(e) => edit(e.target.value)}
          onFocus={() => (focused.current = true)}
          onBlur={() => (focused.current = false)}
          placeholder="Yaz…"
          className="mb-3 min-h-0 w-full flex-1 resize-none rounded-3xl p-4 text-[15.5px] leading-relaxed text-label outline-none placeholder:text-label-3"
          style={{ background: tintBg(ORANGE, 7), border: `1px solid ${tintBg(ORANGE, 22)}` }}
        />
      )}

      <AnimatePresence>
        {menu && cur && (
          <Sheet key="menu" onClose={() => setMenu(false)}>
            <p className="px-1 text-[12px] text-label-3">Notun adı</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 w-full rounded-2xl bg-well px-4 py-3 text-[15px] text-label outline-none" />
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                onClick={async () => {
                  setMenu(false);
                  try {
                    await apply({ op: "remove", id: cur.id });
                    setCurrent(null);
                    await load(true);
                  } catch (e) {
                    say(errText(e));
                  }
                }}
                className="rounded-2xl bg-red/15 py-3.5 font-semibold text-red"
              >
                Notu sil
              </button>
              <button
                onClick={async () => {
                  setMenu(false);
                  if (!title.trim() || title === cur.title) return;
                  try {
                    await apply({ op: "rename", id: cur.id, title: title.trim() });
                    await load();
                  } catch (e) {
                    say(errText(e));
                  }
                }}
                className="rounded-2xl py-3.5 font-semibold text-black"
                style={{ background: ORANGE }}
              >
                Kaydet
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
      {toast}
    </div>
  );
}
