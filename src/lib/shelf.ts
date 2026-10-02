import { convertFileSrc } from "@tauri-apps/api/core";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { dragIconPath, inTauri } from "./bridge";
import type { ShelfItem } from "../store/nook";

let fallbackIcon: Promise<string> | undefined;

/** Raftaki dosyayı native (OLE) sürükleme ile Discord'a, klasöre, tarayıcıya taşı. */
export async function dragOut(item: ShelfItem) {
  if (!inTauri) return;
  const icon = item.isImage ? item.path : await (fallbackIcon ??= dragIconPath());
  await startDrag({ item: [item.path], icon, mode: "copy" });
}

export function thumbnailSrc(item: ShelfItem): string | null {
  return inTauri && item.isImage ? convertFileSrc(item.path) : null;
}
