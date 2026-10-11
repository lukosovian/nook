import { useEffect, useState } from "react";
import { FileText, Send } from "lucide-react";
import { motion } from "motion/react";
import { findHost, sendToPcClipboard, type Pairing } from "../lib/pc";
import { native, onNative } from "../lib/native";
import { queue } from "../lib/outbox";
import { errText, Sheet, tintBg } from "../ui";

/** Başka uygulamadan "Paylaş › Nook" ile gelen: metin ya da dosyalar (MainActivity.readShare) */
export type Shared = { text: string } | { files: { name: string; size: number; mime: string }[] };

const PURPLE = "#9B7BFF";

function size(n: number) {
  if (n < 0) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}

/** Paylaşılanı PC'ye gönderir: metin PC'nin panosuna (PC kapalıysa açılınca), dosyalar İndirilenler › Nook Mobil'e */
export function ShareSheet({ pairing, shared, online, onDone }: { pairing: Pairing; shared: Shared; online: boolean; onDone: (msg?: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onNative("upload", (d) => {
        if (d.error) {
          setBusy(false);
          setProgress(null);
          setError(String(d.error));
        } else if (d.done) onDone("PC'ye gönderildi: İndirilenler › Nook Mobil");
        else if ("files" in shared) {
          const f = shared.files[Number(d.i)];
          const pct = Number(d.size) > 0 ? Math.round((Number(d.sent) / Number(d.size)) * 100) : 0;
          setProgress(`${shared.files.length > 1 ? `${Number(d.i) + 1}/${shared.files.length} · ` : ""}${f?.name ?? ""} · %${pct}`);
        }
      }),
    [shared, onDone],
  );

  const send = async () => {
    setError(null);
    if ("text" in shared) {
      if (!online) {
        queue({ kind: "clip", text: shared.text, at: Date.now() });
        return onDone("PC açılınca panosuna gönderilecek");
      }
      setBusy(true);
      try {
        await sendToPcClipboard(pairing, shared.text);
        onDone("PC'nin panosuna gönderildi");
      } catch (e) {
        setBusy(false);
        setError(errText(e));
      }
      return;
    }
    setBusy(true);
    const host = await findHost(pairing);
    if (!host || !native) {
      setBusy(false);
      setError("PC'ye ulaşılamıyor: PC açıkken yeniden paylaş.");
      return;
    }
    native.uploadShared(host);
  };

  return (
    <Sheet onClose={() => !busy && onDone()}>
      <p className="px-1 text-center text-[17px] font-bold">PC'ye gönder</p>
      <div className="mt-3 rounded-3xl p-3" style={{ background: tintBg(PURPLE, 10), border: `1px solid ${tintBg(PURPLE, 28)}` }}>
        {"text" in shared ? (
          <p className="line-clamp-6 whitespace-pre-wrap break-words text-[14px] text-label">{shared.text}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {shared.files.slice(0, 6).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-[13.5px]">
                <FileText size={16} className="shrink-0 text-label-3" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="shrink-0 text-[12px] text-label-3">{size(f.size)}</span>
              </li>
            ))}
            {shared.files.length > 6 && <li className="text-[12.5px] text-label-3">+{shared.files.length - 6} dosya daha</li>}
          </ul>
        )}
      </div>
      <p className="mt-2 px-1 text-[12px] leading-snug text-label-3">
        {"text" in shared
          ? online
            ? "PC'nin panosuna kopyalanır; PC'de Ctrl+V ile yapıştır."
            : "PC şu an kapalı: açılınca panosuna gönderilir."
          : "PC'de İndirilenler › Nook Mobil klasörüne kaydedilir."}
      </p>
      {error && <p className="mt-2 rounded-2xl bg-red/10 px-3 py-2 text-[13px] text-red">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button disabled={busy} onClick={() => onDone()} className="rounded-2xl bg-well py-3.5 font-medium text-label disabled:opacity-40">
          Vazgeç
        </button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={busy || (!("text" in shared) && !online)}
          onClick={() => void send()}
          className="flex items-center justify-center gap-1.5 rounded-2xl py-3.5 font-bold text-black disabled:opacity-40"
          style={{ background: PURPLE }}
        >
          <Send size={16} /> {busy ? (progress ?? "Gönderiliyor…") : "Gönder"}
        </motion.button>
      </div>
      {!("text" in shared) && !online && <p className="mt-2 px-1 text-center text-[12px] text-label-3">PC'ye ulaşılamıyor: dosya göndermek için PC açık olmalı.</p>}
      <div className="h-4" />
    </Sheet>
  );
}
