/**
 * Arayüz turu yama notu demoları: okunaklı yazı ve odak halkası, tek ana düğme, boş durumlar ve hep görünen
 * eylemler, Kontrol'de anahtarlar/eylemler, geri al şeridi, gruplu bildirimler, pano süzgeçleri, parçacıklar,
 * rafta çoklu seçim.
 */
import { motion } from "motion/react";
import { ChevronRight, FileText, Lock, Mic, Moon, Pencil, Pin, Search, Wifi, X } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

/** Soluk gri yazı açılır; Tab ile gezerken düğmelerin çevresinde mor halka dolaşır */
function ReadableDemo() {
  const n = useTick(1100);
  const bright = n % 6 >= 1;
  const focus = (n % 3) as 0 | 1 | 2;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[8px] w-[224px] rounded-[12px] bg-[#161618] px-[10px] py-[8px]">
          <p className="text-[11px] font-semibold text-label">{tt("Toplantı notları")}</p>
          <motion.p className="mt-[2px] text-[10.5px]" animate={{ color: bright ? "#8a8a92" : "#5f5f66" }}>
            {tt("3 dk önce · Notepad")}
          </motion.p>
        </div>
        <div className="absolute left-[8px] top-[62px] flex w-[224px] items-center gap-[8px]">
          <span className="rounded-[6px] bg-white/[0.08] px-[6px] py-[2px] text-[9px] font-bold text-label-2">Tab</span>
          {[tt("Kopyala"), tt("Sabitle"), tt("Sil")].map((l, i) => (
            <span
              key={l}
              className="flex h-[22px] flex-1 items-center justify-center rounded-full bg-white/[0.07] text-[9.5px] font-semibold text-label"
              style={{ outline: focus === i ? `2px solid ${ACCENT.purple}` : "2px solid transparent", outlineOffset: 2, transition: "outline-color .15s" }}
            >
              {l}
            </span>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

/** Her bölümde aynı ana düğme: modülün renginde, üstten ışık alan dolgu; üstünde aynı bölüm başlığı */
function PrimaryDemo() {
  const n = useTick(1500);
  const items = [
    { c: ACCENT.red, label: tt("Başlat"), head: tt("Odak"), dark: false },
    { c: ACCENT.yellow, label: tt("Kur"), head: tt("Alarm"), dark: true },
    { c: ACCENT.purple, label: tt("Kaydet"), head: tt("Hatırlatma"), dark: false },
  ];
  const it = items[n % 3];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <motion.p key={`h${n % 3}`} className="absolute left-[20px] top-[16px] text-[9.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: tintText(it.c) }} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
          {it.head}
        </motion.p>
        <motion.div
          key={n % 3}
          className="absolute left-[20px] top-[38px] flex h-[36px] w-[200px] items-center justify-center rounded-[12px] text-[12.5px] font-bold"
          style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${it.c} 70%, white), ${it.c})`, color: it.dark ? "#1a1a1c" : "#fff", boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.4), 0 6px 16px -8px ${it.c}` }}
          initial={{ scale: 0.94, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {it.label}
        </motion.div>
      </Fit>
    </Stage>
  );
}

/** Solda uyuklayan Nook'lu boş durum ve tek düğmesi; sağda eylemleri hep görünen bir kart */
function EmptyActionsDemo() {
  const n = useTick(1300);
  const hover = n % 2 === 1;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[8px] flex h-[80px] w-[108px] flex-col items-center justify-center gap-[4px] rounded-[12px] bg-white/[0.04]">
          <span className="relative">
            <MiniNook color={ACCENT.teal} size={22} eyes="closed" />
            <motion.i className="absolute -right-[7px] -top-[5px] text-[8px] font-extrabold not-italic" style={{ color: tintText(ACCENT.teal) }} animate={{ opacity: [0.2, 1, 0.2], y: [1, -2, 1] }} transition={{ duration: 2.2, repeat: Infinity }}>
              z
            </motion.i>
          </span>
          <b className="text-[9.5px] text-label">{tt("Raf boş")}</b>
          <span className="rounded-full border px-[8px] py-[2px] text-[8.5px] font-semibold" style={{ background: tintBg(ACCENT.teal, 16), borderColor: tintBg(ACCENT.teal, 42), color: tintText(ACCENT.teal) }}>
            {tt("Dosya seç")}
          </span>
        </div>
        <div className="absolute left-[124px] top-[8px] h-[80px] w-[108px] rounded-[12px] border border-white/[0.07] bg-white/[0.04] p-[8px]">
          <motion.div className="absolute right-[6px] top-[6px] flex gap-[3px]" animate={{ opacity: hover ? 1 : 0.5 }}>
            {[Pin, Pencil, X].map((I, i) => (
              <span key={i} className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-black/60">
                <I size={9} color="#fff" strokeWidth={2.6} />
              </span>
            ))}
          </motion.div>
          <span className="rounded-[4px] px-[5px] py-[1px] text-[8px] font-bold" style={{ background: tintBg(ACCENT.purple, 20), color: tintText(ACCENT.purple) }}>
            {tt("Metin")}
          </span>
          <p className="mt-[10px] text-[9.5px] text-label">{tt("Perşembe 14:00")}</p>
          <p className="mt-[8px] text-[8.5px] text-label-2">{hover ? tt("Üzerine gelince belirgin") : tt("Hep görünür")}</p>
        </div>
      </Fit>
    </Stage>
  );
}

/** Üstte anahtarlar (açık: dolu, kapalı: nötr, altında durumu), altta oklu eylem satırları */
function ControlSplitDemo() {
  const n = useTick(1200);
  const tiles = [
    { icon: Wifi, label: "Wi-Fi", c: ACCENT.blue, on: n % 4 !== 1 },
    { icon: Moon, label: tt("Karanlık"), c: ACCENT.purple, on: n % 4 >= 2 },
    { icon: Mic, label: tt("Mikrofon"), c: ACCENT.orange, on: n % 4 !== 3 },
  ];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[6px] flex w-[224px] gap-[5px]">
          {tiles.map((t) => (
            <motion.div key={t.label} className="flex h-[48px] flex-1 flex-col items-center justify-center rounded-[11px] border" animate={{ background: t.on ? tintBg(t.c, 18) : "rgb(255 255 255 / 0.03)", borderColor: t.on ? tintBg(t.c, 48) : "rgb(255 255 255 / 0.07)" }}>
              <t.icon size={12} color={t.on ? tintText(t.c) : "#8a8a92"} strokeWidth={2.4} />
              <b className="mt-[2px] text-[8.5px]" style={{ color: t.on ? tintText(t.c) : "#9a9aa2" }}>{t.label}</b>
              <i className="text-[8px] not-italic text-label-3">{t.on ? tt("Açık") : tt("Kapalı")}</i>
            </motion.div>
          ))}
        </div>
        <div className="absolute left-[8px] top-[62px] flex w-[224px] gap-[5px]">
          {[tt("Kilitle"), tt("Ekranı kapat")].map((l) => (
            <span key={l} className="flex h-[26px] flex-1 items-center gap-[5px] rounded-[9px] border border-white/[0.14] px-[7px]">
              <Lock size={10} color={tintText(ACCENT.teal)} strokeWidth={2.4} />
              <b className="flex-1 text-[9px] text-label">{l}</b>
              <ChevronRight size={10} color="#8a8a92" />
            </span>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

/** Temizle'ye basılır, satırlar gider; alttaki şeritte çizgi incelirken "Geri al" her şeyi geri getirir */
function UndoDemo() {
  const n = useTick(900);
  const step = n % 6; // 0-1 dolu · 2-3 temizlendi + şerit · 4 geri al · 5 dolu
  const gone = step === 2 || step === 3;
  return (
    <Stage>
      <Fit w={240} h={96}>
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="absolute left-[8px] h-[15px] w-[224px] rounded-[6px] bg-white/[0.07]" style={{ top: 6 + i * 19 }} animate={{ opacity: gone ? 0 : 1, x: gone ? 14 : 0 }} transition={{ delay: gone ? i * 0.05 : 0 }} />
        ))}
        <motion.div className="absolute left-[34px] top-[66px] flex h-[24px] w-[172px] items-center gap-[6px] overflow-hidden rounded-full border border-white/10 bg-[#1e1e21] pl-[5px] pr-[4px]" animate={{ opacity: gone ? 1 : 0, y: gone ? 0 : 8 }}>
          <MiniNook color={ACCENT.purple} size={14} eyes="happy" />
          <span className="flex-1 text-[9px] font-medium text-label">{tt("Pano temizlendi")}</span>
          <motion.span className="rounded-full border px-[7px] py-[1.5px] text-[8.5px] font-semibold" style={{ borderColor: tintBg(ACCENT.purple, 45), color: tintText(ACCENT.purple) }} animate={{ background: step === 3 ? tintBg(ACCENT.purple, 45) : tintBg(ACCENT.purple, 18) }}>
            {tt("Geri al")}
          </motion.span>
          <motion.i key={gone ? "run" : "idle"} className="absolute inset-x-0 bottom-0 h-[2px] origin-left" style={{ background: ACCENT.purple }} initial={{ scaleX: 1 }} animate={{ scaleX: gone ? 0.55 : 1 }} transition={{ duration: 1.8, ease: "linear" }} />
        </motion.div>
      </Fit>
    </Stage>
  );
}

/** "Discord · 3" grubu açılıp kapanır; başlığındaki kural Adada göster → Yalnızca biriktir → Sustur döner */
function NotifyGroupsDemo() {
  const n = useTick(1200);
  const open = n % 4 >= 2;
  const rule = [tt("Adada göster"), tt("Yalnızca biriktir"), tt("Sustur")][Math.floor(n / 4) % 3];
  const c = "#5865f2";
  return (
    <Stage>
      <Fit w={240} h={96}>
        <p className="absolute left-[10px] top-[4px] text-[8px] font-semibold uppercase tracking-[0.08em] text-label-3">{tt("Bugün")}</p>
        <div className="absolute left-[8px] top-[17px] w-[224px] rounded-[10px] border px-[6px] py-[5px]" style={{ background: tintBg(c, 8), borderColor: tintBg(c, 26) }}>
          <div className="flex items-center gap-[5px]">
            <span className="flex h-[16px] w-[16px] items-center justify-center rounded-[5px] text-[8.5px] font-extrabold" style={{ background: tintBg(c, 30), color: tintText(c) }}>D</span>
            <b className="text-[9.5px] text-label">Discord</b>
            <b className="flex-1 text-[9px]" style={{ color: tintText(c) }}>· 3</b>
            <i className="text-[8px] not-italic text-label-3">{tt("3 dk")}</i>
            <motion.span key={rule} className="rounded-full bg-white/[0.08] px-[6px] py-[1.5px] text-[8px] font-medium text-label" initial={{ opacity: 0.3 }} animate={{ opacity: 1 }}>
              {rule}
            </motion.span>
            <X size={9} color="#8a8a92" strokeWidth={2.6} />
          </div>
          {open ? (
            [tt("Ayşe: Maça geliyor musun?"), tt("Mert: Yeni kanal açtım"), tt("Ayşe: Biletleri aldım")].map((t, i) => (
              <motion.p key={t} className="mt-[3px] rounded-[5px] bg-black/30 px-[6px] py-[2px] text-[8.5px] text-label-2" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                {t}
              </motion.p>
            ))
          ) : (
            <p className="mt-[2px] pl-[21px] text-[8.5px] text-label-2">{tt("Ayşe: Maça geliyor musun?")}</p>
          )}
        </div>
      </Fit>
    </Stage>
  );
}

/** Çipler sırayla seçilir; alttaki kayıtlardan yalnızca o türdekiler kalır */
function ClipFilterDemo() {
  const n = useTick(1100);
  const chips = [tt("Hepsi"), tt("Metin"), tt("Bağlantı"), tt("Kod")];
  const sel = n % chips.length;
  const rows = [
    { kind: 1, text: tt("Perşembe 14:00"), c: ACCENT.purple },
    { kind: 2, text: "github.com/tauri-apps", c: ACCENT.blue },
    { kind: 3, text: "npm run build", c: ACCENT.orange },
  ];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[6px] flex w-[224px] items-center gap-[4px]">
          <Search size={10} color="#8a8a92" />
          {chips.map((l, i) => (
            <span key={l} className="rounded-full border px-[7px] py-[2px] text-[8.5px] font-medium" style={i === sel ? { background: tintBg(ACCENT.purple, 18), borderColor: tintBg(ACCENT.purple, 42), color: tintText(ACCENT.purple) } : { borderColor: "transparent", color: "#8a8a92" }}>
              {l}
            </span>
          ))}
        </div>
        {rows.map((r, i) => {
          const on = sel === 0 || sel === r.kind;
          return (
            <motion.div key={r.text} className="absolute left-[8px] flex h-[19px] w-[224px] items-center gap-[6px] rounded-[7px] bg-white/[0.05] px-[7px]" style={{ top: 30 + i * 22 }} animate={{ opacity: on ? 1 : 0.15, scale: on ? 1 : 0.97 }}>
              <i className="h-[7px] w-[7px] rounded-full" style={{ background: r.c }} />
              <span className="text-[9px] text-label">{r.text}</span>
            </motion.div>
          );
        })}
      </Fit>
    </Stage>
  );
}

/** Aramaya "/adres" yazılır; "Parçacık: Ev adresi" çıkar ve Enter ile kopyalanır */
function SnippetDemo() {
  const n = useTick(450);
  const word = "/adres";
  const k = n % 14;
  const typed = word.slice(0, Math.min(word.length, k));
  const found = k >= 6;
  const copied = k >= 10;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[8px] flex h-[26px] w-[224px] items-center gap-[7px] rounded-[9px] border px-[9px]" style={{ borderColor: tintBg(ACCENT.purple, 45), background: tintBg(ACCENT.purple, 8) }}>
          <Search size={12} color={tintText(ACCENT.purple)} />
          <span className="font-mono text-[10.5px] font-semibold text-label">{typed}</span>
        </div>
        <motion.div className="absolute left-[8px] top-[40px] w-[224px] rounded-[9px] bg-white/[0.06] px-[9px] py-[6px]" animate={{ opacity: found ? 1 : 0, y: found ? 0 : 4 }}>
          <div className="flex items-center gap-[5px]">
            <b className="flex-1 text-[9.5px] text-label">{tt("Parçacık: Ev adresi")}</b>
            <motion.i className="text-[8.5px] font-semibold not-italic" animate={{ color: copied ? tintText(ACCENT.green) : "#8a8a92" }}>
              {copied ? tt("Kopyalandı") : "Enter"}
            </motion.i>
          </div>
          <p className="mt-[2px] text-[8.5px] text-label-2">Bağdat Cad. No: 12 · Kadıköy</p>
        </motion.div>
      </Fit>
    </Stage>
  );
}

/** Dosyalar tek tek seçilir, "2 seçili" çubuğu çıkar ve ikisi birlikte dışarı sürüklenir */
function ShelfMultiDemo() {
  const n = useTick(900);
  const step = n % 5; // 0 boş · 1 bir seçili · 2 iki seçili · 3 sürükleniyor · 4 bitti
  const count = step === 0 ? 0 : step === 1 ? 1 : 2;
  const drag = step === 3;
  const colors = [ACCENT.red, ACCENT.orange, ACCENT.blue];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <motion.div className="absolute left-[8px] top-[6px] flex h-[18px] w-[224px] items-center rounded-full border px-[8px]" style={{ borderColor: tintBg(ACCENT.teal, 34), background: tintBg(ACCENT.teal, 10) }} animate={{ opacity: count ? 1 : 0 }}>
          <b className="flex-1 text-[8.5px]" style={{ color: tintText(ACCENT.teal) }}>{tt("{0} seçili", count || 1)}</b>
          <i className="text-[8px] font-semibold not-italic" style={{ color: tintText(ACCENT.teal) }}>{tt("Birlikte sürükle")}</i>
        </motion.div>
        {colors.map((c, i) => {
          const sel = i === 0 ? count >= 1 : i === 2 ? count >= 2 : false;
          return (
            <motion.div
              key={i}
              className="absolute top-[30px] flex h-[58px] w-[68px] items-center justify-center rounded-[11px] border bg-white/[0.04]"
              style={{ left: 8 + i * 78, borderColor: sel ? ACCENT.teal : "rgb(255 255 255 / 0.07)" }}
              animate={{ x: drag && sel ? (i === 0 ? 60 : -30) : 0, y: drag && sel ? 16 : 0, opacity: drag && sel ? 0.55 : 1, rotate: drag && sel ? (i === 0 ? 5 : -5) : 0 }}
            >
              <FileText size={18} color={c} strokeWidth={1.8} />
              <span className="absolute left-[5px] top-[5px] flex h-[11px] w-[11px] items-center justify-center rounded-full border" style={{ borderColor: sel ? ACCENT.teal : "rgb(255 255 255 / 0.3)", background: sel ? ACCENT.teal : "transparent" }} />
            </motion.div>
          );
        })}
      </Fit>
    </Stage>
  );
}

export const DEMOS35 = {
  readable: ReadableDemo,
  primarybtn: PrimaryDemo,
  emptyactions: EmptyActionsDemo,
  controlsplit: ControlSplitDemo,
  undobar: UndoDemo,
  notifygroups: NotifyGroupsDemo,
  clipfilter: ClipFilterDemo,
  snippets: SnippetDemo,
  shelfmulti: ShelfMultiDemo,
};
