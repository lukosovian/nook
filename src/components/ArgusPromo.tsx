import { motion } from "motion/react";
import { BellRing, CalendarDays, Download, Shuffle, type LucideIcon } from "lucide-react";
import symbol from "../assets/argus/symbol.png";
import wordmark from "../assets/argus/wordmark.png";
import { chooseArgusDir, installArgus } from "../lib/argus";
import { spring } from "../lib/motion";
import { useNook } from "../store/nook";
import { ACCENT, MiniNook, tintBg, tintText } from "./ui/primitives";

/** Argus'un kendi mavisi (logodaki geçiş) */
export const ARGUS_BLUE = "#1a8cff";

const FEATURES: { icon: LucideIcon; text: string }[] = [
  { icon: CalendarDays, text: "İzlediğin dizi ve filmleri, bölüm bölüm takip et" },
  { icon: BellRing, text: "Yeni bölüm çıkınca Nook sana haber versin" },
  { icon: Shuffle, text: "\"Ne izlesem?\" diye sorduğunda listenden seçsin" },
];

/**
 * Argus'u olmayanlara Argus'u tanıtır: Nook'un kardeş uygulaması. "Kur" düğmesi Argus'un
 * kendi kurulum betiğini açar. `big`: tanıtım ekranındaki geniş hâli.
 */
export function ArgusPromo({ big = false }: { big?: boolean }) {
  const hide = () => useNook.getState().updateSettings({ argusPromo: false });
  return (
    <div className={`flex h-full items-center ${big ? "gap-7 px-4" : "gap-3"}`}>
      <motion.img
        src={symbol}
        alt=""
        draggable={false}
        className="shrink-0"
        style={{ width: big ? 150 : 64, filter: `drop-shadow(0 0 ${big ? 28 : 12}px ${tintBg(ARGUS_BLUE, 60)})` }}
        initial={{ opacity: 0, scale: 0.85, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      />
      <div className="min-w-0 flex-1">
        <img src={wordmark} alt="Argus" draggable={false} style={{ height: big ? 34 : 18 }} />
        <p className={`mt-1 text-label-2 ${big ? "text-[13px]" : "text-[11px]"}`}>Nook'un kardeşi: izlediklerinin arşivi</p>
        <div className={`${big ? "mt-4 space-y-2" : "mt-1.5 space-y-0.5"}`}>
          {FEATURES.map(({ icon: Icon, text }) => (
            <p key={text} className={`flex items-center gap-2 text-label-2 ${big ? "text-[12.5px]" : "text-[10.5px]"}`}>
              {big ? <MiniNook color={ARGUS_BLUE} size={24} icon={Icon} /> : <Icon size={11} style={{ color: ARGUS_BLUE }} className="shrink-0" />}
              <span className={big ? "" : "truncate"}>{text}</span>
            </p>
          ))}
        </div>
        <div className={`flex items-center gap-1.5 ${big ? "mt-5" : "mt-2"}`}>
          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={spring.pop}
            onClick={() => void installArgus()}
            className={`flex items-center gap-1.5 rounded-full border font-medium ${big ? "h-9 px-4 text-[13px]" : "h-6 px-2.5 text-[11px]"}`}
            style={{ background: tintBg(ARGUS_BLUE, 22), borderColor: tintBg(ARGUS_BLUE, 50), color: tintText(ARGUS_BLUE), boxShadow: `0 0 16px -6px ${ARGUS_BLUE}` }}
          >
            <Download size={big ? 14 : 11} strokeWidth={2.4} />
            Argus'u kur
          </motion.button>
          <button onClick={() => void chooseArgusDir()} className={`rounded-full px-2 py-0.5 text-label-3 hover:bg-well-hi hover:text-label-2 ${big ? "text-[12px]" : "text-[10.5px]"}`}>
            Zaten kurulu
          </button>
          {!big && (
            <button onClick={hide} className="rounded-full px-2 py-0.5 text-[10.5px] text-label-3 hover:bg-well-hi hover:text-label-2">
              Gösterme
            </button>
          )}
        </div>
        <p className={`text-label-3 ${big ? "mt-2 text-[11px]" : "mt-1 text-[9.5px]"}`}>
          Ücretsiz. Gerekenleri kurulum kendisi kurar; bittiğinde Nook Argus'u kendiliğinden bulur.
        </p>
      </div>
    </div>
  );
}

/** Argus kuruluysa: bağlantının özeti (tanıtım ekranı için) */
export function ArgusLinked({ watching }: { watching: { id: string; title: string; poster: string | null; sub: string }[] }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <img src={symbol} alt="" draggable={false} style={{ width: 64, filter: `drop-shadow(0 0 14px ${tintBg(ARGUS_BLUE, 60)})` }} />
        <div>
          <img src={wordmark} alt="Argus" draggable={false} style={{ height: 24 }} />
          <p className="mt-1 flex items-center gap-1.5 text-[12px]" style={{ color: tintText(ACCENT.green) }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT.green }} />
            Bu bilgisayarda Argus'u buldum, bağlandım
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {watching.map((w, i) => (
          <motion.div
            key={w.id}
            className="flex items-center gap-3 rounded-[14px] bg-well px-2.5 py-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.1 + i * 0.07 }}
          >
            {w.poster ? (
              <img src={w.poster} alt="" draggable={false} className="h-[46px] w-[32px] rounded-[6px] object-cover" />
            ) : (
              <MiniNook color={ARGUS_BLUE} size={32} />
            )}
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium text-label">{w.title}</p>
              <p className="truncate text-[11px] text-label-3">{w.sub}</p>
            </div>
          </motion.div>
        ))}
        {!watching.length && <p className="text-[12px] text-label-3">Argus'ta İzleniyor olan diziler burada görünecek.</p>}
      </div>
      <p className="mt-auto text-[11px] text-label-3">Ana sayfadaki "İzliyorum" çipinden açılır · Ayarlar › Argus</p>
    </div>
  );
}
