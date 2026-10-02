import { useEffect, type RefObject } from "react";
import { setHitRect } from "../lib/bridge";
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
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(push);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}
