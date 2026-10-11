import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ClipboardPaste, Copy, FileText, Image as ImageIcon, Pin, Send, X } from "lucide-react";
import { clipImage, getClips, phoneClipboard, sendToPcClipboard, type Pairing, type PcClip } from "../lib/pc";
import { errText, tintBg, TopBar, useBackButton, useToast } from "../ui";

const PURPLE = "#9B7BFF";

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60_000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} sa önce` : `${Math.round(h / 24)} gün önce`;
}

/** Pano: PC'nin pano geçmişi (dokun → telefona kopyala) ve telefondan PC'nin panosuna metin gönderme */
export function ClipsScreen({ pairing, onBack }: { pairing: Pairing; onBack: () => void }) {
  useBackButton(onBack);
  const [toast, say] = useToast();
  const [clips, setClips] = useState<PcClip[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  const load = () =>
    getClips(pairing)
      .then(setClips)
      .catch((e) => say(errText(e)));
  useEffect(() => {
    void load();
    // PC'de yeni bir şey kopyalanınca liste kendiliğinden yenilensin
    const t = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing]);

  const copy = async (c: PcClip) => {
    if (c.kind === "image") {
      try {
        setImage(await clipImage(pairing, c.id));
      } catch (e) {
        say(errText(e));
      }
      return;
    }
    if (c.kind === "files") {
      say("Dosyalar telefona kopyalanamıyor");
      return;
    }
    try {
      await (await phoneClipboard()).write(c.text);
      say("Telefona kopyalandı");
    } catch (e) {
      say(errText(e));
    }
  };

  const send = async (t: string) => {
    if (!t.trim()) return;
    setSending(true);
    try {
      await sendToPcClipboard(pairing, t);
      say("PC'nin panosuna gönderildi");
      setText("");
      window.setTimeout(() => void load(), 800);
    } catch (e) {
      say(errText(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4">
      <TopBar title="Pano" nook="clip" onBack={() => history.back()} />

      {/* Telefondan PC'ye */}
      <section className="rounded-3xl p-3" style={{ background: tintBg(PURPLE, 10), border: `1px solid ${tintBg(PURPLE, 28)}` }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="PC'ye göndermek istediğini yaz ya da yapıştır"
          rows={3}
          className="w-full resize-none bg-transparent px-1 text-[15px] text-label outline-none placeholder:text-label-3"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={async () => {
              try {
                const t = await (await phoneClipboard()).read();
                if (t) setText(t);
                else say("Telefonun panosu boş");
              } catch (e) {
                say(errText(e));
              }
            }}
            className="flex items-center gap-1.5 rounded-2xl bg-well px-3.5 py-2.5 text-[13px] font-semibold text-label-2"
          >
            <ClipboardPaste size={16} /> Panodan al
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={!text.trim() || sending}
            onClick={() => void send(text)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[14px] font-bold text-black disabled:opacity-40"
            style={{ background: PURPLE }}
          >
            <Send size={16} /> {sending ? "Gönderiliyor…" : "PC'nin panosuna gönder"}
          </motion.button>
        </div>
      </section>

      <h2 className="-mb-1 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">PC'de kopyalananlar</h2>
      {clips && !clips.length && <p className="py-8 text-center text-[13px] text-label-3">PC'nin pano geçmişi boş.</p>}
      <div className="flex flex-col gap-2 pb-4">
        {clips?.map((c) => (
          <motion.button key={c.id} whileTap={{ scale: 0.98 }} onClick={() => void copy(c)} className="flex items-start gap-3 rounded-2xl bg-card p-3 text-left">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: c.color ?? tintBg(PURPLE, 18) }}>
              {c.kind === "image" ? <ImageIcon size={16} className="text-label" /> : c.kind === "files" ? <FileText size={16} className="text-label" /> : !c.color && <Copy size={15} style={{ color: PURPLE }} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-3 whitespace-pre-wrap break-words text-[14px]">{c.kind === "image" ? `Görsel · ${c.text}` : c.text}</span>
              <span className="mt-1 flex items-center gap-1.5 text-[11px] text-label-3">
                {c.pinned && <Pin size={11} />}
                {[c.app, ago(c.at)].filter(Boolean).join(" · ")}
              </span>
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {image && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="safe fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex justify-end px-4 pb-2">
              <button
                onClick={() => {
                  URL.revokeObjectURL(image);
                  setImage(null);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-card"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-1 items-center overflow-auto">
              <img src={image} alt="" className="w-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {toast}
    </div>
  );
}
