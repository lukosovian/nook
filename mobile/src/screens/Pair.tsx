import { useState } from "react";
import { motion } from "motion/react";
import { ClipboardPaste, QrCode } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { Orb } from "../Orb";
import { getStatus, parsePairUrl, PcError, type Pairing } from "../lib/pc";

/** İlk açılış: PC'deki Ayarlar › Telefon'daki QR kodu okut. */
export function PairScreen({ onPaired }: { onPaired: (p: Pairing) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [text, setText] = useState("");

  const tryPair = async (raw: string) => {
    const p = parsePairUrl(raw);
    if (!p) {
      setError("Bu bir Nook eşleşme kodu değil.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const st = await getStatus(p);
      onPaired({ ...p, name: st.name || p.name, mac: st.mac || p.mac });
    } catch (e) {
      setError(
        e instanceof PcError && e.kind === "offline"
          ? "PC'ye ulaşamadım. Aynı Wi-Fi'de misin, ya da iki cihazda da Tailscale açık mı?"
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  const scanQr = async () => {
    setError(null);
    try {
      const { scan, Format, checkPermissions, requestPermissions } = await import("@tauri-apps/plugin-barcode-scanner");
      if ((await checkPermissions()) !== "granted" && (await requestPermissions()) !== "granted") {
        setError("Kodu okumak için kamera izni gerekiyor.");
        return;
      }
      const r = await scan({ windowed: false, formats: [Format.QRCode] });
      if (r?.content) await tryPair(r.content);
    } catch (e) {
      setError(`Kamera açılamadı: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="safe flex min-h-screen flex-col items-center px-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Orb size={112} mood={busy ? "happy" : "idle"} />
        <div>
          <h1 className="font-round text-[28px] font-extrabold tracking-tight">Merhaba!</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-label-2">
            Bilgisayarındaki Nook'ta <b className="text-label">Ayarlar › Telefon</b>'u aç,
            <br />
            köprüyü aç ve <b className="text-label">Kodu göster</b>'e bas.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        {error && <p className="rounded-2xl bg-red/10 px-4 py-3 text-center text-[13px] text-red">{error}</p>}
        {manual || !isTauri() ? (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="nook://pair?…"
              className="min-w-0 flex-1 rounded-2xl bg-card px-4 py-3.5 text-[14px] text-label outline-none placeholder:text-label-3"
            />
            <motion.button whileTap={{ scale: 0.95 }} disabled={busy} onClick={() => void tryPair(text)} className="rounded-2xl bg-blue px-5 font-semibold text-white disabled:opacity-50">
              Bağlan
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={() => void scanQr()}
            className="flex items-center justify-center gap-2.5 rounded-3xl bg-blue py-4 text-[16px] font-semibold text-white disabled:opacity-50"
          >
            <QrCode size={20} strokeWidth={2.4} />
            {busy ? "Bağlanıyor…" : "PC ekle: kodu okut"}
          </motion.button>
        )}
        {isTauri() && (
          <button onClick={() => setManual((v) => !v)} className="flex items-center justify-center gap-1.5 py-2 text-[13px] text-label-3">
            <ClipboardPaste size={14} />
            {manual ? "Kamerayla okut" : "Kodu elle yapıştır"}
          </button>
        )}
      </div>
    </div>
  );
}
