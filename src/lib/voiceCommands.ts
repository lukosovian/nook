/**
 * Sık sesli komutlar Gemini'ye sorulmadan, bu bilgisayarda anında yapılır: uygulama/site açma,
 * şarkı çalma, ses düzeyi, müziği durdurma/geçme, zamanlayıcı. Anlaşılmayan ya da daha
 * karmaşık bir istekse null döner ve komut Gemini'ye gider.
 */
import { appsCached as listApps, quickState } from "./bridge";
import { openArgus, useArgus } from "./argus";
import { runTool, type ToolNote } from "./aiTools";
import { lang, tt } from "./i18n";
import { runByVoice } from "./automations";

/** Sık açılan siteler: "Gmail'i aç" → adres */
const SITES: Record<string, string> = {
  youtube: "https://www.youtube.com",
  "youtube music": "https://music.youtube.com",
  gmail: "https://mail.google.com",
  "google drive": "https://drive.google.com",
  drive: "https://drive.google.com",
  "google": "https://www.google.com",
  "google haritalar": "https://maps.google.com",
  haritalar: "https://maps.google.com",
  "google takvim": "https://calendar.google.com",
  takvim: "https://calendar.google.com",
  instagram: "https://www.instagram.com",
  twitter: "https://x.com",
  x: "https://x.com",
  facebook: "https://www.facebook.com",
  whatsapp: "https://web.whatsapp.com",
  "whatsapp web": "https://web.whatsapp.com",
  netflix: "https://www.netflix.com",
  twitch: "https://www.twitch.tv",
  reddit: "https://www.reddit.com",
  github: "https://github.com",
  "ekşi sözlük": "https://eksisozluk.com",
  ekşi: "https://eksisozluk.com",
  chatgpt: "https://chatgpt.com",
  claude: "https://claude.ai",
  gemini: "https://gemini.google.com",
  wikipedia: "https://tr.wikipedia.org",
  vikipedi: "https://tr.wikipedia.org",
  "hava durumu": "https://www.google.com/search?q=hava+durumu",
};

/** Türkçe küçük harf; ama "Instagram", "Illustrator" gibi adlardaki I → i (ı değil) */
const lower = (s: string) => s.replace(/I(?=[a-z])/g, "i").toLocaleLowerCase("tr");

const ONES: Record<string, number> = { sıfır: 0, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9 };
const TENS: Record<string, number> = { on: 10, yirmi: 20, otuz: 30, kırk: 40, elli: 50, altmış: 60, yetmiş: 70, seksen: 80, doksan: 90 };

/**
 * Yazıyla ve tuhaf biçimde dökülmüş sayılar rakama: "yetmiş beş" → 75, "yüzde yüz" → "%100",
 * "100 de 100" (yazıya dökmenin "yüzde yüz"ü) → "%100", "yüzde 30" → "%30"
 */
export function normalizeNumbers(t: string) {
  const words = t.split(" ");
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    // Ekli sayı: "elliye", "yüze", "otuza" → kök ve ek ayrı
    const sm = words[i].match(/^(yüz|on|yirmi|otuz|kırk|elli|altmış|yetmiş|seksen|doksan|iki|üç|dört|beş|altı|yedi|sekiz|dokuz)('?(?:ye|ya|e|a|de|da|te|ta))$/);
    if (sm) {
      words.splice(i, 1, sm[1], sm[2].replace("'", ""));
    }
    const w = words[i];
    if (w === "yüz" || w in TENS || w in ONES) {
      let n = 0;
      let j = i;
      if (words[j] === "yüz") (n += 100), j++;
      if (words[j] in TENS) (n += TENS[words[j]]), j++;
      if (words[j] in ONES) (n += ONES[words[j]]), j++;
      // "bir" tek başına sayı değil ("bir şarkı"); yalnızca sayı bağlamında çevir
      const lone = j === i + 1 && w === "bir";
      if (!lone) {
        out.push(String(n));
        i = j - 1;
        continue;
      }
    }
    out.push(w);
  }
  return out
    .join(" ")
    .replace(/(^| )yüzde\s*(\d{1,3})/g, "$1%$2")
    .replace(/(^| )\d{1,3}\s*de\s*(\d{1,3})(?= |$)/g, "$1%$2")
    .replace(/%\s+/g, "%");
}

/** Ses düzeyini bağıl değiştir: şu anki düzeyin üstüne/altına */
async function nudgeVolume(delta: number) {
  const now = (await quickState().catch(() => null))?.volume;
  const cur = typeof now === "number" ? Math.round(now * 100) : 50;
  return runTool("set_volume", { percent: Math.max(0, Math.min(100, cur + delta)) });
}

/** "spotify'ı", "discordu", "chrome'u", "youtube'dan" → kök ad */
function stem(word: string) {
  const w = word.trim().replace(/[’`]/g, "'");
  const q = w.indexOf("'");
  if (q > 0) return w.slice(0, q);
  return w;
}

/** Ek atılmış adaylar: "discordu" → ["discordu", "discord"] */
function variants(name: string) {
  const base = stem(name);
  const out = new Set([base]);
  for (const suf of ["yı", "yi", "yu", "yü", "nı", "ni", "nu", "nü", "ı", "i", "u", "ü"]) if (base.endsWith(suf) && base.length > suf.length + 2) out.add(base.slice(0, -suf.length));
  return [...out];
}

/** Levenshtein uzaklığı */
function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

async function openByName(name: string): Promise<{ result: string; note: ToolNote } | null> {
  const cands = variants(lower(name));
  if (cands.includes("argus") && useArgus.getState().snap) {
    await openArgus();
    return { result: "Argus açıldı.", note: { icon: "argus", text: "Argus açıldı" } };
  }
  const apps = await listApps().catch(() => []);
  for (const c of cands) {
    const hit = apps.find((a) => lower(a.name) === c) ?? apps.find((a) => lower(a.name).startsWith(c)) ?? (c.length >= 4 ? apps.find((a) => lower(a.name).includes(c)) : undefined);
    if (hit) return runTool("open_app", { name: hit.name });
  }
  // Yanlış duyulmuş ad ("diskort", "spotifay"): harf farkı az olan uygulama
  for (const c of cands) {
    if (c.length < 4) continue;
    const near = apps
      .map((a) => ({ a, d: distance(c, lower(a.name).split(" ")[0]) }))
      .filter((x) => x.d <= Math.max(1, Math.round(c.length / 3.5)))
      .sort((x, y) => x.d - y.d)[0];
    if (near) return runTool("open_app", { name: near.a.name });
  }
  for (const c of cands) {
    if (SITES[c]) return runTool("open_url", { url: SITES[c] });
    if (/^[a-z0-9-]+\.(com|net|org|io|tv|tr|com\.tr|dev|app)$/i.test(c)) return runTool("open_url", { url: c });
  }
  return null;
}

const EN_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, "a hundred": 100, "one hundred": 100 };

/** İngilizce sık komutlar ("open Spotify", "play lo-fi on YouTube Music", "volume 50") */
async function runEnglish(raw: string): Promise<{ result: string; note: ToolNote } | null> {
  const t = raw
    .toLowerCase()
    .replace(/[.!?,;:"“”]/g, " ")
    .replace(/^\s*(hey\s+)?nook\s*/, "")
    .replace(/^(please|can you|could you)\s+/, "")
    .replace(/\s+(please|now|for me)\s*$/, "")
    .replace(/\b(a hundred|one hundred|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/g, (w) => String(EN_NUMBERS[w]))
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;
  let m: RegExpMatchArray | null;

  // Ses düzeyi: "set the volume to 50", "volume 30 percent", "turn the volume up"
  if ((m = t.match(/^(?:set |change |turn )?(?:the )?volume (?:to |at )?(\d{1,3})(?: ?%| percent)?$/))) return runTool("set_volume", { percent: Math.min(100, Number(m[1])) });
  if (/^(?:turn (?:the )?volume all the way up|max(?:imum)? volume|volume (?:to )?max(?:imum)?)$/.test(t)) return runTool("set_volume", { percent: 100 });
  if (/^(?:turn (?:the )?volume down|volume down|lower the volume|turn it down)$/.test(t)) return nudgeVolume(-20);
  if (/^(?:turn (?:the )?volume up|volume up|raise the volume|turn it up)$/.test(t)) return nudgeVolume(20);
  if (/^(?:mute|mute (?:the )?(?:sound|volume|audio|computer))$/.test(t)) return runTool("quick_set", { key: "mute", on: true });
  if (/^unmute(?: (?:the )?(?:sound|volume|audio|computer))?$/.test(t)) return runTool("quick_set", { key: "mute", on: false });

  // Müzik
  if (/^(?:pause|stop|resume|play|continue)(?: (?:the )?(?:music|song|video|playback))?$/.test(t)) return runTool("media", { action: "toggle" });
  if (/^(?:next|skip)(?: (?:this )?(?:song|track))?$|^(?:play the )?next (?:song|track)$/.test(t)) return runTool("media", { action: "next" });
  if (/^(?:previous|go back|last)(?: (?:song|track))?$|^(?:play the )?previous (?:song|track)$/.test(t)) return runTool("media", { action: "prev" });

  // Hızlı ayarlar: "turn off wifi", "turn bluetooth on", "mute the mic"
  const quick = t.match(/^turn (on|off) (?:the )?(wi-?fi|bluetooth|dark mode|night mode)$/) ?? t.match(/^turn (?:the )?(wi-?fi|bluetooth|dark mode|night mode) (on|off)$/);
  if (quick) {
    const [on, what] = quick[1] === "on" || quick[1] === "off" ? [quick[1], quick[2]] : [quick[2], quick[1]];
    const key = /blue/.test(what) ? "bluetooth" : /mode/.test(what) ? "dark" : "wifi";
    return runTool("quick_set", { key, on: on === "on" });
  }
  if (/^(?:mute|turn off) (?:the |my )?mic(?:rophone)?$/.test(t)) return runTool("quick_set", { key: "mic", on: true });
  if (/^(?:unmute|turn on) (?:the |my )?mic(?:rophone)?$/.test(t)) return runTool("quick_set", { key: "mic", on: false });

  // Şarkı: "play tarkan on youtube music", "play lo-fi on spotify", "play some jazz"
  if ((m = t.match(/^(?:play|put on) (.+?) on youtube music$/))) return runTool("play_music", { query: m[1], service: "youtube_music" });
  if ((m = t.match(/^(?:play|put on|watch) (.+?) on youtube$/))) return runTool("play_music", { query: m[1], service: "youtube" });
  if ((m = t.match(/^(?:play|put on) (.+?) on spotify$/))) return runTool("play_music", { query: m[1], service: "spotify" });
  if ((m = t.match(/^(?:play|put on) (?:some )?(.+)$/))) return runTool("play_music", { query: m[1], service: "youtube_music" });

  // Zamanlayıcı: "set a timer for 10 minutes", "10 minute timer"
  if ((m = t.match(/^(?:set |start )?(?:a )?timer (?:for )?(\d{1,3}) (?:minutes?|mins?)$/) ?? t.match(/^(?:set |start )?(?:a )?(\d{1,3})[ -](?:minute|min) timer$/)))
    return runTool("set_timer", { minutes: Number(m[1]) });

  // Arama: "search google for the weather", "google the weather"
  if ((m = t.match(/^(?:search (?:google |the web |the internet )?for|google|look up) (.+)$/))) return runTool("web_search", { query: m[1] });

  // Uygulama ya da site: "open spotify", "launch discord", "open the youtube website"
  if ((m = t.match(/^(?:open|launch|start|run) (?:the )?(.+?)(?: app| website| site| program)?$/))) {
    if (m[1].split(" ").length <= 4) return openByName(m[1]);
  }
  return null;
}

/** Komutu yerelde yap; yapıldıysa sonucu, anlaşılmadıysa null döner */
export async function runLocalCommand(raw: string): Promise<{ result: string; note: ToolNote } | null> {
  // Kısayol tuşunun ya da otomasyonun adı ("gece modu", "oyun modu"): adın kendisiyse önce o
  const key = async (exact: boolean) => {
    const name = await runByVoice(raw, exact);
    return name ? { result: `${name} çalıştırıldı.`, note: { icon: "toggle" as const, text: tt("{0} çalıştı", name) } } : null;
  };
  const hit = await key(true);
  if (hit) return hit;
  // Nook'un dilindeki kalıplar önce ("google hava durumu ara" Türkçede İngilizce aramaya düşmesin)
  const local = lang === "tr" ? ((await runTurkish(raw)) ?? (await runEnglish(raw))) : ((await runEnglish(raw)) ?? (await runTurkish(raw)));
  return local ?? key(false);
}

async function runTurkish(raw: string): Promise<{ result: string; note: ToolNote } | null> {
  const t = lower(raw)
    .replace(/[.!?,;:"“”]/g, " ")
    .replace(/^\s*(hey\s+)?nook\s*/, "")
    .replace(/\s+(lütfen|hemen|bakalım|bi|bir)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;
  let m: RegExpMatchArray | null;

  // Ses düzeyi: "sesi yüzde 30 yap", "sesi 50'ye getir", "ses seviyesini yüzde yüz yap", "sesi sonuna kadar aç"
  const v = normalizeNumbers(t);
  if ((m = v.match(/^(?:bilgisayarın )?ses(?:i|in| seviyesini| seviyesi| düzeyini| düzeyi)?\s+%?(\d{1,3})(?:'?\s*[a-zğüşöçı]*)?(?:\s+(?:yap|getir|ayarla|olsun|çıkar|indir|düşür|kıs|aç))?$/)))
    return runTool("set_volume", { percent: Math.min(100, Number(m[1])) });
  if (/^sesi\s+(sonuna kadar|en yükseğe|tam|full|fulle) ?(aç|çıkar|getir|yap)?$|^sesi fulle$/.test(t)) return runTool("set_volume", { percent: 100 });
  if (/^sesi\s+(biraz\s+)?(kıs|azalt|düşür|alçalt)$/.test(t)) return nudgeVolume(t.includes("biraz") ? -10 : -20);
  if (/^sesi\s+(biraz\s+)?(artır|arttır|yükselt|aç biraz|biraz aç)$/.test(t)) return nudgeVolume(t.includes("biraz") ? 10 : 20);
  if (/^sesi\s+(kapat|kıs ve kapat|sustur)$/.test(t)) return runTool("quick_set", { key: "mute", on: true });
  if (/^sesi\s+aç$/.test(t)) return runTool("quick_set", { key: "mute", on: false });

  // Müzik: durdur, devam, sonraki, önceki
  if (/^(müziği |şarkıyı |videoyu )?(durdur|duraklat|dur)$/.test(t) || /^(müziğe |şarkıya )?devam( et)?$/.test(t)) return runTool("media", { action: "toggle" });
  if (/^(sonraki|sıradaki)( şarkı| parça)?(ya geç)?$|^(şarkıyı |parçayı )?(geç|atla)$/.test(t)) return runTool("media", { action: "next" });
  if (/^önceki( şarkı| parça)?(ye dön)?$/.test(t)) return runTool("media", { action: "prev" });

  if (/^(müziği|şarkıyı|videoyu|müzik|şarkı) (oynat|başlat|devam ettir|aç)$/.test(t)) return runTool("media", { action: "toggle" });
  // Hızlı ayarlar: "wifi'ı kapat", "bluetooth aç", "karanlık modu aç"
  if ((m = t.match(/^(wi-?fi|wifi|kablosuz|bluetooth|karanlık mod|koyu mod|gece modu)(?:'?[a-zğüşöçı]{0,4})? (aç|kapat)$/))) {
    const key = /blue/.test(m[1]) ? "bluetooth" : /mod/.test(m[1]) ? "dark" : "wifi";
    return runTool("quick_set", { key, on: m[2] === "aç" });
  }
  if (/^mikrofon(?:u)? (kapat|sustur)$/.test(t)) return runTool("quick_set", { key: "mic", on: true });
  if (/^mikrofon(?:u)? aç$/.test(t)) return runTool("quick_set", { key: "mic", on: false });
  // Şarkı: "youtube music'ten tarkan aç", "spotify'da sezen aksu çal", "youtube'da kedi videosu aç"
  if ((m = t.match(/^youtube (?:music|müzik)(?:'?[a-zğüşöçı]{0,4})? (.+?) (?:aç|çal|oynat|başlat)$/))) return runTool("play_music", { query: m[1], service: "youtube_music" });
  if ((m = t.match(/^youtube(?:'?[a-zğüşöçı]{0,4})? (.+?) (?:aç|çal|oynat|izle|başlat)$/))) return runTool("play_music", { query: m[1], service: "youtube" });
  if ((m = t.match(/^spotify(?:'?[a-zğüşöçı]{0,4})? (.+?) (?:aç|çal|oynat|başlat)$/))) return runTool("play_music", { query: m[1], service: "spotify" });
  if ((m = t.match(/^(.+?) (?:şarkısını |şarkısı |müziğini |albümünü )?(?:çal|oynat)$/))) return runTool("play_music", { query: m[1], service: "youtube_music" });
  if ((m = t.match(/^(.+?) (?:şarkısını|şarkısı|müziğini) aç$/))) return runTool("play_music", { query: m[1], service: "youtube_music" });

  // Zamanlayıcı: "10 dakikalık sayaç kur", "5 dakika sonra haber ver"
  if ((m = t.match(/^(\d{1,3}) (?:dakika|dk)(?:lık)? (?:sayaç|zamanlayıcı|geri sayım)(?: kur| başlat)?$/))) return runTool("set_timer", { minutes: Number(m[1]) });

  // Arama: "google'da hava durumu ara", "internette … araştır" ("annemi ara" gibi istekler Gemini'ye kalsın)
  if ((m = t.match(/^(?:google(?:'?[a-zğüşöçı]{0,4})|internette) (.+?) (?:ara|arat|araştır)$/))) return runTool("web_search", { query: m[1] });

  // Uygulama ya da site: "spotify'ı aç", "bilgisayardan discordu aç", "chrome aç"
  if ((m = t.match(/^(?:bilgisayardan |bilgisayarda |pc'?den )?(.+?) (?:aç|başlat|çalıştır)$/))) {
    const name = m[1].replace(/^(uygulamasını|programını|sitesini) /, "").replace(/ (uygulamasını|programını|sitesini|uygulaması|programı|sitesi)$/, "");
    if (name.split(" ").length <= 4) return openByName(name);
  }
  return null;
}
