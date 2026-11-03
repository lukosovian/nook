/**
 * 0.3.5 yama notu demoları (ikinci kısım): bildirimi kapatma, telefonda görülen bildirimler,
 * tam ekran videoda ikinci ekran, oyunun yalnızca öndeyken sayılması, Nook'un adaya sığması,
 * adadaki hava efektlerinin sıklığı, telefon araması kartı.
 */
import { AnimatePresence, motion } from "motion/react";
import { BellOff, Gamepad2, MousePointer2, PhoneOff, Play, Smartphone, X } from "lucide-react";
import { DEFAULT_LOOK, type Look } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Stage, useTick } from "./Demos6";
import { IslandAtmosphere, type AtmosphereLevel } from "../atmosphere/IslandAtmosphere";

const Cursor = ({ x, y, press = false }: { x: number; y: number; press?: boolean }) => (
  <motion.span className="absolute text-white" animate={{ left: x, top: y, scale: press ? 0.8 : 1 }} transition={{ type: "spring", stiffness: 130, damping: 18 }}>
    <MousePointer2 size={9} fill="white" />
  </motion.span>
);

// ---------------------------------------------------------------- Bildirimi kapat

/** İmleç ×'e basar, kart kalkar ve ada açılmaz; ikinci kart sağa kaydırılıp kapanır */
function NotifCloseDemo() {
  const n = useTick(600);
  const phase = n % 12; // 0-1 kart · 2-3 imleç ×'e · 4 bas · 5-6 kapalı ada · 7-9 ikinci kart kayar · 10-11 kapalı
  const first = phase <= 4;
  const second = phase >= 7 && phase <= 9;
  const card = first || second;
  const swipe = phase === 9 ? 70 : 0;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={220} dark>
          <motion.div
            className="absolute left-1/2 top-0 overflow-hidden rounded-b-[10px] bg-black"
            animate={{ width: card ? 170 : 64, height: card ? 24 : 16, x: card ? -85 : -32 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <div className="absolute left-[5px] top-1/2 -translate-y-1/2">
              <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={card ? 13 : 10} expression={card ? "surprised" : "idle"} />
            </div>
            <AnimatePresence>
              {card && (
                <motion.div
                  key={first ? "a" : "b"}
                  className="absolute inset-y-0 left-[22px] right-[5px] flex items-center gap-[4px]"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: swipe ? 0 : 1, y: 0, x: swipe }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[6.5px] font-semibold" style={{ color: tintText(ACCENT.blue) }}>{first ? "Ayşe" : tt("Kargo")}</p>
                    <p className="truncate text-[5.5px] text-label-2">{first ? tt("Akşam geliyor musun?") : tt("Paketin yolda")}</p>
                  </div>
                  <span className="flex h-[10px] w-[10px] items-center justify-center rounded-full bg-white/10 text-label-2">
                    <X size={6} strokeWidth={3} />
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {phase >= 7 && phase <= 9 ? <Cursor x={phase === 9 ? 170 : 110} y={10} press /> : <Cursor x={phase >= 2 && phase <= 6 ? 172 : 150} y={phase >= 2 && phase <= 6 ? 9 : 60} press={phase === 4} />}
          <div className="absolute bottom-[6px] left-[8px] text-[5.5px] text-label-3">{phase >= 5 && phase <= 6 ? tt("Ada açılmadı") : second ? tt("Kaydırarak kapat") : tt("× ile kapat")}</div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Telefonda görülen

/** Telefonda kapatılan bildirim PC'deki listeden de kalkar; telefondan yazılan yanıt PC'de bildirim olmaz */
function PhoneSeenDemo() {
  const n = useTick(800);
  const phase = n % 8; // 0-2 ikisinde de · 3 telefonda kaydırılır · 4-7 ikisinden de kalkar
  const gone = phase >= 4;
  const rows = [
    { t: "Ayşe", d: tt("Akşam geliyor musun?"), key: "a" },
    { t: "Mert", d: tt("Fotoğrafları attım"), key: "m" },
  ];
  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={150} dark>
          <div className="flex flex-col gap-[3px] p-[6px]">
            <span className="text-[6px] font-semibold text-label-2">{tt("Bildirimler")}</span>
            <AnimatePresence initial={false}>
              {rows.filter((r) => !(gone && r.key === "a")).map((r) => (
                <motion.div key={r.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-[4px] rounded-[5px] bg-white/[0.05] px-[4px] py-[3px]">
                  <Smartphone size={7} style={{ color: tintText(ACCENT.blue) }} />
                  <span className="text-[6px] font-semibold text-label">{r.t}</span>
                  <span className="truncate text-[5.5px] text-label-3">{r.d}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Pc>
        <div className="absolute left-[14px] top-[4px] h-[80px] w-[46px] overflow-hidden rounded-[8px] border border-white/15 bg-[#111]">
          <AnimatePresence>
            {!gone && (
              <motion.div className="absolute inset-x-[3px] top-[8px] rounded-[4px] bg-white/10 px-[3px] py-[2px]" animate={{ x: phase === 3 ? 40 : 0, opacity: phase === 3 ? 0.3 : 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                <p className="text-[5px] font-semibold text-label">Ayşe</p>
                <p className="truncate text-[4.5px] text-label-3">{tt("Akşam geliyor musun?")}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute inset-x-[3px] top-[28px] rounded-[4px] bg-white/10 px-[3px] py-[2px]">
            <p className="text-[5px] font-semibold text-label">Mert</p>
            <p className="truncate text-[4.5px] text-label-3">{tt("Sen: Tamam")}</p>
          </div>
        </div>
        <div className="absolute bottom-[2px] left-[2px] w-[70px] text-center text-[5px] leading-tight text-label-3">{tt("Kendi yanıtın PC'ye gelmez")}</div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Tam ekran video: ikinci ekran

/** Soldaki ekranda video tam ekran olunca ada sağdaki ekrana geçer, video bitince döner */
function FullSecondDemo() {
  const n = useTick(1600);
  const full = n % 2 === 1;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <div className="absolute left-[6px] top-[14px] flex gap-[8px]">
          {[0, 1].map((i) => (
            <div key={i} className="relative h-[66px] w-[108px] overflow-hidden rounded-[6px] border border-white/10" style={{ background: i === 0 && full ? "#000" : "#1a1b22" }}>
              {i === 0 && full && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2a1846,#b4416b)" }}>
                  <Play size={14} fill="white" className="text-white/80" />
                </div>
              )}
            </div>
          ))}
        </div>
        <motion.div
          className="absolute top-[14px] h-[11px] w-[40px] rounded-b-[6px] bg-black"
          animate={{ left: full ? 6 + 108 + 8 + 34 : 6 + 34 }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }}
        >
          <div className="absolute left-1/2 top-[1px] -translate-x-1/2">
            <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={9} expression={full ? "happy" : "idle"} />
          </div>
        </motion.div>
        <div className="absolute bottom-[6px] left-[8px] text-[5.5px] text-label-3">{full ? tt("Video tam ekran: Nook öbür ekranda") : tt("Normal")}</div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Oyun yalnızca öndeyken sayılır

/** Oyun öndeyken sayaç akar; masaüstüne geçince (oyun arkada açık) durur */
function GameTimeDemo() {
  const n = useTick(500);
  const phase = n % 16; // 0-7 oyunda · 8-15 arkada
  const front = phase < 8;
  const mins = 40 + Math.min(phase, 7) * 2;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={200} dark>
          <AnimatePresence mode="wait">
            {front ? (
              <motion.div key="g" className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0f3d2e,#16c47f55)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Gamepad2 size={18} className="text-white/70" />
              </motion.div>
            ) : (
              <motion.div key="d" className="absolute inset-0 grid grid-cols-6 content-start gap-[4px] p-[8px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className="h-[12px] w-[12px] rounded-[3px] bg-white/10" />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute bottom-[6px] right-[6px] flex items-center gap-[4px] rounded-full bg-black/70 px-[6px] py-[2px] text-[6px] font-semibold">
            <Gamepad2 size={7} style={{ color: tintText(ACCENT.green) }} />
            <span className="tabular-nums text-label">{tt("{0} dk oynandı", mins)}</span>
            <span style={{ color: front ? tintText(ACCENT.green) : "rgb(255 255 255 / 0.45)" }}>{front ? tt("sayılıyor") : tt("arkada, sayılmıyor")}</span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Nook adaya sığar

const HATS: Look[] = [
  { ...DEFAULT_LOOK, head: "crown" },
  { ...DEFAULT_LOOK, shape: "pineapple" },
  { ...DEFAULT_LOOK, head: "chef" },
];

/** Şapkalı / yapraklı Nook kapalı adada kesilmeden sığar; açık adada altı boşsa ortaya iner */
function NookFitDemo() {
  const n = useTick(1300);
  const look = HATS[n % HATS.length];
  const open = n % 2 === 1;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={220} dark>
          <motion.div
            className="absolute left-1/2 top-0 overflow-hidden rounded-b-[12px] bg-black"
            animate={{ width: open ? 150 : 64, height: open ? 70 : 20, x: open ? -75 : -32 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
          >
            {open && <div className="absolute bottom-[4px] left-[4px] top-[6px] w-[50px] rounded-[6px] bg-white/[0.05]" />}
            <motion.div className="absolute" animate={open ? { left: 29 - 10, top: 38 - 10 } : { left: 32 - 8, top: 11 - 8 }} transition={{ type: "spring", stiffness: 220, damping: 26 }}>
              <NookFigure look={look} color="#F4F4F6" size={open ? 20 : 15} expression="idle" />
            </motion.div>
          </motion.div>
          <div className="absolute bottom-[6px] left-[8px] text-[5.5px] text-label-3">{open ? tt("Altı boşsa Nook ortaya iner") : tt("Şapkası kesilmez")}</div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Duvar kağıtları

const LEVELS: { id: AtmosphereLevel; label: string }[] = [
  { id: "low", label: tt("Az") },
  { id: "mid", label: tt("Orta") },
  { id: "high", label: tt("Çok") },
];

/** Aynı sonbahar havası üç sıklıkta: Az'da yaprak ara ara düşer, Çok'ta habire */
function WeatherLevelDemo() {
  return (
    <Stage>
      <Fit w={240} h={100}>
        <div className="flex flex-col gap-[7px]">
          {LEVELS.map((l, i) => (
            <div key={l.id} className="flex items-center gap-[8px]">
              <span className="w-[26px] text-right text-[7px] font-semibold" style={{ color: i === 0 ? tintText(ACCENT.blue) : undefined }}>
                {l.label}
              </span>
              <div className="relative h-[24px] w-[150px] overflow-hidden rounded-full bg-black">
                <IslandAtmosphere width={150} height={24} override="autumn" level={l.id} />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={16} expression="happy" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Arama kartı

/** Telefon çalar, adada arama kartı çıkar; imleç önce zili kısar, sonra aramayı reddeder */
function PhoneCallDemo() {
  const n = useTick(650);
  const phase = n % 12; // 0 sessiz · 1-3 çalıyor · 4 Sessize al · 5-6 sessiz çalıyor · 7 Reddet · 8-11 bitti
  const ringing = phase >= 1 && phase <= 7;
  const muted = phase >= 4 && phase <= 7;
  const ring = ringing && !muted;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <>
          <Pc w={176} dark>
            <motion.div
              className="absolute left-1/2 top-0 overflow-hidden rounded-b-[10px] bg-black"
              animate={{ width: ringing ? 150 : 56, height: ringing ? 24 : 15, x: ringing ? -75 : -28 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              <div className="absolute left-[5px] top-1/2 -translate-y-1/2">
                <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={ringing ? 13 : 10} expression={ringing ? "surprised" : "idle"} />
              </div>
              <AnimatePresence>
                {ringing && (
                  <motion.div
                    className="absolute inset-y-0 left-[22px] right-[5px] flex items-center gap-[3px]"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[6.5px] font-semibold" style={{ color: tintText(ACCENT.blue) }}>{tt("Annem")}</p>
                      <p className="truncate text-[5.5px] text-label-2">{tt("Arıyor…")}</p>
                    </div>
                    <span className="flex h-[10px] items-center gap-[2px] rounded-full px-[4px] text-[5px] font-semibold" style={{ background: `${ACCENT.red}33`, color: tintText(ACCENT.red) }}>
                      <PhoneOff size={5} strokeWidth={2.6} />
                      {tt("Reddet")}
                    </span>
                    <span className={`flex h-[10px] items-center gap-[2px] rounded-full bg-white/10 px-[4px] text-[5px] font-medium text-label-2 ${muted ? "opacity-50" : ""}`}>
                      <BellOff size={5} strokeWidth={2.4} />
                      {muted ? tt("Sessiz") : tt("Sessize al")}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <Cursor x={phase >= 6 ? 112 : phase >= 3 ? 136 : 120} y={phase >= 3 && phase <= 7 ? 9 : 60} press={phase === 4 || phase === 7} />
            <div className="absolute bottom-[6px] left-[8px] text-[5.5px] text-label-3">
              {phase >= 8 ? tt("Arama reddedildi") : muted ? tt("Zil kısıldı") : ringing ? tt("Telefon çalıyor") : ""}
            </div>
          </Pc>
          {/* Telefon: çalarken titrer, sessizde durur */}
          <motion.div
            className="absolute left-[16px] top-[16px] flex h-[62px] w-[32px] flex-col items-center justify-center gap-[3px] rounded-[7px] border border-white/15 bg-[#111]"
            animate={ring ? { rotate: [0, -6, 6, -6, 0] } : { rotate: 0 }}
            transition={ring ? { duration: 0.5, repeat: Infinity } : { duration: 0.2 }}
          >
            <Smartphone size={9} className="text-label-3" />
            <span className="text-[5px] font-semibold" style={{ color: ringing ? tintText(ACCENT.green) : undefined }}>
              {ringing ? tt("Annem") : "—"}
            </span>
            {muted && <BellOff size={6} className="text-label-3" />}
          </motion.div>
        </>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Duvar kağıtları

const WALLS = [
  { id: "kamp", label: tt("Kamp ateşi") },
  { id: "synthwave", label: "Synthwave DJ" },
  { id: "kis-koyu", label: tt("Kış köyü") },
  { id: "yorunge", label: tt("Yörünge") },
];

/** Studio'da bir duvar kağıdı seçilir, "Uygula" ile masaüstü ona döner; gruplar sırayla */
function WallpapersDemo() {
  const n = useTick(1100);
  const i = Math.floor(n / 2) % WALLS.length;
  const applied = n % 2 === 1;
  const shown = applied ? i : (i + WALLS.length - 1) % WALLS.length;
  return (
    <Stage>
      <Fit w={240} h={100}>
        {/* Studio: küçük önizlemeler */}
        <div className="absolute left-[4px] top-[8px] grid w-[70px] grid-cols-2 gap-[3px] rounded-[8px] bg-white/5 p-[4px]">
          {WALLS.map((w, k) => (
            <img
              key={w.id}
              src={`/wallpapers/${w.id}.webp`}
              alt=""
              className="aspect-video w-full rounded-[3px] border object-cover"
              style={{ borderColor: k === i ? ACCENT.blue : "transparent" }}
            />
          ))}
          <span className="col-span-2 mt-[2px] rounded-full py-[2px] text-center text-[5.5px] font-semibold" style={{ background: `${ACCENT.teal}33`, color: tintText(ACCENT.teal) }}>
            {tt("Masaüstüne uygula")}
          </span>
        </div>
        <Pc w={150}>
          <AnimatePresence initial={false}>
            <motion.img
              key={WALLS[shown].id}
              src={`/wallpapers/${WALLS[shown].id}.webp`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </AnimatePresence>
          <span className="absolute bottom-[4px] left-[4px] rounded-full bg-black/60 px-[5px] py-[1px] text-[5.5px] font-semibold text-label">{WALLS[shown].label}</span>
        </Pc>
      </Fit>
    </Stage>
  );
}

export const DEMOS22 = {
  wallpapers: WallpapersDemo,
  phonecall: PhoneCallDemo,
  notifclose: NotifCloseDemo,
  phoneseen: PhoneSeenDemo,
  fullsecond: FullSecondDemo,
  gametime: GameTimeDemo,
  nookfit: NookFitDemo,
  weatherlevel: WeatherLevelDemo,
};
