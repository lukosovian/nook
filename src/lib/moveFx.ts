/**
 * Ekranlar arası geçiş efektleri ("İmleci takip et"): ada eski ekranda bir efektle kaybolur,
 * pencere taşınır, yeni ekranda aynı efektin tersiyle belirir. Her geçişte biri seçilir.
 * Kaybolma 0,45 sn'yi geçmemeli — Rust pencereyi 470 ms sonra taşır (window.rs RELOCATE_OUT).
 */
import type { TargetAndTransition } from "motion/react";
import type { Antic } from "../store/nook";

export type MoveKind = "beam" | "warp" | "portal" | "jump" | "slide" | "glitch";

export const MOVE_KINDS: { id: MoveKind; label: string }[] = [
  { id: "beam", label: "Star Trek ışınlanma" },
  { id: "warp", label: "Işık hızı" },
  { id: "portal", label: "Portal" },
  { id: "jump", label: "Zıplayarak" },
  { id: "slide", label: "Kayarak" },
  { id: "glitch", label: "Dijital bozulma" },
];

export interface Move {
  kind: MoveKind;
  /** 1 = sağdaki ekrana, -1 = soldakine */
  dir: 1 | -1;
  phase: "out" | "in";
}

/** Yeni ekrana varınca Nook'un hareketi */
export const MOVE_ANTIC: Record<MoveKind, Antic> = {
  beam: "wink",
  warp: "dizzy",
  portal: "dizzy",
  jump: "hop",
  slide: "nod",
  glitch: "surprised",
};

let last: MoveKind | null = null;
export function pickMove(style: "random" | MoveKind): MoveKind {
  if (style !== "random") return style;
  const pool = MOVE_KINDS.map((k) => k.id).filter((k) => k !== last);
  last = pool[Math.floor(Math.random() * pool.length)];
  return last;
}

const REST = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, skewX: 0, opacity: 1 };
const RGB = (r: number) => `drop-shadow(${r}px 0 0 rgba(255,40,80,0.9)) drop-shadow(${-r}px 0 0 rgba(40,220,255,0.9))`;

/** Adanın (ve Nook'un) kaybolma/belirme hareketi */
export function moveTarget({ kind, dir, phase }: Move): TargetAndTransition {
  const out = phase === "out";
  switch (kind) {
    case "beam":
      // Titreşerek parlar ve söner; yeni ekranda tersine
      return out
        ? {
            ...REST,
            opacity: [1, 0.6, 0.85, 0.3, 0.5, 0],
            filter: ["brightness(1)", "brightness(2.4)", "brightness(2.4)", "brightness(2.8)", "brightness(2.8)", "brightness(3)"],
            transition: { duration: 0.44, ease: "linear" },
          }
        : {
            ...REST,
            opacity: [0, 0.4, 0.2, 0.7, 0.5, 1],
            filter: ["brightness(3)", "brightness(2.6)", "brightness(2.6)", "brightness(2)", "brightness(1.5)", "brightness(1)"],
            transition: { duration: 0.75, ease: "linear" },
          };
    case "warp":
      // Önce bir çizgiye ezilir, sonra o yöne fırlar; yeni ekrana karşı yönden çizgi olarak gelip açılır
      return out
        ? {
            ...REST,
            scaleY: [1, 0.08, 0.08],
            scaleX: [1, 1.25, 3.5],
            x: [0, 0, dir * 420],
            opacity: [1, 1, 0],
            transition: { duration: 0.42, times: [0, 0.45, 1], ease: "easeIn" },
          }
        : {
            ...REST,
            scaleY: [0.08, 0.08, 1.12, 1],
            scaleX: [3.5, 1.2, 0.96, 1],
            x: [-dir * 420, 0, 0, 0],
            opacity: [0, 1, 1, 1],
            transition: { duration: 0.6, times: [0, 0.45, 0.8, 1], ease: "easeOut" },
          };
    case "portal":
      // Dönerek bir noktaya çekilir, yeni ekranda o noktadan dönerek açılır
      return out
        ? { ...REST, rotate: [0, -60, -300], scale: [1, 0.85, 0], opacity: [1, 1, 0], filter: ["blur(0px)", "blur(0px)", "blur(4px)"], transition: { duration: 0.44, ease: "easeIn" } }
        : { ...REST, rotate: [300, 40, 0], scale: [0, 1.08, 1], opacity: [0, 1, 1], filter: ["blur(4px)", "blur(0px)", "blur(0px)"], transition: { duration: 0.62, ease: "easeOut" } };
    case "jump":
      // Çömelir, döne döne yukarı sıçrar; yeni ekrana yukarıdan düşüp yaylanır
      return out
        ? {
            ...REST,
            scaleY: [1, 0.78, 1.15, 1],
            scaleX: [1, 1.18, 0.9, 1],
            y: [0, 4, -30, -90],
            x: [0, 0, dir * 30, dir * 90],
            rotate: [0, 0, dir * 25, dir * 70],
            opacity: [1, 1, 1, 0],
            transition: { duration: 0.44, times: [0, 0.3, 0.65, 1], ease: "easeOut" },
          }
        : {
            ...REST,
            y: [-90, 0, -12, 0, -3, 0],
            x: [-dir * 60, 0, 0, 0, 0, 0],
            rotate: [-dir * 40, 0, 0, 0, 0, 0],
            scaleY: [1, 0.78, 1.06, 0.95, 1.02, 1],
            scaleX: [1, 1.2, 0.96, 1.04, 0.99, 1],
            opacity: [0, 1, 1, 1, 1, 1],
            transition: { duration: 0.8, times: [0, 0.35, 0.55, 0.72, 0.86, 1], ease: "easeOut" },
          };
    case "slide":
      // Yeni ekranın yönüne eğilip kayar; karşı kenardan girip yerine oturur
      return out
        ? { ...REST, x: [0, -dir * 10, dir * 460], skewX: [0, dir * 8, -dir * 22], opacity: [1, 1, 0.4], transition: { duration: 0.42, times: [0, 0.25, 1], ease: "easeIn" } }
        : { ...REST, x: [-dir * 460, dir * 14, 0], skewX: [-dir * 22, dir * 6, 0], opacity: [0.4, 1, 1], transition: { duration: 0.6, times: [0, 0.7, 1], ease: "easeOut" } };
    case "glitch":
      // Renkler kayar, sarsılır, parazitle kaybolur; yeni ekranda parazitle toparlanır
      return out
        ? {
            ...REST,
            x: [0, -7, 6, -10, 12, 0],
            skewX: [0, 12, -8, 18, -20, 0],
            scaleY: [1, 0.9, 1.1, 0.6, 0.2, 0.02],
            opacity: [1, 0.8, 1, 0.6, 0.9, 0],
            filter: [RGB(0), RGB(3), RGB(-4), RGB(6), RGB(-8), RGB(10)],
            transition: { duration: 0.42, ease: "linear" },
          }
        : {
            ...REST,
            x: [0, 10, -8, 6, -3, 0],
            skewX: [0, -16, 12, -6, 3, 0],
            scaleY: [0.02, 0.5, 1.1, 0.92, 1.03, 1],
            opacity: [0, 0.8, 0.5, 1, 0.8, 1],
            filter: [RGB(10), RGB(-7), RGB(5), RGB(-3), RGB(1), RGB(0)],
            transition: { duration: 0.55, ease: "linear" },
          };
  }
}
