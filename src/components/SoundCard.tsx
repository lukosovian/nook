/**
 * "sound-card" penceresinin içeriği: adanın solunda (yer yoksa sağında), ada gibi ekrana yapışık
 * siyah çentik. Üstte çıkış cihazı, ana ses kaydırıcısı ve mikrofon; altında uygulama bazlı ses.
 * Görünürken 2 sn'de bir tazelenir. Tıklanabilir alanı Rust'a kendisi bildirir.
 * Büyük adada aynı içerik (SoundBody) Nook'un altında durur.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Headphones, Mic, MicOff, Speaker, Volume1, Volume2, VolumeX } from "lucide-react";
import { emit, listen } from "@tauri-apps/api/event";
import { mixerList, mixerSet, quickOutput, quickSet, quickState, quickVolume, setHitRect, type AppVolume, type QuickState } from "../lib/bridge";
import { SOUND_SIZE, type SoundCardData } from "../lib/soundCard";
import { ACCENT, tintBg, tintText } from "./ui/primitives";
import { AppIcon, arrangeApps, shortName } from "./panels/ControlPanel";
import { useNook } from "../store/nook";
import { tt } from "../lib/i18n";

const COLOR = ACCENT.pink;
const NONE: string[] = [];
const PAD = 6;

export function SoundCard({ initial = null }: { initial?: SoundCardData | null }) {
  const [data, setData] = useState<SoundCardData | null>(initial);
  useEffect(() => {
    if (initial) return;
    const off = listen<SoundCardData>("nook://sound-card", (e) => setData(e.payload));
    const offSide = listen<boolean>("nook://sound-side", (e) => setData((d) => (d ? { ...d, right: e.payload } : d)));
    void off.then(() => emit("nook://sound-card-ready"));
    return () => {
      void off.then((f) => f());
      void offSide.then((f) => f());
    };
  }, [initial]);

  // Bu pencerede sağ tık menüsü yok
  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", block);
    return () => window.removeEventListener("contextmenu", block);
  }, []);

  // Görünürken kartın kutusu tıklanabilir; gizliyken pencere tamamen tıklama-geçirgen
  const visible = !!data?.visible;
  const right = !!data?.right;
  useEffect(() => {
    void setHitRect(
      visible ? { x: right ? PAD : window.innerWidth - PAD - SOUND_SIZE.width, y: 0, width: SOUND_SIZE.width, height: SOUND_SIZE.height } : { x: 0, y: 0, width: 0, height: 0 },
    ).catch(() => {});
  }, [visible, right]);

  // Adaya bakan yandan açılır
  const dx = right ? -18 : 18;
  return (
    <div className={`pointer-events-none fixed top-0 ${right ? "left-0 pl-1.5" : "right-0 pr-1.5"}`}>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="card"
            className={`pointer-events-auto flex flex-col overflow-hidden bg-black p-3 ${data?.detached ? "rounded-[28px]" : "rounded-b-[28px]"}`}
            style={{ width: SOUND_SIZE.width, height: SOUND_SIZE.height, originX: right ? 0 : 1, originY: 0, boxShadow: "0 18px 40px -16px rgba(0,0,0,0.9)" }}
            initial={{ opacity: 0, x: dx, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: dx * 0.8, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <SoundBody />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Ses kartının içeriği: çıkış seçimi, ana ses, mikrofon, uygulamalar (yüzdeleriyle) */
export function SoundBody() {
  const [state, setState] = useState<QuickState | null>(null);
  const [apps, setApps] = useState<AppVolume[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kaydırırken tazeleme değeri geri itmesin
  const dragging = useRef<string | null>(null);
  const refresh = useCallback(() => {
    if (dragging.current === "master") return;
    void quickState().then((s) => s && setState(s));
    void mixerList().then((l) =>
      setApps((prev) => (dragging.current && prev ? l.map((a) => (a.key === dragging.current ? (prev.find((p) => p.key === a.key) ?? a) : a)) : l)),
    );
  }, []);
  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 2000);
    return () => window.clearInterval(t);
  }, [refresh]);
  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(null), 4000);
    return () => window.clearTimeout(t);
  }, [error]);

  const vol = state?.volume ?? null;
  const muted = !!state?.muted;
  const outputs = state?.outputs ?? [];
  const current = outputs.find((o) => o.default) ?? null;
  const pct = Math.round((muted ? 0 : (vol ?? 0)) * 100);
  const VolIcon = muted || pct === 0 ? VolumeX : pct < 50 ? Volume1 : Volume2;
  const patchApp = (key: string, p: Partial<AppVolume>) => setApps((l) => l?.map((a) => (a.key === key ? { ...a, ...p } : a)) ?? l);
  // Adadaki karıştırıcıda gizlenen/sabitlenen uygulamalar burada da öyle
  const hidden = useNook((s) => s.settings.mixerHidden) ?? NONE;
  const pinned = useNook((s) => s.settings.mixerPinned) ?? NONE;
  const list = apps ? arrangeApps(apps, hidden, pinned) : null;

  /** Seçilen çıkışa geç, Windows gerçekten geçti mi bak */
  const pick = (id: string) => {
    setPicking(false);
    setError(null);
    setState((p) => (p ? { ...p, outputs: p.outputs.map((o) => ({ ...o, default: o.id === id })) } : p));
    void quickOutput(id)
      .then(() => new Promise((r) => window.setTimeout(r, 500)))
      .then(() => quickState())
      .then((s) => {
        if (!s) return;
        setState(s);
        if (!s.outputs.find((o) => o.id === id)?.default) setError(tt("Windows çıkışı değiştirmedi"));
      })
      .catch((e) => setError(String(e)));
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[15px] font-semibold text-label">{tt("Ses")}</span>
        {current && (
          <button
            disabled={outputs.length < 2}
            onClick={() => setPicking((v) => !v)}
            title={current.name}
            className="flex min-w-0 max-w-[180px] items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] font-medium"
            style={{ background: tintBg(COLOR, 12), borderColor: tintBg(COLOR, 32), color: tintText(COLOR) }}
          >
            {current.headphone ? <Headphones size={11} strokeWidth={2.4} className="shrink-0" /> : <Speaker size={11} strokeWidth={2.4} className="shrink-0" />}
            <span className="truncate">{shortName(current.name)}</span>
            {outputs.length > 1 && <ChevronDown size={10} strokeWidth={2.6} className={`shrink-0 transition-transform ${picking ? "rotate-180" : ""}`} />}
          </button>
        )}
      </div>

      {/* Çıkış listesi: hangisine geçileceği görünsün (sırayla dolaşmak boş çıkışa düşürebiliyordu) */}
      <AnimatePresence>
        {picking && (
          <motion.div
            className="absolute inset-x-0 top-8 z-20 space-y-0.5 rounded-[14px] border border-white/10 bg-[#161618] p-1 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.9)]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            {outputs.map((o) => (
              <button
                key={o.id}
                onClick={() => (o.default ? setPicking(false) : pick(o.id))}
                title={o.name}
                className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-[11px] hover:bg-white/[0.07]"
                style={{ color: o.default ? tintText(COLOR) : "var(--color-label)" }}
              >
                {o.headphone ? <Headphones size={12} strokeWidth={2.4} className="shrink-0" /> : <Speaker size={12} strokeWidth={2.4} className="shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.default && <Check size={12} strokeWidth={2.8} className="shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ana ses */}
      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={() => {
            setState((p) => (p ? { ...p, muted: !muted } : p));
            void quickSet("mute", !muted).finally(refresh);
          }}
          title={muted ? tt("Sesi aç") : tt("Sessize al")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
          style={muted ? { background: tintBg(ACCENT.red, 14), borderColor: tintBg(ACCENT.red, 36), color: tintText(ACCENT.red) } : { background: tintBg(COLOR, 16), borderColor: tintBg(COLOR, 40), color: tintText(COLOR) }}
        >
          <VolIcon size={14} strokeWidth={2.4} />
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          disabled={vol == null}
          onPointerDown={() => (dragging.current = "master")}
          onPointerUp={() => (dragging.current = null)}
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            setState((p) => (p ? { ...p, volume: v, muted: v === 0 ? p.muted : false } : p));
            void quickVolume(v);
          }}
          className="min-w-0 flex-1"
          style={{ accentColor: COLOR }}
        />
        <span className="w-7 shrink-0 text-right font-round text-[12px] font-bold tabular-nums" style={{ color: tintText(COLOR) }}>
          {pct}
        </span>
        {state?.micMuted != null && (
          <button
            onClick={() => {
              const v = !state.micMuted;
              setState((p) => (p ? { ...p, micMuted: v } : p));
              void quickSet("mic", v).finally(refresh);
            }}
            title={state.micMuted ? tt("Mikrofonu aç") : tt("Mikrofonu kapat")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
            style={state.micMuted ? { background: tintBg(ACCENT.orange, 14), borderColor: tintBg(ACCENT.orange, 36), color: tintText(ACCENT.orange) } : { background: "rgb(255 255 255 / 0.04)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-2)" }}
          >
            {state.micMuted ? <MicOff size={13} strokeWidth={2.4} /> : <Mic size={13} strokeWidth={2.4} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 truncate text-[10px] text-red/90" title={error}>{error}</p>}

      {/* Uygulamalar */}
      <p className="mb-1 mt-3 text-[10px] font-medium uppercase tracking-[0.12em] text-label-3">{tt("Uygulama sesi")}</p>
      <div className="-mr-1.5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1.5">
        {list?.length === 0 && <p className="py-3 text-center text-[11px] text-label-3">{tt("Şu an ses çıkaran bir uygulama yok")}</p>}
        {list?.map((a) => {
          const p = Math.round((a.muted ? 0 : a.volume) * 100);
          return (
            <div key={a.key} className="flex items-center gap-2 rounded-[12px] bg-white/[0.05] px-2 py-1">
              <AppIcon path={a.path} />
              <span className="w-[58px] shrink-0 truncate text-[10.5px] font-medium text-label" title={a.name}>
                {a.name}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={p}
                onPointerDown={() => (dragging.current = a.key)}
                onPointerUp={() => (dragging.current = null)}
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  patchApp(a.key, { volume: v, muted: false });
                  void mixerSet(a.key, v, a.muted && v > 0 ? false : undefined);
                }}
                className="min-w-0 flex-1"
                style={{ accentColor: COLOR }}
              />
              <span className="w-[22px] shrink-0 text-right text-[10px] font-semibold tabular-nums" style={{ color: a.muted ? "var(--color-label-3)" : tintText(COLOR) }}>
                {p}
              </span>
              <button
                onClick={() => {
                  patchApp(a.key, { muted: !a.muted });
                  void mixerSet(a.key, undefined, !a.muted);
                }}
                title={a.muted ? tt("Sesi aç") : tt("Sessize al")}
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full hover:bg-white/10"
                style={{ color: a.muted ? tintText(ACCENT.red) : "var(--color-label-2)" }}
              >
                {a.muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
