/**
 * 0.3.2 yama notu demosu: ekran paylaşımı sürerken paylaşım çubuğunda "Gizle"ye basılınca ya da
 * çubuk kaybolunca Nook "Yayın bitti" demiyor, CANLI kalıyor. Studio'da yama notu kartında oynar.
 */
import { AnimatePresence, motion } from "motion/react";
import { Bug, Check, Gamepad2, MessageCircle, MessageSquare, Mic, MicOff, Play, Search, Send, Shirt, Zap } from "lucide-react";
import { DEFAULT_LOOK } from "../../lib/look";
import { NookFigure } from "../mascot/Figure";
import { FEED_STYLES, Nook } from "../mascot/Nook";
import type { FeedStyle } from "../mascot/Props";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Stage, useTick } from "./Demos6";

/** Tarayıcının paylaşım çubuğunda "Gizle"ye basılır ve çubuk kaybolur; adadaki CANLI hiç sönmez */
function ShareHoldDemo() {
  const phase = useTick(500) % 12; // 0-3 çubuk var · 4 Gizle'ye basılır · 5-9 gizli, CANLI sürer · 10-11 geri döner
  const press = phase === 4;
  const gone = phase >= 5 && phase <= 9;
  const R = ACCENT.red;
  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={240}>
          {/* Ada: CANLI baştan sona yanık */}
          <div className="absolute left-1/2 top-0 flex h-[20px] -translate-x-1/2 items-center gap-[5px] rounded-b-[10px] bg-black px-[8px]">
            <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={14} expression="happy" />
            <span className="flex items-center gap-[3px] rounded-full px-[5px] py-[1px] text-[6px] font-bold tracking-wider" style={{ background: tintBg(R, 22), color: tintText(R) }}>
              <motion.span className="h-[4px] w-[4px] rounded-full" style={{ background: R }} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
              {tt("CANLI")}
            </span>
          </div>
          {/* Paylaşılan pencere */}
          <div className="absolute inset-x-[10px] top-[26px] h-[30px] rounded-[5px] bg-white/[0.05] p-[5px]">
            <span className="block h-[3px] w-[55%] rounded-full bg-white/15" />
            <span className="mt-[4px] block h-[3px] w-[80%] rounded-full bg-white/10" />
            <span className="mt-[4px] block h-[3px] w-[40%] rounded-full bg-white/10" />
          </div>
          {/* Tarayıcının paylaşım çubuğu */}
          <AnimatePresence>
            {!gone && (
              <motion.div
                key="bar"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-[6px] left-1/2 flex -translate-x-1/2 items-center gap-[5px] whitespace-nowrap rounded-[4px] bg-[#e9eaee] px-[6px] py-[3px]"
              >
                <span className="text-[5.5px] text-[#222]">{tt("meet.google.com ekranınızı paylaşıyor")}</span>
                <span className="rounded-[3px] px-[4px] py-[1px] text-[5.5px] font-bold text-white" style={{ background: ACCENT.blue }}>
                  {tt("Paylaşımı durdur")}
                </span>
                <motion.span animate={{ scale: press ? 0.86 : 1 }} className="rounded-[2px] px-[3px] py-[1px] text-[5.5px] font-semibold" style={{ color: ACCENT.blue, background: press ? "rgb(0 0 0 / 0.1)" : "transparent" }}>
                  {tt("Gizle")}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Çubuk gizliyken: CANLI ve gizlilik sürer */}
          <AnimatePresence>
            {gone && (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-[8px] left-1/2 flex -translate-x-1/2 items-center gap-[4px] whitespace-nowrap rounded-full px-[7px] py-[2px]" style={{ background: tintBg(R, 16) }}>
                <span className="h-[4px] w-[4px] rounded-full" style={{ background: R }} />
                <span className="text-[5.5px] font-semibold" style={{ color: tintText(R) }}>
                  {tt("Çubuk gizlendi · yayın ve gizlilik sürüyor")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Pc>
      </Fit>
    </Stage>
  );
}

/** Dosya bırakırken 5 farklı yutma/yakalama hareketi ve yalnızca dosya sürüklenirken sallama */
function FeedStylesDemo() {
  const tick = useTick(650);
  const styleIdx = Math.floor(tick / 3) % FEED_STYLES.length;
  const sub = tick % 3; // 0: hungry (dosya yaklaşıyor) · 1: chewing (yutuyor/yakalıyor) · 2: happy (rafta)
  const style: FeedStyle = FEED_STYLES[styleIdx];
  const expr = sub === 0 ? "hungry" : sub === 1 ? "chewing" : "happy";
  const labels: Record<FeedStyle, string> = {
    chomp: tt("Lokma"),
    vacuum: tt("Vakum"),
    catch: tt("Havada kapma"),
    folder: tt("Damgalama"),
    box: tt("Koli"),
  };
  const B = ACCENT.blue;
  const G = ACCENT.green;

  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={240}>
          {/* Ada: önce koca adayı açmadan doğrudan yutma moduna esner */}
          <motion.div
            animate={{ width: sub === 2 ? 112 : 124, height: sub === 2 ? 28 : 42 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center justify-center rounded-b-[13px] bg-black"
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.45)" }}
          >
            <div style={{ transform: `scale(${sub === 2 ? 0.9 : 1.15}) translateY(${sub === 2 ? 0 : 3}px)` }}>
              <Nook expression={expr} feedStyle={style} look={DEFAULT_LOOK} color="#F4F4F6" res={160} />
            </div>
          </motion.div>

          {/* 5 üslup göstergesi */}
          <div className="absolute inset-x-[8px] bottom-[22px] flex items-center justify-center gap-[3px]">
            {FEED_STYLES.map((s) => {
              const active = s === style;
              return (
                <span
                  key={s}
                  className="rounded-full px-[5px] py-[1.5px] text-[5.5px] font-semibold transition-all"
                  style={{
                    background: active ? tintBg(B, 24) : "rgba(255,255,255,0.05)",
                    color: active ? tintText(B) : "rgba(255,255,255,0.42)",
                  }}
                >
                  {labels[s]}
                </span>
              );
            })}
          </div>

          {/* Alt durum bilgisi */}
          <div className="absolute bottom-[5px] left-1/2 flex -translate-x-1/2 items-center gap-[4px] whitespace-nowrap rounded-full px-[7px] py-[2px]" style={{ background: tintBg(G, 15) }}>
            <span className="h-[4px] w-[4px] rounded-full" style={{ background: G }} />
            <span className="text-[5.5px] font-semibold" style={{ color: tintText(G) }}>
              {tt("Doğrudan yutma · sallama yalnızca dosyada")}
            </span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

/** Studio penceresi daraltılıp genişletilirken arama çubuğu esner, kıyafet (Görünüm) düğmesi karttan taşmaz */
function StudioFitDemo() {
  const phase = useTick(900) % 4; // 0: geniş · 1: orta · 2: dar · 3: orta
  const widths = [208, 174, 146, 174];
  const cardW = widths[phase];
  const P = ACCENT.pink;
  const T = ACCENT.teal;

  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={240}>
          <div className="absolute inset-0 flex items-center justify-center pt-[4px]">
            <motion.div
              animate={{ width: cardW }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="flex items-center gap-[8px] rounded-[11px] border border-white/[0.08] bg-white/[0.04] px-[9px] py-[7px]"
            >
              <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={26} expression="happy" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[7.5px] font-extrabold text-white">{tt("Merhaba")}</div>
                <div className="mt-[2px] flex min-w-0 items-center gap-[4px]">
                  <span
                    className="shrink-0 rounded-full px-[4px] py-[1px] text-[5px] font-semibold"
                    style={{ background: tintBg(P, 18), color: tintText(P) }}
                  >
                    ♥ {tt("Çok mutlu")}
                  </span>
                  <div className="h-[3px] min-w-[14px] flex-1 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full w-[85%] rounded-full" style={{ background: P }} />
                  </div>
                </div>
                <div className="mt-[5px] flex min-w-0 items-center gap-[4px]">
                  <div
                    className="flex h-[15px] min-w-0 flex-1 items-center gap-[3px] rounded-[5px] border px-[5px]"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: tintBg(T, 35) }}
                  >
                    <Search size={7} style={{ color: tintText(T) }} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[5.5px] text-white/55">{tt("Ara, hesapla, çevir…")}</span>
                  </div>
                  <span
                    className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[5px] border"
                    style={{ background: tintBg(P, 14), borderColor: tintBg(P, 32), color: tintText(P) }}
                  >
                    <Shirt size={8} />
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

/** 1. ekranda tam ekran oyun açılınca Nook arka planda gizlenmek yerine 2. ekrana geçer; oyun kapanınca geri döner */
function GameScreenDemo() {
  const phase = useTick(800) % 6; // 0-1: normal (1. ekranda) · 2-4: oyun açık (Nook 2. ekranda) · 5: oyun kapandı (1. ekrana döndü)
  const inGame = phase >= 2 && phase <= 4;
  const B = ACCENT.blue;
  const G = ACCENT.green;
  const P = ACCENT.purple;

  return (
    <Stage>
      <Fit w={240} h={100}>
        <div className="relative flex h-[100px] w-[240px] flex-col items-center justify-center gap-[6px]">
          <div className="flex items-center gap-[8px]">
            {/* 1. Ekran */}
            <div
              className="relative h-[64px] w-[108px] overflow-hidden rounded-[7px] border"
              style={{
                background: inGame ? `linear-gradient(145deg, ${tintBg(P, 26)}, #11131a)` : "#131419",
                borderColor: inGame ? tintBg(P, 45) : "rgba(255,255,255,0.12)",
              }}
            >
              <AnimatePresence>
                {!inGame && (
                  <motion.div
                    key="nook-1"
                    initial={{ opacity: 0, y: -6, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 24, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 360, damping: 24 }}
                    className="absolute left-1/2 top-0 flex h-[16px] -translate-x-1/2 items-center gap-[4px] rounded-b-[8px] bg-black px-[7px]"
                  >
                    <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={11} expression="happy" />
                    <span className="text-[5px] font-bold text-white/80">Nook</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-[6px]">
                {inGame ? (
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-[2px]"
                  >
                    <Gamepad2 size={14} style={{ color: tintText(P) }} />
                    <span className="rounded-full px-[5px] py-[1px] text-[5.5px] font-bold" style={{ background: tintBg(P, 24), color: tintText(P) }}>
                      {tt("Tam ekran oyun")}
                    </span>
                  </motion.div>
                ) : (
                  <span className="text-[6px] font-semibold text-white/40">{tt("1. Ekran (Ana)")}</span>
                )}
              </div>
            </div>

            {/* 2. Ekran */}
            <div
              className="relative h-[64px] w-[108px] overflow-hidden rounded-[7px] border"
              style={{
                background: "#131419",
                borderColor: inGame ? tintBg(B, 45) : "rgba(255,255,255,0.12)",
              }}
            >
              <AnimatePresence>
                {inGame && (
                  <motion.div
                    key="nook-2"
                    initial={{ opacity: 0, x: -24, scale: 0.7 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 360, damping: 24 }}
                    className="absolute left-1/2 top-0 flex h-[16px] -translate-x-1/2 items-center gap-[4px] rounded-b-[8px] bg-black px-[7px]"
                  >
                    <NookFigure look={DEFAULT_LOOK} color="#F4F4F6" size={11} expression="happy" />
                    <span className="text-[5px] font-bold" style={{ color: tintText(B) }}>
                      {tt("Buradayım!")}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-[6px]">
                <span className="text-[6px] font-semibold text-white/45">{tt("2. Ekran")}</span>
              </div>
            </div>
          </div>

          <div
            className="flex items-center gap-[4px] rounded-full px-[8px] py-[2px]"
            style={{ background: tintBg(inGame ? B : G, 16) }}
          >
            <span className="h-[4px] w-[4px] rounded-full" style={{ background: inGame ? B : G }} />
            <span className="text-[5.5px] font-semibold" style={{ color: tintText(inGame ? B : G) }}>
              {inGame ? tt("Oyun açık · Nook 2. ekrana geçti") : tt("Oyun kapandı · Nook 1. ekrana döndü")}
            </span>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

/** Kısayollarda mikrofon kapalıyken üstü çizili simge ve otomasyonu tek dokunuşla çalıştırma */
function DeckFixDemo() {
  const step = useTick(700) % 6;
  const muted = step >= 1 && step <= 3;
  const autoRunning = step === 4 || step === 5;
  const O = ACCENT.orange;
  const R = ACCENT.red;
  const P = ACCENT.purple;
  const G = ACCENT.green;
  const micColor = muted ? R : O;
  return (
    <Stage>
      <Fit w={236} h={98}>
        <div className="flex h-[98px] w-[236px] items-center justify-center gap-[8px] px-2">
          {/* Mikrofon tuşu */}
          <motion.div
            animate={{ scale: step === 1 ? 0.94 : 1 }}
            className="relative flex h-[68px] w-[72px] flex-col items-center justify-center gap-[4px] rounded-[12px] border"
            style={{
              background: `linear-gradient(150deg, ${tintBg(micColor, 18)}, ${tintBg(micColor, 5)})`,
              borderColor: tintBg(micColor, 40),
            }}
          >
            <span
              className="absolute right-[6px] top-[6px] h-[5px] w-[5px] rounded-full"
              style={{ background: micColor, boxShadow: `0 0 6px ${micColor}` }}
            />
            <span
              className="flex h-[24px] w-[24px] items-center justify-center rounded-[8px]"
              style={{ background: tintBg(micColor, 24), color: tintText(micColor) }}
            >
              {muted ? <MicOff size={13} strokeWidth={2.4} /> : <Mic size={13} strokeWidth={2.4} />}
            </span>
            <span className="text-[6.5px] font-bold" style={{ color: tintText(micColor) }}>
              {muted ? tt("Mikrofon kapalı") : tt("Mikrofon")}
            </span>
          </motion.div>

          {/* Otomasyon kartı + Şimdi çalıştır */}
          <div
            className="flex h-[68px] flex-1 flex-col justify-between rounded-[12px] border p-[7px]"
            style={{
              background: autoRunning ? tintBg(P, 18) : "rgba(255,255,255,0.035)",
              borderColor: autoRunning ? tintBg(P, 45) : "rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-[5px]">
              <span
                className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px]"
                style={{ background: tintBg(P, 22), color: tintText(P) }}
              >
                <Zap size={10} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[7px] font-bold text-white/90">{tt("Gece modu")}</p>
                <p className="truncate text-[5.5px] text-white/45">{tt("Her gün 23:00 · 4 adım")}</p>
              </div>
              <motion.span
                animate={{ scale: step === 4 ? 0.88 : 1 }}
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full border"
                style={{
                  background: tintBg(autoRunning ? G : P, 24),
                  borderColor: tintBg(autoRunning ? G : P, 50),
                  color: tintText(autoRunning ? G : P),
                }}
              >
                <Play size={8} fill="currentColor" />
              </motion.span>
            </div>
            <div
              className="flex items-center justify-between rounded-[6px] px-[6px] py-[2.5px]"
              style={{ background: tintBg(autoRunning ? G : P, 14) }}
            >
              <span className="text-[5.5px] font-semibold" style={{ color: tintText(autoRunning ? G : P) }}>
                {autoRunning ? tt("Koşulsuz şimdi çalıştırıldı") : tt("İstediğin an tek dokunuşla çalıştır")}
              </span>
            </div>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

/** WhatsApp modülü ve gelen bildirimden anında hızlı yanıt */
function WhatsAppDemo() {
  const phase = useTick(750) % 6; // 0: mesaj geldi · 1-2: hızlı yanıt yazılıyor · 3: gönderildi · 4-5: WhatsApp modülünde sohbet
  const WA = "#25D366";
  const sent = phase === 3;
  const inPanel = phase >= 4;

  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={240}>
          <AnimatePresence mode="wait">
            {!inPanel ? (
              <motion.div
                key="toast"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-1/2 top-0 flex w-[188px] -translate-x-1/2 items-center gap-[5px] rounded-b-[11px] bg-black px-[7px] py-[5px]"
                style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
              >
                <span
                  className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full"
                  style={{ background: tintBg(WA, 22), color: tintText(WA) }}
                >
                  <MessageCircle size={9} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[6px] font-bold text-white">Ece · {tt("Akşam buluşuyor muyuz?")}</div>
                  <div className="mt-[2px] flex items-center gap-[3px]">
                    <div
                      className="flex h-[12px] flex-1 items-center rounded-full border px-[5px] text-[5.5px]"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        borderColor: tintBg(WA, 38),
                        color: sent ? tintText(WA) : "rgba(255,255,255,0.85)",
                      }}
                    >
                      {phase === 0
                        ? tt("Yanıt yaz…")
                        : phase === 1
                          ? tt("Geliyorum!")
                          : phase === 2
                            ? tt("Geliyorum! 20:00'de")
                            : tt("Yanıt gönderildi")}
                    </div>
                    <span
                      className="flex h-[12px] w-[12px] items-center justify-center rounded-full text-black"
                      style={{ background: WA }}
                    >
                      {sent ? <Check size={7} strokeWidth={3} /> : <Send size={6} />}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="panel"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="absolute left-1/2 top-0 flex w-[198px] -translate-x-1/2 flex-col gap-[3px] rounded-b-[12px] bg-black px-[8px] py-[5px]"
                style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.55)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-[3px] text-[6.5px] font-extrabold text-white">
                    <MessageCircle size={8} style={{ color: tintText(WA) }} />
                    WhatsApp · Ece
                  </span>
                  <span
                    className="rounded-full px-[4px] py-[0.5px] text-[4.8px] font-bold"
                    style={{ background: tintBg(WA, 20), color: tintText(WA) }}
                  >
                    {tt("Web + Telefon")}
                  </span>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <span className="self-start rounded-[6px] rounded-bl-[2px] bg-white/[0.08] px-[5px] py-[2px] text-[5.5px] text-white/85">
                    {tt("Akşam buluşuyor muyuz?")}
                  </span>
                  <span
                    className="self-end rounded-[6px] rounded-br-[2px] px-[5px] py-[2px] text-[5.5px] font-semibold"
                    style={{ background: tintBg(WA, 24), color: tintText(WA) }}
                  >
                    {tt("Geliyorum! 20:00'de")} ✓✓
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="absolute bottom-[5px] left-1/2 flex -translate-x-1/2 items-center gap-[4px] whitespace-nowrap rounded-full px-[7px] py-[2px]"
            style={{ background: tintBg(WA, 16) }}
          >
            <span className="h-[4px] w-[4px] rounded-full" style={{ background: WA }} />
            <span className="text-[5.5px] font-semibold" style={{ color: tintText(WA) }}>
              {inPanel ? tt("Adadaki WhatsApp sekmesinden tüm sohbetler") : tt("Gelen bildirimden tek tıkla hızlı yanıt")}
            </span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

/** Kullanıcı geribildirim sistemi: Studio › Ayarlar › Hakkında içinde hata bildirimi veya öneri yazma ve takip */
function FeedbackDemo() {
  const tick = useTick(800);
  const phase = tick % 6; // 0-2: form yazımı ve gönderim · 3-5: liste görünümü ve "Senin bildirimin" takibi
  const isList = phase >= 3;
  const P = ACCENT.purple;
  const R = ACCENT.red;
  const G = ACCENT.green;

  return (
    <Stage>
      <Fit w={240} h={100}>
        <Pc w={240}>
          <div className="absolute inset-0 flex items-center justify-center pt-[2px]">
            <motion.div
              animate={{ height: isList ? 78 : 82 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="flex w-[214px] flex-col rounded-[11px] border border-white/[0.08] bg-white/[0.04] p-[7px]"
            >
              {/* Üst başlık & sekme göstergesi */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-[4px]">
                <span className="flex items-center gap-[4px] text-[6.5px] font-bold text-white">
                  <MessageSquare size={8} style={{ color: tintText(P) }} />
                  {tt("Geribildirim")}
                </span>
                <div className="flex items-center gap-[2px] rounded-full bg-white/[0.06] p-[1px]">
                  <span
                    className="rounded-full px-[4px] py-[1px] text-[5px] font-semibold"
                    style={{
                      background: !isList ? tintBg(P, 26) : "transparent",
                      color: !isList ? tintText(P) : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {tt("Yeni Yaz")}
                  </span>
                  <span
                    className="rounded-full px-[4px] py-[1px] text-[5px] font-semibold"
                    style={{
                      background: isList ? tintBg(P, 26) : "transparent",
                      color: isList ? tintText(P) : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {tt("Takip (Açık)")}
                  </span>
                </div>
              </div>

              {/* İçerik */}
              <AnimatePresence mode="wait">
                {!isList ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    className="flex flex-1 flex-col justify-between pt-[4px]"
                  >
                    <div className="flex items-center gap-[3px]">
                      <span
                        className="flex items-center gap-[2px] rounded-full px-[4px] py-[1px] text-[5px] font-bold"
                        style={{ background: tintBg(R, 20), color: tintText(R) }}
                      >
                        <Bug size={6} />
                        {tt("Hata")}
                      </span>
                      <span className="flex-1 truncate rounded-[5px] bg-white/[0.06] px-[5px] py-[2px] text-[5.5px] text-white/90">
                        {tt("Kısayollarda mikrofon simgesi…")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-[5px] bg-white/[0.03] px-[5px] py-[2px]">
                      <span className="text-[5px] text-white/60">✓ {tt("Sürüm v0.3.2 ve son loglar eklendi")}</span>
                      <motion.span
                        animate={{ scale: phase === 2 ? 0.92 : 1 }}
                        className="flex items-center gap-[2px] rounded-full px-[5px] py-[1.5px] text-[5px] font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${R}, #c02626)` }}
                      >
                        <Send size={5} />
                        {tt("GitHub'da Gönder")}
                      </motion.span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    className="flex flex-1 flex-col justify-between pt-[4px]"
                  >
                    <div className="rounded-[7px] border border-white/[0.08] bg-white/[0.04] p-[4px]">
                      <div className="flex items-center gap-[3px]">
                        <span
                          className="h-[4px] w-[4px] rounded-full"
                          style={{ background: G, boxShadow: `0 0 4px ${G}` }}
                        />
                        <span className="text-[5px] font-bold" style={{ color: tintText(G) }}>
                          {tt("Açık")}
                        </span>
                        <span
                          className="rounded-full px-[3px] py-[0.5px] text-[4.8px] font-bold"
                          style={{ background: tintBg(ACCENT.yellow, 24), color: tintText(ACCENT.yellow) }}
                        >
                          ★ {tt("Senin bildirimin")}
                        </span>
                        <span className="ml-auto text-[5px] font-mono text-white/40">#42</span>
                      </div>
                      <p className="mt-[2px] truncate text-[6px] font-semibold text-white">
                        {tt("Kısayollarda mikrofon simgesi güncellenmiyor")}
                      </p>
                      <p className="mt-[1px] text-[5px] text-white/50">
                        💬 2 {tt("yanıt")} · {tt("İnceleniyor")}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div
            className="absolute bottom-[5px] left-1/2 flex -translate-x-1/2 items-center gap-[4px] whitespace-nowrap rounded-full px-[7px] py-[2px]"
            style={{ background: tintBg(P, 16) }}
          >
            <span className="h-[4px] w-[4px] rounded-full" style={{ background: P }} />
            <span className="text-[5.5px] font-semibold" style={{ color: tintText(P) }}>
              {isList
                ? tt("Açık ve çözülen konuları uygulama içinden takip et")
                : tt("Loglar ve sistem bilgisiyle tek tıkla hata / öneri bildir")}
            </span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

export const DEMOS20 = {
  sharehold: ShareHoldDemo,
  feedstyles: FeedStylesDemo,
  studiofit: StudioFitDemo,
  gamescreen: GameScreenDemo,
  deckfix: DeckFixDemo,
  whatsapp: WhatsAppDemo,
  feedback: FeedbackDemo,
};
