/**
 * Hum: bilgisayarda çalan şarkıyı bulur (dizide, filmde, videoda). Mikrofon değil Windows'un
 * dahili sesi dinlenir; sesten Shazam parmak izi çıkarılıp yalnızca o gönderilir (bkz. hum.rs).
 */
import { invoke } from "@tauri-apps/api/core";
import { inTauri } from "./bridge";

export interface HumTrack {
  key: string;
  title: string;
  artist: string;
  album?: string | null;
  released?: string | null;
  genre?: string | null;
  cover?: string | null;
  url?: string | null;
}

/** Geçmişteki kayıt */
export interface HumEntry extends HumTrack {
  id: string;
  /** Bulunduğu an (ms) */
  at: number;
  /** Otomatik Hum buldu (elle değil) */
  auto: boolean;
}

export type HumOutcome =
  | { status: "found"; track: HumTrack }
  | { status: "none" }
  | { status: "silent" }
  | { status: "noDevice" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export interface HumState {
  phase: "listening" | "found" | "none" | "silent" | "noDevice" | "error";
  /** Dinlerken Nook'un yaptığı hareket (DJ_MOVES sırası) */
  move: number;
  track?: HumTrack;
  message?: string;
}

/** Dinlerken her seferinde başka bir hareket */
export const DJ_MOVES = ["djNod", "djSway", "djBounce", "djEar", "djScratch", "djSpin"] as const;

export const MAX_HUMS = 300;

export const humListen = (): Promise<HumOutcome> => (inTauri ? invoke<HumOutcome>("hum_listen") : demoListen());
export const humWatching = (on: boolean) => (inTauri ? invoke<void>("hum_watching", { on }) : Promise.resolve());
export const humCancel = () => (inTauri ? invoke<void>("hum_cancel") : Promise.resolve(void (demoCancel = true)));

/** Tarayıcı önizlemesi: 4 sn dinleyip örnek bir şarkı bulur */
let demoCancel = false;
function demoListen(): Promise<HumOutcome> {
  demoCancel = false;
  return new Promise((res) =>
    window.setTimeout(
      () =>
        res(
          demoCancel
            ? { status: "cancelled" }
            : {
                status: "found",
                track: { key: "357027", title: "Never Gonna Give You Up", artist: "Rick Astley", album: "Whenever You Need Somebody", released: "1987", genre: "Pop", cover: null, url: null },
              },
        ),
      4000,
    ),
  );
}

const q = (t: HumTrack) => encodeURIComponent(`${t.artist} ${t.title}`);
export const spotifyUrl = (t: HumTrack) => `https://open.spotify.com/search/${q(t)}`;
export const youtubeUrl = (t: HumTrack) => `https://www.youtube.com/results?search_query=${q(t)}`;
