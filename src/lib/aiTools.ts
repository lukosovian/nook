/**
 * Nook'un yapay zekâsının kullanabildiği araçlar: alarm, zamanlayıcı, hızlı ayarlar, not,
 * müzik, uygulama açma, web araması ve hatırlama. Her araç kısa bir sonuç metni döner;
 * model bunu okuyup kullanıcıya cevap verir.
 */
import { playAntic } from "../hooks/useAntics";
import { clock, REPEAT_LABEL, type Repeat } from "./alarm";
import { listApps, mediaControl, openPath, quickSet, type QuickKey } from "./bridge";
import { mmss, PHASE_LABEL, remaining, startFocus, stopFocus } from "./focus";
import type { FunctionDecl } from "./ai";
import { calendar, dayLabel, epLabel, findItem, markWatched, matchTitle, parseEpisode, pickPool, useArgus, watching, weekStats, type ArgusItem } from "./argus";
import { useNook } from "../store/nook";

const fn = (name: string, description: string, properties: object, required: string[] = []): FunctionDecl => ({
  name,
  description,
  parameters: { type: "object", properties, required },
});

const ARGUS_FUNCTIONS: FunctionDecl[] = [
  fn(
    "argus_overview",
    "Kullanıcının Argus arşivinden: şu an izlediği diziler ve sıradaki bölümleri, önümüzdeki günlerde çıkacak bölümler, bu hafta kaç bölüm/film izlediği. 'Ne izliyordum', 'yeni bölüm var mı', 'bu hafta ne kadar izledim' gibi sorularda kullan.",
    {},
  ),
  fn(
    "argus_suggest",
    "Argus'taki İzlenecekler listesinden, yayınlanmış yapımlardan rastgele adaylar getirir. 'Ne izlesem', 'bir film öner' gibi isteklerde kullan; adaylardan birini seçip kısaca nedenini söyle.",
    {
      kind: { type: "string", enum: ["film", "dizi", "all"], description: "Film mi dizi mi; belirtilmediyse all" },
      max_minutes: { type: "integer", description: "En fazla süre (dakika), kullanıcı kısa bir şey isterse" },
      genre: { type: "string", description: "Tür (Komedi, Bilim Kurgu, Korku…)" },
    },
  ),
  fn(
    "argus_find",
    "Argus'ta bir dizi/film kaydını adıyla bulur: durumu, puanı, kaç bölüm izlendiği, sıradaki bölüm.",
    { title: { type: "string" } },
    ["title"],
  ),
  fn(
    "argus_mark_watched",
    "Kullanıcı bir bölümü ya da filmi izlediğini söylerse Argus'a bugün izlendi olarak işaretler. Bölüm belirtilmezse dizinin sıradaki bölümü işaretlenir.",
    {
      title: { type: "string" },
      season: { type: "integer" },
      episode: { type: "integer" },
    },
    ["title"],
  ),
];

export const FUNCTIONS: FunctionDecl[] = [
  fn(
    "set_alarm",
    "Belirli bir saate alarm kurar.",
    {
      hour: { type: "integer", description: "Saat (0-23). 'Akşam 8' → 20." },
      minute: { type: "integer", description: "Dakika (0-59)" },
      label: { type: "string", description: "Kullanıcı bir amaç söylediyse onu yaz: Toplantı, İlaç, Kalk…" },
      repeat: {
        type: "string",
        enum: ["once", "daily", "weekdays", "weekend"],
        description: "Kullanıcı açıkça 'her gün', 'hafta içi', 'hafta sonu' demedikçe MUTLAKA 'once'.",
      },
      day_offset: { type: "integer", description: "Tek seferlik alarmlar için: 0 bugün, 1 yarın, 2 öbür gün. Belirtilmezse ilk uygun saat." },
      silent: { type: "boolean", description: "Kullanıcı 'sessiz' derse true: ses çıkmaz, yalnızca ekranda görünür." },
    },
    ["hour", "minute", "repeat"],
  ),
  fn(
    "set_timer",
    "Şu andan itibaren belirli dakika sonra çalacak zamanlayıcı kurar.",
    { minutes: { type: "number", description: "Kaç dakika sonra" }, label: { type: "string" } },
    ["minutes"],
  ),
  fn(
    "quick_set",
    "Wi-Fi, Bluetooth, karanlık mod, sesi kapatma (mute) ya da mikrofonu kapatma (mic) ayarını açar/kapatır.",
    {
      key: { type: "string", enum: ["wifi", "bluetooth", "dark", "mute", "mic"] },
      on: { type: "boolean", description: "wifi/bluetooth/dark için açık; mute/mic için sessize alınmış mı" },
    },
    ["key", "on"],
  ),
  fn(
    "focus",
    "Odak (Pomodoro) sayacını başlatır ya da bitirir. 'Odaklanalım', 'çalışmaya başlıyorum', '25 dakika ders' gibi isteklerde kullan.",
    {
      action: { type: "string", enum: ["start", "stop"] },
      minutes: { type: "integer", description: "Çalışma süresi (dakika). Söylenmediyse boş bırak." },
    },
    ["action"],
  ),
  fn("add_note", "Kullanıcının hızlı notuna bir satır ekler.", { text: { type: "string" } }, ["text"]),
  fn("media", "Çalan müziği/videoyu yönetir.", { action: { type: "string", enum: ["toggle", "next", "prev"] } }, ["action"]),
  fn("open_app", "Bilgisayardaki bir uygulamayı adıyla açar (ör. Spotify, Discord, Steam).", { name: { type: "string" } }, ["name"]),
  fn("web_search", "Tarayıcıda Google araması açar.", { query: { type: "string" } }, ["query"]),
  fn("set_user_name", "Kullanıcı adını söylerse (\"benim adım …\") kalıcı olarak kaydeder.", { name: { type: "string" } }, ["name"]),
  fn(
    "remember",
    "Kullanıcı hakkında kalıcı olarak hatırlanacak bir bilgiyi kaydeder (adı, sevdiği şeyler, alışkanlıkları). Yalnızca kullanıcı hatırlamanı isterse ya da kendisi hakkında önemli bir şey söylerse kullan.",
    { fact: { type: "string", description: "Kısa, üçüncü şahıs cümlesi: 'Kahveyi şekersiz içer.'" } },
    ["fact"],
  ),
];

/** Argus yalnızca bu bilgisayarda varsa modele tanıtılır */
export const functions = () => (useArgus.getState().snap ? [...FUNCTIONS, ...ARGUS_FUNCTIONS] : FUNCTIONS);

/** Sohbet içinde araç sonucunu gösteren küçük etiket */
export interface ToolNote {
  icon: "alarm" | "toggle" | "note" | "music" | "app" | "web" | "memory" | "error" | "focus" | "argus";
  text: string;
}

/** Model için tek satırlık kayıt özeti */
const describe = (i: ArgusItem) =>
  `${i.title}${i.original ? ` (${i.original})` : ""}: ${[i.kind, i.release?.slice(0, 4), i.genres.slice(0, 3).join("/"), i.runtime ? `${i.runtime} dk` : null, i.series ? `${i.series.aired} bölüm` : null, i.status].filter(Boolean).join(", ")}`;

const num = (v: unknown, d = 0) => (typeof v === "number" ? v : Number(v ?? d)) || d;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

const QUICK_LABEL: Record<QuickKey, [string, string]> = {
  wifi: ["Wi-Fi açıldı", "Wi-Fi kapatıldı"],
  bluetooth: ["Bluetooth açıldı", "Bluetooth kapatıldı"],
  dark: ["Karanlık mod açıldı", "Aydınlık moda geçildi"],
  mute: ["Ses kapatıldı", "Ses açıldı"],
  mic: ["Mikrofon kapatıldı", "Mikrofon açıldı"],
};

/** Aracı çalıştırır; modele dönen sonuç ve sohbette gösterilecek etiket. */
export async function runTool(name: string, args: Record<string, unknown>): Promise<{ result: string; note: ToolNote }> {
  const s = useNook.getState();
  try {
    switch (name) {
      case "set_alarm": {
        const hour = Math.min(23, Math.max(0, Math.round(num(args.hour))));
        const minute = Math.min(59, Math.max(0, Math.round(num(args.minute))));
        const repeat = (["once", "daily", "weekdays", "weekend"].includes(str(args.repeat)) ? str(args.repeat) : "once") as Repeat;
        // "Yarın 8'de" → saat henüz 8 olmasa bile yarına kur
        let at: number | undefined;
        let when = "";
        if (repeat === "once" && args.day_offset != null) {
          const d = new Date();
          d.setDate(d.getDate() + Math.max(0, Math.round(num(args.day_offset))));
          d.setHours(hour, minute, 0, 0);
          if (d.getTime() > Date.now()) {
            at = d.getTime();
            when = num(args.day_offset) === 1 ? "yarın " : num(args.day_offset) >= 2 ? d.toLocaleDateString("tr-TR", { weekday: "long" }) + " " : "bugün ";
          }
        }
        const silent = args.silent === true || args.silent === "true";
        s.addAlarm({ hour, minute, label: str(args.label), repeat, at, silent });
        const t = clock({ hour, minute });
        const name = str(args.label) ? ` (${str(args.label)})` : "";
        return {
          result: `Alarm ${when}${t} için kuruldu${name}, tekrar: ${REPEAT_LABEL[repeat]}.`,
          note: { icon: "alarm", text: `${when ? when[0].toUpperCase() + when.slice(1) : ""}${t}${name} · ${REPEAT_LABEL[repeat]}${silent ? " · sessiz" : ""}` },
        };
      }
      case "set_timer": {
        const minutes = Math.max(1, num(args.minutes, 5));
        const at = Date.now() + minutes * 60_000;
        const d = new Date(at);
        s.addAlarm({ hour: d.getHours(), minute: d.getMinutes(), label: str(args.label) || `${minutes} dk zamanlayıcı`, repeat: "once", oneShot: true, at });
        return { result: `${minutes} dakikalık zamanlayıcı kuruldu, ${clock({ hour: d.getHours(), minute: d.getMinutes() })}'de çalacak.`, note: { icon: "alarm", text: `${minutes} dk sonra çalacak` } };
      }
      case "quick_set": {
        const key = str(args.key) as QuickKey;
        if (!(key in QUICK_LABEL)) throw new Error("bilinmeyen ayar");
        const on = args.on === true || args.on === "true";
        await quickSet(key, on);
        const text = QUICK_LABEL[key][on ? 0 : 1];
        return { result: `${text}.`, note: { icon: "toggle", text } };
      }
      case "focus": {
        if (str(args.action) === "stop") {
          stopFocus();
          return { result: "Odak sayacı durduruldu.", note: { icon: "focus", text: "Odak bitti" } };
        }
        const mins = args.minutes != null ? Math.min(180, Math.max(1, Math.round(num(args.minutes)))) : s.settings.focusWork;
        startFocus("work", 0, mins);
        return { result: `${mins} dakikalık odak başladı.`, note: { icon: "focus", text: `${mins} dk odak başladı` } };
      }
      case "add_note": {
        const text = str(args.text).trim();
        s.setNote(s.note ? `${s.note}\n${text}` : text);
        return { result: `Nota eklendi: ${text}`, note: { icon: "note", text: `Nota eklendi: ${text}` } };
      }
      case "media": {
        const action = str(args.action) as "toggle" | "next" | "prev";
        if (!s.media) return { result: "Şu an çalan bir şey yok.", note: { icon: "music", text: "Çalan bir şey yok" } };
        await mediaControl(action);
        const text = action === "next" ? "Sonraki parça" : action === "prev" ? "Önceki parça" : s.media.playing ? "Duraklatıldı" : "Oynatılıyor";
        return { result: `${text}.`, note: { icon: "music", text } };
      }
      case "open_app": {
        const q = str(args.name).toLocaleLowerCase("tr");
        const apps = await listApps();
        const hit =
          apps.find((a) => a.name.toLocaleLowerCase("tr") === q) ??
          apps.find((a) => a.name.toLocaleLowerCase("tr").startsWith(q)) ??
          apps.find((a) => a.name.toLocaleLowerCase("tr").includes(q));
        if (!hit) return { result: `"${args.name}" adında bir uygulama bulamadım.`, note: { icon: "error", text: `${args.name} bulunamadı` } };
        await openPath(hit.path);
        return { result: `${hit.name} açıldı.`, note: { icon: "app", text: `${hit.name} açıldı` } };
      }
      case "web_search": {
        const query = str(args.query);
        await openPath(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        return { result: `Tarayıcıda "${query}" araması açıldı.`, note: { icon: "web", text: `"${query}" aranıyor` } };
      }
      case "set_user_name": {
        const name = str(args.name).trim();
        s.updateSettings({ userName: name });
        playAntic("love");
        return { result: `Kullanıcının adı kaydedildi: ${name}`, note: { icon: "memory", text: `Adın: ${name}` } };
      }
      case "remember": {
        const fact = str(args.fact).trim();
        s.updateSettings({ memories: [...s.settings.memories.filter((m) => m !== fact), fact].slice(-30) });
        playAntic("love");
        return { result: `Kaydedildi: ${fact}`, note: { icon: "memory", text: `Hatırlayacağım: ${fact}` } };
      }
      case "argus_overview": {
        const snap = useArgus.getState().snap;
        if (!snap) return { result: "Argus bu bilgisayarda yok.", note: { icon: "error", text: "Argus yok" } };
        const w = watching(snap).map((i) => `${i.title}: ${i.series!.next ? `sıradaki ${epLabel(i.series!.next)} ${i.series!.next.name}` : "güncel"} (${i.series!.seen}/${i.series!.aired})`);
        const cal = calendar(snap).slice(0, 8).map((c) => `${dayLabel(c.date)}: ${c.item.title} ${epLabel(c.ep)}`);
        const st = weekStats(snap)!;
        return {
          result: [`İzlediği diziler: ${w.join("; ") || "yok"}`, `Takvim: ${cal.join("; ") || "yakında bölüm yok"}`, `Son 7 gün: ${st.episodes} bölüm, ${st.movies} film`].join("\n"),
          note: { icon: "argus", text: "Argus'a baktım" },
        };
      }
      case "argus_suggest": {
        const snap = useArgus.getState().snap;
        const kind = (["film", "dizi", "all"].includes(str(args.kind)) ? str(args.kind) : "all") as "film" | "dizi" | "all";
        const pool = pickPool(snap, { kind, maxMinutes: args.max_minutes != null ? num(args.max_minutes) : null, genre: str(args.genre) || null });
        if (!pool.length) return { result: "Bu ölçülere uyan, izlenecekler listesinde çıkmış bir yapım yok.", note: { icon: "argus", text: "Uygun yapım yok" } };
        const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, 8);
        return {
          result: `Adaylar (${pool.length} içinden):\n${picks.map(describe).join("\n")}`,
          note: { icon: "argus", text: `${pool.length} izlenecek arasından seçtim` },
        };
      }
      case "argus_find": {
        const it = matchTitle(useArgus.getState().snap, str(args.title));
        if (!it) return { result: `Argus'ta "${args.title}" bulunamadı.`, note: { icon: "error", text: `${args.title} bulunamadı` } };
        const sr = it.series;
        return {
          result: `${describe(it)}${it.score != null ? `, puanı ${it.score.toFixed(1)}` : ""}${sr ? `, ${sr.seen}/${sr.aired} bölüm izlendi${sr.next ? `, sıradaki ${epLabel(sr.next)}` : ""}` : ""}`,
          note: { icon: "argus", text: it.title },
        };
      }
      case "argus_mark_watched": {
        const snap = useArgus.getState().snap;
        const it = matchTitle(snap, str(args.title));
        if (!it) return { result: `Argus'ta "${args.title}" bulunamadı.`, note: { icon: "error", text: `${args.title} bulunamadı` } };
        let ep: { season: number; episode: number } | null = null;
        if (it.series) {
          ep = args.episode != null ? { season: args.season != null ? num(args.season) : (it.series.next?.season ?? 1), episode: num(args.episode) } : (parseEpisode(str(args.title)) ?? it.series.next);
          if (!ep) return { result: `${it.title} dizisinin çıkmış bütün bölümleri zaten izlenmiş.`, note: { icon: "argus", text: `${it.title} güncel` } };
        }
        await markWatched(it, ep);
        const fresh = findItem(it.id);
        return {
          result: `${it.title}${ep ? ` ${epLabel(ep)}` : ""} izlendi olarak işaretlendi.${fresh?.series?.next ? ` Sıradaki: ${epLabel(fresh.series.next)}.` : ""}`,
          note: { icon: "argus", text: `${it.title}${ep ? ` ${epLabel(ep)}` : ""} izlendi` },
        };
      }
      default:
        return { result: `Bilinmeyen araç: ${name}`, note: { icon: "error", text: `Bilinmeyen araç: ${name}` } };
    }
  } catch (e) {
    return { result: `Hata: ${String(e)}`, note: { icon: "error", text: `Yapılamadı: ${String(e)}` } };
  }
}

/** Kişilik + o anki bağlam (saat, müzik, hava, alarm, piller, hatıralar). */
export function systemPrompt(): string {
  const s = useNook.getState();
  const now = new Date();
  const lines = [
    "Senin adın Nook. Kullanıcının Windows bilgisayarında, ekranın üst kenarındaki çentikte yaşayan sevimli bir maskotsun.",
    "Görünüşün: yuvarlak beyaz bir küre, iki siyah hap göz, bazen beliren küçük yüzen eller.",
    "Kişiliğin: neşeli, meraklı, biraz şakacı ve kullanıcına bağlı. Her zaman Türkçe konuş.",
    "Kullanıcıyla konuşuyorsun: ona asla 'Nook' diye hitap etme, Nook sensin. Adını biliyorsan adıyla, bilmiyorsan hitapsız konuş.",
    "Kısa konuş: çoğunlukla 1-2 cümle. Emojiyi çok az kullan. Yapay zekâ olduğunu vurgulama.",
    "Bir iş istenirse (alarm, zamanlayıcı, odak, Wi-Fi, mikrofon, not, müzik, uygulama, arama) uygun aracı kullan.",
    "Kullanıcı ekran görüntüsü eklediyse görüntüye bakarak somut, adım adım ama kısa cevap ver.",
    "Aracı kullandıktan sonra ne yaptığını onaylayan tek, doğal bir cümle kur. Örnek: 'Tamam, yarın 08:00'e toplantı alarmını kurdum!'",
    "Araçları yalnızca kullanıcı açıkça isterse kullan. Saat ya da gün belirsizse önce sor.",
    "",
    `Şu an: ${now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, saat ${now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}.`,
  ];
  if (s.settings.userName) lines.push(`Kullanıcının adı: ${s.settings.userName}.`);
  if (s.media) lines.push(`${s.media.playing ? "Çalıyor" : "Duraklatılmış"}: "${s.media.title}"${s.media.artist ? ` — ${s.media.artist}` : ""}.`);
  if (s.weather) lines.push(`Hava (${s.weather.city}): ${s.weather.temp}°, en yüksek ${s.weather.high}°, en düşük ${s.weather.low}°, yağış ihtimali %${s.weather.rainChance}.`);
  const alarms = s.alarms.filter((a) => a.enabled && a.next).sort((a, b) => a.next! - b.next!);
  if (alarms.length) lines.push(`Kurulu alarmlar: ${alarms.map((a) => `${clock(a)}${a.label ? ` (${a.label})` : ""}`).join(", ")}.`);
  const d = s.devices;
  const dev = [d?.headset && `kulaklık %${d.headset.percent}`, d?.mouse && `mouse %${d.mouse.percent}`, d?.fan && `vantilatör ${d.fan.on ? "açık" : "kapalı"}`].filter(Boolean);
  if (dev.length) lines.push(`Cihazlar: ${dev.join(", ")}.`);
  if (s.stats?.battery) lines.push(`Bilgisayar pili: %${s.stats.battery.percent}${s.stats.battery.charging ? " (şarjda)" : ""}.`);
  if (s.note) lines.push(`Kullanıcının hızlı notu: ${s.note.replace(/\n/g, " / ")}`);
  if (s.focus) lines.push(`Odak sayacı: ${PHASE_LABEL[s.focus.phase]}, ${mmss(remaining(s.focus))} kaldı${s.focus.endsAt === null ? " (duraklatıldı)" : ""}.`);
  if (!s.online) lines.push("İnternet bağlantısı şu an yok.");
  const argus = useArgus.getState().snap;
  if (argus) {
    const w = watching(argus).slice(0, 5).map((i) => i.title);
    lines.push(`Kullanıcının Argus adlı dizi/film arşivi var (izledikleri, izleyecekleri). ${w.length ? `Şu an izlediği diziler: ${w.join(", ")}. ` : ""}Dizi/film soruları ve "ne izlesem" için argus_* araçlarını kullan.`);
  }
  if (s.settings.memories.length) lines.push("", "Kullanıcı hakkında hatırladıkların:", ...s.settings.memories.map((m) => `- ${m}`));
  return lines.join("\n");
}
