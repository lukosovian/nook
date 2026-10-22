/**
 * Nook'un günlüğü: gün boyu hangi uygulamada ne kadar kalındığı, imlecin ne kadar yol aldığı, kablosuz
 * farenin pili, Argus'ta izlenenler, müzik, su, odak… toplanır; gece (22:30'dan sonra) ya da ertesi günün
 * ilk açılışında Gemini, Nook'un ağzından 3-4 cümlelik mizahi bir günlük yazar. Adada kart, Studio ana
 * sayfası, günün özeti ve Nook Mobil'de görünür.
 */
import { useEffect } from "react";
import { foregroundApp, isPrimary, mouseTravel } from "./bridge";
import { generateOnce, pickQuickModel } from "./ai";
import { modelsFor } from "../hooks/useGemini";
import { useArgus } from "./argus";
import { nookName } from "./look";
import { note } from "./log";
import { dayKey, EMPTY_DAY, useNook } from "../store/nook";
import { lang, LANG_NAME_TR, tt } from "./i18n";

/** Bir fiziksel pikselin ekrandaki boyu (cm): 24-27 inçlik ekranların ortalaması */
const CM_PER_PX = 0.026;
/** Bundan az bilgisayar başında geçen günün günlüğü yazılmaz (dk) */
const MIN_ACTIVE = 20;
/** Bu saatten sonra o günün günlüğü yazılır */
const NIGHT = { h: 22, m: 30 };
const CHECK_EVERY_MS = 10 * 60_000;

/** Kendi pencerelerimiz ve sistem kabukları uygulama sayılmaz */
const SKIP_APPS = /^(nook|lockapp|searchhost|searchapp|shellexperiencehost|startmenuexperiencehost|applicationframehost|textinputhost|systemsettingsbroker|dwm|rundll32|consent)$/i;

/** Sık uygulamaların okunur adı (exe adından) */
const APP_NAMES: Record<string, string> = {
  chrome: "Chrome",
  msedge: "Edge",
  firefox: "Firefox",
  opera: "Opera",
  brave: "Brave",
  code: "VS Code",
  cursor: "Cursor",
  explorer: tt("Dosya Gezgini"),
  figma: "Figma",
  photoshop: "Photoshop",
  illustrator: "Illustrator",
  afterfx: "After Effects",
  "adobe premiere pro": "Premiere Pro",
  blender: "Blender",
  discord: "Discord",
  spotify: "Spotify",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  steam: "Steam",
  steamwebhelper: "Steam",
  winword: "Word",
  excel: "Excel",
  powerpnt: "PowerPoint",
  outlook: "Outlook",
  "ms-teams": "Teams",
  teams: "Teams",
  windowsterminal: tt("Terminal"),
  cmd: tt("Komut İstemi"),
  powershell: "PowerShell",
  notepad: tt("Not Defteri"),
  obs64: "OBS",
  vlc: "VLC",
  argus: "Argus",
  claude: "Claude",
  slack: "Slack",
  zoom: "Zoom",
  notion: "Notion",
};

export function appLabel(exe: string) {
  return APP_NAMES[exe.toLowerCase()] ?? exe.charAt(0).toUpperCase() + exe.slice(1);
}

let lastTravel: number | null = null;

/** Dakikada bir (Karne sayacıyla birlikte): öndeki uygulama, imlecin yolu, farenin pili */
export async function logDiaryMinute(away: boolean) {
  if (!isPrimary) return;
  const [exe, travel] = await Promise.all([away ? null : foregroundApp().catch(() => null), mouseTravel().catch(() => 0)]);
  const s = useNook.getState();
  const cm = lastTravel === null || travel < lastTravel ? 0 : Math.round((travel - lastTravel) * CM_PER_PX);
  lastTravel = travel;
  if (cm > 0) s.track({ mouse: cm });
  const app = exe && !SKIP_APPS.test(exe) ? appLabel(exe) : null;
  s.logMinute(app, s.devices?.mouse?.percent ?? null);
}

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} saat ${Math.round(min % 60)} dakika` : `${Math.round(min)} dakika`);

/** O günün verisi, Gemini'ye giden düz yazı */
function facts(day: string): string | null {
  const s = useNook.getState();
  const d = { ...EMPTY_DAY, ...s.days[day] };
  if (d.active < MIN_ACTIVE) return null;
  const log = s.dayLog[day];
  const lines = [`Bilgisayar başında: ${hm(d.active)}.`];
  const apps = Object.entries(log?.apps ?? {})
    .sort((a, b) => b[1] - a[1])
    .filter(([, m]) => m >= 3)
    .slice(0, 5);
  if (apps.length) lines.push(`En çok kullanılan uygulamalar: ${apps.map(([a, m]) => `${a} (${hm(m)})`).join(", ")}.`);
  if (d.music) lines.push(`Müzik dinleme: ${hm(d.music)}.`);
  if (d.game) lines.push(`Oyun: ${hm(d.game)}.`);
  if (d.focus) lines.push(`Odak sayacıyla çalışma: ${hm(d.focus)}${d.pomodoros ? `, ${d.pomodoros} pomodoro` : ""}.`);
  lines.push(s.settings.waterEvery > 0 || d.water ? `İçilen su: ${d.water} bardak.` : "");
  if (d.care) lines.push(`Nook'la ilgilenme (sevme, oyun, sohbet): ${d.care} kez.`);
  if (d.notifs) lines.push(`Gelen bildirim: ${d.notifs}.`);
  if (d.mouse > 100) lines.push(`İmlecin ekranda aldığı yol: yaklaşık ${d.mouse >= 10_000 ? `${(d.mouse / 100_000).toFixed(1)} km` : `${Math.round(d.mouse / 100)} metre`}.`);
  if (log?.mouseBattery !== undefined && log.mouseBattery < 100) lines.push(`Kablosuz farenin pili gün içinde en düşük %${log.mouseBattery}'e indi.`);
  const snap = useArgus.getState().snap;
  if (snap) {
    const eps = snap.episodeDays[day] ?? 0;
    const titles = snap.items.filter((i) => i.watchDates.includes(day)).map((i) => i.title);
    if (eps || titles.length) lines.push(`Argus'ta izlenenler: ${titles.slice(0, 4).join(", ") || "-"}${eps ? ` (${eps} bölüm)` : ""}.`);
  }
  if (d.moodN) lines.push(`Nook'un gün boyu keyfi: ortalama %${Math.round(d.moodSum / d.moodN)}.`);
  return lines.filter(Boolean).join("\n");
}

let writing = false;

/** O günün günlüğünü yazar (Gemini anahtarı ve yeterli veri yoksa null) */
export async function writeDiary(day: string): Promise<string | null> {
  const s = useNook.getState();
  const key = s.settings.geminiKey.trim();
  const data = facts(day);
  if (!key || !data || writing) return null;
  writing = true;
  try {
    const name = nookName();
    const user = s.settings.userName.trim();
    const when = day === dayKey() ? "bugün" : "dün";
    const system = [
      `Sen ${name}'sun: kullanıcının Windows bilgisayarında, ekranın üst kenarında yaşayan sevimli, şakacı bir maskot.`,
      `Kendi ağzından, ${LANG_NAME_TR[lang]} dilinde, ${when} için 3-4 cümlelik kısa, sıcak ve mizahi bir günlük yazıyorsun.`,
      user ? `Kullanıcıdan adıyla (${user}) ve üçüncü şahıs olarak bahset.` : "Kullanıcıdan 'benimki' ya da 'insanım' diye üçüncü şahıs olarak bahset.",
      "Yalnızca verilen verilere dayan, olmayan bir şey uydurma; birkaç ilginç ayrıntıyı seç, hepsini sayma. Sayıları doğal yuvarla.",
      "Hafif takılabilirsin ama kırıcı olma; iyi bir şey yaptıysa (su içtiyse, odaklandıysa) takdir et. Başlık, tarih, emoji ya da tırnak ekleme; düz paragraf yaz.",
      `Örnek ton: "Bugün Luko saatlerce tasarım yaptı, farenin pilini %7'ye kadar sömürdü, araya bir bölüm Mehmed sıkıştırdı; neyse ki suyu unutmadı."`,
    ].join(" ");
    const quick = pickQuickModel(await modelsFor(key).catch(() => []));
    const models = [...new Set([quick, s.settings.aiModel].filter(Boolean) as string[])];
    for (const model of models) {
      try {
        const text = (await generateOnce(key, model, [{ text: `${when === "bugün" ? "Bugünün" : "Dünün"} verileri:\n${data}` }], system)).trim().replace(/^["“]|["”]$/g, "");
        if (!text) continue;
        useNook.getState().setDiary(day, text);
        note(`günlük yazıldı: ${day}, ${text.length} karakter`);
        return text;
      } catch (e) {
        note(`günlük ${model}: ${(e as Error).message}`);
      }
    }
    return null;
  } finally {
    writing = false;
  }
}

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};

/** Gece bugünün, sabah ilk açılışta (yazılmadıysa) dünün günlüğü; yalnızca ana adada */
export function useDiary() {
  useEffect(() => {
    if (!isPrimary) return;
    const check = async () => {
      const s = useNook.getState();
      if (!s.settings.diary || !s.settings.geminiKey.trim()) return;
      const now = new Date();
      const today = dayKey();
      const y = yesterdayKey();
      if (!s.diary[y] && now.getHours() >= 5 && facts(y)) {
        if (await writeDiary(y)) useNook.getState().pushToast({ kind: "chat", title: tt("Dünkü günlüğümü yazdım"), detail: tt("Studio ana sayfasında ya da telefonda oku"), ms: 8000 });
        return;
      }
      const night = now.getHours() > NIGHT.h || (now.getHours() === NIGHT.h && now.getMinutes() >= NIGHT.m);
      if (night && !s.diary[today]) {
        const text = await writeDiary(today);
        if (text) useNook.getState().pushToast({ kind: "chat", title: tt("Bugünü günlüğüme yazdım"), detail: tt("Studio ana sayfasında ya da telefonda oku"), ms: 8000 });
      }
    };
    // Açılışta dünkü günlük eksikse erkenden yazılsın (Studio ve telefon)
    const first = window.setTimeout(() => void check(), 8_000);
    const every = window.setInterval(() => void check(), CHECK_EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, []);
}

/** Gösterilecek en yeni günlük: bugünün ya da dünün */
export function latestDiary(diary: Record<string, { text: string; at: number }>) {
  const day = Object.keys(diary).sort().at(-1);
  return day ? { day, ...diary[day] } : null;
}
