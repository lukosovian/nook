import { useEffect } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { inspectPaths, inTauri } from "../lib/bridge";
import { useNook } from "../store/nook";

/** Çiğneme animasyonu süresi — Island'daki squash keyframe'leri ile aynı. */
export const CHEW_MS = 650;
const HAPPY_MS = 900;

/**
 * Dosya yutma koreografisi:
 *   drag-enter → hungry (gözler O O, ağız açık, ada esner)
 *   drop       → chewing (ada squash & stretch, ağız çiğner) → dosyalar rafa
 *              → happy (küçük zıplama) → idle
 *   drag-leave → idle
 */
export function useFeeding() {
  useEffect(() => {
    const timers = new Set<number>();
    const later = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const mood = () => useNook.getState().mood;
    const { setMood, addFiles, setTab } = useNook.getState();

    const enter = () => {
      if (mood() === "idle" || mood() === "happy") setMood("hungry");
    };
    const leave = () => {
      if (mood() === "hungry") setMood("idle");
    };
    const drop = async (paths: string[]) => {
      if (!paths.length) return setMood("idle");
      setMood("chewing");
      try {
        const [files] = await Promise.all([
          inspectPaths(paths),
          new Promise((r) => later(CHEW_MS, () => r(null))),
        ]);
        addFiles(files);
        useNook.getState().care(4);
        setTab("shelf");
        setMood("happy");
        later(HAPPY_MS, () => mood() === "happy" && setMood("idle"));
      } catch {
        setMood("idle");
      }
    };

    let cleanup: () => void;
    if (inTauri) {
      let unlisten: (() => void) | undefined;
      let disposed = false;
      void getCurrentWebview()
        .onDragDropEvent(({ payload }) => {
          if (payload.type === "enter") enter();
          else if (payload.type === "leave") leave();
          else if (payload.type === "drop") void drop(payload.paths);
        })
        .then((fn) => (disposed ? fn() : (unlisten = fn)));
      cleanup = () => {
        disposed = true;
        unlisten?.();
      };
    } else {
      // Tarayıcı önizlemesi: HTML5 drag olayları (dosya adları yol yerine geçer).
      let depth = 0;
      const onEnter = (e: DragEvent) => {
        e.preventDefault();
        if (depth++ === 0) enter();
      };
      const onOver = (e: DragEvent) => e.preventDefault();
      const onLeave = () => {
        if (--depth === 0) leave();
      };
      const onDrop = (e: DragEvent) => {
        e.preventDefault();
        depth = 0;
        void drop(Array.from(e.dataTransfer?.files ?? [], (f) => f.name));
      };
      window.addEventListener("dragenter", onEnter);
      window.addEventListener("dragover", onOver);
      window.addEventListener("dragleave", onLeave);
      window.addEventListener("drop", onDrop);
      cleanup = () => {
        window.removeEventListener("dragenter", onEnter);
        window.removeEventListener("dragover", onOver);
        window.removeEventListener("dragleave", onLeave);
        window.removeEventListener("drop", onDrop);
      };
    }

    return () => {
      cleanup();
      timers.forEach(clearTimeout);
    };
  }, []);
}
