/**
 * Yama notu demoları: telefon eşleştirme sihirbazı, Ayarlar'da arama ve tek yerde duran ayarlar,
 * sessiz saatler, parçacık seçici.
 */
import { motion } from "motion/react";
import { ArrowRight, Bell, Check, CornerDownLeft, Gamepad2, Moon, QrCode, Search, Settings2 } from "lucide-react";
import { ACCENT, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Fit, Stage, useTick } from "./Demos6";

/** Üç adım kartı: İndir · Eşleştir · Dene; sıradaki renkli, biten tikli, sonunda nokta yeşile döner */
function PhoneWizardDemo() {
  const n = useTick(1300);
  const cur = n % 4; // 0 indir · 1 eşleştir · 2 dene (bekliyor) · 3 bağlandı
  const steps = [tt("İndir"), tt("Eşleştir"), tt("Dene")];
  return (
    <Stage>
      <Fit w={240} h={96}>
        {steps.map((title, i) => {
          const done = i < cur || cur === 3;
          const on = i === cur;
          const c = done ? ACCENT.green : ACCENT.blue;
          return (
            <motion.div
              key={title}
              className="absolute top-[8px] flex h-[80px] w-[72px] flex-col items-center gap-[6px] rounded-[10px] border pt-[7px]"
              style={{ left: 6 + i * 78 }}
              animate={{ background: on ? tintBg(c, 12) : "rgb(255 255 255 / 0.045)", borderColor: on ? tintBg(c, 55) : "rgb(255 255 255 / 0.06)" }}
            >
              <span className="flex w-full items-center gap-[4px] px-[7px]">
                <span className="flex h-[13px] w-[13px] items-center justify-center rounded-full text-[8px] font-extrabold" style={done || on ? { background: c, color: "#000" } : { background: "rgb(255 255 255 / 0.1)", color: "rgb(255 255 255 / 0.5)" }}>
                  {done ? <Check size={8} strokeWidth={3.5} /> : i + 1}
                </span>
                <b className="text-[8.5px] text-label">{title}</b>
              </span>
              {i < 2 ? (
                <span className="flex items-center justify-center rounded-[6px] bg-white" style={{ width: i ? 40 : 32, height: i ? 40 : 32 }}>
                  <QrCode size={i ? 32 : 25} color="#000" strokeWidth={1.8} />
                </span>
              ) : (
                <span className="flex flex-col items-center gap-[5px] pt-[6px]">
                  <motion.i className="h-[9px] w-[9px] rounded-full" animate={{ background: cur === 3 ? ACCENT.green : ACCENT.yellow, scale: cur === 2 ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.8, repeat: cur === 2 ? Infinity : 0 }} />
                  <span className="text-[7.5px] font-semibold" style={{ color: cur === 3 ? tintText(ACCENT.green) : "var(--color-label-2)" }}>
                    {cur === 3 ? tt("Bağlandı") : tt("Bekleniyor…")}
                  </span>
                </span>
              )}
            </motion.div>
          );
        })}
      </Fit>
    </Stage>
  );
}

/** "wifi" yazılır: eş anlamlısıyla bulunan satır, kategorisi çipte; sonra yanlış yazım ve "Bunu mu aradın?" */
function SettingsSearchDemo() {
  const n = useTick(450);
  const t = n % 16;
  const typo = t >= 8;
  const word = typo ? "bildrim" : "wifi";
  const typed = word.slice(0, Math.min(word.length, (typo ? t - 8 : t) + 1));
  const full = typed === word;
  const chip = (label: string, c: string, Icon: typeof Bell) => (
    <span className="flex items-center gap-[3px] rounded-full border px-[5px] py-[1px] text-[7px] font-semibold" style={{ background: tintBg(c, 14), borderColor: tintBg(c, 36), color: tintText(c) }}>
      <Icon size={7} strokeWidth={2.6} />
      {label}
    </span>
  );
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[6px] flex h-[22px] w-[224px] items-center gap-[6px] rounded-full bg-white/[0.07] px-[9px]">
          <Search size={10} color="rgb(255 255 255 / 0.5)" />
          <span className="text-[9.5px] text-label">{typed}</span>
          <motion.i className="h-[10px] w-[1px] bg-white/70" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
        </div>
        {full && !typo && (
          <motion.div className="absolute left-[8px] top-[36px] flex h-[34px] w-[224px] items-center gap-[6px] rounded-[9px] bg-white/[0.05] px-[9px]" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <span className="flex-1 text-[9px] font-semibold text-label">{tt("Olay kartları")}</span>
            {chip(tt("Bildirimler"), ACCENT.purple, Bell)}
          </motion.div>
        )}
        {full && typo && (
          <motion.div className="absolute left-[8px] top-[32px] w-[224px]" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <p className="mb-[4px] text-center text-[8px] text-label-3">{tt("Bunu mu aradın?")}</p>
            <div className="flex h-[26px] items-center gap-[6px] rounded-[9px] bg-white/[0.05] px-[9px]">
              <span className="flex-1 text-[9px] font-semibold text-label">
                <mark className="rounded-[3px] px-[1px]" style={{ background: tintBg(ACCENT.yellow, 30), color: tintText(ACCENT.yellow) }}>
                  {tt("Windows bildirimleri").slice(0, 7)}
                </mark>
                {tt("Windows bildirimleri").slice(7)}
              </span>
              {chip(tt("Bildirimler"), ACCENT.purple, Bell)}
            </div>
          </motion.div>
        )}
      </Fit>
    </Stage>
  );
}

/** Aynı ayar iki kategoride durmaz: eski yerinde "→ Tam ekran altında" satırı, basınca asıl yerine gider */
function SettingsOnceDemo() {
  const n = useTick(1500);
  const there = n % 2 === 1;
  const c = there ? ACCENT.orange : ACCENT.blue;
  const Icon = there ? Gamepad2 : Settings2;
  return (
    <Stage>
      <Fit w={240} h={96}>
        <motion.div key={String(there)} className="absolute left-[8px] top-[8px] flex items-center gap-[5px]" initial={{ opacity: 0, x: there ? 8 : -8 }} animate={{ opacity: 1, x: 0 }}>
          <span className="flex h-[16px] w-[16px] items-center justify-center rounded-[5px]" style={{ background: tintBg(c, 22) }}>
            <Icon size={10} color={c} />
          </span>
          <b className="text-[10px]" style={{ color: tintText(c) }}>
            {there ? tt("Tam ekran") : tt("Genel")}
          </b>
        </motion.div>
        <motion.div
          className="absolute left-[8px] top-[36px] flex h-[40px] w-[224px] items-center gap-[6px] rounded-[10px] px-[10px]"
          animate={{ background: there ? tintBg(ACCENT.purple, 16) : "rgb(255 255 255 / 0.05)" }}
        >
          <span className={`flex-1 text-[9px] font-semibold ${there ? "text-label" : "text-label-3"}`}>{tt("Tam ekranda ikinci ekrana geç")}</span>
          {there ? (
            <span className="flex h-[13px] w-[22px] items-center justify-end rounded-full px-[2px]" style={{ background: ACCENT.blue }}>
              <i className="h-[9px] w-[9px] rounded-full bg-white" />
            </span>
          ) : (
            <motion.span className="flex items-center gap-[3px] rounded-full bg-white/[0.08] px-[6px] py-[2px] text-[7.5px] font-semibold text-label-2" animate={{ scale: [1, 1, 0.92, 1] }} transition={{ duration: 1.5, times: [0, 0.75, 0.88, 1] }}>
              <ArrowRight size={8} />
              {tt("{0} altında", tt("Tam ekran"))}
            </motion.span>
          )}
        </motion.div>
      </Fit>
    </Stage>
  );
}

/** Saat 23:00'e gelince ay çıkar, kart gelmez; alarm yine çalar; 08:00'de kartlar geri gelir */
function QuietHoursDemo() {
  const n = useTick(1100);
  const phase = n % 4; // 0 gündüz · 1-2 sessiz · 3 sabah
  const quiet = phase === 1 || phase === 2;
  const time = ["22:59", "23:00", "03:30", "08:00"][phase];
  return (
    <Stage>
      <Fit w={240} h={96}>
        <div className="absolute left-[8px] top-[8px] flex h-[30px] w-[224px] items-center gap-[7px] rounded-[10px] bg-white/[0.05] px-[10px]">
          <span className="flex-1 text-[9.5px] font-semibold text-label">{tt("Sessiz saatler")}</span>
          <span className="rounded-full bg-white/[0.08] px-[6px] py-[2px] text-[8px] tabular-nums text-label-2">23:00 – 08:00</span>
        </div>
        <motion.div className="absolute left-[8px] top-[48px] flex h-[40px] w-[108px] flex-col items-center justify-center gap-[3px] rounded-[10px]" animate={{ background: quiet ? tintBg(ACCENT.purple, 18) : "rgb(255 255 255 / 0.05)" }}>
          <b className="text-[13px] leading-none tabular-nums text-label">{time}</b>
          <motion.span className="flex items-center gap-[3px] text-[7.5px] font-semibold" style={{ color: tintText(ACCENT.purple) }} animate={{ opacity: quiet ? 1 : 0 }}>
            <Moon size={8} strokeWidth={2.6} />
            {tt("Şu an sessiz")}
          </motion.span>
        </motion.div>
        <div className="absolute left-[124px] top-[48px] flex h-[40px] w-[108px] items-center justify-center gap-[6px] rounded-[10px] bg-black">
          <MiniNook color="#ffffff" size={16} eyes={quiet ? "closed" : "open"} />
          <motion.span key={phase} className="text-[8px] font-semibold" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} style={{ color: phase === 2 ? tintText(ACCENT.yellow) : "var(--color-label-2)" }}>
            {[tt("Kart geldi"), tt("Kart yok"), tt("Alarm çalar"), tt("Kartlar geri")][phase]}
          </motion.span>
        </div>
      </Fit>
    </Stage>
  );
}

/** Kısayolla açılan liste: yazınca süzülür, Enter seçileni önceki pencereye yapıştırır */
function SnippetPickDemo() {
  const n = useTick(500);
  const t = n % 12;
  const pasted = t >= 8;
  const typed = "ib".slice(0, Math.max(0, Math.min(2, t - 1)));
  const rows = [
    { name: tt("Adres"), text: "Bağdat Cad. No: 12" },
    { name: "IBAN", text: "TR12 0006 4000 …" },
    { name: tt("İmza"), text: tt("İyi çalışmalar") },
  ].filter((r) => !typed || r.name.toLowerCase().includes(typed));
  const c = ACCENT.purple;
  return (
    <Stage>
      <Fit w={240} h={96}>
        {/* Arkadaki pencere: yapıştırılan metin buraya düşer */}
        <div className="absolute left-[8px] top-[62px] flex h-[28px] w-[224px] items-center rounded-[8px] border border-white/[0.08] bg-white/[0.03] px-[9px] text-[8.5px] text-label-2">
          {pasted ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-label">TR12 0006 4000 …</motion.span> : <motion.i className="h-[10px] w-[1px] bg-white/60" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />}
        </div>
        <motion.div className="absolute left-[40px] top-0 w-[160px] overflow-hidden rounded-b-[12px] bg-black px-[7px] pb-[6px] pt-[5px]" animate={{ y: pasted ? -70 : 0, opacity: pasted ? 0 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
          <div className="mb-[3px] flex h-[14px] items-center gap-[4px] rounded-full bg-white/[0.08] px-[6px]">
            <Search size={7} color="rgb(255 255 255 / 0.5)" />
            <span className="text-[7.5px] text-label">{typed}</span>
          </div>
          {rows.slice(0, 2).map((r, i) => (
            <div key={r.name} className="flex h-[15px] items-center gap-[5px] rounded-[6px] px-[5px]" style={i === 0 ? { background: tintBg(c, 18) } : undefined}>
              <b className="text-[7.5px] text-label">{r.name}</b>
              <span className="flex-1 truncate text-[7px] text-label-3">{r.text}</span>
              {i === 0 && <CornerDownLeft size={7} color={tintText(c)} />}
            </div>
          ))}
        </motion.div>
      </Fit>
    </Stage>
  );
}

export const DEMOS38 = {
  phonewizard: PhoneWizardDemo,
  settingssearch: SettingsSearchDemo,
  settingsonce: SettingsOnceDemo,
  quiethours: QuietHoursDemo,
  snippetpick: SnippetPickDemo,
};
