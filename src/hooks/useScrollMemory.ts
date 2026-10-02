import { useLayoutEffect, type RefObject } from "react";

/** Liste anahtarı → kaydırma yeri. `Infinity` = en altta (yeni içerik gelince de altta kalsın). */
const saved = new Map<string, number>();
/** Açılış animasyonu sırasında liste boyu değişebilir; bu süre boyunca yer yeniden uygulanır. */
const SETTLE_MS = 700;

/**
 * Ada kapanıp açılınca bölüm yeniden kurulur ve liste en başa dönerdi.
 * Kaldığı yeri hatırlar. `bottom`: ilk açılışta en alttan başla ve en alttayken orada kal (sohbet).
 */
export function useScrollMemory(key: string, ref: RefObject<HTMLElement | null>, bottom = false) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const restore = () => {
      const v = saved.get(key) ?? (bottom ? Infinity : 0);
      el.scrollTop = v === Infinity ? el.scrollHeight : v;
    };
    restore();
    const started = performance.now();
    const ro = new ResizeObserver(() => {
      if (performance.now() - started < SETTLE_MS) restore();
    });
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    const onScroll = () => {
      // Yerleşme sırasında tarayıcının kendi düzeltmeleri kaydı bozmasın
      if (performance.now() - started < 120) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 6;
      saved.set(key, bottom && atBottom ? Infinity : el.scrollTop);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, [key, ref, bottom]);
}

/** Sohbet gibi listelerde: kullanıcı en alttaysa (ya da hiç kaydırmadıysa) true. */
export const isPinnedBottom = (key: string) => (saved.get(key) ?? Infinity) === Infinity;
