import { motion } from "motion/react";
import { Languages } from "lucide-react";
import { lang, LANGS, onLangChange, type Lang } from "../../lib/i18n";
import { spring } from "../../lib/motion";
import { useNook } from "../../store/nook";
import { ACCENT, Dropdown, tintBg, tintText } from "./primitives";

/** Dili değiştir: ayar kaydedilir, Nook pencereleri yeni dille yeniden yüklenir */
export function setLang(next: Lang) {
  useNook.getState().updateSettings({ lang: next });
  onLangChange(next);
}

/** Tanıtımın ilk sayfası: dillerin kendi adlarıyla küçük çipler */
export function LangChips() {
  return (
    <div className="flex max-w-[820px] flex-wrap items-center justify-center gap-1.5">
      <Languages size={14} strokeWidth={2.2} className="mr-0.5 text-label-3" />
      {LANGS.map((l) => {
        const on = l.id === lang;
        return (
          <motion.button
            key={l.id}
            whileTap={{ scale: 0.94 }}
            whileHover={{ y: -1 }}
            transition={spring.pop}
            onClick={() => setLang(l.id)}
            className="rounded-full border px-2.5 py-1 text-[12px] font-medium"
            style={
              on
                ? { background: tintBg(ACCENT.teal, 22), borderColor: tintBg(ACCENT.teal, 55), color: tintText(ACCENT.teal) }
                : { background: "rgb(255 255 255 / 0.04)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-2)" }
            }
          >
            {l.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Ayarlar: açılır liste */
export function LangDropdown() {
  return <Dropdown options={LANGS.map((l) => ({ id: l.id, label: l.label }))} value={lang} onChange={(v) => setLang(v as Lang)} />;
}
