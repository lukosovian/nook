/**
 * 0.3.5 yama notu demoları: tek denetimli Alışkanlıklar, üstüne gelince büyüyen bildirim kartı,
 * prizdeyken de görünen hava atmosferi, Argus'ta sahne/film ayrımı.
 */
import { AnimatePresence, motion } from "motion/react";
import { Check, Clapperboard, Droplet, Eye, Gamepad2, MousePointer2, PersonStanding, PlugZap, X } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Stage, useTick } from "./Demos6";
import { IslandAtmosphere } from "../atmosphere/IslandAtmosphere";

const WATER_C = "#2FD4C0";

/** Küçük anahtar */
function Switch({ on, color }: { on: boolean; color: string }) {
  return (
    <span
      className="flex h-[8px] w-[15px] items-center rounded-full border p-[1px]"
      style={{ justifyContent: on ? "flex-end" : "flex-start", background: on ? tintBg(color, 35) : "rgb(255 255 255 / 0.06)", borderColor: on ? tintBg(color, 65) : "rgb(255 255 255 / 0.1)" }}
    >
      <motion.span layout className="h-[5px] w-[5px] rounded-full" style={{ background: on ? tintText(color) : "rgb(255 255 255 / 0.5)" }} />
    </span>
  );
}

// ---------------------------------------------------------------- Alışkanlıklar: tek denetim

/** Su kartında hatırlatma aralığı seçilir, molaların her birinde tek anahtar; imleç göz molasını kapatıp açar */
function HabitsFixDemo() {
  const n = useTick(700);
  const phase = n % 10; // 0-2 su 1 sa · 3-4 su Kapalı · 5-6 göz kapalı · 7-9 göz açık
  const water = phase >= 3 && phase <= 4 ? 0 : 60;
  const eyeOn = !(phase >= 5 && phase <= 6);
  const glasses = 3 + (phase >= 8 ? 1 : 0);
  // İmleç: önce su aralığına, sonra göz anahtarına gider
  const cursor = phase <= 4 ? { x: 112, y: 33 } : { x: 128, y: 55 };
  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={170}>
          <div className="flex flex-col gap-[3px] p-[5px]">
            <div className="rounded-[5px] bg-white/[0.05] p-[4px]">
              <div className="flex items-center gap-[4px]">
                <MiniNook color={WATER_C} size={12} icon={Droplet} />
                <span className="text-[6.5px] font-semibold text-label">{tt("Su")}</span>
                <span className="rounded-full px-[3px] text-[5px]" style={{ background: tintBg(WATER_C, 20), color: tintText(WATER_C) }}>
                  {glasses} / 8
                </span>
              </div>
              <div className="mt-[3px] flex items-center justify-between">
                <div className="flex gap-[1.5px]">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span key={i} className="flex h-[7px] w-[7px] items-center justify-center rounded-[2px] border" style={i < glasses ? { background: tintBg(WATER_C, 25), borderColor: tintBg(WATER_C, 55), color: tintText(WATER_C) } : { borderColor: "rgb(255 255 255 / 0.08)", color: "rgb(255 255 255 / 0.25)" }}>
                      <Droplet size={4} fill={i < glasses ? "currentColor" : "none"} />
                    </span>
                  ))}
                </div>
                <div className="flex rounded-full bg-white/[0.05] p-[1px] text-[4.5px]">
                  {[0, 45, 60, 90].map((v) => (
                    <span key={v} className="rounded-full px-[3px] py-[1px]" style={water === v ? { background: tintBg(WATER_C, 30), color: tintText(WATER_C) } : { color: "rgb(255 255 255 / 0.4)" }}>
                      {v === 0 ? tt("Kapalı") : v === 60 ? tt("1 sa") : tt("{0} dk", v)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {[
              { icon: Eye, color: ACCENT.purple, title: tt("Göz Dinlendir"), on: eyeOn },
              { icon: PersonStanding, color: ACCENT.pink, title: tt("Duruş & Esneme"), on: true },
            ].map((h) => (
              <div key={h.title} className="flex items-center gap-[4px] rounded-[5px] bg-white/[0.05] px-[4px] py-[3px] transition-opacity" style={{ opacity: h.on ? 1 : 0.55 }}>
                <MiniNook color={h.color} size={11} icon={h.icon} />
                <span className="flex-1 text-[6px] font-semibold text-label">{h.title}</span>
                <span className="rounded-full bg-white/[0.07] px-[3px] text-[4.5px] text-label-2">{tt("Yaptım")}</span>
                <Switch on={h.on} color={h.color} />
              </div>
            ))}
          </div>
          <motion.span className="absolute text-white" animate={{ left: cursor.x, top: cursor.y }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
            <MousePointer2 size={9} fill="white" />
          </motion.span>
        </Pc>
        <div className="absolute left-0 top-[18px] w-[62px] text-[6.5px] leading-snug text-label-2">
          {tt("Her satırda tek anahtar; su hatırlatıcısı da kartında")}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Bildirim kartı büyür

const LONG = "Akşam maça geliyor musun? Biletleri ben alırım, 19.30'da kapıda buluşalım.";

/** Kart tek satırken imleç gelir, ada metin kadar uzar; ardından "Üstüme gel" teklifi imleçle oyuna açılır */
function NotifGrowDemo() {
  const n = useTick(650);
  const phase = n % 14; // 0-1 kart · 2-5 imleç üstünde, büyür · 6 ayrılır · 7-8 oyun teklifi · 9-13 imleç gelir, Oyun açılır
  const notif = phase <= 6;
  const open = phase >= 2 && phase <= 5;
  const game = phase >= 10;
  const w = game ? 200 : open ? 196 : notif ? 160 : 150;
  const h = game ? 66 : open ? 44 : 22;
  const over = open || phase >= 9;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={220} dark>
          <motion.div
            className="absolute left-1/2 top-0 overflow-hidden bg-black"
            animate={{ width: w, height: h, x: -w / 2, borderBottomLeftRadius: game ? 14 : 10, borderBottomRightRadius: game ? 14 : 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <div className="absolute left-[6px] top-[4px]">
              <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={14} expression={game ? "happy" : notif ? "surprised" : "bored"} />
            </div>
            <AnimatePresence mode="wait">
              {game ? (
                <motion.div key="g" className="absolute inset-x-[24px] top-[5px] flex flex-col gap-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <span className="flex items-center gap-[3px] text-[6.5px] font-semibold" style={{ color: tintText(ACCENT.pink) }}>
                    <Gamepad2 size={7} /> {tt("Oyun")}
                  </span>
                  <div className="grid grid-cols-3 gap-[2px]">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="h-[14px] rounded-[3px]" style={{ background: tintBg(ACCENT.pink, 10 + (i % 3) * 6) }} />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div key={notif ? "n" : "p"} className="absolute left-[24px] right-[6px] top-[4px]" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <p className="truncate text-[6.5px] font-semibold" style={{ color: tintText(notif ? ACCENT.blue : ACCENT.pink) }}>
                    {notif ? "Ayşe" : tt("Sıkıldım…")}
                  </p>
                  <p className={`text-[5.5px] leading-[7.5px] text-label-2 ${open ? "" : "truncate"}`}>{notif ? LONG : tt("Benimle oyun oynar mısın? Üstüme gel")}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <motion.span className="absolute text-white" animate={over ? { left: 118, top: 12, opacity: 1 } : { left: 150, top: 62, opacity: 0.8 }} transition={{ type: "spring", stiffness: 110, damping: 18 }}>
            <MousePointer2 size={9} fill="white" />
          </motion.span>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Atmosfer prizde de

/** Bilgisayar prizdeyken ada yağmur, sonra gece (ateş böceği adada gezer) */
function AtmosPlugDemo() {
  const n = useTick(3200);
  const night = n % 2 === 1;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={200} dark>
          <div className="absolute left-1/2 top-0 h-[30px] w-[150px] -translate-x-1/2 overflow-hidden rounded-b-[12px] bg-black">
            <AnimatePresence mode="wait">
              <motion.div key={night ? "night" : "rain"} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <IslandAtmosphere width={150} height={30} override={night ? "night" : "rain"} />
              </motion.div>
            </AnimatePresence>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={20} expression={night ? "drowsy" : "shy"} />
            </div>
          </div>
          <div className="absolute bottom-[6px] left-[8px] flex items-center gap-[3px] rounded-full px-[5px] py-[1px] text-[5.5px] font-semibold" style={{ background: tintBg(ACCENT.green, 18), color: tintText(ACCENT.green) }}>
            <PlugZap size={7} /> {tt("Prizde")}
          </div>
          <div className="absolute bottom-[6px] right-[8px] text-[5.5px] text-label-3">{night ? tt("Gece · ateş böceği") : tt("Yağmur")}</div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Argus: sahne mi, film mi

const ARGUS_C = ACCENT.orange;

/** Önce YouTube'da kısa bir dizi sahnesi: Argus'a yazılmaz. Sonra film sitesinde uzun film: Argus tanır ve sorar */
function ArgusSceneDemo() {
  const n = useTick(1700);
  const film = n % 2 === 1;
  const tab = film ? "Enkanto: Sihirli Dünya izle · Bilim Kurgu, Aile" : "Muhteşem Yüzyıl · Hürrem Sahnesi";
  const len = film ? "1:42:10" : "6:24";
  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={220} dark>
          {/* Tarayıcı sekmesi ve video */}
          <div className="absolute left-[8px] right-[8px] top-[6px] flex items-center gap-[3px] rounded-t-[4px] bg-white/[0.06] px-[4px] py-[2px]">
            <span className="h-[4px] w-[4px] rounded-full" style={{ background: film ? ACCENT.blue : ACCENT.red }} />
            <motion.span key={tab} className="truncate text-[5.5px] text-label-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {tab}
            </motion.span>
          </div>
          <div className="absolute left-[8px] top-[17px] h-[44px] w-[96px] rounded-b-[4px]" style={{ background: film ? "linear-gradient(135deg,#7b3fa0,#f2a33a)" : "linear-gradient(135deg,#5a1a1a,#c0392b)" }}>
            <span className="absolute bottom-[2px] right-[3px] rounded-[2px] bg-black/60 px-[2px] text-[5px] text-white">{len}</span>
          </div>
          {/* Ada: Nook'un kararı */}
          <motion.div
              key={film ? "f" : "s"}
              className="absolute right-[8px] top-[18px] flex w-[100px] items-center gap-[4px] rounded-[8px] bg-black px-[5px] py-[4px]"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <MiniNook color={film ? ARGUS_C : ACCENT.gray} size={14} icon={Clapperboard} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[6px] font-semibold" style={{ color: tintText(film ? ARGUS_C : ACCENT.gray) }}>
                  {film ? tt("Enkanto bitti mi?") : tt("Sahne, bölüm değil")}
                </p>
                <p className="truncate text-[5px] text-label-3">{film ? tt("Üstüme gel, işaretleyeyim") : tt("Argus'a yazılmaz")}</p>
              </div>
              {film ? <Check size={8} style={{ color: tintText(ACCENT.green) }} /> : <X size={8} style={{ color: tintText(ACCENT.red) }} />}
            </motion.div>
          <div className="absolute bottom-[6px] left-[8px] text-[5.5px] text-label-3">{film ? tt("Film · 1 sa 42 dk") : tt("YouTube · 6 dk")}</div>
        </Pc>
      </Fit>
    </Stage>
  );
}

export const DEMOS21 = {
  habitsfix: HabitsFixDemo,
  notifgrow: NotifGrowDemo,
  atmosplug: AtmosPlugDemo,
  argusscene: ArgusSceneDemo,
};
