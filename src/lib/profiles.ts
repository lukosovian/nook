import { ACCENT } from "../components/ui/primitives";
import type { Tab } from "../store/nook";
import { tt } from "./i18n";

/**
 * Ana sayfa profilleri: "Hepsi" sabit; diğerleri kullanıcının (eklenir, silinir, adı değişir).
 * `only`: yalnızca profilin bölümleri görünür; yoksa onlar öne çıkar, diğerleri arkada durur.
 */
export interface ProfileDef {
  id: string;
  label: string;
  color: string;
  ids: Tab[];
  only?: boolean;
}

export const ALL_PROFILE: ProfileDef = { id: "all", label: tt("Hepsi"), color: ACCENT.teal, ids: [] };

export const DEFAULT_PROFILES: ProfileDef[] = [
  { id: "work", label: tt("İş"), color: ACCENT.blue, ids: ["focus", "note", "calendar", "clip"], only: true },
  { id: "game", label: tt("Oyun"), color: ACCENT.red, ids: ["report", "media", "stats", "play"] },
  { id: "fun", label: tt("Eğlence"), color: ACCENT.pink, ids: ["media", "argus", "play", "look"] },
];

/** En fazla bu kadar profil (Hepsi hariç) — başlıktaki şeride sığsın */
export const MAX_PROFILES = 5;

const COLORS = [ACCENT.purple, ACCENT.orange, ACCENT.green, ACCENT.yellow, ACCENT.blue, ACCENT.red, ACCENT.pink];

export function allProfiles(custom: ProfileDef[] | undefined): ProfileDef[] {
  return [ALL_PROFILE, ...userProfiles(custom)];
}

/** Kullanıcının profilleri; hiç dokunulmadıysa varsayılanlar */
export const userProfiles = (custom: ProfileDef[] | undefined) => custom ?? DEFAULT_PROFILES;

/** Yeni boş profil: kullanılmayan bir renk, "Profil N" adı; yalnızca seçilen bölümler görünür */
export function newProfile(custom: ProfileDef[]): ProfileDef {
  let n = custom.length + 1;
  while (custom.some((p) => p.label === tt("Profil {0}", n))) n++;
  const color = COLORS.find((c) => !custom.some((p) => p.color === c)) ?? COLORS[custom.length % COLORS.length];
  return { id: crypto.randomUUID(), label: tt("Profil {0}", n), color, ids: [], only: true };
}
