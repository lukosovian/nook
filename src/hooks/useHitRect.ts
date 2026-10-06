import { useEffect, type RefObject } from "react";
import { setHitRect, type Rect } from "../lib/bridge";
import { HIT_PADDING } from "../lib/layout";

/**
 * Elemanın yerleşim kutusu — CSS dönüşümleri (scale/translate) YOK sayılır.
 * getBoundingClientRect dönüşümleri içerir: ada tam ekranda kaçarken (küçülüp yukarı giderken)
 * ölçülürse geri geldiğinde sınır ekran dışında kalırdı ve ada açılmazdı.
 */
function layoutRect(el: HTMLElement) {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

/**
 * Adaya bağlı ek alanlar (sağda Argus kartı, solda ses kartı); Rust tek dikdörtgen alır, hepsini
 * kapsayan kutu gönderilir. Değişince sınırlar yeniden gönderilir.
 */
const extras = new Map<string, Rect>();
let extra: Rect | null = null;
let onExtra: (() => void) | null = null;
export function setHitExtra(key: string, rect: Rect | null) {
  if (rect) extras.set(key, rect);
  else extras.delete(key);
  const all = [...extras.values()];
  if (!all.length) extra = null;
  else {
    const x = Math.min(...all.map((r) => r.x));
    const y = Math.min(...all.map((r) => r.y));
    const right = Math.max(...all.map((r) => r.x + r.width));
    const bottom = Math.max(...all.map((r) => r.y + r.height));
    extra = { x, y, width: right - x, height: bottom - y };
  }
  onExtra?.();
}

/**
 * Adanın gerçek sınırlarını Rust'a bildirir. Rust bu dikdörtgenin dışında
 * pencereyi click-through yapar → şeffaf alanlar arkadaki uygulamalara tıklanır.
 * ResizeObserver + rAF: animasyon sırasında karede en fazla bir IPC çağrısı.
 */
export function useHitRect(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const push = () => {
      raf = 0;
      const r = layoutRect(el);
      void setHitRect({
        x: r.x - HIT_PADDING,
        y: r.y - HIT_PADDING,
        width: r.width + HIT_PADDING * 2,
        height: r.height + HIT_PADDING * 2,
      }, extra);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(push);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener("resize", schedule);
    onExtra = schedule;
    schedule();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      onExtra = null;
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}
