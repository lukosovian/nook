import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand, Keyboard, Lock, MousePointer2, X } from "lucide-react";
import { rcFrame, rcInput, type Pairing, type RcEvent, type Status } from "../lib/pc";
import { native } from "../lib/native";
import { errText } from "../ui";

type Mode = "pad" | "touch";
type Mod = "ctrl" | "alt" | "shift";

const MODE_KEY = "nook.rc.mode";
/** Yazı kutusunda hep duran iki boşluk: kutu boşken de silme tuşu bir değişiklik üretsin */
const SENTINEL = "  ";
const TAP_MS = 260;
const LONG_MS = 550;
const SLOP = 8;

interface View {
  s: number;
  tx: number;
  ty: number;
}

interface Box {
  w: number;
  h: number;
}

interface Pt {
  x: number;
  y: number;
}

/** Görüntünün yüzeydeki yeri: ölçek 1'de ortalanmış "sığdır", sonra yakınlaştırma ve kaydırma */
function layout(box: Box, img: Box, v: View) {
  const fit = Math.min(box.w / img.w, box.h / img.h) || 1;
  const w = img.w * fit * v.s;
  const h = img.h * fit * v.s;
  return { left: (box.w - w) / 2 + v.tx, top: (box.h - h) / 2 + v.ty, w, h };
}

/** Görüntü yüzeyden büyükse kenarları boşta kalmasın, küçükse ortada dursun */
function clampView(box: Box, img: Box, v: View): View {
  const s = Math.min(6, Math.max(1, v.s));
  const fit = Math.min(box.w / img.w, box.h / img.h) || 1;
  const w = img.w * fit * s;
  const h = img.h * fit * s;
  const mx = Math.max(0, (w - box.w) / 2);
  const my = Math.max(0, (h - box.h) / 2);
  return { s, tx: Math.min(mx, Math.max(-mx, v.tx)), ty: Math.min(my, Math.max(-my, v.ty)) };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Uzaktan kontrol: PC'nin ekranı canlı gelir, dokunuşlar fare ve klavyeye dönüşür.
 * Fare kipi (dokunmatik yüzey gibi): kaydır = imleci taşı, dokun = tıkla, iki kez dokunup sürükle = sürükle,
 * iki parmak = kaydırma, iki parmakla dokun ya da basılı tut = sağ tık, iki parmağı aç/kapa = yakınlaştır.
 * Dokunma kipi: dokunduğun yere tıklar, sürükleyince sürükler; yakınlaşmışken iki parmak görüntüyü gezdirir.
 */
export function RemoteView({ pairing, status, onClose }: { pairing: Pairing; status: Status | null; onClose: () => void }) {
  // Geri tuşu yalnızca bu ekranı kapatsın (alttaki Bilgisayar ekranı da geri dinliyor)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    history.pushState({ nook: "rc" }, "");
    const onPop = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      closeRef.current();
    };
    window.addEventListener("popstate", onPop, { capture: true, once: true });
    return () => window.removeEventListener("popstate", onPop, { capture: true });
  }, []);
  const monitors = status?.monitors ?? [];
  const [mon, setMon] = useState(() => Math.max(0, monitors.findIndex((m) => m.primary)));
  const [mode, setModeState] = useState<Mode>(() => {
    try {
      return localStorage.getItem(MODE_KEY) === "touch" ? "touch" : "pad";
    } catch {
      return "pad";
    }
  });
  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* yalnızca kolaylık */
    }
  };
  const [img, setImg] = useState<Box | null>(null);
  const [box, setBox] = useState<Box>({ w: window.innerWidth, h: window.innerHeight });
  const [view, setView] = useState<View>({ s: 1, tx: 0, ty: 0 });
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keys, setKeys] = useState(false);
  const [mods, setMods] = useState<Set<Mod>>(new Set());
  const [bar, setBar] = useState(true);

  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const prevText = useRef(SENTINEL);
  // Hareket işleyicileri en son değerleri okusun (her dokunuşta yeniden kurulmasın)
  const st = useRef({ box, img, view, cursor, mode, mods, mon, keys });
  st.current = { box, img, view, cursor, mode, mods, mon, keys };
  /** Kullanıcı imleci son ne zaman oynattı: o sırada PC'den gelen imleç konumu yerelin üstüne yazılmasın */
  const touchedAt = useRef(0);

  useEffect(() => {
    native?.remoteMode?.(true);
    return () => native?.remoteMode?.(false);
  }, []);

  useLayoutEffect(() => {
    const el = surface.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Yakınlaştıkça daha keskin kare iste
  const want = (() => {
    const px = box.w * Math.min(2, window.devicePixelRatio || 1) * view.s;
    return px > 2000 ? 2560 : px > 1400 ? 1920 : 1280;
  })();

  // ---------------------------------------------------------------- Kareler
  useEffect(() => {
    let alive = true;
    let hash = "";
    void (async () => {
      while (alive) {
        try {
          const f = await rcFrame(pairing, mon, want, want > 1280 ? 62 : 55, hash);
          if (!alive) break;
          hash = f.hash;
          if (f.blob) {
            const bmp = await createImageBitmap(f.blob);
            const c = canvas.current;
            if (c && alive) {
              if (c.width !== bmp.width || c.height !== bmp.height) {
                c.width = bmp.width;
                c.height = bmp.height;
                setImg({ w: bmp.width, h: bmp.height });
              }
              c.getContext("2d")?.drawImage(bmp, 0, 0);
            }
            bmp.close();
          }
          setLocked(f.locked);
          if (f.cursor && Date.now() - touchedAt.current > 700) setCursor({ x: f.cursor[0], y: f.cursor[1] });
          setError(null);
        } catch (e) {
          if (!alive) break;
          setError(errText(e));
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [pairing, mon, want]);

  // ---------------------------------------------------------------- Girdi kuyruğu
  // Bir istek yoldayken gelen fare hareketleri birleşir: ağ yavaşsa da imleç en son konuma gider
  const queue = useRef<RcEvent[]>([]);
  const sending = useRef(false);
  const flush = useCallback(async () => {
    if (sending.current || !queue.current.length) return;
    sending.current = true;
    const batch = queue.current.splice(0);
    try {
      await rcInput(pairing, st.current.mon, batch);
    } catch (e) {
      setError(errText(e));
    }
    sending.current = false;
    if (queue.current.length) void flush();
  }, [pairing]);
  const push = useCallback(
    (...evs: RcEvent[]) => {
      const q = queue.current;
      for (const ev of evs) {
        const last = q[q.length - 1];
        if (ev.t === "move" && last?.t === "move") q[q.length - 1] = ev;
        else if (ev.t === "wheel" && last?.t === "wheel") q[q.length - 1] = { t: "wheel", dy: (last.dy ?? 0) + (ev.dy ?? 0), dx: (last.dx ?? 0) + (ev.dx ?? 0) };
        else q.push(ev);
      }
      void flush();
    },
    [flush],
  );

  // ---------------------------------------------------------------- Yardımcılar
  const rectNow = () => {
    const { box, img, view } = st.current;
    return img ? layout(box, img, view) : null;
  };
  const toNorm = (p: Pt): Pt | null => {
    const r = rectNow();
    if (!r) return null;
    return { x: Math.min(1, Math.max(0, (p.x - r.left) / r.w)), y: Math.min(1, Math.max(0, (p.y - r.top) / r.h)) };
  };
  const moveCursor = (n: Pt) => {
    touchedAt.current = Date.now();
    st.current.cursor = n;
    setCursor(n);
    push({ t: "move", x: n.x, y: n.y });
  };
  const click = (b: "l" | "r") => push({ t: "down", b }, { t: "up", b });
  /** Fare kipinde yakınlaşmışken imleç görüntünün kenarına yaklaşınca görüntü onu izler */
  const follow = (n: Pt) => {
    const { box, img, view } = st.current;
    if (!img || view.s <= 1.01) return;
    const r = layout(box, img, view);
    const px = r.left + n.x * r.w;
    const py = r.top + n.y * r.h;
    const m = 0.18;
    let { tx, ty } = view;
    if (px < box.w * m) tx += box.w * m - px;
    if (px > box.w * (1 - m)) tx -= px - box.w * (1 - m);
    if (py < box.h * m) ty += box.h * m - py;
    if (py > box.h * (1 - m)) ty -= py - box.h * (1 - m);
    if (tx !== view.tx || ty !== view.ty) setView(clampView(box, img, { ...view, tx, ty }));
  };

  // ---------------------------------------------------------------- Dokunuşlar
  const g = useRef({
    pts: new Map<number, Pt>(),
    start: new Map<number, Pt>(),
    downAt: 0,
    maxPts: 0,
    moved: false,
    kind: null as null | "one" | "pinch" | "scroll" | "pan",
    long: 0 as number,
    longDone: false,
    lastTapAt: 0,
    dragging: false,
    pinch0: { d: 1, s: 1, c: { x: 0, y: 0 }, tx: 0, ty: 0 },
    last: { x: 0, y: 0 },
    scrollAcc: { x: 0, y: 0 },
  });

  const pos = (e: React.PointerEvent): Pt => {
    const r = surface.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    // Yüzeye dokunmak yazı kutusunun odağını almasın: klavye açıksa açık kalır
    e.preventDefault();
    // Klavye kapalıyken yazı kutusunda odak kalmasın: kalırsa Android her dokunuşta klavyeyi yeniden açıyor
    if (!st.current.keys && document.activeElement === text.current) text.current?.blur();
    surface.current?.setPointerCapture(e.pointerId);
    const s = g.current;
    const p = pos(e);
    s.pts.set(e.pointerId, p);
    s.start.set(e.pointerId, p);
    s.maxPts = Math.max(s.maxPts, s.pts.size);
    if (s.pts.size === 1) {
      s.downAt = Date.now();
      s.moved = false;
      s.kind = "one";
      s.longDone = false;
      s.last = p;
      // Fare kipinde: az önce dokunulduysa bu dokunuş sürükleme başlatır
      s.dragging = false;
      const armed = st.current.mode === "pad" && Date.now() - s.lastTapAt < 320;
      window.clearTimeout(s.long);
      s.long = window.setTimeout(() => {
        if (s.pts.size !== 1 || s.moved || s.dragging) return;
        s.longDone = true;
        if (st.current.mode === "touch") {
          const n = toNorm(p);
          if (n) moveCursor(n);
        }
        click("r");
        navigator.vibrate?.(15);
      }, LONG_MS);
      if (armed) {
        s.dragging = true;
        s.lastTapAt = 0;
        push({ t: "down", b: "l" });
      }
    } else if (s.pts.size === 2) {
      window.clearTimeout(s.long);
      // Tek parmakla sürüklerken ikinci parmak gelirse sürükleme bırakılır
      if (s.dragging) {
        s.dragging = false;
        push({ t: "up", b: "l" });
      }
      const [a, b] = [...s.pts.values()];
      const { view } = st.current;
      s.kind = null;
      s.pinch0 = { d: dist(a, b), s: view.s, c: mid(a, b), tx: view.tx, ty: view.ty };
      s.scrollAcc = { x: 0, y: 0 };
      s.last = mid(a, b);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s.pts.has(e.pointerId)) return;
    const p = pos(e);
    s.pts.set(e.pointerId, p);
    const { mode, box, img } = st.current;
    if (s.pts.size === 1 && s.kind === "one") {
      const st0 = s.start.get(e.pointerId)!;
      if (!s.moved && dist(st0, p) < SLOP) return;
      if (!s.moved) {
        s.moved = true;
        window.clearTimeout(s.long);
        if (mode === "touch" && !s.longDone) {
          // Dokunma kipi: parmağın altından sürükle
          const n = toNorm(st0);
          if (n) moveCursor(n);
          s.dragging = true;
          push({ t: "down", b: "l" });
        }
      }
      if (s.longDone) return;
      const r = rectNow();
      if (!r) return;
      if (mode === "touch") {
        const n = toNorm(p);
        if (n) moveCursor(n);
      } else {
        // Dokunmatik yüzey: hızlı kaydırınca imleç daha çok yol alır
        const dx = p.x - s.last.x;
        const dy = p.y - s.last.y;
        const speed = Math.hypot(dx, dy);
        const gain = 1.1 + Math.min(1.6, speed / 18);
        const c = st.current.cursor ?? { x: 0.5, y: 0.5 };
        const n = { x: Math.min(1, Math.max(0, c.x + (dx * gain) / r.w)), y: Math.min(1, Math.max(0, c.y + (dy * gain) / r.h)) };
        moveCursor(n);
        follow(n);
      }
      s.last = p;
      return;
    }
    if (s.pts.size === 2 && img) {
      const [a, b] = [...s.pts.values()];
      const c = mid(a, b);
      const d = dist(a, b);
      if (!s.kind) {
        const pinched = Math.abs(d / s.pinch0.d - 1) > 0.12;
        const travelled = dist(c, s.pinch0.c) > SLOP * 1.5;
        if (pinched) s.kind = "pinch";
        else if (travelled) s.kind = mode === "touch" && st.current.view.s > 1.01 ? "pan" : "scroll";
        else return;
      }
      s.moved = true;
      if (s.kind === "pinch") {
        const s1 = Math.min(6, Math.max(1, s.pinch0.s * (d / s.pinch0.d)));
        // Parmakların ortasındaki nokta yerinde kalsın, ortası kayınca görüntü de kaysın
        const k = s1 / s.pinch0.s;
        const cx = s.pinch0.c.x - box.w / 2;
        const cy = s.pinch0.c.y - box.h / 2;
        const tx = cx - (cx - s.pinch0.tx) * k + (c.x - s.pinch0.c.x);
        const ty = cy - (cy - s.pinch0.ty) * k + (c.y - s.pinch0.c.y);
        setView(clampView(box, img, { s: s1, tx, ty }));
      } else if (s.kind === "pan") {
        setView(clampView(box, img, { s: st.current.view.s, tx: s.pinch0.tx + (c.x - s.pinch0.c.x), ty: s.pinch0.ty + (c.y - s.pinch0.c.y) }));
      } else {
        // Parmaklar yukarı → sayfa aşağı (telefondaki gibi)
        s.scrollAcc.y += (s.last.y - c.y) / 34;
        s.scrollAcc.x += (c.x - s.last.x) / 34;
        const dy = Math.trunc(s.scrollAcc.y * 4) / 4;
        const dx = Math.trunc(s.scrollAcc.x * 4) / 4;
        if (dy || dx) {
          s.scrollAcc.y -= dy;
          s.scrollAcc.x -= dx;
          push({ t: "wheel", dy, dx });
        }
      }
      s.last = c;
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s.pts.has(e.pointerId)) return;
    s.pts.delete(e.pointerId);
    if (s.pts.size > 0) return;
    window.clearTimeout(s.long);
    const quick = Date.now() - s.downAt < TAP_MS;
    if (s.dragging) {
      s.dragging = false;
      push({ t: "up", b: "l" });
    } else if (!s.moved && !s.longDone && quick) {
      if (s.maxPts >= 2) click("r");
      else {
        if (st.current.mode === "touch") {
          const n = toNorm(s.start.get(e.pointerId) ?? s.last);
          if (n) moveCursor(n);
        }
        click("l");
        s.lastTapAt = Date.now();
      }
    }
    s.maxPts = 0;
    s.kind = null;
    s.start.clear();
  };

  // ---------------------------------------------------------------- Klavye
  const toggleMod = (m: Mod) =>
    setMods((cur) => {
      const n = new Set(cur);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });
  const key = (k: string) => {
    push({ t: "key", k, mods: [...st.current.mods] });
    setMods(new Set());
  };
  const onText = (v: string) => {
    const prev = prevText.current;
    let i = 0;
    while (i < prev.length && i < v.length && prev[i] === v[i]) i++;
    const del = prev.length - i;
    const add = v.slice(i);
    for (let n = 0; n < del; n++) push({ t: "key", k: "backspace" });
    if (add) {
      const m = [...st.current.mods];
      // Ctrl/Alt/Win basılıyken yazılan harf kısayol olur (Ctrl+C gibi)
      if (m.some((x) => x !== "shift") && add.length === 1 && /[a-z0-9]/i.test(add)) {
        push({ t: "key", k: add.toLowerCase(), mods: m });
        setMods(new Set());
      } else push({ t: "text", s: add });
    }
    prevText.current = v;
    if (v.length < SENTINEL.length || v.length > 400) {
      prevText.current = SENTINEL;
      if (text.current) text.current.value = SENTINEL;
    }
  };
  const openKeys = () => {
    setKeys((k) => {
      const next = !k;
      if (next)
        setTimeout(() => {
          const t = text.current;
          if (!t) return;
          t.value = SENTINEL;
          prevText.current = SENTINEL;
          t.focus();
          t.setSelectionRange(SENTINEL.length, SENTINEL.length);
        }, 0);
      else text.current?.blur();
      return next;
    });
  };

  // Klavye telefonun geri tuşuyla / aşağı kaydırılarak kapatıldı: yazı kutusu da bıraksın, düğme de sönsün
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let full = vv.height;
    let width = vv.width;
    let shrunk = false;
    const onResize = () => {
      // Ekran döndü: yeni tam boy bu
      if (Math.abs(vv.width - width) > 40) {
        width = vv.width;
        full = vv.height;
        shrunk = false;
        return;
      }
      if (vv.height < full * 0.85) shrunk = true;
      else {
        if (shrunk && st.current.keys) {
          text.current?.blur();
          setKeys(false);
        }
        shrunk = false;
        full = Math.max(full, vv.height);
      }
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // ---------------------------------------------------------------- Görünüm
  const r = img ? layout(box, img, view) : null;
  const shownCursor = cursor && r ? { x: r.left + cursor.x * r.w, y: r.top + cursor.y * r.h } : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-black">
      <div
        ref={surface}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvas}
          className="absolute"
          style={r ? { left: r.left, top: r.top, width: r.w, height: r.h, imageRendering: view.s > 2 ? "pixelated" : "auto" } : { display: "none" }}
        />
        {shownCursor && (
          <MousePointer2
            size={20}
            className="pointer-events-none absolute fill-white text-black drop-shadow"
            style={{ left: shownCursor.x - 3, top: shownCursor.y - 2 }}
            strokeWidth={1.6}
          />
        )}
        {!img && (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] text-label-2">{error ?? "PC'nin ekranı geliyor…"}</p>
        )}
        {img && locked && (
          <div className="pointer-events-none absolute inset-x-0 top-14 mx-auto flex w-fit items-center gap-2 rounded-full bg-black/75 px-4 py-2 text-[13px] text-label-2">
            <Lock size={15} /> PC kilitli: kilit ekranı telefondan açılamaz
          </div>
        )}
        {img && error && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[90%] rounded-full bg-black/75 px-4 py-2 text-center text-[12.5px] text-label-2">{error}</div>
        )}
      </div>

      {/* Üstte küçük araç çubuğu; boş yere dokununca gizlenmez, ok tuşuyla katlanır */}
      <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#1c1c1f]/90 p-1 shadow-lg backdrop-blur">
          {bar ? (
            <>
              <BarButton label="Kapat" onClick={() => history.back()}>
                <X size={18} />
              </BarButton>
              {monitors.length > 1 &&
                monitors.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setMon(i);
                      setImg(null);
                      setView({ s: 1, tx: 0, ty: 0 });
                    }}
                    className={`h-9 rounded-full px-3 text-[12.5px] font-semibold ${mon === i ? "bg-blue text-white" : "text-label-2"}`}
                  >
                    {m.primary ? `Ekran ${i + 1}` : `${i + 1}`}
                  </button>
                ))}
              <BarButton label={mode === "pad" ? "Fare kipi" : "Dokunma kipi"} active onClick={() => setMode(mode === "pad" ? "touch" : "pad")}>
                {mode === "pad" ? <MousePointer2 size={17} /> : <Hand size={17} />}
                <span className="pr-1 text-[12px] font-semibold">{mode === "pad" ? "Fare" : "Dokun"}</span>
              </BarButton>
              <BarButton label="Klavye" active={keys} onClick={openKeys}>
                <Keyboard size={18} />
              </BarButton>
              <BarButton label="Gizle" onClick={() => setBar(false)}>
                <ArrowUp size={16} />
              </BarButton>
            </>
          ) : (
            <BarButton label="Araçları göster" onClick={() => setBar(true)}>
              <ArrowDown size={16} />
            </BarButton>
          )}
        </div>
      </div>

      {keys && (
        <div className="flex shrink-0 gap-1 overflow-x-auto bg-[#141416] px-2 py-1.5">
          {(["ctrl", "alt", "shift"] as Mod[]).map((m) => (
            <KeyCap key={m} active={mods.has(m)} onClick={() => toggleMod(m)}>
              {m === "ctrl" ? "Ctrl" : m === "alt" ? "Alt" : "Shift"}
            </KeyCap>
          ))}
          <KeyCap onClick={() => key("win")}>Win</KeyCap>
          <KeyCap onClick={() => key("esc")}>Esc</KeyCap>
          <KeyCap onClick={() => key("tab")}>Tab</KeyCap>
          <KeyCap onClick={() => key("delete")}>Del</KeyCap>
          <KeyCap onClick={() => key("left")}>
            <ArrowLeft size={15} />
          </KeyCap>
          <KeyCap onClick={() => key("up")}>
            <ArrowUp size={15} />
          </KeyCap>
          <KeyCap onClick={() => key("down")}>
            <ArrowDown size={15} />
          </KeyCap>
          <KeyCap onClick={() => key("right")}>
            <ArrowRight size={15} />
          </KeyCap>
          <KeyCap onClick={() => key("home")}>Home</KeyCap>
          <KeyCap onClick={() => key("end")}>End</KeyCap>
          {[1, 2, 3, 4, 5, 11, 12].map((n) => (
            <KeyCap key={n} onClick={() => key(`f${n}`)}>
              F{n}
            </KeyCap>
          ))}
        </div>
      )}
      {/* Görünmez yazı kutusu: telefon klavyesi buna yazar, fark PC'ye gönderilir */}
      <textarea
        ref={text}
        defaultValue={SENTINEL}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onInput={(e) => onText(e.currentTarget.value)}
        onBlur={() => setKeys(false)}
        className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
      />
    </motion.div>
  );
}

function BarButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} onClick={onClick} className={`flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-2 ${active ? "text-label" : "text-label-2"}`}>
      {children}
    </button>
  );
}

function KeyCap({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      // Klavye açık kalsın: dokununca yazı kutusu odağı kaybetmesin
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-9 min-w-11 shrink-0 items-center justify-center rounded-xl px-2.5 text-[13px] font-semibold ${active ? "bg-blue text-white" : "bg-card text-label"}`}
    >
      {children}
    </button>
  );
}
