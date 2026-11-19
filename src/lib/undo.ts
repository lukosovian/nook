/**
 * Geri al şeridi: tek tıkla silen işlemler (Temizle, ×) 5 saniyeliğine "… temizlendi · Geri al" sunar.
 * Silinen veri yalnızca bu süre boyunca bellekte (undo kapanışında) durur; şerit kalkınca bırakılır.
 * Şeridi açık adanın altında UndoBar çizer.
 */
import { create } from "zustand";

export const UNDO_MS = 5000;

export interface UndoOffer {
  id: number;
  label: string;
  undo: () => void;
  /** Şeridin rengi (modülün rengi); verilmezse mor */
  color?: string;
}

export const useUndo = create<{ offer: UndoOffer | null }>(() => ({ offer: null }));

let timer = 0;
let seq = 0;

/** Şeridi gösterir; yeni bir teklif öncekinin yerini alır (önceki artık geri alınamaz) */
export function offerUndo(o: { label: string; undo: () => void; color?: string }) {
  window.clearTimeout(timer);
  useUndo.setState({ offer: { ...o, id: ++seq } });
  timer = window.setTimeout(dismissUndo, UNDO_MS);
}

export function dismissUndo() {
  window.clearTimeout(timer);
  useUndo.setState({ offer: null });
}

export function runUndo() {
  const o = useUndo.getState().offer;
  dismissUndo();
  o?.undo();
}

/** Silinenleri eski sıralarına geri koyar; bu arada eklenenler başta kalır */
export function restoreInto<T extends { id: string | number }>(prev: T[], cur: T[], gone: T[]): T[] {
  const back = new Set(gone.map((g) => g.id));
  const now = new Map(cur.map((c) => [c.id, c]));
  const old = new Set(prev.map((p) => p.id));
  return [...cur.filter((c) => !old.has(c.id)), ...prev.flatMap((p) => (now.has(p.id) ? [now.get(p.id)!] : back.has(p.id) ? [p] : []))];
}

/**
 * Listeden `gone` olanları çıkarır ve geri almayı sunar.
 * `get` listenin o anki hâlini okur, `put` yenisini yazar (store'a ya da yerel duruma).
 */
export function removeWithUndo<T extends { id: string | number }>(get: () => T[], put: (list: T[]) => void, gone: (item: T) => boolean, label: string, color?: string) {
  const prev = get();
  const removed = prev.filter(gone);
  if (!removed.length) return;
  put(prev.filter((i) => !gone(i)));
  offerUndo({ label, color, undo: () => put(restoreInto(prev, get(), removed)) });
}
