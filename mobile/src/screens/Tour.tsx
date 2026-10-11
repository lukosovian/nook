import { useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ArrowRight, Camera, Clipboard, Film, Lock, Monitor, Moon, Music2, NotebookPen, Pause, Power, Radio, ShieldCheck, Smartphone, SkipForward, Volume2, Wifi, type LucideIcon } from "lucide-react";
import { NookFigure } from "@nook/components/mascot/Figure";
import { CHIP_NOOKS, DEFAULT_LOOK, type Look } from "@nook/lib/look";
import type { Expression } from "@nook/store/nook";
import { tintBg, tintText } from "../ui";

const SEEN_KEY = "nook.toured";

export function tourSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* yalnızca bu oturum */
  }
}

interface Step {
  title: string;
  text: string;
  color: string;
  /** Sayfanın Nook'u: PC'deki çip Nook'u (CHIP_NOOKS) ya da varsayılan beyaz Nook */
  nook: string | null;
  expression: Expression;
  /** Nook'un etrafında dönen küçük simgeler: bu bölümde neler yapılır */
  icons: LucideIcon[];
}

const STEPS: Step[] = [
  {
    title: "Merhaba, ben Nook",
    text: "Bilgisayarındaki Nook'un cebe sığan hâliyim. Bilgisayarını telefondan yönetirsin; neler yapabildiğimi bir dakikada göstereyim.",
    color: "#3ccf6e",
    nook: null,
    expression: "hop",
    icons: [],
  },
  {
    title: "Bilgisayarın avucunda",
    text: "Kapat, uyut, kilitle, ekranı kapat ya da ekran görüntüsünü al. Ne kadar süredir açık, işlemci, bellek ve disk ne durumda, ana sayfada görürsün.",
    color: "#8FE03A",
    nook: "control",
    expression: "nod",
    icons: [Power, Moon, Lock, Camera, Monitor],
  },
  {
    title: "Kapalıyken de açarım",
    text: "Bilgisayar kapalıysa “PC'yi aç”a bas, uyandırırım. Evdeyken hep çalışır; dışarıdan açmak için bilgisayardaki Nook'ta tek bir anahtarı açman yeter.",
    color: "#8FE03A",
    nook: "control",
    expression: "wink",
    icons: [Power, Wifi],
  },
  {
    title: "Müziğin kumandası",
    text: "Bilgisayarda çalan şarkı ya da video kapağıyla burada. Duraklat, geç, sesi aç kıs; kalkmana gerek yok.",
    color: "#FF5C8A",
    nook: "media",
    expression: "hum",
    icons: [Music2, Pause, SkipForward, Volume2],
  },
  {
    title: "Ne izlesem? Argus bilir",
    text: "Argus'taki arşivinden bir şey seçerim, yarım kalan dizinin sıradaki bölümünü gösteririm. İzledim dediğin bilgisayardaki Argus'a yazılır.",
    color: "#2B8CFF",
    nook: "argus",
    expression: "wink",
    icons: [Film],
  },
  {
    title: "Pano ve notlar elinde",
    text: "Bilgisayarda kopyaladığın telefona, telefonda kopyaladığın bilgisayara tek dokunuşla geçer. Nook'taki notların da burada; birinde yazdığın ötekinde görünür.",
    color: "#9B7BFF",
    nook: "clip",
    expression: "giggle",
    icons: [Clipboard, NotebookPen],
  },
  {
    title: "Çalan şarkıyı bulurum",
    text: "Kafede, arabada, televizyonda çalan bir şarkı mı? Hum'a dokun, telefonun mikrofonuyla dinleyip adını bulurum; bilgisayardaki Hum geçmişine de eklerim.",
    color: "#9B7BFF",
    nook: "hum",
    expression: "djNod",
    icons: [Radio, Music2],
  },
  {
    title: "Evden uzakta da",
    text: "Bilgisayarına ve bu telefona ücretsiz Tailscale'i kurarsan dışarıdayken de bağlanırım. Bağlantı yalnızca seninle bilgisayarın arasında, şifreli.",
    color: "#2B8CFF",
    nook: "argus",
    expression: "happy",
    icons: [ShieldCheck, Smartphone, Monitor],
  },
  {
    title: "Hadi bilgisayarını ekleyelim",
    text: "Bilgisayarındaki Nook'ta Ayarlar › Telefon'u aç, köprüyü aç ve Kodu göster'e bas. Sonra buradan kodu okut, hepsi bu.",
    color: "#3ccf6e",
    nook: null,
    expression: "love",
    icons: [],
  },
];

/** İlk açılış tanıtımı: kaydırarak ya da İleri ile geçilir; son sayfa PC eklemeye götürür */
export function TourScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const go = (n: number) => {
    if (n < 0) return;
    if (n >= STEPS.length) {
      markSeen();
      onDone();
      return;
    }
    setDir(n > i ? 1 : -1);
    setI(n);
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(i + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(i - 1);
  };
  const chip = step.nook ? CHIP_NOOKS[step.nook] : null;
  const look: Look = chip?.look ?? DEFAULT_LOOK;
  const color = chip?.color ?? "#F4F4F6";

  return (
    <div className="safe flex min-h-screen flex-col px-6">
      <div className="flex justify-end pt-1">
        {!last && (
          <button
            onClick={() => {
              markSeen();
              onDone();
            }}
            className="h-10 rounded-full px-4 text-[14px] text-label-3"
          >
            Geç
          </button>
        )}
      </div>

      <motion.div className="flex flex-1 flex-col" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragEnd={onDragEnd}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={i}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
          >
            {/* Nook ve etrafında dönen simgeler */}
            <div className="relative flex h-[230px] w-[230px] items-center justify-center">
              <motion.span
                className="absolute inset-4 rounded-full"
                style={{ background: `radial-gradient(circle, ${tintBg(step.color, 30)} 0%, transparent 70%)` }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              {step.icons.map((Icon, k) => {
                const a = (k / step.icons.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <motion.span
                    key={k}
                    className="absolute flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ background: tintBg(step.color, 18), border: `1px solid ${tintBg(step.color, 40)}`, color: tintText(step.color) }}
                    initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, x: Math.cos(a) * 98, y: [Math.sin(a) * 98 - 4, Math.sin(a) * 98 + 4, Math.sin(a) * 98 - 4] }}
                    transition={{ delay: 0.15 + k * 0.07, type: "spring", stiffness: 260, damping: 18, y: { duration: 2.6 + k * 0.3, repeat: Infinity, ease: "easeInOut" } }}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                  </motion.span>
                );
              })}
              <NookFigure look={look} color={color} size={step.icons.length ? 120 : 150} expression={step.expression} res={256} alive />
            </div>
            <div>
              <h1 className="font-round text-[27px] font-extrabold leading-tight tracking-tight" style={{ color: tintText(step.color) }}>
                {step.title}
              </h1>
              <p className="mx-auto mt-3 max-w-[330px] text-[15px] leading-relaxed text-label-2">{step.text}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="flex flex-col items-center gap-5 pb-4">
        <div className="flex gap-1.5">
          {STEPS.map((_, k) => (
            <button key={k} onClick={() => go(k)} className="p-1">
              <motion.span className="block h-2 rounded-full" animate={{ width: k === i ? 22 : 8, background: k === i ? step.color : "rgba(255,255,255,0.18)" }} />
            </button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => go(i + 1)}
          className="flex w-full items-center justify-center gap-2 rounded-3xl py-4 text-[16px] font-bold text-black"
          style={{ background: step.color }}
        >
          {last ? "PC'yi ekle" : i === 0 ? "Göster" : "İleri"}
          <ArrowRight size={19} strokeWidth={2.6} />
        </motion.button>
      </div>
    </div>
  );
}
