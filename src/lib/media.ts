import type { NowPlaying } from "../store/nook";

/** Oynarken, son güncellemeden bu yana geçen süreyi ekleyerek anlık pozisyon. */
export function livePosition(m: NowPlaying): number {
  const elapsed = m.playing ? performance.now() - m.at : 0;
  return Math.min(m.durationMs || Infinity, m.positionMs + elapsed);
}

export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const KNOWN: [RegExp, string][] = [
  [/spotify/i, "Spotify"],
  [/chrome/i, "Chrome"],
  [/msedge|microsoftedge/i, "Edge"],
  [/firefox/i, "Firefox"],
  [/opera/i, "Opera"],
  [/brave/i, "Brave"],
  [/zune|music/i, "Medya Oynatıcı"],
  [/vlc/i, "VLC"],
  [/apple/i, "Apple Music"],
];

/** "Spotify.exe" / "Microsoft.ZuneMusic_8wekyb3d8bbwe!Microsoft.ZuneMusic" → okunur ad */
export function appName(id: string): string {
  for (const [re, name] of KNOWN) if (re.test(id)) return name;
  return id.split(/[!\\]/).pop()!.replace(/\.exe$/i, "");
}
