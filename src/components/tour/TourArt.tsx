/**
 * Tanıtımın sağ kartındaki çizimler: sahte bir masaüstü + çentik üzerinde döngüsel canlandırmalar.
 * Gerçek ayarlar (anahtar, göz/su) burada da değiştirilebilir.
 */
import { motion, type TargetAndTransition, type Transition } from "motion/react";
import {
  Camera,
  Droplet,
  ExternalLink,
  Eye,
  FileText,
  Hand,
  House,
  ImageIcon,
  LogOut,
  MessageCircle,
  Moon,
  MousePointer2,
  MousePointerClick,
  Search,
  Settings,
  Target,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { useGemini } from "../../hooks/useGemini";
import { openPath } from "../../lib/bridge";
import { SULK_BELOW, useNook, type Expression } from "../../store/nook";
import { KeyInput, TextInput } from "../panels/SettingsPanel";
import { ArgusLinked, ArgusPromo } from "../ArgusPromo";
import { epLabel, posterSrc, useArgus, watching } from "../../lib/argus";
import { ACCENT, Bar, MiniNook, Segmented, tintBg, tintText, Toggle } from "../ui/primitives";
import { MyNook, NookFigure } from "../mascot/Figure";
import { DEFAULT_LOOK, SHOWCASE, useShowcase, type Look } from "../../lib/look";
import { endTour } from "../../lib/tour";
import { useEffect, useState } from "react";
import { Shuffle } from "lucide-react";

const LOOP = { repeat: Infinity, ease: "easeInOut" } as const;

/** Sahte masaüstü: duvar kâğıdı, birkaç pencere silueti, görev çubuğu. Çentik üstte ortada. */
function Screen({ height, children }: { height: number; children?: React.ReactNode }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[16px] border border-white/[0.08]"
      style={{ height, background: "radial-gradient(120% 100% at 15% 0%, #2a3a55 0%, #171c27 55%, #0f1117 100%)" }}
    >
      {/* Pencere siluetleri */}
      <div className="absolute left-[7%] top-[30%] h-[42%] w-[38%] rounded-[8px] border border-white/[0.06] bg-white/[0.035]">
        <div className="h-3 rounded-t-[8px] bg-white/[0.05]" />
        <div className="m-2 space-y-1.5">
          <div className="h-1.5 w-3/4 rounded-full bg-white/[0.07]" />
          <div className="h-1.5 w-1/2 rounded-full bg-white/[0.05]" />
          <div className="h-1.5 w-2/3 rounded-full bg-white/[0.05]" />
        </div>
      </div>
      <div className="absolute right-[8%] top-[38%] h-[36%] w-[30%] rounded-[8px] border border-white/[0.06] bg-white/[0.03]">
        <div className="h-3 rounded-t-[8px] bg-white/[0.05]" />
      </div>
      {/* Görev çubuğu */}
      <div className="absolute inset-x-0 bottom-0 flex h-[18px] items-center justify-center gap-1 bg-black/40">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="h-2 w-2 rounded-[3px]" style={{ background: i === 0 ? "rgb(255 255 255 / 0.35)" : "rgb(255 255 255 / 0.14)" }} />
        ))}
      </div>
      {children}
    </div>
  );
}

/** Çentik: üstte ortada saf siyah, yalnızca alt köşeleri yuvarlak. */
function Notch({ animate, transition, children }: { animate: TargetAndTransition; transition: Transition; children?: React.ReactNode }) {
  return (
    <motion.div
      className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden bg-black"
      style={{ boxShadow: "0 8px 20px -8px rgba(0,0,0,0.9)" }}
      animate={animate}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

function Tip({ icon: Icon, color, children }: { icon: LucideIcon; color: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border px-2.5 py-2" style={{ background: tintBg(color, 8), borderColor: tintBg(color, 22) }}>
      <MiniNook color={color} size={24} icon={Icon} />
      <span className="text-[11.5px] leading-snug text-label-2">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------- Üstüne gel

const HOVER_T = { duration: 5.2, times: [0, 0.22, 0.3, 0.62, 0.72, 1], ...LOOP };

export function HoverArt() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Screen height={308}>
        <Notch animate={{ width: [70, 70, 330, 330, 70, 70], height: [17, 17, 132, 132, 17, 17], borderBottomLeftRadius: [8, 8, 20, 20, 8, 8], borderBottomRightRadius: [8, 8, 20, 20, 8, 8] }} transition={HOVER_T}>
          <motion.div className="absolute" animate={{ left: [29, 29, 18, 18, 29, 29], top: [2.5, 2.5, 18, 18, 2.5, 2.5], scale: [1, 1, 2.4, 2.4, 1, 1] }} transition={HOVER_T} style={{ originX: 0, originY: 0 }}>
            <MyNook size={12} />
          </motion.div>
          <motion.div className="absolute left-[70px] right-3 top-4 grid grid-cols-2 gap-1.5" animate={{ opacity: [0, 0, 1, 1, 0, 0] }} transition={HOVER_T}>
            {[ACCENT.yellow, ACCENT.pink, ACCENT.red, ACCENT.teal, ACCENT.purple, ACCENT.orange].map((c, i) => (
              <span key={i} className="flex h-[30px] items-center gap-1.5 rounded-full border px-1" style={{ background: tintBg(c, 14), borderColor: tintBg(c, 34) }}>
                <MiniNook color={c} size={18} />
                <span className="h-1.5 w-12 rounded-full" style={{ background: tintBg(c, 60) }} />
              </span>
            ))}
          </motion.div>
        </Notch>
        <motion.div
          className="absolute z-20"
          animate={{ left: ["78%", "50%", "50%", "50%", "72%", "78%"], top: ["78%", "5%", "5%", "8%", "72%", "78%"] }}
          transition={HOVER_T}
        >
          <MousePointer2 size={20} className="text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]" fill="white" strokeWidth={1.4} />
        </motion.div>
      </Screen>
      <div className="flex gap-2">
        <Tip icon={MousePointer2} color={ACCENT.blue}>
          Üst ortaya gel: <b className="font-medium text-label">açılırım</b>
        </Tip>
        <Tip icon={LogOut} color={ACCENT.teal}>
          Uzaklaş: <b className="font-medium text-label">kapanırım</b>
        </Tip>
        <Tip icon={Moon} color={ACCENT.purple}>
          Bilgisayar boştaysa <b className="font-medium text-label">uyurum</b>
        </Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Bölümler

const MODULES: { label: string; desc: string; color: string }[] = [
  { label: "Bugün", desc: "Hava, alarm, günün özeti", color: ACCENT.yellow },
  { label: "Müzik", desc: "Çalan şarkıyı yönet", color: ACCENT.pink },
  { label: "Odak", desc: "Pomodoro sayacı", color: ACCENT.red },
  { label: "Raf", desc: "Bana bıraktığın dosyalar", color: ACCENT.teal },
  { label: "Pano", desc: "Kopyaladıkların, çevirisi", color: ACCENT.purple },
  { label: "Not", desc: "Hızlı karalama", color: ACCENT.orange },
  { label: "Alarm", desc: "Alarm ve hatırlatıcı", color: ACCENT.yellow },
  { label: "Kısayollar", desc: "Sık açtığın uygulamalar", color: ACCENT.blue },
  { label: "Bildirimler", desc: "Windows bildirimleri", color: ACCENT.purple },
  { label: "Kontrol", desc: "Wi-Fi, ses, mikrofon", color: ACCENT.green },
  { label: "Sistem", desc: "İşlemci, bellek, ağ", color: ACCENT.red },
  { label: "Oyun", desc: "Benimle mini oyunlar", color: ACCENT.pink },
  { label: "Karne", desc: "Haftalık istatistik", color: ACCENT.teal },
];

const NAV: { icon: LucideIcon; label: string }[] = [
  { icon: House, label: "Ana sayfa" },
  { icon: MessageCircle, label: "Sohbet" },
  { icon: Search, label: "Ara" },
  { icon: Settings, label: "Ayarlar" },
];

export function ModulesArt() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-1.5">
        {NAV.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5 rounded-full bg-well px-2.5 py-1 text-[11px] font-medium text-label-2">
            <Icon size={12} strokeWidth={2.2} />
            {label}
          </span>
        ))}
        <span className="ml-auto text-[10.5px] text-label-3">sol üstteki ikonlar</span>
      </div>
      <div className="grid flex-1 grid-cols-3 content-start gap-1.5">
        {MODULES.map((m, i) => (
          <motion.div
            key={m.label}
            className="flex min-w-0 items-center gap-2 rounded-full border py-1 pl-1 pr-2.5"
            style={{ background: tintBg(m.color, 12), borderColor: tintBg(m.color, 32) }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 + i * 0.035 }}
          >
            <MiniNook color={m.color} size={26} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[12px] font-medium" style={{ color: tintText(m.color) }}>
                {m.label}
              </span>
              <span className="block truncate text-[10px] text-label-3">{m.desc}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Dosya yedir

const FEED_T = { duration: 4.6, times: [0, 0.12, 0.42, 0.5, 0.62, 0.86, 1], ...LOOP };

export function FeedArt() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Screen height={256}>
        {/* Dosya yaklaşınca çentik ağzını açar, yutunca çiğner, sonra rafa koyar */}
        <Notch
          animate={{
            width: [70, 70, 150, 132, 150, 70, 70],
            height: [17, 17, 54, 46, 50, 17, 17],
            borderBottomLeftRadius: [8, 8, 22, 20, 22, 8, 8],
            borderBottomRightRadius: [8, 8, 22, 20, 22, 8, 8],
          }}
          transition={FEED_T}
        >
          <motion.div animate={{ scale: [1, 1, 2.2, 1.9, 2.1, 1, 1] }} transition={FEED_T}>
            <MyNook size={12} />
          </motion.div>
        </Notch>
        <motion.div
          className="absolute z-20 flex flex-col items-center gap-1"
          animate={{
            left: ["22%", "22%", "46%", "47%", "47%", "22%", "22%"],
            top: ["60%", "60%", "14%", "4%", "4%", "60%", "60%"],
            scale: [1, 1, 0.9, 0.2, 0, 0, 1],
            opacity: [0, 1, 1, 1, 0, 0, 0],
          }}
          transition={FEED_T}
        >
          <span className="flex h-11 w-9 items-center justify-center rounded-[6px] border border-white/15 bg-white/10 backdrop-blur">
            <FileText size={18} className="text-white/85" strokeWidth={1.8} />
          </span>
          <span className="rounded bg-black/50 px-1 text-[9.5px] text-white/80">rapor.pdf</span>
          <MousePointer2 size={16} className="-mt-3 ml-6 text-white drop-shadow" fill="white" strokeWidth={1.4} />
        </motion.div>
      </Screen>
      {/* Raf */}
      <div className="flex items-center gap-2 rounded-[14px] bg-well px-2.5 py-2">
        <MiniNook color={ACCENT.teal} size={24} />
        <span className="text-[11.5px] font-medium" style={{ color: tintText(ACCENT.teal) }}>
          Raf
        </span>
        <div className="ml-1 flex gap-1.5">
          {[
            { icon: FileText, name: "rapor.pdf" },
            { icon: ImageIcon, name: "ekran.png" },
            { icon: FileText, name: "sunum.docx" },
          ].map(({ icon: Icon, name }, i) => (
            <motion.span
              key={name}
              className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-label-2"
              animate={i === 0 ? { scale: [0.6, 0.6, 0.6, 0.6, 1.08, 1, 1], opacity: [0.2, 0.2, 0.2, 0.2, 1, 1, 1] } : undefined}
              transition={i === 0 ? FEED_T : undefined}
            >
              <Icon size={11} />
              {name}
            </motion.span>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Tip icon={Camera} color={ACCENT.teal}>
          Ekran görüntüleri rafa <b className="font-medium text-label">kendiliğinden</b> düşer
        </Tip>
        <Tip icon={Hand} color={ACCENT.pink}>
          Raftan sürükle, <b className="font-medium text-label">istediğin yere bırak</b>
        </Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Kısayollar

function Keys({ combo, color }: { combo: string; color: string }) {
  const parts = combo.replace("Space", "Boşluk").split("+");
  return (
    <span className="flex shrink-0 items-center gap-1">
      {parts.map((k, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-[11px] text-label-3">+</span>}
          <kbd
            className="min-w-[30px] rounded-[8px] border px-2 py-1 text-center font-sans text-[11.5px] font-medium"
            style={{
              background: "linear-gradient(180deg, rgb(255 255 255 / 0.1), rgb(255 255 255 / 0.04))",
              borderColor: tintBg(color, 40),
              color: tintText(color),
              boxShadow: `0 2px 0 rgb(0 0 0 / 0.6), 0 0 12px -6px ${color}`,
            }}
          >
            {k}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export function KeysArt() {
  const s = useNook((st) => st.settings);
  const rows = [
    { combo: s.shortcut, color: ACCENT.blue, title: "Hızlı arama", text: "Uygulama aç, hesap yap (12*7), çevir (5 km kaç mil, 100 usd), emoji bul, web'de ara." },
    { combo: s.askShortcut, color: ACCENT.purple, title: "Ekrana sor", text: "Ekranın görüntüsünü alır, bana sorarsın: \"bu hata ne demek?\"" },
    { combo: s.voiceShortcut, color: ACCENT.orange, title: "Sesli komut", text: "Basılı tut, konuş, bırak: \"yarın sekize alarm kur\"." },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      {rows.map((r, i) => (
        <motion.div
          key={r.title}
          className="flex items-center gap-4 rounded-[16px] border px-4 py-3.5"
          style={{ background: tintBg(r.color, 7), borderColor: tintBg(r.color, 20) }}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.08 + i * 0.08 }}
        >
          <div className="w-[208px] shrink-0">
            <Keys combo={r.combo} color={r.color} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium" style={{ color: tintText(r.color) }}>
              {r.title}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-label-2">{r.text}</p>
          </div>
        </motion.div>
      ))}
      <p className="px-1 text-[10.5px] text-label-3">Ekrana sor ve sesli komut için bir sonraki adımdaki Gemini anahtarı gerekir.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Yapay zekâ

export function AiArt() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  const gemini = useGemini();

  return (
    <div className="flex h-full gap-4">
      {/* Sahte sohbet */}
      <div className="flex w-[218px] shrink-0 flex-col justify-center gap-2 rounded-[16px] bg-well p-3">
        <motion.p
          className="ml-auto max-w-[170px] rounded-[14px] rounded-br-[4px] px-3 py-1.5 text-[11.5px] text-white"
          style={{ background: tintBg(ACCENT.blue, 55) }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Yarın sabah 8'e alarm kurar mısın?
        </motion.p>
        <motion.div className="flex items-end gap-1.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <MyNook size={20} expression="happy" />
          <p className="max-w-[160px] rounded-[14px] rounded-bl-[4px] bg-white/[0.08] px-3 py-1.5 text-[11.5px] text-label">
            Kurdum! Yarın 08:00'de seni uyandırırım.
          </p>
        </motion.div>
        <motion.span
          className="ml-[26px] flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px]"
          style={{ background: tintBg(ACCENT.yellow, 12), borderColor: tintBg(ACCENT.yellow, 34), color: tintText(ACCENT.yellow) }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.3, type: "spring", stiffness: 500, damping: 20 }}
        >
          Alarm · 08:00
        </motion.span>
        <motion.div className="mt-1 flex items-end gap-1.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9 }}>
          <MyNook size={20} />
          <p className="max-w-[160px] rounded-[14px] rounded-bl-[4px] bg-white/[0.08] px-3 py-1.5 text-[11.5px] text-label">"Şunu hatırla…" dersen aklımda tutarım.</p>
        </motion.div>
      </div>

      {/* Kurulum */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
        <SetupRow n={1} title="Ücretsiz anahtarını al">
          <button
            onClick={() => void openPath("https://aistudio.google.com/apikey")}
            className="mt-1.5 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium"
            style={{ background: tintBg(ACCENT.blue, 16), borderColor: tintBg(ACCENT.blue, 40), color: tintText(ACCENT.blue) }}
          >
            aistudio.google.com
            <ExternalLink size={11} strokeWidth={2.4} />
          </button>
          <p className="mt-1 text-[10.5px] text-label-3">Google hesabınla gir → "Create API key"</p>
        </SetupRow>
        <SetupRow n={2} title="Anahtarı buraya yapıştır">
          <div className="mt-1.5">
            <KeyInput value={s.geminiKey} onChange={(v) => update({ geminiKey: v })} />
          </div>
          <p className="mt-1 text-[10.5px]" style={{ color: gemini.status === "ok" ? ACCENT.green : gemini.status === "error" ? ACCENT.red : "var(--color-label-3)" }}>
            {gemini.status === "ok"
              ? "Bağlandı! Artık konuşabiliriz."
              : gemini.status === "error"
                ? gemini.error
                : gemini.status === "checking"
                  ? "Kontrol ediliyor…"
                  : "Yalnızca bu bilgisayarda saklanır."}
          </p>
        </SetupRow>
        <SetupRow n={3} title="Sana nasıl seslenelim?">
          <div className="mt-1.5">
            <TextInput value={s.userName} placeholder="Adın" onChange={(v) => update({ userName: v })} />
          </div>
        </SetupRow>
        <p className="text-[10.5px] text-label-3">Şimdi atlarsan sonra Ayarlar › Yapay zekâ'dan girebilirsin.</p>
      </div>
    </div>
  );
}

function SetupRow({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold"
        style={{ background: tintBg(ACCENT.purple, 24), color: tintText(ACCENT.purple) }}
      >
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-label">{title}</p>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Sağlık

const WATER = [
  { id: 0, label: "Yok" },
  { id: 45, label: "45 dk" },
  { id: 60, label: "1 sa" },
  { id: 90, label: "90 dk" },
];

/** Adadaki olay kartının küçük kopyası */
function MiniToast({ icon, color, title, detail, delay }: { icon: LucideIcon; color: string; title: string; detail: string; delay: number }) {
  return (
    <motion.div
      className="flex h-[52px] w-[300px] items-center gap-3 rounded-b-[20px] bg-black px-3"
      style={{ boxShadow: "0 10px 24px -10px rgba(0,0,0,0.9)" }}
      animate={{ y: [-60, -60, 0, 0, -60, -60], opacity: [0, 0, 1, 1, 0, 0] }}
      transition={{ duration: 6, times: [0, delay, delay + 0.06, delay + 0.36, delay + 0.42, 1], ...LOOP }}
    >
      <MyNook size={26} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight" style={{ color: tintText(color) }}>
          {title}
        </p>
        <p className="mt-0.5 truncate text-[11px] leading-tight text-label-2">{detail}</p>
      </div>
      <MiniNook color={color} size={28} icon={icon} />
    </motion.div>
  );
}

export function CareArt() {
  const s = useNook((st) => st.settings);
  const update = useNook((st) => st.updateSettings);
  return (
    <div className="flex h-full flex-col gap-3">
      <Screen height={176}>
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <div className="absolute left-0 top-0">
            <MiniToast icon={Eye} color={ACCENT.teal} title="Göz molası" detail="20 saniye boyunca uzağa bak" delay={0.04} />
          </div>
          <div className="relative">
            <MiniToast icon={Droplet} color={ACCENT.blue} title="Su içme vakti" detail="Bir bardak su iyi gelir" delay={0.52} />
          </div>
        </div>
      </Screen>
      <div className="divide-y divide-white/[0.05] rounded-[16px] bg-well px-3.5 py-1">
        <CareRow icon={Eye} color={ACCENT.teal} title="Göz molası (20-20-20)" sub="20 dk kesintisiz kullanımda 20 sn uzağa bak">
          <Toggle on={s.eyeBreak} onChange={(v) => update({ eyeBreak: v })} />
        </CareRow>
        <CareRow icon={Droplet} color={ACCENT.blue} title="Su hatırlatıcısı" sub="Seçtiğin aralıkla">
          <Segmented id="tour-water" options={WATER} value={s.waterEvery} onChange={(v) => update({ waterEvery: v })} color={ACCENT.blue} />
        </CareRow>
        <CareRow icon={Target} color={ACCENT.red} title="Odak (Pomodoro)" sub="25 dk çalış, 5 dk mola; 4 turda bir uzun mola">
          <span className="text-[10.5px] text-label-3">Odak bölümünde</span>
        </CareRow>
      </div>
    </div>
  );
}

function CareRow({ icon, color, title, sub, children }: { icon: LucideIcon; color: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <MiniNook color={color} size={26} icon={icon} />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-label">{title}</p>
        <p className="text-[10.5px] text-label-3">{sub}</p>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Keyif

const MOODS: { icon: LucideIcon; color: string; expression: Expression; act: string; result: string }[] = [
  { icon: MousePointerClick, color: ACCENT.orange, expression: "slap", act: "Bir kez tıkla", result: "Şaplak! (3 kez üst üste: kızarım)" },
  { icon: Hand, color: ACCENT.purple, expression: "suspicious", act: "Tut ve fırlat", result: "Sert fırlatırsan başım döner" },
  { icon: FileText, color: ACCENT.pink, expression: "happy", act: "Dosya yedir", result: "En sevdiğim şey" },
  { icon: Moon, color: ACCENT.blue, expression: "sleepy", act: "Gece yarısından sonra", result: "Uykum gelir, esnerim" },
];

export function MoodArt() {
  const affection = useNook((st) => st.affection);
  const sulky = affection < SULK_BELOW;
  const color = sulky ? ACCENT.orange : ACCENT.pink;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3 rounded-[16px] bg-well px-3.5 py-3">
        <MyNook size={30} expression={sulky ? "sulk" : affection >= 80 ? "happy" : "idle"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between text-[12.5px]">
            <span className="font-medium text-label">Keyfim</span>
            <span className="font-medium tabular-nums" style={{ color }}>
              %{Math.round(affection)}
            </span>
          </div>
          <Bar pct={affection} color={color} className="mt-1.5" />
          <p className="mt-1.5 text-[10.5px] text-label-3">Ayarlar'ın en üstünde de görürsün.</p>
        </div>
        <Heart size={18} className="shrink-0" style={{ color }} fill="currentColor" />
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2">
        {MOODS.map((m, i) => (
          <motion.div
            key={m.act}
            className="flex flex-col justify-between rounded-[16px] border p-3"
            style={{ background: tintBg(m.color, 8), borderColor: tintBg(m.color, 24) }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.08 + i * 0.06 }}
          >
            <div className="flex items-center justify-between">
              <MyNook size={30} expression={m.expression} />
              <m.icon size={16} style={{ color: tintText(m.color) }} />
            </div>
            <div>
              <p className="text-[12.5px] font-medium" style={{ color: tintText(m.color) }}>
                {m.act}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-label-2">{m.result}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Kendi Nook'un

const SHOWCASE_MS = 1900;

/**
 * Hazır görünümlerden bir vitrin. Soldaki büyük Nook da sırayla onlara bürünür (Island, useShowcase);
 * adımdan çıkınca kendi görünümüne döner.
 */
export function LookArt() {
  const [i, setI] = useState(1);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % SHOWCASE.length), SHOWCASE_MS);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    useShowcase.setState({ pick: { look: SHOWCASE[i].look, color: SHOWCASE[i].color } });
  }, [i]);
  useEffect(() => () => useShowcase.setState({ pick: null }), []);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid flex-1 grid-cols-3 gap-2">
        {SHOWCASE.map((m, n) => {
          const on = n === i;
          return (
            <motion.button
              key={m.name}
              onClick={() => setI(n)}
              className="relative flex flex-col items-center justify-end overflow-hidden rounded-[18px] border pb-2.5"
              style={{ background: on ? tintBg(m.color, 16) : "rgb(255 255 255 / 0.04)", borderColor: on ? tintBg(m.color, 55) : "rgb(255 255 255 / 0.06)" }}
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 28, delay: 0.06 + n * 0.05 }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3" style={{ background: `radial-gradient(60% 70% at 50% 40%, ${tintBg(m.color, on ? 30 : 12)} 0%, transparent 70%)` }} />
              <motion.div className="relative mb-3" animate={{ y: on ? [0, -4, 0] : 0, scale: on ? 1.08 : 1 }} transition={on ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}>
                <NookFigure look={m.look} color={m.color} size={54} expression={on ? "happy" : "idle"} />
              </motion.div>
              <span className="relative text-[12.5px] font-semibold" style={{ color: on ? tintText(m.color) : undefined }}>
                {m.name}
              </span>
              <span className="relative text-[10.5px] text-label-3">{m.note}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {["İsim", "6 gövde", "Vinil · peluş", "10 renk", "5 göz", "Gözlük", "Şapka", "Papyon"].map((t) => (
            <span key={t} className="rounded-full bg-well px-2 py-0.5 text-[10.5px] text-label-2">
              {t}
            </span>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            useNook.getState().setPendingTab("look");
            endTour();
          }}
          className="shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium"
          style={{ background: tintBg(ACCENT.pink, 18), borderColor: tintBg(ACCENT.pink, 45), color: tintText(ACCENT.pink) }}
        >
          Şimdi giydir
        </motion.button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Argus

export function ArgusArt() {
  const snap = useArgus((s) => s.snap);
  if (!snap) return <ArgusPromo big />;
  const list = watching(snap)
    .slice(0, 4)
    .map((i) => ({
      id: i.id,
      title: i.title,
      poster: posterSrc(i),
      sub: i.series?.next ? `Sıradaki ${epLabel(i.series.next)}${i.series.next.name ? ` · ${i.series.next.name}` : ""}` : "Güncelsin",
    }));
  return <ArgusLinked watching={list} />;
}

// ---------------------------------------------------------------- İlk ve son adım

export function HelloChips() {
  // Her çipte başka bir Nook: kendi Nook'unu da böyle giydirebileceğinin habercisi
  const items: { color: string; label: string; body: string; look: Look }[] = [
    { color: ACCENT.pink, label: "Müzik", body: "#FF5C8A", look: { ...DEFAULT_LOOK, shape: "heart", head: "headphones" } },
    { color: ACCENT.teal, label: "Dosya rafı", body: "#2FD4C0", look: { ...DEFAULT_LOOK, shape: "cloud", texture: "plush", eyes: "bead" } },
    { color: ACCENT.purple, label: "Yapay zekâ", body: "#9B7BFF", look: { ...DEFAULT_LOOK, shape: "triangle", glasses: "round" } },
    { color: ACCENT.yellow, label: "Alarm", body: "#FFD21F", look: { ...DEFAULT_LOOK, shape: "flower", eyes: "sparkle" } },
    { color: ACCENT.red, label: "Odak", body: "#FF6A3D", look: { ...DEFAULT_LOOK, shape: "bean", head: "bowler" } },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {items.map((c, i) => (
        <motion.span
          key={c.label}
          className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[12px] font-medium"
          style={{ background: tintBg(c.color, 12), borderColor: tintBg(c.color, 32), color: tintText(c.color) }}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 450, damping: 26, delay: 0.25 + i * 0.06 }}
        >
          <NookFigure look={c.look} color={c.body} size={20} />
          {c.label}
        </motion.span>
      ))}
    </div>
  );
}

export function DoneTips() {
  const tips = [
    { color: ACCENT.blue, icon: MousePointer2, text: "Üst ortaya gel → açılırım" },
    { color: ACCENT.purple, icon: Settings, text: "Ayarlar › Nook nedir? → bu tanıtım" },
    { color: ACCENT.pink, icon: Shuffle, text: "Sağ tık › Görünüm → beni giydir" },
    { color: ACCENT.gray, icon: ExternalLink, text: "Sağ alttaki tepsi simgesi → çıkış" },
  ];
  return (
    <div className="flex justify-center gap-2">
      {tips.map((t, i) => (
        <motion.span
          key={t.text}
          className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[11.5px] text-label-2"
          style={{ background: tintBg(t.color, 10), borderColor: tintBg(t.color, 28) }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 450, damping: 26, delay: 0.25 + i * 0.07 }}
        >
          <MiniNook color={t.color} size={22} icon={t.icon} />
          {t.text}
        </motion.span>
      ))}
    </div>
  );
}
