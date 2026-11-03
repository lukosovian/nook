/**
 * 0.3.6 yama notu demoları: gün gün tutulan, saatli günlük kayıtları ve eskilerin silinmesi.
 * 0.3.7: başka bir programın tuttuğu kısayol.
 */
import { AnimatePresence, motion } from "motion/react";
import { FileText, Folder, Mic, MicOff, MousePointer2 } from "lucide-react";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Stage, useTick } from "./Demos6";

const DAYS = ["2026-11-03", "2026-11-02", "2026-11-01", "2026-10-31", "2026-10-30", "2026-10-29"];
const KEEP = [
  { id: 14, label: tt("2 hafta") },
  { id: 3, label: tt("3 gün") },
];

/** Bugünün dosyasına saatli satırlar düşer; "3 gün" seçilince eski günler silinir */
function LogsDemo() {
  const n = useTick(650);
  const phase = n % 16; // 0-8 satırlar akar · 9 ayar 3 güne · 10-15 eskiler silinmiş
  const keep = phase >= 9 ? 3 : 14;
  const lines = [
    { t: "19:35:14", lv: tt("bilgi"), msg: tt("Nook açıldı"), color: "" },
    { t: "19:35:14", lv: tt("bilgi"), msg: tt("ekranlar (2): 1920x1080 · 2560x1440"), color: "" },
    { t: "19:35:15", lv: tt("bilgi"), msg: tt("ada yerleşti: üst orta"), color: "" },
    { t: "19:38:02", lv: tt("uyarı"), msg: tt("DONMA: arayüz 6 sn takıldı"), color: ACCENT.orange },
    { t: "19:46:05", lv: tt("bilgi"), msg: tt("ada açıldı"), color: "" },
    { t: "23:58:40", lv: tt("bilgi"), msg: tt("Nook kapandı"), color: "" },
  ].slice(0, Math.min(6, phase + 1));
  return (
    <Stage>
      <Fit w={250} h={100}>
        <Pc w={240} dark>
          <div className="flex h-full">
            {/* Gün dosyaları */}
            <div className="w-[64px] shrink-0 border-r border-white/10 px-[4px] py-[4px]">
              <div className="mb-[3px] flex items-center gap-[3px] text-[5.5px] font-bold text-label-2">
                <Folder size={6} style={{ color: ACCENT.blue }} /> logs
              </div>
              <AnimatePresence initial={false}>
                {DAYS.filter((_, i) => i < keep).map((d, i) => (
                  <motion.div
                    key={d}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -14, transition: { duration: 0.35 } }}
                    className="mb-[1.5px] flex items-center gap-[2px] rounded-[3px] px-[2px] py-[1px] text-[5px]"
                    style={{ background: i === 0 ? tintBg(ACCENT.blue, 22) : "transparent", color: i === 0 ? tintText(ACCENT.blue) : "rgba(255,255,255,.55)" }}
                  >
                    <FileText size={5} /> {d}.log
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {/* Bugünün satırları */}
            <div className="min-w-0 flex-1 px-[5px] py-[4px] font-mono">
              {lines.map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="truncate text-[5px] leading-[8px]" style={{ color: l.color || "rgba(255,255,255,.75)" }}>
                  <span className="text-white/40">{l.t}</span> <span className="font-bold">{l.lv}</span> {l.msg}
                </motion.div>
              ))}
              {/* Kaç gün saklansın */}
              <div className="absolute bottom-[5px] right-[6px] flex items-center gap-[3px]">
                <span className="text-[5px] text-white/50 font-sans">{tt("Kaç gün saklansın")}</span>
                <div className="flex rounded-full bg-white/10 p-[1.5px] font-sans">
                  {KEEP.map((k) => (
                    <span key={k.id} className="rounded-full px-[4px] py-[1px] text-[5px] font-bold" style={{ background: keep === k.id ? "rgba(255,255,255,.85)" : "transparent", color: keep === k.id ? "#000" : "rgba(255,255,255,.6)" }}>
                      {k.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Başka programın tuttuğu kısayol

/** Kısayol satırı kırmızı uyarıyla görünür; öneriye basınca tuşlar değişir, uyarı kalkar, ada açılır */
function HotkeyHeldDemo() {
  const n = useTick(650);
  const phase = n % 12; // 0-3 uyarı · 4 imleç öneriye · 5 bas · 6-8 yeni tuşlar · 9-11 ada açılır
  const fixed = phase >= 6;
  const open = phase >= 9;
  return (
    <Stage>
      <Fit w={250} h={100}>
        <Pc w={240} dark>
          {/* Ada: yeni kısayolla açılır */}
          <motion.div
            className="absolute left-1/2 top-0 rounded-b-[9px] bg-black"
            animate={{ width: open ? 120 : 54, height: open ? 22 : 12, x: open ? -60 : -27 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {open && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute left-[8px] top-[6px] text-[6px] text-white/70">
                {tt("Ara…")}
              </motion.span>
            )}
          </motion.div>
          {/* Studio › Kısayollar satırı */}
          <div className="absolute left-[10px] right-[10px] top-[30px] rounded-[7px] bg-white/[0.05] px-[7px] py-[5px]">
            <div className="flex items-center justify-between">
              <span className="text-[6.5px] font-semibold text-label">{tt("Hızlı arama")}</span>
              <motion.span key={String(fixed)} initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="rounded-[4px] bg-white/10 px-[5px] py-[1.5px] text-[6px] font-bold text-label">
                {fixed ? tt("Ctrl + Alt + Boşluk") : tt("Ctrl + Shift + Boşluk")}
              </motion.span>
            </div>
            <AnimatePresence>
              {!fixed && (
                <motion.div exit={{ opacity: 0, height: 0 }} className="mt-[3px] flex items-center gap-[4px] overflow-hidden">
                  <span className="text-[5.2px]" style={{ color: tintText(ACCENT.red) }}>
                    {tt("Bu tuşları başka bir program tutuyor; Nook kullanamıyor.")}
                  </span>
                  <span className="shrink-0 rounded-full px-[4px] py-[1px] text-[5.2px] font-bold" style={{ background: tintBg(ACCENT.blue, phase === 5 ? 40 : 22), color: tintText(ACCENT.blue) }}>
                    {tt("Ctrl + Alt + Boşluk yap")}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Klavye: yeni kısayola basılır */}
          {phase >= 8 && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-[8px] left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-[6px] py-[1.5px] text-[5.5px] font-bold text-label-2">
              Ctrl + Alt + {tt("Boşluk")}
            </motion.span>
          )}
          {phase >= 3 && phase <= 5 && (
            <motion.span className="absolute text-white" initial={{ left: 120, top: 80 }} animate={{ left: 196, top: 47, scale: phase === 5 ? 0.8 : 1 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
              <MousePointer2 size={8} fill="white" />
            </motion.span>
          )}
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Duvar kağıdı: büyük önizleme, çift tık

const WALLS = ["kamp", "synthwave", "neon", "lofi", "uzay", "orman"];

/** Tıklanan resim büyür; çift tıkla uygulanan masaüstüne geçer */
function WallPreviewDemo() {
  const n = useTick(700);
  const phase = n % 10; // 0-1 ızgara · 2-4 büyük önizleme · 5 kapanır · 6-7 çift tık · 8-9 masaüstü değişti
  const big = phase >= 2 && phase <= 4;
  const applied = phase >= 8 ? "neon" : "kamp";
  return (
    <Stage>
      <Fit w={250} h={100}>
        <Pc w={240} dark>
          <img src={`/wallpapers/${applied}.webp`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute left-[30px] right-[30px] top-[10px] grid grid-cols-3 gap-[4px] rounded-[6px] bg-black/70 p-[4px]">
            {WALLS.map((w) => (
              <motion.img
                key={w}
                src={`/wallpapers/${w}.webp`}
                alt=""
                animate={{ scale: (w === "neon" && (phase === 6 || phase === 7)) ? 0.92 : 1 }}
                className="aspect-video w-full rounded-[3px] object-cover"
                style={{ outline: w === "neon" && phase >= 6 ? `1.5px solid ${ACCENT.teal}` : "none" }}
              />
            ))}
          </div>
          <AnimatePresence>
            {big && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-[3px] bg-black/80">
                <motion.img initial={{ scale: 0.6 }} animate={{ scale: 1 }} src="/wallpapers/synthwave.webp" alt="" className="h-[56px] rounded-[5px] object-cover" />
                <span className="rounded-full px-[5px] py-[1px] text-[5.5px] font-bold text-black" style={{ background: ACCENT.teal }}>
                  {tt("Masaüstüne uygula")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {(phase === 6 || phase === 7) && (
            <span className="absolute left-[150px] top-[62px] rounded-full bg-black/70 px-[4px] py-[1px] text-[5px] font-bold text-white">{tt("çift tık")}</span>
          )}
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Duvar kağıdı döngüsü

/** Sırayla seçilen resimler numaralanır, döngü açılınca masaüstü sırayla değişir */
function WallCycleDemo() {
  const n = useTick(650);
  const phase = n % 14; // 0-3 sırayla seçilir · 4 kaydet · 5-13 masaüstü sırayla döner
  const picked = WALLS.slice(0, 3).slice(0, Math.min(3, phase));
  const running = phase >= 5;
  const shown = running ? WALLS[Math.floor((phase - 5) / 3) % 3] : "orman";
  return (
    <Stage>
      <Fit w={250} h={100}>
        <Pc w={240} dark>
          <AnimatePresence>
            <motion.img key={shown} src={`/wallpapers/${shown}.webp`} alt="" initial={{ opacity: 0 }} animate={{ opacity: running ? 1 : 0.35 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 h-full w-full object-cover" />
          </AnimatePresence>
          {!running && (
            <div className="absolute left-[30px] right-[30px] top-[10px] grid grid-cols-3 gap-[4px] rounded-[6px] bg-black/70 p-[4px]">
              {WALLS.map((w) => {
                const at = picked.indexOf(w);
                return (
                  <div key={w} className="relative">
                    <img src={`/wallpapers/${w}.webp`} alt="" className="aspect-video w-full rounded-[3px] object-cover" style={{ outline: at >= 0 ? `1.5px solid ${ACCENT.blue}` : "none" }} />
                    {at >= 0 && (
                      <span className="absolute right-[2px] top-[2px] flex h-[8px] w-[8px] items-center justify-center rounded-full text-[5px] font-extrabold text-white" style={{ background: ACCENT.blue }}>
                        {at + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 rounded-full px-[6px] py-[1.5px] text-[5.5px] font-bold" style={{ background: tintBg(ACCENT.blue, 30), color: tintText(ACCENT.blue) }}>
            {running ? tt("Döngü açık · 1 saatte bir") : phase === 4 ? tt("Kaydet") : tt("Resimlere sırayla tıkla")}
          </span>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Studio boyutu

/** Studio büyütülüp kapatılır; yeniden açılınca aynı boyutta ve yerde gelir */
function StudioSizeDemo() {
  const n = useTick(700);
  const phase = n % 10; // 0-1 küçük · 2-3 büyür · 4-5 kapalı · 6-9 yeniden açılır, aynı boyut
  const open = phase < 4 || phase >= 6;
  const big = phase >= 2;
  return (
    <Stage>
      <Fit w={250} h={100}>
        <Pc w={240} dark>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, left: big ? 20 : 70, top: big ? 8 : 20, width: big ? 200 : 100, height: big ? 66 : 44 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 160, damping: 22 }}
                className="absolute overflow-hidden rounded-[6px] border border-white/15 bg-[#14161c]"
              >
                <div className="flex h-[9px] items-center gap-[3px] border-b border-white/10 px-[4px] text-[5px] font-bold text-label-2">Nook Studio</div>
                <div className="flex h-full gap-[3px] p-[4px]">
                  <div className="w-[18%] rounded-[3px] bg-white/[0.06]" />
                  <div className="flex-1 rounded-[3px] bg-white/[0.04]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {phase >= 6 && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-[4px] left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-[5px] py-[1px] text-[5.5px] font-bold" style={{ color: tintText(ACCENT.green) }}>
              {tt("Bıraktığın boyutta açıldı")}
            </motion.span>
          )}
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Otomasyon açıklamaları

/** Tetikleyici seçicide her seçeneğin altında ne zaman çalıştığı yazar */
function AutoHintsDemo() {
  const n = useTick(1100);
  const rows = [
    { label: tt("Boşta kalınca"), hint: tt("Fareye ve klavyeye uyuma süresi kadar dokunmayınca"), color: ACCENT.purple },
    { label: tt("Telefon eve gelince"), hint: tt("Telefon 20 dk uzak kalıp ev Wi-Fi'ına bağlanınca"), color: ACCENT.teal },
    { label: tt("Kilitlenince"), hint: tt("Win+L ile ya da kendiliğinden kilitlenince"), color: ACCENT.green },
  ];
  const on = n % rows.length;
  return (
    <Stage>
      <Fit w={250} h={100}>
        <div className="absolute inset-x-[14px] top-[10px] flex flex-col gap-[5px]">
          {rows.map((r, i) => (
            <motion.div key={r.label} animate={{ scale: i === on ? 1.03 : 1 }} className="rounded-[7px] border px-[7px] py-[4px]" style={{ background: i === on ? tintBg(r.color, 16) : "rgb(255 255 255 / 0.03)", borderColor: i === on ? tintBg(r.color, 45) : "rgb(255 255 255 / 0.06)" }}>
              <p className="text-[7px] font-bold text-label">{r.label}</p>
              <p className="text-[5.5px] text-label-3">{r.hint}</p>
            </motion.div>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Telefondan mikrofon tuşu

/** Telefondaki mikrofon tuşuna basılır; PC'de mikrofon kapanır, telefondaki simge hemen üstü çizili olur */
function PhoneMicDemo() {
  const n = useTick(800);
  const muted = n % 4 >= 1 && n % 4 <= 2;
  const press = n % 4 === 1 || n % 4 === 3;
  return (
    <Stage>
      <Fit w={250} h={100}>
        <div className="absolute left-[20px] top-[6px] flex h-[88px] w-[50px] flex-col items-center justify-center gap-[4px] rounded-[10px] border border-white/20 bg-black">
          <motion.div animate={{ scale: press ? 0.88 : 1 }} className="flex h-[26px] w-[34px] flex-col items-center justify-center rounded-[7px]" style={{ background: muted ? tintBg(ACCENT.red, 28) : tintBg(ACCENT.orange, 22), color: muted ? tintText(ACCENT.red) : tintText(ACCENT.orange) }}>
            {muted ? <MicOff size={10} /> : <Mic size={10} />}
          </motion.div>
          <span className="text-[5px] font-semibold text-label-2">{muted ? tt("Mikrofon kapalı") : tt("Mikrofon")}</span>
        </div>
        <Pc w={150} dark>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4px]">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full" style={{ background: muted ? tintBg(ACCENT.red, 28) : tintBg(ACCENT.green, 22), color: muted ? tintText(ACCENT.red) : tintText(ACCENT.green) }}>
              {muted ? <MicOff size={12} /> : <Mic size={12} />}
            </span>
            <span className="text-[6px] font-semibold text-label-2">{muted ? tt("PC'de mikrofon kapalı") : tt("PC'de mikrofon açık")}</span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

export const DEMOS23 = {
  logs: LogsDemo,
  hotkeyheld: HotkeyHeldDemo,
  wallpreview: WallPreviewDemo,
  wallcycle: WallCycleDemo,
  studiosize: StudioSizeDemo,
  autohints: AutoHintsDemo,
  phonemic: PhoneMicDemo,
};
