/**
 * Sık sesli komutlar Gemini'ye sorulmadan, bu bilgisayarda anında yapılır: uygulama/site açma,
 * şarkı çalma, ses düzeyi, müziği durdurma/geçme, zamanlayıcı. Anlaşılmayan ya da daha
 * karmaşık bir istekse null döner ve komut Gemini'ye gider.
 */
import { appsCached as listApps, quickState } from "./bridge";
import { openArgus, useArgus } from "./argus";
import { runTool, type ToolNote } from "./aiTools";

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

const lower = (s: string) => s.toLocaleLowerCase("tr");

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

/** Komutu yerelde yap; yapıldıysa sonucu, anlaşılmadıysa null döner */
export async function runLocalCommand(raw: string): Promise<{ result: string; note: ToolNote } | null> {
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
