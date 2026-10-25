/**
 * Nook Kullanıcı Geribildirim Bölümü (Studio › Ayarlar › Hakkında içinde).
 * - Kullanıcıların Hata Bildirimi veya Özellik İsteği / Öneri yazıp GitHub'a göndermesini sağlar.
 * - Sürüm ve son hata kayıtları otomatik olarak eklenir.
 * - lukosovian/nook deposundaki açık/çözülmüş bildirimleri ve yanıtları uygulama içinde canlı listeler.
 */
import { useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  PlusCircle,
  RotateCw,
  Search,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import {
  buildDiagnostics,
  openNewIssue,
  refreshIssues,
  useFeedback,
  type FeedbackIssue,
  type FeedbackKind,
} from "../../lib/feedback";
import { copyText, openPath } from "../../lib/bridge";
import { REPO_URL } from "../../lib/supporters";
import { ACCENT, tintBg, tintText } from "../ui/primitives";
import { SettingsLook } from "./SettingsPanel";
import { isTurkish, tt } from "../../lib/i18n";

export function FeedbackSection() {
  const look = useContext(SettingsLook);
  const studio = look === "studio";

  const [tab, setTab] = useState<"write" | "list">("write");
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [includeDiag, setIncludeDiag] = useState(true);
  const [diagPreview, setDiagPreview] = useState(false);
  const [diagText, setDiagText] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const issues = useFeedback((s) => s.issues);
  const loading = useFeedback((s) => s.loading);
  const filterState = useFeedback((s) => s.filterState);
  const filterKind = useFeedback((s) => s.filterKind);
  const searchQuery = useFeedback((s) => s.searchQuery);
  const setFilterState = useFeedback((s) => s.setFilterState);
  const setFilterKind = useFeedback((s) => s.setFilterKind);
  const setSearchQuery = useFeedback((s) => s.setSearchQuery);

  // Sayfa açıldığında issue'ları arka planda tazele
  useEffect(() => {
    void refreshIssues();
  }, []);

  // Tanılama metnini hazırla
  useEffect(() => {
    if (includeDiag && diagPreview) {
      void buildDiagnostics(kind === "bug").then(setDiagText);
    }
  }, [includeDiag, diagPreview, kind]);

  const handleCopy = async () => {
    const diag = includeDiag ? await buildDiagnostics(kind === "bug") : "";
    const prefix = kind === "bug" ? "[Hata]" : "[Öneri]";
    const text = [
      `${prefix} ${title.trim()}`,
      "",
      description.trim() ? `### Açıklama\n${description.trim()}` : "",
      kind === "bug" && steps.trim() ? `### Tekrarlama Adımları\n${steps.trim()}` : "",
      diag,
    ]
      .filter(Boolean)
      .join("\n\n");

    await copyText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!title.trim()) return;
    setSending(true);
    try {
      await openNewIssue({
        kind,
        title,
        description,
        stepsToReproduce: steps,
        includeDiag,
      });
      // Gönderimden sonra temizle ve liste sekmesine geç
      setTitle("");
      setDescription("");
      setSteps("");
      setTab("list");
    } finally {
      setSending(false);
    }
  };

  // Liste süzme
  const filteredIssues = issues.filter((it) => {
    if (filterState === "open" && it.state !== "open") return false;
    if (filterState === "closed" && it.state !== "closed") return false;
    if (filterKind !== "all" && it.kind !== filterKind) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        it.title.toLowerCase().includes(q) ||
        it.body.toLowerCase().includes(q) ||
        it.author.toLowerCase().includes(q) ||
        String(it.number).includes(q);
      if (!match) return false;
    }
    return true;
  });

  const openCount = issues.filter((i) => i.state === "open").length;
  const closedCount = issues.filter((i) => i.state === "closed").length;

  return (
    <section data-sec={tt("Geribildirim")} className={studio ? "nook-card rounded-[20px] px-5 pb-5 pt-4" : ""}>
      {/* Başlık ve Sekmeler */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <h3 className="text-[14px] font-bold tracking-tight text-label flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-[8px]"
              style={{ background: tintBg(ACCENT.purple, 20), color: tintText(ACCENT.purple) }}
            >
              <MessageSquare size={13} strokeWidth={2.4} />
            </span>
            {tt("Geribildirim ve İstekler")}
          </h3>
          <p className="mt-0.5 text-[11px] text-label-3">
            {tt("Fikrini paylaş, hata bildir veya mevcut konuların durumunu takip et.")}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-well p-0.5">
          <button
            onClick={() => setTab("write")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              tab === "write" ? "bg-white/10 text-label shadow-sm" : "text-label-3 hover:text-label-2"
            }`}
          >
            <PlusCircle size={12} />
            {tt("Yeni Bildirim")}
          </button>
          <button
            onClick={() => {
              setTab("list");
              void refreshIssues();
            }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              tab === "list" ? "bg-white/10 text-label shadow-sm" : "text-label-3 hover:text-label-2"
            }`}
          >
            <Clock size={12} />
            {tt("Mevcut Bildirimler")}
            {issues.length > 0 && (
              <span
                className="ml-0.5 rounded-full px-1.5 py-[1px] text-[9.5px] font-bold tabular-nums"
                style={{ background: tintBg(ACCENT.blue, 24), color: tintText(ACCENT.blue) }}
              >
                {openCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === "write" ? (
        /* YENİ BİLDİRİM FORMU */
        <div className="mt-4 space-y-3.5">
          {/* Tür Seçimi: Hata mı Öneri mi? */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-medium text-label-2">{tt("Bildirim Türü:")}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setKind("bug")}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all"
                style={{
                  background: kind === "bug" ? tintBg(ACCENT.red, 20) : "rgba(255,255,255,0.03)",
                  borderColor: kind === "bug" ? tintBg(ACCENT.red, 45) : "rgba(255,255,255,0.08)",
                  color: kind === "bug" ? tintText(ACCENT.red) : "var(--color-label-3)",
                }}
              >
                <Bug size={12} />
                {tt("Hata Bildirimi")}
              </button>
              <button
                type="button"
                onClick={() => setKind("idea")}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all"
                style={{
                  background: kind === "idea" ? tintBg(ACCENT.purple, 20) : "rgba(255,255,255,0.03)",
                  borderColor: kind === "idea" ? tintBg(ACCENT.purple, 45) : "rgba(255,255,255,0.08)",
                  color: kind === "idea" ? tintText(ACCENT.purple) : "var(--color-label-3)",
                }}
              >
                <Lightbulb size={12} />
                {tt("Öneri / İstek")}
              </button>
            </div>
          </div>

          {/* Başlık Girişi */}
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-label-2">
              {kind === "bug" ? tt("Hata Özeti / Başlık") : tt("Öneri Başlığı")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                kind === "bug"
                  ? tt("Örn: Kısayol tuşuna basınca mikrofon durumu güncellenmiyor")
                  : tt("Örn: Spotify için şarkı sözlerini otomatik açma seçeneği")
              }
              className="w-full rounded-[12px] border border-white/[0.08] bg-well px-3 py-2 text-[12px] text-label outline-none placeholder:text-label-3 focus:border-white/25 focus:bg-well-hi"
            />
          </div>

          {/* Açıklama Girişi */}
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-label-2">{tt("Detaylı Açıklama")}</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                kind === "bug"
                  ? tt("Ne yaparken bu sorunla karşılaştın? Ne olması gerekiyordu, ne oldu?")
                  : tt("Bu özellik Nook'ta nasıl çalışmalı? Sana veya başkalarına nasıl kolaylık sağlar?")
              }
              className="w-full resize-none rounded-[12px] border border-white/[0.08] bg-well px-3 py-2 text-[12px] text-label outline-none placeholder:text-label-3 focus:border-white/25 focus:bg-well-hi"
            />
          </div>

          {/* Hata ise Tekrarlama Adımları (İsteğe Bağlı) */}
          {kind === "bug" && (
            <div>
              <label className="mb-1 block text-[11.5px] font-medium text-label-3">
                {tt("Tekrarlama Adımları (İsteğe bağlı)")}
              </label>
              <textarea
                rows={2}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder={tt("1. Nook Studio'yu aç\n2. Kısayollar sekmesine git\n3. ...")}
                className="w-full resize-none rounded-[12px] border border-white/[0.08] bg-well px-3 py-1.5 text-[11.5px] text-label outline-none placeholder:text-label-3 focus:border-white/25 focus:bg-well-hi"
              />
            </div>
          )}

          {/* Tanılama ve Günlük Seçeneği */}
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-2.5">
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={includeDiag}
                  onChange={(e) => setIncludeDiag(e.target.checked)}
                  className="rounded text-purple focus:ring-0"
                />
                <span className="text-[11.5px] text-label-2">
                  {tt("Sürüm, sistem bilgisi ve son hata kayıtlarını otomatik ekle")}
                </span>
              </label>

              {includeDiag && (
                <button
                  type="button"
                  onClick={() => setDiagPreview((v) => !v)}
                  className="flex items-center gap-1 text-[10.5px] text-label-3 hover:text-label"
                >
                  {diagPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {diagPreview ? tt("Gizle") : tt("Önizle")}
                </button>
              )}
            </div>

            {includeDiag && diagPreview && (
              <pre className="mt-2 max-h-[140px] overflow-y-auto rounded-[8px] bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-label-3">
                {diagText || tt("Yükleniyor…")}
              </pre>
            )}
          </div>

          {/* Aksiyon Düğmeleri */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex items-center gap-1.5 rounded-full bg-well px-3 py-1.5 text-[11.5px] font-medium text-label-2 hover:bg-well-hi hover:text-label transition-colors"
            >
              <Copy size={12} />
              {copied ? tt("Kopyalandı!") : tt("Metni Kopyala")}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!title.trim() || sending}
                onClick={() => void handleSend()}
                className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-bold text-white transition-all disabled:opacity-40"
                style={{
                  background:
                    kind === "bug"
                      ? `linear-gradient(135deg, ${ACCENT.red}, #c02626)`
                      : `linear-gradient(135deg, ${ACCENT.purple}, ${ACCENT.blue})`,
                  boxShadow: title.trim() ? "0 4px 14px rgba(0,0,0,0.3)" : undefined,
                }}
              >
                <Send size={13} />
                {sending ? tt("Açılıyor…") : tt("GitHub'da Gönder")}
                <ExternalLink size={11} className="opacity-70" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MEVCUT BİLDİRİMLER LİSTESİ */
        <div className="mt-4 space-y-3">
          {/* Arama & Filtre Çubuğu */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-1 min-w-[180px] items-center gap-2 rounded-[10px] border border-white/[0.08] bg-well px-2.5 py-1 text-label-3 focus-within:border-white/20">
              <Search size={12} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tt("Bildirimlerde ara…")}
                className="w-full bg-transparent text-[11.5px] text-label outline-none placeholder:text-label-3"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="hover:text-label">
                  <X size={11} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Durum filtresi */}
              <div className="flex items-center rounded-full bg-well p-0.5 text-[10.5px]">
                <button
                  onClick={() => setFilterState("all")}
                  className={`rounded-full px-2 py-0.5 font-medium transition-colors ${
                    filterState === "all" ? "bg-white/10 text-label" : "text-label-3 hover:text-label-2"
                  }`}
                >
                  {tt("Tümü")}
                </button>
                <button
                  onClick={() => setFilterState("open")}
                  className={`rounded-full px-2 py-0.5 font-medium transition-colors ${
                    filterState === "open" ? "bg-white/10 text-label" : "text-label-3 hover:text-label-2"
                  }`}
                >
                  {tt("Açık ({0})", openCount)}
                </button>
                <button
                  onClick={() => setFilterState("closed")}
                  className={`rounded-full px-2 py-0.5 font-medium transition-colors ${
                    filterState === "closed" ? "bg-white/10 text-label" : "text-label-3 hover:text-label-2"
                  }`}
                >
                  {tt("Çözüldü ({0})", closedCount)}
                </button>
              </div>

              {/* Tür filtresi */}
              <div className="flex items-center rounded-full bg-well p-0.5 text-[10.5px]">
                <button
                  onClick={() => setFilterKind("all")}
                  className={`rounded-full px-2 py-0.5 font-medium transition-colors ${
                    filterKind === "all" ? "bg-white/10 text-label" : "text-label-3 hover:text-label-2"
                  }`}
                >
                  {tt("Tümü")}
                </button>
                <button
                  onClick={() => setFilterKind("bug")}
                  className={`rounded-full px-2 py-0.5 font-medium transition-colors ${
                    filterKind === "bug" ? "bg-white/10 text-label" : "text-label-3 hover:text-label-2"
                  }`}
                >
                  {tt("Hata")}
                </button>
                <button
                  onClick={() => setFilterKind("idea")}
                  className={`rounded-full px-2 py-0.5 font-medium transition-colors ${
                    filterKind === "idea" ? "bg-white/10 text-label" : "text-label-3 hover:text-label-2"
                  }`}
                >
                  {tt("Öneri")}
                </button>
              </div>

              {/* Yenile düğmesi */}
              <button
                onClick={() => void refreshIssues(true)}
                title={tt("Yenile")}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-well text-label-3 hover:bg-well-hi hover:text-label transition-colors"
              >
                <RotateCw size={12} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Bildirim Kartları */}
          <div className="space-y-2">
            {filteredIssues.length === 0 ? (
              <div className="rounded-[14px] border border-white/[0.05] bg-white/[0.02] p-8 text-center">
                <p className="text-[12px] font-medium text-label-2">
                  {loading ? tt("GitHub'dan yükleniyor…") : tt("Eşleşen bildirim bulunamadı.")}
                </p>
                <p className="mt-1 text-[11px] text-label-3">
                  {tt("Aklında bir fikir veya karşılaştığın bir sorun varsa hemen ilk bildirimi açabilirsin!")}
                </p>
                <button
                  onClick={() => setTab("write")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-well px-3.5 py-1 text-[11px] font-semibold text-label hover:bg-well-hi"
                >
                  <PlusCircle size={12} />
                  {tt("Yeni Bildirim Yaz")}
                </button>
              </div>
            ) : (
              filteredIssues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-label-3">
            <span>{tt("lukosovian/nook GitHub deposundaki bildirimler")}</span>
            <button
              onClick={() => void openPath(`${REPO_URL}/issues`)}
              className="flex items-center gap-1 text-label-2 hover:text-label hover:underline"
            >
              <span>{tt("GitHub'da görüntüle")}</span>
              <ExternalLink size={10} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Tek bir Issue kartı ve tıklandığında açılan yorum/detay görünümü */
function IssueCard({ issue }: { issue: FeedbackIssue }) {
  const selectedNumber = useFeedback((s) => s.selectedNumber);
  const setSelectedNumber = useFeedback((s) => s.setSelectedNumber);
  const comments = useFeedback((s) => s.comments[issue.number]);
  const loadingComments = useFeedback((s) => s.loadingComments[issue.number]);

  const expanded = selectedNumber === issue.number;
  const isOpen = issue.state === "open";
  const isBug = issue.kind === "bug";

  const dateStr = new Date(issue.createdAt).toLocaleDateString(isTurkish ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
  });

  return (
    <div
      className={`rounded-[14px] border transition-all ${
        expanded
          ? "border-white/20 bg-white/[0.05] shadow-md"
          : "border-white/[0.06] bg-white/[0.025] hover:border-white/12 hover:bg-white/[0.035]"
      }`}
    >
      {/* Başlık Satırı */}
      <div
        onClick={() => setSelectedNumber(expanded ? null : issue.number)}
        className="flex cursor-pointer items-start gap-2.5 p-3 select-none"
      >
        {/* Durum İkonu */}
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{
            background: isOpen ? tintBg(ACCENT.green, 20) : tintBg(ACCENT.purple, 20),
            color: isOpen ? tintText(ACCENT.green) : tintText(ACCENT.purple),
          }}
          title={isOpen ? tt("Açık") : tt("Çözüldü / Kapatıldı")}
        >
          {isOpen ? <Clock size={11} strokeWidth={2.4} /> : <CheckCircle2 size={12} strokeWidth={2.4} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Tür Rozeti */}
            <span
              className="rounded-full px-2 py-[1px] text-[9.5px] font-bold uppercase tracking-wider"
              style={{
                background: isBug ? tintBg(ACCENT.red, 20) : tintBg(ACCENT.purple, 20),
                color: isBug ? tintText(ACCENT.red) : tintText(ACCENT.purple),
              }}
            >
              {isBug ? tt("Hata") : tt("Öneri")}
            </span>

            {/* Senin Bildirimin Rozeti */}
            {issue.isMine && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-[1px] text-[9.5px] font-bold"
                style={{ background: tintBg(ACCENT.yellow, 24), color: tintText(ACCENT.yellow) }}
              >
                <Sparkles size={9} />
                {tt("Senin bildirimin")}
              </span>
            )}

            <span className="text-[11px] font-mono text-label-3">#{issue.number}</span>
          </div>

          <p className="mt-1 text-[12.5px] font-semibold leading-snug text-label">{issue.cleanTitle}</p>

          <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-label-3">
            <span className="flex items-center gap-1">
              {issue.avatar ? (
                <img src={issue.avatar} alt={issue.author} className="h-3.5 w-3.5 rounded-full" />
              ) : (
                <User size={10} />
              )}
              <span>{issue.author}</span>
            </span>
            <span>·</span>
            <span>{dateStr}</span>
            {issue.commentsCount > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 font-medium text-label-2">
                  <MessageSquare size={10} />
                  {issue.commentsCount}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          className="ml-1 mt-1 text-label-3 hover:text-label"
          title={expanded ? tt("Küçült") : tt("Genişlet")}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Genişletilmiş Görünüm: Açıklama ve Yorumlar */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/[0.06] bg-black/25 px-3.5 py-3"
          >
            {/* Gövde Metni */}
            <div className="text-[12px] leading-relaxed text-label-2 whitespace-pre-wrap break-words max-h-[220px] overflow-y-auto pr-1">
              {issue.body || tt("Açıklama belirtilmemiş.")}
            </div>

            {/* Geliştirici Yanıtları / Yorumlar */}
            <div className="mt-3.5 border-t border-white/[0.05] pt-3">
              <h4 className="text-[11px] font-bold text-label-3 uppercase tracking-wider mb-2">
                {tt("Yorumlar ve Yanıtlar")} ({issue.commentsCount})
              </h4>

              {loadingComments ? (
                <p className="text-[11px] text-label-3">{tt("Yorumlar yükleniyor…")}</p>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-[10px] bg-white/[0.03] p-2.5 border border-white/[0.04]">
                      <div className="flex items-center justify-between text-[10.5px] text-label-3 mb-1">
                        <span className="flex items-center gap-1.5 font-semibold text-label-2">
                          {c.avatar && <img src={c.avatar} alt={c.author} className="h-3.5 w-3.5 rounded-full" />}
                          {c.author}
                        </span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11.5px] leading-relaxed text-label-2 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-label-3">{tt("Henüz bir yanıt ya da yorum yazılmamış.")}</p>
              )}
            </div>

            {/* Dış Bağlantı */}
            <div className="mt-3 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void openPath(issue.url);
                }}
                className="flex items-center gap-1.5 rounded-full bg-well px-3 py-1 text-[11px] font-semibold text-label hover:bg-well-hi transition-colors"
              >
                <span>{tt("GitHub'da Aç ve Yanıt Yaz")}</span>
                <ExternalLink size={11} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
