import { convertFileSrc } from "@tauri-apps/api/core";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { dragIconPath, inTauri } from "./bridge";
import type { ShelfItem } from "../store/nook";

let fallbackIcon: Promise<string> | undefined;

/** Raftaki dosyayı native (OLE) sürükleme ile Discord'a, klasöre, tarayıcıya taşı. */
export async function dragOut(item: ShelfItem | ShelfItem[], onDropped?: () => void) {
  // Dizi verilirse hepsi tek sürüklemede taşınır (rafta çoklu seçim)
  const items = Array.isArray(item) ? item : [item];
  if (!inTauri || !items.length) return;
  const icon = items[0].isImage ? items[0].path : await (fallbackIcon ??= dragIconPath());
  await startDrag({ item: items.map((i) => i.path), icon, mode: "copy" }, (e) => e.result === "Dropped" && onDropped?.());
}

/** Herhangi bir yolu (çıkarılmış arşiv dosyası, klasör) native sürükleme ile taşı */
export async function dragPath(path: string) {
  if (!inTauri) return;
  const icon = /\.(png|jpe?g|gif|webp|bmp)$/i.test(path) ? path : await (fallbackIcon ??= dragIconPath());
  await startDrag({ item: [path], icon, mode: "copy" });
}

export function thumbnailSrc(item: ShelfItem): string | null {
  return inTauri && item.isImage ? convertFileSrc(item.path) : null;
}
