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
  Layers,
  Move,
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
import { SHOWCASE, TOUR_CHIPS } from "../../lib/look";
import { endTour } from "../../lib/tour";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Shuffle } from "lucide-react";
import { tt } from "../../lib/i18n";

const LOOP = { repeat: Infinity, ease: "easeInOut" } as const;

/** Sahte masaüstü: duvar kâğıdı, birkaç pencere silueti, görev çubuğu. Çentik üstte ortada. */
export function Screen({ height, bare, children }: { height: number; bare?: boolean; children?: React.ReactNode }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[16px] border border-white/[0.08]"
      style={{ height, background: "radial-gradient(120% 100% at 15% 0%, #2a3a55 0%, #171c27 55%, #0f1117 100%)" }}
    >
      {/* Pencere siluetleri */}
      {!bare && (
      <>
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
      </>
      )}
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
export function Notch({ animate, transition, children }: { animate: TargetAndTransition; transition: Transition; children?: React.ReactNode }) {
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

export function Tip({ icon: Icon, color, children }: { icon: LucideIcon; color: string; children: React.ReactNode }) {
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
        <Tip icon={MousePointer2} color={ACCENT.blue}>{tt("Üst ortaya gel:")}{" "}<b className="font-medium text-label">{tt("açılırım")}</b>
        </Tip>
        <Tip icon={LogOut} color={ACCENT.teal}>{tt("Uzaklaş:")}{" "}<b className="font-medium text-label">{tt("kapanırım")}</b>
        </Tip>
        <Tip icon={Moon} color={ACCENT.purple}>{tt("Bilgisayar boştaysa")}{" "}<b className="font-medium text-label">{tt("uyurum")}</b>
        </Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Bölümler

const MODULES: { label: string; desc: string; color: string }[] = [
  { label: tt("Bugün"), desc: tt("Hava, alarm, günün özeti"), color: ACCENT.yellow },
  { label: tt("Medya"), desc: tt("Çalan müzik, şarkı sözleri"), color: ACCENT.pink },
  { label: "Hum", desc: tt("Çalan şarkıyı bul"), color: ACCENT.purple },
  { label: "Pomodoro", desc: tt("Odaklanma sayacı"), color: ACCENT.red },
  { label: tt("Raf"), desc: tt("Bana bıraktığın dosyalar"), color: ACCENT.teal },
  { label: tt("Pano"), desc: tt("Kopyaladıkların, çevirisi"), color: ACCENT.purple },
  { label: tt("Not"), desc: tt("Hızlı karalama"), color: ACCENT.orange },
  { label: tt("Alarm"), desc: tt("Alarm ve hatırlatıcı"), color: ACCENT.yellow },
  { label: tt("Takvim"), desc: tt("Etkinlikler, geri sayım"), color: ACCENT.blue },
  { label: tt("Kısayollar"), desc: tt("Sık açtığın uygulamalar"), color: ACCENT.blue },
  { label: tt("Bildirimler"), desc: tt("Windows bildirimleri"), color: ACCENT.purple },
  { label: tt("Kontrol"), desc: tt("Wi-Fi, uygulama bazlı ses"), color: ACCENT.green },
  { label: tt("Sistem"), desc: tt("İşlemci, bellek, ağ"), color: ACCENT.red },
  { label: tt("Oyun"), desc: tt("Benimle mini oyunlar"), color: ACCENT.pink },
  { label: tt("Karne"), desc: tt("Haftalık istatistik"), color: ACCENT.teal },
  { label: tt("Görünüm"), desc: tt("Beni giydir"), color: ACCENT.pink },
  { label: tt("Yama notları"), desc: tt("Yeni gelenler"), color: ACCENT.orange },
  { label: tt("Yıl özeti"), desc: tt("Yılın nasıl geçti"), color: ACCENT.yellow },
];

const NAV: { icon: LucideIcon; label: string }[] = [
  { icon: House, label: tt("Ana sayfa") },
  { icon: MessageCircle, label: tt("Sohbet") },
  { icon: Search, label: tt("Ara") },
  { icon: Settings, label: tt("Ayarlar") },
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
        <span className="ml-auto text-[10.5px] text-label-3">{tt("sol üstteki ikonlar")}</span>
      </div>
      <div className="grid grid-cols-3 content-start gap-1.5">
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
      <div className="mt-auto flex gap-2">
        <Tip icon={Hand} color={ACCENT.purple}>{tt("Çipleri")}{" "}<b className="font-medium text-label">{tt("sürükle, sırala, gizle")}</b>
        </Tip>
        <Tip icon={Layers} color={ACCENT.blue}>{tt("Profiller:")}{" "}<b className="font-medium text-label">{tt("İş, Oyun, Eğlence")}</b>
        </Tip>
        <Tip icon={Move} color={ACCENT.teal}>{tt("Adayı")}{" "}<b className="font-medium text-label">{tt("istediğin yere taşı")}</b>
        </Tip>
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
          <span className="rounded bg-black/50 px-1 text-[9.5px] text-white/80">{tt("rapor.pdf")}</span>
          <MousePointer2 size={16} className="-mt-3 ml-6 text-white drop-shadow" fill="white" strokeWidth={1.4} />
        </motion.div>
      </Screen>
      {/* Raf */}
      <div className="flex items-center gap-2 rounded-[14px] bg-well px-2.5 py-2">
        <MiniNook color={ACCENT.teal} size={24} />
        <span className="text-[11.5px] font-medium" style={{ color: tintText(ACCENT.teal) }}>{tt("Raf")}</span>
        <div className="ml-1 flex gap-1.5">
          {[
            { icon: FileText, name: tt("rapor.pdf") },
            { icon: ImageIcon, name: tt("ekran.png") },
            { icon: FileText, name: tt("sunum.docx") },
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
        <Tip icon={Camera} color={ACCENT.teal}>{tt("Ekran görüntüleri rafa")}{" "}<b className="font-medium text-label">{tt("kendiliğinden")}</b>{" "}{tt("düşer")}</Tip>
        <Tip icon={Hand} color={ACCENT.pink}>{tt("Raftan sürükle,")}{" "}<b className="font-medium text-label">{tt("istediğin yere bırak")}</b>
        </Tip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Kısayollar

export function Keys({ combo, color }: { combo: string; color: string }) {
  const parts = combo.replace("Space", tt("Boşluk")).split("+");
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
    { combo: s.shortcut, color: ACCENT.blue, title: tt("Hızlı arama"), text: tt("Uygulama aç, hesap yap (12*7), çevir (5 km kaç mil, 100 usd), emoji bul, web'de ara.") },
    { combo: s.askShortcut, color: ACCENT.purple, title: tt("Ekrana sor"), text: tt("Ekranın görüntüsünü alır, bana sorarsın: \"bu hata ne demek?\"") },
    { combo: s.voiceShortcut, color: ACCENT.orange, title: tt("Sesli komut"), text: tt("Basılı tut, konuş, bırak: \"yarın sekize alarm kur\".") },
    { combo: s.humShortcut, color: ACCENT.pink, title: "Hum", text: tt("Videoda, dizide çalan şarkıyı bulurum.") },
    { combo: s.shieldShortcut, color: ACCENT.teal, title: tt("Gizlilik kalkanı"), text: tt("Ekranını bir anda uyuyan Nook'larla örterim.") },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {rows.filter((r) => r.combo).map((r, i) => (
        <motion.div
          key={r.title}
          className="flex items-center gap-4 rounded-[16px] border px-4 py-2.5"
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
      <p className="px-1 text-[10.5px] text-label-3">{tt("Ekrana sor ve sesli komut için bir sonraki adımdaki Gemini anahtarı gerekir.")}</p>
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
        >{tt("Yarın sabah 8'e alarm kurar mısın?")}</motion.p>
        <motion.div className="flex items-end gap-1.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <MyNook size={20} expression="happy" />
          <p className="max-w-[160px] rounded-[14px] rounded-bl-[4px] bg-white/[0.08] px-3 py-1.5 text-[11.5px] text-label">{tt("Kurdum! Yarın 08:00'de seni uyandırırım.")}</p>
        </motion.div>
        <motion.span
          className="ml-[26px] flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px]"
          style={{ background: tintBg(ACCENT.yellow, 12), borderColor: tintBg(ACCENT.yellow, 34), color: tintText(ACCENT.yellow) }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.3, type: "spring", stiffness: 500, damping: 20 }}
        >{tt("Alarm · 08:00")}</motion.span>
        <motion.div className="mt-1 flex items-end gap-1.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9 }}>
          <MyNook size={20} />
          <p className="max-w-[160px] rounded-[14px] rounded-bl-[4px] bg-white/[0.08] px-3 py-1.5 text-[11.5px] text-label">{tt("\"Şunu hatırla…\" dersen aklımda tutarım.")}</p>
        </motion.div>
      </div>

      {/* Kurulum */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
        <SetupRow n={1} title={tt("Ücretsiz anahtarını al")}>
          <button
            onClick={() => void openPath("https://aistudio.google.com/apikey")}
            className="mt-1.5 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium"
            style={{ background: tintBg(ACCENT.blue, 16), borderColor: tintBg(ACCENT.blue, 40), color: tintText(ACCENT.blue) }}
          >
            aistudio.google.com
            <ExternalLink size={11} strokeWidth={2.4} />
          </button>
          <p className="mt-1 text-[10.5px] text-label-3">{tt("Google hesabınla gir → \"Create API key\"")}</p>
        </SetupRow>
        <SetupRow n={2} title={tt("Anahtarı buraya yapıştır")}>
          <div className="mt-1.5">
            <KeyInput value={s.geminiKey} onChange={(v) => update({ geminiKey: v })} />
          </div>
          <p className="mt-1 text-[10.5px]" style={{ color: gemini.status === "ok" ? ACCENT.green : gemini.status === "error" ? ACCENT.red : "var(--color-label-3)" }}>
            {gemini.status === "ok"
              ? tt("Bağlandı! Artık konuşabiliriz.")
              : gemini.status === "error"
                ? gemini.error
                : gemini.status === "checking"
                  ? tt("Kontrol ediliyor…")
                  : tt("Yalnızca bu bilgisayarda saklanır.")}
          </p>
        </SetupRow>
        <SetupRow n={3} title={tt("Sana nasıl seslenelim?")}>
          <div className="mt-1.5">
            <TextInput value={s.userName} placeholder={tt("Adın")} onChange={(v) => update({ userName: v })} />
          </div>
        </SetupRow>
        <p className="text-[10.5px] text-label-3">{tt("Şimdi atlarsan sonra Ayarlar › Yapay zekâ'dan girebilirsin.")}</p>
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
  { id: 0, label: tt("Yok") },
  { id: 45, label: tt("45 dk") },
  { id: 60, label: tt("1 sa") },
  { id: 90, label: tt("90 dk") },
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
            <MiniToast icon={Eye} color={ACCENT.teal} title={tt("Göz molası")} detail={tt("20 saniye boyunca uzağa bak")} delay={0.04} />
          </div>
          <div className="relative">
            <MiniToast icon={Droplet} color={ACCENT.blue} title={tt("Su içme vakti")} detail={tt("Bir bardak su iyi gelir")} delay={0.52} />
          </div>
        </div>
      </Screen>
      <div className="divide-y divide-white/[0.05] rounded-[16px] bg-well px-3.5 py-1">
        <CareRow icon={Eye} color={ACCENT.teal} title={tt("Göz molası (20-20-20)")} sub={tt("20 dk kesintisiz kullanımda 20 sn uzağa bak")}>
          <Toggle on={s.eyeBreak} onChange={(v) => update({ eyeBreak: v })} />
        </CareRow>
        <CareRow icon={Droplet} color={ACCENT.blue} title={tt("Su hatırlatıcısı")} sub={tt("Seçtiğin aralıkla")}>
          <Segmented id="tour-water" options={WATER} value={s.waterEvery} onChange={(v) => update({ waterEvery: v })} color={ACCENT.blue} />
        </CareRow>
        <CareRow icon={Target} color={ACCENT.red} title={tt("Odak (Pomodoro)")} sub={tt("25 dk çalış, 5 dk mola; 4 turda bir uzun mola")}>
          <span className="text-[10.5px] text-label-3">{tt("Odak bölümünde")}</span>
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
  { icon: MousePointerClick, color: ACCENT.orange, expression: "slap", act: tt("Bir kez tıkla"), result: tt("Şaplak! (3 kez üst üste: kızarım)") },
  { icon: Hand, color: ACCENT.purple, expression: "suspicious", act: tt("Tut ve fırlat"), result: tt("Sert fırlatırsan başım döner") },
  { icon: FileText, color: ACCENT.pink, expression: "happy", act: tt("Dosya yedir"), result: tt("En sevdiğim şey") },
  { icon: Moon, color: ACCENT.blue, expression: "sleepy", act: tt("Gece yarısından sonra"), result: tt("Uykum gelir, esnerim") },
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
            <span className="font-medium text-label">{tt("Keyfim")}</span>
            <span className="font-medium tabular-nums" style={{ color }}>
              %{Math.round(affection)}
            </span>
          </div>
          <Bar pct={affection} color={color} className="mt-1.5" />
          <p className="mt-1.5 text-[10.5px] text-label-3">{tt("Ayarlar'ın en üstünde de görürsün.")}</p>
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

/** Kalabalık ortadan dışa doğru sırayla belirir */
const POP_GAP = 0.07;

/**
 * Dots afişi gibi: siyah sahnede parlayan "nook" yazısı, altında iç içe dizilmiş rengârenk,
 * peluş Nook kalabalığı. Üzerine gelinen Nook öne çıkar, gülümser ve adını söyler.
 */
export function LookArt() {
  const [hover, setHover] = useState<number | null>(null);
  // Ortadakiler önce: sahne ortadan kenarlara dolar
  const order = (x: number) => Math.abs(x - 300) / 300;

  return (
    <div className="relative -m-[18px] h-[calc(100%+36px)] overflow-hidden bg-black">
      {/* Parlayan yazı: arkada bulanık gökkuşağı, önde sütlü beyaz */}
      <div className="pointer-events-none absolute inset-x-0 top-[34px] flex justify-center">
        <motion.div className="relative" initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: "easeOut" }}>
          <span aria-hidden className="absolute inset-0 select-none text-[104px] font-semibold leading-none tracking-[-0.04em]" style={{ ...RAINBOW_GLOW, filter: "blur(30px)", opacity: 0.8 }}>
            nook
          </span>
          <span aria-hidden className="absolute inset-0 select-none text-[104px] font-semibold leading-none tracking-[-0.04em]" style={RAINBOW_GLOW}>
            nook
          </span>
          <span className="relative select-none text-[104px] font-semibold leading-none tracking-[-0.04em]" style={MILK_TEXT}>
            nook
          </span>
        </motion.div>
      </div>

      {/* Kalabalık */}
      {SHOWCASE.map((m, n) => {
        const on = hover === n;
        return (
          <motion.div
            key={m.name}
            className="absolute"
            style={{ left: m.x - m.size / 2, top: m.y - m.size / 2, width: m.size, height: m.size, zIndex: on ? 30 : n < 6 ? 1 : 2 }}
            initial={{ y: 170, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 17, delay: 0.35 + order(m.x) * 6 * POP_GAP + (n < 6 ? 0.12 : 0) }}
          >
            <motion.div
              className="h-full w-full"
              animate={{ y: [0, -3 - (n % 3), 0], rotate: [0, n % 2 ? 1.5 : -1.5, 0] }}
              transition={{ duration: 2.6 + (n % 4) * 0.45, repeat: Infinity, ease: "easeInOut", delay: (n % 5) * 0.3 }}
            >
              <motion.button
                className="relative block h-full w-full rounded-full outline-none"
                onHoverStart={() => setHover(n)}
                onHoverEnd={() => setHover((h) => (h === n ? null : h))}
                onFocus={() => setHover(n)}
                onBlur={() => setHover((h) => (h === n ? null : h))}
                animate={on ? { y: -14, scale: 1.07 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
              >
                <NookFigure look={m.look} color={m.color} size={m.size} expression={on ? "happy" : (m.mood ?? "idle")} smile={on || m.mood === "happy" || m.mood === "wink"} />
              </motion.button>
            </motion.div>
            <AnimatePresence>
              {on && (
                <motion.span
                  className="pointer-events-none absolute left-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold"
                  style={{ bottom: m.size + 6 + (m.look.head === "ears" || m.look.head === "stalks" || m.look.head === "sprout" ? m.size * 0.28 : 0), x: "-50%", background: m.color, color: "#111" }}
                  initial={{ opacity: 0, y: 6, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 520, damping: 28 }}
                >
                  {m.name}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Alttan yumuşak gölge: kalabalık sahnenin dibinde kaybolsun */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-10" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }} />

      <div className="absolute inset-x-0 top-[142px] z-[4] flex flex-col items-center gap-2.5">
        <motion.p className="text-[12px] text-label-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>{tt("Hepsi ben. Gövde, doku, renk, göz, şapka, toka… sen seç.")}</motion.p>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.04 }}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        onClick={() => {
          useNook.getState().setPendingTab("look");
          endTour();
        }}
        className="absolute right-3.5 top-3.5 z-[40] flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium"
        style={{ background: tintBg(ACCENT.pink, 18), borderColor: tintBg(ACCENT.pink, 45), color: tintText(ACCENT.pink) }}
      >
        <Shuffle size={12} strokeWidth={2.4} />{tt("Şimdi giydir")}</motion.button>
    </div>
  );
}

const RAINBOW_GLOW: React.CSSProperties = {
  background: "linear-gradient(90deg, #6f8bff 0%, #5ff0c0 28%, #ffe36b 52%, #ff7ad0 76%, #a774ff 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter: "blur(9px)",
  opacity: 1,
  transform: "scale(1.03)",
};

const MILK_TEXT: React.CSSProperties = {
  background: "linear-gradient(90deg, #e9eeff 0%, #effff8 30%, #fffbe9 55%, #fff0fa 80%, #f3ecff 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

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
      sub: i.series?.next ? tt("Sıradaki {0}{1}", epLabel(i.series.next), i.series.next.name ? ` · ${i.series.next.name}` : "") : tt("Güncelsin"),
    }));
  return <ArgusLinked watching={list} />;
}

// ---------------------------------------------------------------- İlk ve son adım

export function HelloChips() {
  // Her çipte başka bir Nook: kendi Nook'unu da böyle giydirebileceğinin habercisi
  const tints = [ACCENT.pink, ACCENT.teal, ACCENT.purple, ACCENT.yellow, ACCENT.red];
  const items = TOUR_CHIPS.map((c, i) => ({ ...c, color: tints[i] }));
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
    { color: ACCENT.blue, icon: MousePointer2, text: tt("Üst ortaya gel → açılırım") },
    { color: ACCENT.purple, icon: Settings, text: tt("Ayarlar › Nook nedir? → bu tanıtım") },
    { color: ACCENT.pink, icon: Shuffle, text: tt("Sağ tık › Görünüm → beni giydir") },
    { color: ACCENT.gray, icon: ExternalLink, text: tt("Sağ alttaki tepsi simgesi → çıkış") },
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
