import { useEffect, useRef, useState } from "react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { AnimatePresence, motion } from "motion/react";
import { BookmarkPlus, Check, Copy, Languages, Pencil, Pin, Pipette, Plus, Search, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { playAntic } from "../../hooks/useAntics";
import { clipboardWriteFiles, clipboardWriteImage, copyText, inTauri, setInteractive } from "../../lib/bridge";
import { spring } from "../../lib/motion";
import { useNook, type ClipItem, type Settings, type Snippet } from "../../store/nook";
import { ACCENT, EmptyState, Segmented, TextButton, tintBg, tintText } from "../ui/primitives";
import { removeWithUndo } from "../../lib/undo";
import { tt } from "../../lib/i18n";
import { fold } from "../../lib/search";
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

/** Panodan çıkarır; 5 sn "Geri al" sunar */
const dropClips = (gone: (c: ClipItem) => boolean, label: string) =>
  removeWithUndo(() => useNook.getState().clips, (clips) => useNook.setState({ clips }), gone, label, ACCENT.purple);

/** Arama kutusunun yanındaki tür süzgeçleri */
type Filter = "all" | ClipKind | "color";
const FILTERS: Filter[] = ["all", "text", "link", "code", "image", "color", "files"];
const filterLabel = (f: Filter) => ({ all: tt("Hepsi"), text: tt("Metin"), link: tt("Bağlantı"), code: tt("Kod"), image: tt("Görsel"), color: tt("Renk"), files: tt("Dosya") })[f];

/** Son açık bölüm (panel kapanıp açılınca korunur) */
let lastView: "clips" | "snippets" = import.meta.env.DEV && new URLSearchParams(location.search).has("snip") ? "snippets" : "clips";

/** Pano bir sonraki açılışında Parçacıklar'la açılsın (parçacık seçicinin "Parçacık ekle"si) */
export const showSnippets = () => void (lastView = "snippets");

export function ClipboardPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("clip", scroller);
  const clips = useNook((s) => s.clips);
  const [view, setView] = useState(lastView);
  const [filter, setFilter] = useState<Filter>("all");
  // Açık parçacık formu: id boşsa yeni kayıt
  const [draft, setDraft] = useState<Snippet | null>(null);
  const show = (v: typeof view) => {
    lastView = v;
    setView(v);
  };
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

  const q = fold(query.trim());
  const match = (c: ClipItem) => !q || [c.text, c.translation, c.app].some((x) => x && fold(x).includes(q));
  const colors = filter === "all" || filter === "color" ? clips.filter((c) => c.color && match(c)) : [];
  // Sabitlenenler başta
  const items = filter === "color" ? [] : clips.filter((c) => !c.color && match(c) && (filter === "all" || clipType(c).id === filter)).sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const unpinned = clips.some((c) => !c.pinned);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 items-center gap-1.5">
        <Segmented
          id="clip-view"
          value={view}
          onChange={show}
          color={ACCENT.purple}
          options={[
            { id: "clips", label: tt("Pano") },
            { id: "snippets", label: tt("Parçacıklar") },
          ]}
        />
        <label className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-well px-2.5 focus-within:bg-well-hi">
          <Search size={11} strokeWidth={2.6} className="shrink-0 text-label-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={view === "clips" ? tt("Panoda ara") : tt("Parçacıklarda ara")}
            aria-label={view === "clips" ? tt("Panoda ara") : tt("Parçacıklarda ara")}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-[11.5px] text-label outline-none placeholder:text-label-3"
          />
        </label>
        {view === "clips" ? (
          <>
            <PickColor />
            {unpinned && (
              <TextButton tone="danger" onClick={() => dropClips((c) => !c.pinned, tt("Pano temizlendi"))}>{tt("Temizle")}</TextButton>
            )}
          </>
        ) : (
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={spring.pop}
            onClick={() => setDraft({ id: "", name: "", text: "" })}
            className="flex h-6 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium"
            style={{ background: tintBg(ACCENT.purple, 14), borderColor: tintBg(ACCENT.purple, 38), color: tintText(ACCENT.purple) }}
          >
            <Plus size={11} strokeWidth={2.6} />
            {tt("Yeni")}
          </motion.button>
        )}
      </div>

      {view === "clips" && clips.length > 0 && (
        <div className="-my-0.5 flex shrink-0 items-center gap-1" role="group" aria-label={tt("Türe göre süz")}>
          {FILTERS.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={`h-5 rounded-full border px-2 text-[10.5px] font-medium transition-colors ${filter === k ? "" : "border-transparent text-label-3 hover:bg-well hover:text-label-2"}`}
              style={filter === k ? { background: tintBg(ACCENT.purple, 16), borderColor: tintBg(ACCENT.purple, 40), color: tintText(ACCENT.purple) } : undefined}
            >
              {filterLabel(k)}
            </button>
          ))}
        </div>
      )}

      {view === "snippets" ? (
        <Snippets q={q} draft={draft} setDraft={setDraft} copied={copied} onCopied={flash} />
      ) : !clips.length ? (
        <EmptyState title={tt("Pano boş")} hint={tt("Bir şey kopyala, burada belirir: metin, görsel, dosya, renk")} color={ACCENT.purple} />
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
                    className="group flex h-8 items-center rounded-row border"
                    style={{ background: tintBg(c.color!, 12), borderColor: tintBg(c.color!, 35) }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={spring.pop}
                      onClick={() => copy(c)}
                      title={tt("{0} — kopyala", formatColor(c.color!, fmt, noHash))}
                      className="flex h-full items-center gap-1.5 py-1 pl-1 pr-1.5"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-badge" style={{ background: c.color!, boxShadow: `0 0 10px -2px ${c.color}` }}>
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
                    {/* Sil: soluk durur, üzerine gelince belirginleşir */}
                    <button
                      onClick={() => dropClips((x) => x.id === c.id, tt("{0} silindi", c.color!))}
                      title={tt("Rengi sil")}
                      aria-label={tt("Rengi sil")}
                      className="mr-1 flex h-4 w-4 items-center justify-center rounded-full text-label-3 opacity-50 transition hover:bg-white/10 hover:text-label focus-visible:opacity-100 group-hover:opacity-100"
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
                  <ClipCard
                    key={c.id}
                    clip={c}
                    copied={copied}
                    onCopy={copy}
                    onEdit={() => setEditing(c.id)}
                    onSnippet={() => {
                      show("snippets");
                      setDraft({ id: "", name: c.text.trim().split("\n")[0].slice(0, 24), text: c.text });
                    }}
                  />
                ),
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

type ClipKind = "text" | "link" | "code" | "image" | "files";

/** Kaydın türü: kartın sol üstündeki rozet ve rengi; `id` süzgeç çiplerinin türü (e-posta ve sayı metin sayılır) */
function clipType(c: ClipItem): { id: ClipKind; label: string; color: string; mono: boolean } {
  const kind = c.kind ?? "text";
  if (kind === "image") return { id: "image", label: tt("Görsel"), color: ACCENT.pink, mono: false };
  if (kind === "files") return { id: "files", label: tt("Dosya"), color: ACCENT.teal, mono: false };
  const t = c.text.trim();
  if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return { id: "link", label: tt("Bağlantı"), color: ACCENT.blue, mono: true };
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(t)) return { id: "text", label: tt("E-posta"), color: ACCENT.blue, mono: false };
  if (/^[+\d\s().,-]{6,}$/.test(t)) return { id: "text", label: tt("Sayı"), color: ACCENT.yellow, mono: true };
  if (/[{};]|=>|^\s*(npm|npx|git|cd|pip|cargo|sudo|\$)\s|^\s*(const|let|import|function|def|class|SELECT)\b/m.test(t)) return { id: "code", label: tt("Kod"), color: ACCENT.orange, mono: true };
  return { id: "text", label: tt("Metin"), color: ACCENT.purple, mono: false };
}

/** Pano kartı: tür rozeti, iki satırlık içerik (görselde önizleme), geldiği uygulama; sağ üstte sabitle/düzenle/parçacık yap/sil */
function ClipCard({ clip: c, copied, onCopy, onEdit, onSnippet }: { clip: ClipItem; copied: string | null; onCopy: (c: ClipItem, tr?: boolean) => void; onEdit: () => void; onSnippet: () => void }) {
  const { pinClip } = useNook.getState();
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
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-row border ${c.translation || (c.askTranslate && !c.translation) ? "col-span-2" : ""}`}
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
            <span className="ml-auto flex items-center gap-0.5 text-[10.5px] font-semibold" style={{ color: tintText(ACCENT.green) }}>
              <Check size={10} strokeWidth={3} />
              {tt("Kopyalandı")}
            </span>
          )}
        </span>
        <span className={`relative mt-1 line-clamp-2 break-all text-label ${type.mono ? "font-mono text-[10.5px]" : "text-[11.5px]"}`}>
          {kind === "image" ? c.text : kind === "files" ? ((c.paths?.length ?? 0) > 1 ? tt("{0} dosya · {1}", c.paths!.length, c.text) : c.text) : c.text.replace(/\s+/g, " ")}
        </span>
        {c.app && <span className="relative mt-auto truncate pt-1 text-[10.5px] text-label-3">{c.app}</span>}
      </button>
      {/* Sabitle, düzenle, parçacık yap, sil: hep görünür (soluk); üzerine gelince ya da odaklanınca belirginleşir */}
      <div className={`absolute right-1 top-1 flex items-center rounded-full bg-black/55 transition-opacity focus-within:opacity-100 group-hover:opacity-100 ${done ? "opacity-0" : "opacity-50"}`}>
        <RowAction label={c.pinned ? tt("Sabitlemeyi kaldır") : tt("Sabitle")} onClick={() => pinClip(c.id, !c.pinned)} color={c.pinned ? ACCENT.yellow : undefined}>
          <Pin size={10.5} strokeWidth={2.4} fill={c.pinned ? "currentColor" : "none"} />
        </RowAction>
        {kind === "text" && (
          <RowAction label={tt("Önizle ve düzenle")} onClick={onEdit}>
            <Pencil size={10.5} strokeWidth={2.4} />
          </RowAction>
        )}
        {kind === "text" && (
          <RowAction label={tt("Parçacık yap")} onClick={onSnippet}>
            <BookmarkPlus size={10.5} strokeWidth={2.4} />
          </RowAction>
        )}
        <RowAction label={tt("Sil")} onClick={() => dropClips((x) => x.id === c.id, tt("Kayıt silindi"))}>
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
            <Copy size={12} strokeWidth={2.2} className="text-label-3 opacity-50 transition-opacity group-hover/tr:opacity-100" />
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
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col-span-2 space-y-1 rounded-row bg-well-hi p-1.5">
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
        className="w-full resize-none rounded-badge bg-black/30 p-2 text-[11.5px] leading-relaxed text-label outline-none"
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

/**
 * Parçacıklar: adlandırılmış hazır metinler (adres, IBAN, imza…). Satıra tıkla: kopyalanır.
 * Tetikleyicisi ("/adres") olan parçacık Nook'un aramasında yazılınca çıkar, Enter kopyalar.
 */
function Snippets({ q, draft, setDraft, copied, onCopied }: { q: string; draft: Snippet | null; setDraft: (d: Snippet | null) => void; copied: string | null; onCopied: (id: string) => void }) {
  const snippets = useNook((s) => s.snippets);
  const list = snippets.filter((s) => !q || [s.name, s.text, s.trigger].some((x) => x && fold(x).includes(q)));
  if (!snippets.length && !draft)
    return (
      <EmptyState
        title={tt("Parçacık yok")}
        hint={tt("Adres, IBAN, imza gibi sık yazdıklarını kaydet. Aramada /adres yazıp Enter'a basınca kopyalanır")}
        color={ACCENT.purple}
        action={{ label: tt("Yeni parçacık"), onClick: () => setDraft({ id: "", name: "", text: "" }) }}
      />
    );
  return (
    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
      {draft && !draft.id && <SnippetForm draft={draft} onDone={() => setDraft(null)} />}
      {!list.length && !draft && <p className="pt-6 text-center text-[11px] text-label-3">{tt("Eşleşen parçacık yok")}</p>}
      {list.map((s) =>
        draft?.id === s.id ? (
          <SnippetForm key={s.id} draft={draft} onDone={() => setDraft(null)} />
        ) : (
          <div key={s.id} className="group relative flex items-center rounded-row border border-white/[0.06] bg-white/[0.035]" style={copied === s.id ? { background: tintBg(ACCENT.green, 10), borderColor: tintBg(ACCENT.green, 45) } : undefined}>
            <button
              onClick={() => {
                void copyText(s.text);
                onCopied(s.id);
              }}
              title={tt("{0}\n— tıkla: kopyala", s.text)}
              className="min-w-0 flex-1 rounded-row px-2.5 py-1.5 text-left hover:bg-white/[0.03]"
            >
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[12px] font-semibold text-label">{s.name}</span>
                {s.trigger && (
                  <span className="shrink-0 rounded-badge px-1.5 py-[1px] font-mono text-[10px] font-semibold" style={{ background: tintBg(ACCENT.purple, 20), color: tintText(ACCENT.purple) }}>
                    {s.trigger}
                  </span>
                )}
                {copied === s.id && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[10.5px] font-semibold" style={{ color: tintText(ACCENT.green) }}>
                    <Check size={10} strokeWidth={3} />
                    {tt("Kopyalandı")}
                  </span>
                )}
              </span>
              <span className="block truncate text-[11px] text-label-2">{s.text.replace(/\s+/g, " ")}</span>
            </button>
            <div className="mr-1 flex shrink-0 items-center opacity-50 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <RowAction label={tt("Düzenle")} onClick={() => setDraft(s)}>
                <Pencil size={10.5} strokeWidth={2.4} />
              </RowAction>
              <RowAction
                label={tt("Sil")}
                onClick={() => removeWithUndo(() => useNook.getState().snippets, (snippets) => useNook.setState({ snippets }), (x) => x.id === s.id, tt("{0} parçacığı silindi", s.name), ACCENT.purple)}
              >
                <X size={11} strokeWidth={2.6} />
              </RowAction>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

/** Parçacık formu: ad, isteğe bağlı tetikleyici ("/adres") ve metin */
function SnippetForm({ draft, onDone }: { draft: Snippet; onDone: () => void }) {
  const [name, setName] = useState(draft.name);
  const [trigger, setTrigger] = useState(draft.trigger ?? "");
  const [text, setText] = useState(draft.text);
  const save = () => {
    if (!text.trim()) return;
    const t = trigger.trim().replace(/\s+/g, "");
    const item: Snippet = { id: draft.id || crypto.randomUUID(), name: name.trim() || text.trim().split("\n")[0].slice(0, 24), text, trigger: t ? (t.startsWith("/") ? t : `/${t}`) : undefined };
    useNook.setState((s) => ({ snippets: draft.id ? s.snippets.map((x) => (x.id === draft.id ? item : x)) : [item, ...s.snippets] }));
    onDone();
  };
  const field = "h-6 min-w-0 rounded-badge bg-black/30 px-2 text-[11.5px] text-label outline-none placeholder:text-label-3";
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onDone();
    if (e.key === "Enter" && (e.ctrlKey || e.currentTarget.tagName === "INPUT")) save();
  };
  return (
    <div className="space-y-1 rounded-row bg-well-hi p-1.5">
      <div className="flex gap-1">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={keys} maxLength={24} placeholder={tt("Ad (ör. Ev adresi)")} aria-label={tt("Parçacığın adı")} spellCheck={false} className={`${field} flex-1`} />
        <input value={trigger} onChange={(e) => setTrigger(e.target.value)} onKeyDown={keys} maxLength={16} placeholder={tt("/adres (isteğe bağlı)")} aria-label={tt("Tetikleyici sözcük")} spellCheck={false} className={`${field} w-[132px] font-mono`} />
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={keys} rows={3} placeholder={tt("Kopyalanacak metin")} aria-label={tt("Kopyalanacak metin")} spellCheck={false} className="w-full resize-none rounded-badge bg-black/30 p-2 text-[11.5px] leading-relaxed text-label outline-none placeholder:text-label-3" />
      <div className="flex justify-end gap-1">
        <TextButton onClick={onDone}>{tt("İptal")}</TextButton>
        <TextButton onClick={save} disabled={!text.trim()}>
          {tt("Kaydet")}
        </TextButton>
      </div>
    </div>
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
