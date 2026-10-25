import { useEffect } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { archiveList, inspectPaths, inTauri } from "../lib/bridge";
import { tt } from "../lib/i18n";
import { useNook } from "../store/nook";

/** Çiğneme / yutma animasyonu süresi — farklı yutma hareketleri rahatça görülsün. */
export const CHEW_MS = 950;
const HAPPY_MS = 900;

/**
 * Dosya yutma koreografisi:
 *   drag-enter → hungry (Nook gelen dosyayı karşılar, ada feeding moduna esner)
 *   drop       → chewing (her seferinde farklı bir yutma/yakalama hareketi) → dosyalar rafa
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
      const s = useNook.getState();
      if (s.hovered && !s.pinned && !s.holds.length) s.setHovered(false);
      if (s.mood === "idle" || s.mood === "happy") setMood("hungry");
    };
    const leave = () => {
      if (mood() === "hungry") setMood("idle");
    };
    const drop = async (paths: string[]) => {
      if (!paths.length) return setMood("idle");
      const s0 = useNook.getState();
      if (s0.hovered && !s0.pinned && !s0.holds.length) s0.setHovered(false);
      setMood("chewing");
      // Tek bir arşiv: rafa değil, içine bakılır (açmadan)
      if (inTauri && paths.length === 1 && /\.(zip|rar)$/i.test(paths[0])) {
        try {
          const [list] = await Promise.all([archiveList(paths[0]), new Promise((r) => later(CHEW_MS, () => r(null)))]);
          const s = useNook.getState();
          s.setArchive({ path: paths[0], ...list });
          setTab("archive");
          setMood("happy");
          // Arşiv açılınca içini göstermek için adayı kısa süre açık tut
          s.setHold("shelf-drop", false);
          s.setHold("archive-open", true);
          later(4000, () => useNook.getState().setHold("archive-open", false));
          later(HAPPY_MS, () => mood() === "happy" && setMood("idle"));
          return;
        } catch (e) {
          console.warn("[nook] arşiv", e);
          // Okunamadıysa (bozuk, şifreli başlık) rafa düşer
        }
      }
      try {
        const [files] = await Promise.all([
          inspectPaths(paths),
          new Promise((r) => later(CHEW_MS, () => r(null))),
        ]);
        addFiles(files);
        const s = useNook.getState();
        s.care(4);
        s.yearAdd({ feeds: files.length });
        setTab("shelf");
        setMood("happy");
        if (!s.pinned && !s.holds.length && !s.hovered) {
          s.pushToast({
            kind: "shelf",
            title: files.length === 1 ? files[0].name : tt("{0} öğe rafta", files.length),
            detail: tt("Rafa eklendi"),
          });
        }
        later(HAPPY_MS, () => {
          if (mood() === "happy") setMood("idle");
          useNook.getState().setHold("shelf-drop", false);
        });
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
