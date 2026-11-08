/**
 * 0.3.8 yama notu demoları (ikinci bölüm): Claude onay kartında tam komut ve kural, mikrofonun geri
 * gelmesi, görüşmede susan Hey Nook, telefon köprüsü izinleri, Tailscale anahtarı, kısayol çakışmaları,
 * bölgeye göre dil ve saat, kaldırınca temizlik, günlüklerde gizlilik, sakin pano çevirisi.
 */
import { AnimatePresence, motion } from "motion/react";
import { Camera, Check, CheckCheck, Eye, Globe, Keyboard, Languages, Lock, Mic, MicOff, Radio, ShieldCheck, Smartphone, Trash2, X } from "lucide-react";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Pc, Stage, useTick } from "./Demos6";

const CLAUDE = "#d97757";

/** Küçük yuvarlak düğme */
const Pill = ({ label, color, press = false, icon }: { label?: string; color: string; press?: boolean; icon?: React.ReactNode }) => (
  <motion.span
    animate={{ scale: press ? 0.86 : 1 }}
    className="flex h-[13px] items-center gap-[2px] rounded-full border px-[5px] text-[5.5px] font-bold"
    style={{ background: tintBg(color, 18), borderColor: tintBg(color, 40), color: tintText(color) }}
  >
    {icon}
    {label}
  </motion.span>
);

/** Ayar satırı ve anahtarı */
const Switch = ({ on }: { on: boolean }) => (
  <motion.span animate={{ background: on ? ACCENT.blue : "rgba(255,255,255,.18)" }} className="relative h-[9px] w-[16px] shrink-0 rounded-full">
    <motion.span animate={{ x: on ? 8 : 1 }} className="absolute top-[1px] h-[7px] w-[7px] rounded-full bg-white" />
  </motion.span>
);

// ---------------------------------------------------------------- Claude onay kartı

/** Çok satırlı komut "+2 satır" rozetiyle gelir, "Tamamını gör" komutun hepsini açar; yayındayken kart gizlidir */
function ClaudeAskDemo() {
  const n = useTick(750);
  const phase = n % 15; // 0-2 kart · 3 Tamamını gör · 4-7 tam komut · 8-10 Her zaman üstünde kural · 11-14 yayında
  const full = phase >= 4 && phase <= 7;
  const rule = phase >= 8 && phase <= 10;
  const live = phase >= 11;
  return (
    <Stage>
      <Fit w={250} h={100}>
        <div className="absolute inset-x-[10px] top-[8px]">
          <div className="flex items-center gap-[5px] rounded-[14px] bg-black px-[7px] py-[5px]">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-[3px] text-[5.5px] font-medium" style={{ color: tintText(CLAUDE) }}>
                <span className="h-[3px] w-[3px] rounded-full" style={{ background: CLAUDE }} />
                {live ? "Claude" : "Claude · nook"}
                {live && <Radio size={6} className="ml-[2px]" style={{ color: ACCENT.red }} />}
              </p>
              <p className="mt-[2px] text-[7px] font-medium text-label">{live ? tt("Claude onayını bekliyor") : tt("Komut çalıştırmak istiyor")}</p>
              <p
                className="mt-[2px] truncate rounded-[3px] px-[3px] py-[1px] font-mono text-[5.5px] text-label-2"
                style={{ background: rule ? tintBg(ACCENT.green, 16) : "rgba(255,255,255,.06)" }}
              >
                {live ? tt("Yayında gizlendi") : rule ? tt("Eklenecek kural: {0}", "Bash(npm test:*)") : "cd nook"}
                {!live && !rule && (
                  <span className="ml-[3px] rounded-full px-[3px] font-sans text-[4.5px] font-bold" style={{ background: tintBg(ACCENT.orange, 26), color: tintText(ACCENT.orange) }}>
                    {tt("+{0} satır", 2)}
                  </span>
                )}
              </p>
            </div>
            <Pill color={ACCENT.red} icon={<X size={6} />} />
            {live ? (
              <Pill color={CLAUDE} label={tt("Göster")} icon={<Eye size={6} />} />
            ) : rule ? (
              <Pill color={ACCENT.green} label={tt("Her zaman")} icon={<CheckCheck size={6} />} press />
            ) : (
              <Pill color={CLAUDE} label={tt("Tamamını gör")} icon={<Eye size={6} />} press={phase === 3} />
            )}
          </div>
          <AnimatePresence>
            {full && (
              <motion.pre
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-[5px] rounded-[6px] bg-black/50 px-[6px] py-[4px] font-mono text-[5.5px] leading-snug text-label-2"
              >
                {"cd nook\nnpm test\nrm -rf dist"}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Mikrofon geri gelir

/** Kalkan mikrofonu 0'a indirir; Nook o sırada kapansa da yeniden açılınca mikrofon eski seviyesine döner */
function MicBackDemo() {
  const n = useTick(650);
  const phase = n % 12; // 0-1 açık · 2-5 kalkan, %0 · 6-7 Nook kapandı · 8-11 açıldı, %80
  const level = phase >= 2 && phase <= 7 ? 0 : 80;
  const closed = phase === 6 || phase === 7;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute inset-x-[16px] top-[14px] flex flex-col gap-[8px]">
          <div className="flex items-center gap-[6px]">
            {level ? <Mic size={11} style={{ color: ACCENT.green }} /> : <MicOff size={11} style={{ color: ACCENT.red }} />}
            <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div animate={{ width: `${level}%` }} className="h-full rounded-full" style={{ background: level ? ACCENT.green : ACCENT.red }} />
            </div>
            <span className="w-[20px] text-right font-round text-[7px] font-bold tabular-nums text-label">%{level}</span>
          </div>
          <div className="flex items-center gap-[5px] text-[6px] text-label-2">
            <ShieldCheck size={8} style={{ color: phase >= 2 && phase <= 5 ? ACCENT.blue : "rgba(255,255,255,.3)" }} />
            <span>
              {phase < 2 ? tt("Görüşmedesin") : phase <= 5 ? tt("Kalkan açık: mikrofon %0") : closed ? tt("Nook kapandı") : tt("Nook açıldı: mikrofon geri geldi")}
            </span>
          </div>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Hey Nook görüşmede susar

/** Görüşme başlayınca Hey Nook dinlemeyi bırakır; görüşme bitince yeniden dinler */
function HeyPauseDemo() {
  const n = useTick(700);
  const phase = n % 10; // 0-2 dinliyor · 3-7 görüşmede · 8-9 yine dinliyor
  const call = phase >= 3 && phase <= 7;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <Pc w={200}>
          <AnimatePresence>
            {call && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-[10px] grid grid-cols-2 gap-[4px]">
                {[ACCENT.blue, ACCENT.purple, ACCENT.green, ACCENT.orange].map((c) => (
                  <span key={c} className="rounded-[5px]" style={{ background: tintBg(c, 22) }} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="absolute left-1/2 top-[4px] flex -translate-x-1/2 items-center gap-[4px] rounded-full bg-black px-[7px] py-[3px]">
            <motion.span animate={{ opacity: call ? 0.35 : [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: call ? 0 : Infinity }}>
              {call ? <MicOff size={7} className="text-label-3" /> : <Mic size={7} style={{ color: ACCENT.green }} />}
            </motion.span>
            <span className="text-[5.5px] text-label-2">{call ? tt("Görüşmede: Hey Nook dinlemiyor") : tt("Hey Nook dinliyor")}</span>
          </div>
        </Pc>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Telefon köprüsü izinleri

/** Uzaktan kontrol kapalıyken telefon ekran görüntüsü alamaz; kilitli kalkan telefondan kalkmaz */
function PhoneSafeDemo() {
  const n = useTick(900);
  const phase = n % 8; // 0-3 ekran görüntüsü · 4-7 kilitli kalkan
  const shot = phase < 4;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[18px] top-[6px] h-[84px] w-[48px] rounded-[9px] border border-white/20 bg-black p-[4px]">
          <Smartphone size={8} className="mx-auto text-label-3" />
          <motion.div key={shot ? "s" : "k"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-[6px] flex flex-col items-center gap-[4px]">
            {shot ? <Camera size={11} className="text-label-2" /> : <Lock size={11} style={{ color: ACCENT.yellow }} />}
            <span className="text-center text-[4.5px] leading-tight text-label-2">
              {shot ? tt("Ekranı görmek için uzaktan kontrolü aç") : tt("Kalkan kilitli: PC'de parolayla kaldır")}
            </span>
          </motion.div>
        </div>
        <div className="absolute right-[16px] top-[18px] flex w-[130px] flex-col gap-[5px]">
          <div className="flex items-center justify-between rounded-[7px] bg-white/[0.05] px-[6px] py-[4px]">
            <span className="text-[6px] text-label">{tt("Telefondan uzaktan kontrol")}</span>
            <Switch on={false} />
          </div>
          <p className="px-[2px] text-[5px] leading-tight text-label-3">{tt("Kafe gibi Genel ağlarda telefon bağlantı noktası kapalı kalır.")}</p>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Tailscale'i açık tut

/** Anahtar kapalıyken Nook Tailscale'e dokunmaz; açınca kapanan Tailscale'i yeniden bağlar */
function TsKeepDemo() {
  const n = useTick(800);
  const phase = n % 10; // 0-3 kapalı, Tailscale kapalı kalır · 4 aç · 5-6 bağlanıyor · 7-9 açık
  const on = phase >= 4;
  const up = phase >= 7;
  return (
    <Stage>
      <Fit w={240} h={90}>
        <div className="absolute inset-x-[20px] top-[14px] flex flex-col gap-[6px]">
          <div className="flex items-center gap-[5px] text-[6.5px] text-label">
            <motion.span animate={{ background: up ? "#3ccf6e" : "rgba(255,255,255,.25)" }} className="h-[5px] w-[5px] rounded-full" />
            {up ? tt("Tailscale açık") : on ? tt("Tailscale kapalı: Nook açıyor…") : tt("Tailscale kapalı")}
          </div>
          <div className="flex items-center justify-between rounded-[7px] bg-white/[0.05] px-[6px] py-[4px]">
            <span className="text-[6.5px] text-label">{tt("Tailscale'i açık tut")}</span>
            <Switch on={on} />
          </div>
          <p className="px-[2px] text-[5px] leading-tight text-label-3">{tt("Kapalıyken Nook Tailscale'e dokunmaz.")}</p>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Kısayol çakışmaları

/** Ctrl+Shift+A seçilince Teams ve JetBrains'teki işi de yazar */
function KeyClashDemo() {
  const n = useTick(900);
  const phase = n % 6;
  const warn = phase >= 2;
  return (
    <Stage>
      <Fit w={240} h={90}>
        <div className="absolute inset-x-[18px] top-[14px] flex flex-col gap-[5px]">
          <div className="flex items-center justify-between rounded-[7px] bg-white/[0.05] px-[6px] py-[4px]">
            <span className="flex items-center gap-[4px] text-[6.5px] text-label">
              <Keyboard size={8} className="text-label-3" /> {tt("Ekrana sor")}
            </span>
            <span className="rounded-[4px] border border-white/20 px-[4px] font-mono text-[6px] text-label">Ctrl+Shift+A</span>
          </div>
          <AnimatePresence>
            {warn && (
              <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[6px] px-[6px] py-[3px] text-[5.5px] leading-tight" style={{ background: tintBg(ACCENT.orange, 14), color: tintText(ACCENT.orange) }}>
                {tt("Bu tuşlar başka bir programda: {0}", `${tt("Teams'te gelen aramayı kabul etme")}, ${tt("JetBrains IDE'lerinde Find Action")}`)}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Bölgeye göre dil ve saat

/** İngilizce Windows, bölge Türkiye: Nook Türkçe açılır; İngilizce seçilse de saat 24 saatlik */
function RegionLangDemo() {
  const n = useTick(1100);
  const en = n % 4 >= 2;
  return (
    <Stage>
      <Fit w={240} h={90}>
        <div className="absolute left-[18px] top-[18px] flex flex-col gap-[3px] text-[6px] text-label-2">
          <span className="flex items-center gap-[3px]">
            <Globe size={8} /> Windows: English
          </span>
          <span>{tt("Bölge: Türkiye")}</span>
        </div>
        <div className="absolute right-[18px] top-[14px] flex w-[110px] items-center gap-[6px] rounded-full bg-black px-[8px] py-[5px]">
          <span className="h-[12px] w-[12px] rounded-full" style={{ background: ACCENT.blue }} />
          <motion.span key={en ? "en" : "tr"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 flex-1 truncate text-[6.5px] text-label">
            {en ? "Good evening" : "İyi akşamlar"}
          </motion.span>
          <span className="font-round text-[7px] font-bold tabular-nums text-label">21:30</span>
        </div>
        <p className="absolute right-[18px] top-[40px] w-[110px] text-[5px] text-label-3">{en ? "English · 24-hour clock" : "Türkçe"}</p>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Kaldırınca temizlik

/** Nook kaldırılınca bıraktıkları tek tek silinir */
function CleanUninstallDemo() {
  const n = useTick(500);
  const items = [tt("Güvenlik duvarı kuralları"), tt("Modemdeki yönlendirme"), tt("Tailscale girişsiz çalışma"), tt("Eşleştirme anahtarı ve günlükler")];
  const done = Math.min(items.length, n % (items.length + 4));
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute inset-x-[24px] top-[10px] flex flex-col gap-[4px]">
          <span className="flex items-center gap-[4px] text-[7px] font-bold text-label">
            <Trash2 size={8} style={{ color: ACCENT.red }} /> {tt("Nook kaldırılıyor")}
          </span>
          {items.map((t, i) => (
            <span key={t} className="flex items-center gap-[4px] text-[6px]" style={{ color: i < done ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.35)" }}>
              <motion.span animate={{ scale: i < done ? 1 : 0.6, opacity: i < done ? 1 : 0.3 }}>
                <Check size={7} style={{ color: ACCENT.green }} />
              </motion.span>
              {t}
            </span>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Günlüklerde gizlilik

/** Geribildirime eklenen günlük satırlarında kullanıcı adı, adresler ve tırnak içi metinler gizlenir */
function LogMaskDemo() {
  const n = useTick(1200);
  const masked = n % 2 === 1;
  const rows = masked
    ? ["telefondan dosya: foto.jpg", "C:\\Users\\***\\Downloads", "hey nook doğrulama: hayır", "IP *.*.*.*"]
    : ["telefondan dosya: foto.jpg", "C:\\Users\\Ali\\Downloads", "hey nook doğrulama: hayır", "IP 192.168.1.24"];
  return (
    <Stage>
      <Fit w={240} h={90}>
        <div className="absolute inset-x-[20px] top-[10px] rounded-[7px] bg-black/50 px-[7px] py-[5px]">
          <p className="mb-[3px] text-[5.5px] font-bold text-label-3">{masked ? tt("Issue'ya giden") : tt("Bilgisayardaki günlük")}</p>
          {rows.map((r, i) => (
            <motion.p key={i + r} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="truncate font-mono text-[5.5px] leading-snug text-label-2">
              {r}
            </motion.p>
          ))}
        </div>
      </Fit>
    </Stage>
  );
}

// ---------------------------------------------------------------- Sakin pano çevirisi

/** "git status" gibi kısa kopyalar çevrilmeye gönderilmez; uzun yabancı metin çevrilir */
function TranslateCalmDemo() {
  const n = useTick(1100);
  const long = n % 4 >= 2;
  return (
    <Stage>
      <Fit w={240} h={90}>
        <div className="absolute inset-x-[20px] top-[12px] flex flex-col gap-[5px]">
          <div className="rounded-[7px] bg-white/[0.05] px-[6px] py-[4px] font-mono text-[6px] text-label">
            {long ? "The meeting has been moved to Friday" : "git status"}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={long ? "l" : "s"} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-[4px] text-[6px]">
              <Languages size={8} style={{ color: long ? ACCENT.purple : "rgba(255,255,255,.3)" }} />
              <span className={long ? "text-label" : "text-label-3"}>{long ? tt("Toplantı cumaya alındı") : tt("Kısa metin: çevrilmez")}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </Fit>
    </Stage>
  );
}

export const DEMOS25 = {
  claudeask: ClaudeAskDemo,
  micback: MicBackDemo,
  heypause: HeyPauseDemo,
  phonesafe: PhoneSafeDemo,
  tskeep: TsKeepDemo,
  keyclash: KeyClashDemo,
  regionlang: RegionLangDemo,
  cleanuninstall: CleanUninstallDemo,
  logmask: LogMaskDemo,
  translatecalm: TranslateCalmDemo,
};
