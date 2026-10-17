import { useEffect, useRef, useState } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Languages, Pencil, Pin, Pipette, Search, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { playAntic } from "../../hooks/useAntics";
import { clipboardWriteFiles, clipboardWriteImage, copyText, inTauri, setInteractive } from "../../lib/bridge";
import { spring } from "../../lib/motion";
import { useNook, type ClipItem, type Settings } from "../../store/nook";
import { ACCENT, EmptyState, TextButton, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { translateToUser } from "../../lib/assist";

/** "#3A7BFF" → Ayarlar'daki biçim: HEX (# ile/olmadan), rgb() ya da hsl() */
export function formatColor(hex: string, fmt: Settings["colorFormat"], noHash: boolean): string {
  const h = hex.replace("#", "");
  if (fmt === "hex" || h.length !== 6) return noHash ? h : `#${h}`;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (fmt === "rgb") return `rgb(${r}, ${g}, ${b})`;
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d) hue = max === rr ? ((gg - bb) / d) % 6 : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  hue = Math.round(hue * 60 + 360) % 360;
  return `hsl(${hue}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export function ClipboardPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("clip", scroller);
  const clips = useNook((s) => s.clips);
  const clearClips = useNook((s) => s.clearClips);
  const removeClip = useNook((s) => s.removeClip);
  const fmt = useNook((s) => s.settings.colorFormat ?? "hex");
  const noHash = useNook((s) => s.settings.colorNoHash ?? false);
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = (key: string) => {
    setCopied(key);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1000);
  };
  const copy = async (c: ClipItem, translation = false) => {
    if (c.kind === "image" && c.path) await clipboardWriteImage(c.path);
    else if (c.kind === "files" && c.paths) await clipboardWriteFiles(c.paths);
    else await copyText(translation && c.translation ? c.translation : c.color ? formatColor(c.color, fmt, noHash) : c.text);
    flash(translation ? `${c.id}-tr` : c.id);
  };

  const q = query.trim().toLocaleLowerCase("tr");
  const match = (c: ClipItem) => !q || [c.text, c.translation, c.app].some((x) => x?.toLocaleLowerCase("tr").includes(q));
  const colors = clips.filter((c) => c.color && match(c));
  // Sabitlenenler başta
  const items = clips.filter((c) => !c.color && match(c)).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const unpinned = clips.some((c) => !c.pinned);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center gap-1.5">
        <label className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-well px-2.5 focus-within:bg-well-hi">
          <Search size={11} strokeWidth={2.6} className="shrink-0 text-label-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={tt("Panoda ara")}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-label outline-none placeholder:text-label-3"
          />
        </label>
        <PickColor />
        {unpinned && (
          <TextButton tone="danger" onClick={clearClips}>{tt("Temizle")}</TextButton>
        )}
      </div>

      {!clips.length ? (
        <EmptyState title={tt("Pano boş")} hint={tt("Kopyaladığın metinler, görseller, dosyalar ve renkler burada birikir")} color={ACCENT.purple} />
      ) : !colors.length && !items.length ? (
        <p className="pt-6 text-center text-[11px] text-label-3">{tt("Eşleşen kayıt yok")}</p>
      ) : (
        <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {colors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence initial={false}>
                {colors.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={spring.pop}
                    className="group flex h-8 items-center rounded-[11px] border"
                    style={{ background: tintBg(c.color!, 12), borderColor: tintBg(c.color!, 35) }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={spring.pop}
                      onClick={() => copy(c)}
                      title={tt("{0} — kopyala", formatColor(c.color!, fmt, noHash))}
                      className="flex h-full items-center gap-1.5 py-1 pl-1 pr-1.5"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-[8px]" style={{ background: c.color!, boxShadow: `0 0 10px -2px ${c.color}` }}>
                        <AnimatePresence>
                          {copied === c.id && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                              <Check size={11} strokeWidth={3.5} className="text-white mix-blend-difference" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </span>
                      <span className="font-mono text-[11px] font-medium" style={{ color: tintText(c.color!) }}>
                        {c.color}
                      </span>
                    </motion.button>
                    {/* Sil: üzerine gelince belirir */}
                    <button
                      onClick={() => removeClip(c.id)}
                      title={tt("Rengi sil")}
                      className="mr-1 flex h-4 w-4 items-center justify-center rounded-full text-label-3 opacity-40 transition hover:bg-white/10 hover:text-label group-hover:opacity-100"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <AnimatePresence initial={false}>
              {items.map((c) =>
                editing === c.id ? (
                  <EditRow key={c.id} clip={c} onDone={() => setEditing(null)} />
                ) : (
                  <ClipCard key={c.id} clip={c} copied={copied} onCopy={copy} onEdit={() => setEditing(c.id)} />
                ),
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

/** Kaydın türü: kartın sol üstündeki rozet ve rengi */
function clipType(c: ClipItem): { label: string; color: string; mono: boolean } {
  const kind = c.kind ?? "text";
  if (kind === "image") return { label: tt("Görsel"), color: ACCENT.pink, mono: false };
  if (kind === "files") return { label: tt("Dosya"), color: ACCENT.teal, mono: false };
  const t = c.text.trim();
  if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return { label: tt("Bağlantı"), color: ACCENT.blue, mono: true };
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(t)) return { label: tt("E-posta"), color: ACCENT.blue, mono: false };
  if (/^[+\d\s().,-]{6,}$/.test(t)) return { label: tt("Sayı"), color: ACCENT.yellow, mono: true };
  if (/[{};]|=>|^\s*(npm|npx|git|cd|pip|cargo|sudo|\$)\s|^\s*(const|let|import|function|def|class|SELECT)\b/m.test(t)) return { label: tt("Kod"), color: ACCENT.orange, mono: true };
  return { label: tt("Metin"), color: ACCENT.purple, mono: false };
}

/** Pano kartı: tür rozeti, iki satırlık içerik (görselde önizleme), geldiği uygulama; üstüne gelince sabitle/düzenle/sil */
function ClipCard({ clip: c, copied, onCopy, onEdit }: { clip: ClipItem; copied: string | null; onCopy: (c: ClipItem, tr?: boolean) => void; onEdit: () => void }) {
  const { pinClip, removeClip } = useNook.getState();
  const kind = c.kind ?? "text";
  const type = clipType(c);
  const tip = c.app ? `${kind === "files" ? (c.paths ?? []).join("\n") : c.text}\n— ${c.app}` : kind === "files" ? (c.paths ?? []).join("\n") : c.text;
  const done = copied === c.id;
  const image = kind === "image" && c.path && inTauri;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={spring.pop}
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-[13px] border ${c.translation || (c.askTranslate && !c.translation) ? "col-span-2" : ""}`}
      style={{ background: done ? tintBg(ACCENT.green, 10) : "rgb(255 255 255 / 0.035)", borderColor: done ? tintBg(ACCENT.green, 45) : c.pinned ? tintBg(ACCENT.yellow, 35) : "rgb(255 255 255 / 0.06)" }}
    >
      <button onClick={() => onCopy(c)} title={tip} className="relative flex min-h-[66px] flex-col px-2.5 pb-2 pt-2 text-left transition-colors hover:bg-white/[0.03]">
        {image && (
          <>
            <img src={convertFileSrc(c.path!)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-55" />
            <span className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgb(0 0 0 / 0.1), rgb(0 0 0 / 0.75))" }} />
          </>
        )}
        <span className="relative flex items-center gap-1">
          <span className="rounded-[5px] px-1.5 py-[1px] text-[9px] font-bold" style={{ background: tintBg(type.color, 20), color: tintText(type.color) }}>
            {type.label}
          </span>
          {c.pinned && <Pin size={9} strokeWidth={2.6} fill="currentColor" style={{ color: tintText(ACCENT.yellow) }} />}
          {done && (
            <span className="ml-auto flex items-center gap-0.5 text-[9.5px] font-semibold" style={{ color: tintText(ACCENT.green) }}>
              <Check size={10} strokeWidth={3} />
              {tt("Kopyalandı")}
            </span>
          )}
        </span>
        <span className={`relative mt-1 line-clamp-2 break-all text-label ${type.mono ? "font-mono text-[10.5px]" : "text-[11.5px]"}`}>
          {kind === "image" ? c.text : kind === "files" ? ((c.paths?.length ?? 0) > 1 ? tt("{0} dosya · {1}", c.paths!.length, c.text) : c.text) : c.text.replace(/\s+/g, " ")}
        </span>
        {c.app && <span className="relative mt-auto truncate pt-1 text-[9.5px] text-label-3">{c.app}</span>}
      </button>
      {/* Üzerine gelince: sabitle, düzenle, sil */}
      <div className="absolute right-1 top-1 flex items-center rounded-full bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <RowAction label={c.pinned ? tt("Sabitlemeyi kaldır") : tt("Sabitle")} onClick={() => pinClip(c.id, !c.pinned)} color={c.pinned ? ACCENT.yellow : undefined}>
          <Pin size={10.5} strokeWidth={2.4} fill={c.pinned ? "currentColor" : "none"} />
        </RowAction>
        {kind === "text" && (
          <RowAction label={tt("Önizle ve düzenle")} onClick={onEdit}>
            <Pencil size={10.5} strokeWidth={2.4} />
          </RowAction>
        )}
        <RowAction label={tt("Sil")} onClick={() => removeClip(c.id)}>
          <X size={11} strokeWidth={2.6} />
        </RowAction>
      </div>
      {c.translation && (
        <button
          onClick={() => onCopy(c, true)}
          title={tt("{0} — çeviriyi kopyala", c.translation)}
          className="group/tr flex h-7 w-full items-center gap-2 border-t border-white/[0.05] px-2.5 text-left transition-colors hover:bg-well-hi"
        >
          <Languages size={11} strokeWidth={2.4} className="shrink-0" style={{ color: ACCENT.purple }} />
          <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: tintText(ACCENT.purple) }}>
            {c.translation}
          </span>
          {copied === `${c.id}-tr` ? (
            <Check size={13} strokeWidth={3} style={{ color: ACCENT.green }} />
          ) : (
            <Copy size={12} strokeWidth={2.2} className="text-label-3 opacity-0 transition-opacity group-hover/tr:opacity-100" />
          )}
        </button>
      )}
      {c.askTranslate && !c.translation && <TranslateAsk clip={c} />}
    </motion.div>
  );
}

/**
 * Gemini anahtarı yokken yabancı metin: çevirmek için metnin ücretsiz servise (MyMemory) gitmesi
 * gerekir — izin verilmeden gönderilmez. "Hep çevir" bir daha sormaz, "Hayır" bir daha önermez.
 */
function TranslateAsk({ clip: c }: { clip: ClipItem }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Gemini anahtarı varsa bu kart, kendiliğinden yapılan çeviri tutmadığında çıkar: yalnızca "Tekrar dene"
  const gemini = useNook((s) => !!s.settings.geminiKey.trim());
  const run = async (always: boolean) => {
    const st = useNook.getState();
    if (always) st.updateSettings({ freeTranslate: true });
    setBusy(true);
    setFailed(false);
    const out = await translateToUser(c.text, gemini ? st.settings.freeTranslate === true : true).catch(() => null);
    setBusy(false);
    if (out) useNook.getState().patchClip(c.id, { translation: out, askTranslate: false });
    else setFailed(true);
  };
  if (gemini)
    return (
      <div className="flex h-7 items-center gap-1.5 border-t border-white/[0.05] pl-2.5 pr-1">
        <Languages size={11} strokeWidth={2.4} className="shrink-0" style={{ color: ACCENT.purple }} />
        <span className="min-w-0 flex-1 truncate text-[10.5px] text-label-3">{busy ? tt("Çeviriyorum…") : failed ? tt("Yine olmadı, biraz sonra dene") : tt("Çeviri yetişmedi")}</span>
        {!busy && <TextButton onClick={() => void run(false)}>{tt("Tekrar dene")}</TextButton>}
      </div>
    );
  const never = () => {
    const st = useNook.getState();
    st.updateSettings({ freeTranslate: false });
    for (const x of st.clips) if (x.askTranslate) st.patchClip(x.id, { askTranslate: false });
  };
  return (
    <div className="flex h-7 items-center gap-1.5 border-t border-white/[0.05] pl-2.5 pr-1">
      <Languages size={11} strokeWidth={2.4} className="shrink-0" style={{ color: ACCENT.purple }} />
      <span className="min-w-0 flex-1 truncate text-[10.5px] text-label-3" title={tt("Gemini anahtarın olmadığı için metin ücretsiz çeviri servisi MyMemory'ye gönderilir")}>
        {busy ? tt("Çeviriyorum…") : failed ? tt("Çeviremedim") : tt("Çevireyim mi? (MyMemory)")}
      </span>
      {!busy && (
        <>
          <TextButton onClick={() => void run(false)}>{tt("Çevir")}</TextButton>
          <TextButton onClick={() => void run(true)}>{tt("Hep çevir")}</TextButton>
          <TextButton tone="danger" onClick={never}>{tt("Hayır")}</TextButton>
        </>
      )}
    </div>
  );
}

function RowAction({ label, onClick, color, children }: { label: string; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-label-2 hover:bg-white/10 hover:text-label"
      style={color ? { color: tintText(color) } : undefined}
    >
      {children}
    </button>
  );
}

/** Kaydın tamamı: okunur, düzenlenir; kaydedince geçmişteki kayıt değişir, Kopyala panoya koyar */
function EditRow({ clip, onDone }: { clip: ClipItem; onDone: () => void }) {
  const [text, setText] = useState(clip.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);
  const save = () => {
    if (text.trim() && text !== clip.text) useNook.getState().editClip(clip.id, text);
    onDone();
  };
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col-span-2 space-y-1 rounded-[12px] bg-well-hi p-1.5">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
          if (e.key === "Enter" && e.ctrlKey) save();
        }}
        spellCheck={false}
        rows={Math.min(7, Math.max(3, text.split("\n").length))}
        className="w-full resize-none rounded-[8px] bg-black/30 p-2 text-[11.5px] leading-relaxed text-label outline-none"
      />
      <div className="flex justify-end gap-1">
        <TextButton onClick={onDone}>{tt("İptal")}</TextButton>
        <TextButton
          onClick={() => {
            void copyText(text);
            save();
          }}
        >
          {tt("Kopyala")}
        </TextButton>
        <TextButton onClick={save}>{tt("Kaydet")}</TextButton>
      </div>
    </motion.div>
  );
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/** Ekranın herhangi bir yerinden renk al → Ayarlar'daki biçimde panoya kopyala ve renk havuzuna ekle. */
function PickColor() {
  const ED = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
  if (!ED) return null;
  const pick = async () => {
    // Seçerken imleç adanın dışına çıkar: ada açık ve pencere tıklanabilir kalsın, yoksa seçici kapanır
    const st = useNook.getState();
    st.setHold("eyedropper", true);
    await setInteractive(true);
    try {
      const { sRGBHex } = await new ED().open();
      const hex = sRGBHex.toUpperCase();
      const { colorFormat, colorNoHash } = useNook.getState().settings;
      await copyText(formatColor(hex, colorFormat ?? "hex", colorNoHash ?? false));
      useNook.getState().pushClip(hex);
      playAntic("wink");
    } catch {
      // Esc ile vazgeçildi
    } finally {
      useNook.getState().setHold("eyedropper", false);
      void setInteractive(false);
    }
  };
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring.pop}
      onClick={() => void pick()}
      title={tt("Ekrandan renk seç")}
      className="flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium"
      style={{ background: tintBg(ACCENT.purple, 14), borderColor: tintBg(ACCENT.purple, 38), color: tintText(ACCENT.purple) }}
    >
      <Pipette size={11} strokeWidth={2.6} />{tt("Renk")}</motion.button>
  );
}
