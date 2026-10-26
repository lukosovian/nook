/**
 * Yalnızca geliştirme: `?preview=<durum>` ile adayı örnek verilerle belirli bir duruma sokar.
 * Tarayıcıda tasarım incelemesi ve ekran görüntüsü için. Üretim paketine girmez.
 *   ?preview=collapsed | music | osd | toast | search | <sekme adı: media, shelf, clip, note, devices, stats, settings>
 */
import { MotionGlobalConfig } from "motion/react";
import { dayKey, useNook, type Tab } from "../store/nook";
import { useArgus, type ArgusItem } from "../lib/argus";
import { usePowerTimer } from "../lib/powerTimer";
import { useClaude, type ClaudeAsk } from "../lib/claude";

const TABS: Tab[] = ["home", "modules", "chat", "media", "shelf", "clip", "note", "alarm", "focus", "apps", "notify", "devices", "control", "stats", "play", "report", "today", "argus", "look", "calendar", "remind", "settings", "year", "claude", "whatsapp", "hum"];

const ART =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#ff375f'/><stop offset='0.5' stop-color='#bf5af2'/><stop offset='1' stop-color='#0a84ff'/></linearGradient></defs><rect width='200' height='200' fill='url(#g)'/><circle cx='100' cy='100' r='46' fill='none' stroke='white' stroke-opacity='.5' stroke-width='6'/></svg>`,
  );

function day(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

function demoArgus() {
  const ep = (season: number, episode: number, name: string, date: string) => ({ season, episode, name, date });
  const show = (id: string, title: string, aired: number, seen: number, next: ReturnType<typeof ep> | null, upcoming: ReturnType<typeof ep>[], latest = next): ArgusItem => ({
    id, title, original: null, status: "İzleniyor", kind: "Dizi", genres: ["Bilim Kurgu", "Dram"], release: "2024-05-01", runtime: 50, score: 8.4, poster: null,
    recent: Date.now() - aired * 1000, watchDates: [], series: { aired, seen, position: seen, next, latest, upcoming, lastSeen: day(-1), seenToday: [] },
  });
  const items: ArgusItem[] = [
    show("a", "Star Trek: Starfleet Academy", 10, 8, ep(1, 9, "300. Gece", day(-7)), []),
    show("b", "Lanterns", 8, 7, ep(1, 8, "Yeşil Işık", day(0)), [ep(1, 9, "Karanlık", day(7))], ep(1, 8, "Yeşil Işık", day(0))),
    show("c", "Silo", 30, 5, ep(1, 6, "Obje", day(-400)), []),
    show("d", "Tuzlu Kahve", 5, 2, ep(1, 3, "3. Bölüm", day(-14)), [ep(1, 6, "6. Bölüm", day(4))]),
    { id: "m", title: "Bıçaklar Çekildi: Gizemli Bir Serüven", original: "Glass Onion: A Knives Out Mystery", status: "İzlenecek", kind: "Film", genres: ["Gizem", "Komedi"], release: "2022-11-23", runtime: 140, score: null, poster: null, recent: null, watchDates: [], series: null },
  ];
  useArgus.setState({
    snap: { profiles: ["Luko", "Zırtapoz"], dir: "C:\Users\OEM\Desktop\Argus", profile: "Luko", profileId: "p", boardId: "b", running: false, items, episodeDays: { [day(0)]: 2, [day(-1)]: 4 }, statuses: ["İzlenecek", "İzleniyor", "Yarım", "İzlendi"] },
    suggestion: new URLSearchParams(location.search).has("suggest") ? { itemId: "b", season: 1, episode: 8 } : null,
  });
}

function demoClaude(mode: string, params: URLSearchParams) {
  const now = Date.now();
  const base = { cwd: "", reply: "", startedAt: now - 3600_000, turnAt: now - 240_000, files: [] as string[], edits: 0, commands: 0 };
  const ask: ClaudeAsk | null =
    mode === "claudeask"
      ? { askId: 1, session: "a", project: "Nook", tool: "Bash", title: "Komut çalıştırmak istiyor", detail: "npm run tauri build -- --bundles nsis", questions: null, canAlways: true, at: now }
      : mode === "claudeq"
        ? { askId: 2, session: "a", project: "Nook", tool: "AskUserQuestion", title: "Sana soruyor", detail: "", canAlways: false, at: now, questions: [{ question: "Kartın rengi ne olsun?", multiSelect: false, options: [{ label: "Turuncu" }, { label: "Mor" }, { label: "Yeşil" }] }] }
        : null;
  useClaude.setState({
    setup: { present: true, hooked: !params.has("unhooked"), stale: false, statusline: "nook" },
    plan: { fiveHour: { usedPct: 37, resetsAt: now + 2 * 3600_000 + 14 * 60_000 }, sevenDay: { usedPct: 62, resetsAt: now + 3 * 86_400_000 }, updatedAt: now - (params.has("planstale") ? 24 : 1) * 60_000 },
    asks: ask ? [ask] : [],
    sessions: {
      a: { ...base, id: "a", project: "Nook", cwd: "C:/Users/OEM/Desktop/Nook", state: ask ? "waiting" : CLAUDE_IDLE.includes(mode) && !params.has("claudework") ? "done" : "working", action: ask ? "Onay bekliyor · npm run tauri build" : "Düzenliyor · ClaudePanel.tsx", prompt: "Claude Code entegrasyonunu ekle", updatedAt: now - 20_000, edits: 12, commands: 5, files: ["ClaudePanel.tsx", "claude.rs", "Panels.tsx"] },
      b: { ...base, id: "b", project: "argus", cwd: "C:/Users/OEM/Desktop/Argus", state: "done", action: "Bitti", prompt: "Takvimdeki boş günleri gizle", reply: "Boş günler artık takvimde görünmüyor; filtre ayarlara da eklendi.", updatedAt: now - 9 * 60_000, edits: 3, commands: 2, files: ["calendar.js"] },
    },
  });
  if (ask) useNook.setState({ claudeCard: true });
}

/** Kapalı ada önizlemeleri: örnek Claude oturumu ve yaklaşan etkinlik kapsülü ezmesin */
const CLAUDE_IDLE = ["music", "collapsed", "focusmini", "fish", "camp", "sleepcap", "split", "home", "homeq"];

const DEMO_NOTE = "# Hafta\n- [x] Market: **süt**, ekmek\n- [ ] Pazartesi sunum provası\n> `npm run build` unutma";

export function applyPreview(mode: string) {
  const params0 = new URLSearchParams(location.search);
  const tr = (new URLSearchParams(location.search).get("lang") ?? "tr") === "tr";
  if (!new URLSearchParams(location.search).has("noargus")) demoArgus();
  demoClaude(mode, new URLSearchParams(location.search));
  // Zamanlı kapatma kurulu görünsün
  if (params0.has("timeron")) usePowerTimer.setState({ timer: { at: Date.now() + 42 * 60_000, action: "shutdown", from: "phone" } });
  document.documentElement.style.background = "#3a4a5c";
  // Ekran görüntüsü animasyonun ortasında çekilmesin
  if (new URLSearchParams(location.search).has("still")) {
    MotionGlobalConfig.skipAnimations = true;
    const st = document.createElement("style");
    st.textContent = ".nook-fade{animation:none!important}";
    document.head.appendChild(st);
  }
  if (new URLSearchParams(location.search).has("happy")) useNook.setState({ affection: 90 });
  const s = useNook.getState();
  const now = performance.now();

  useNook.setState({
    media: {
      title: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      app: "Spotify.exe",
      playing: true,
      positionMs: 72_000,
      durationMs: 200_000,
      trackKey: "demo",
      artwork: ART,
      at: now,
    },
    stats: {
      cpu: 23,
      memUsed: 9.4 * 1024 ** 3,
      memTotal: 16 * 1024 ** 3,
      netDown: 2.4 * 1024 ** 2,
      netUp: 310 * 1024,
      diskUsed: 380 * 1024 ** 3,
      diskTotal: 476 * 1024 ** 3,
      battery: null,
      saver: false,
      gpu: 41,
    },
    netTotals: { down: 1.8 * 1024 ** 3, up: 210 * 1024 ** 2 },
    netHistory: Array.from({ length: 40 }, (_, i) => (Math.sin(i / 3) + 1.3) * 1e6 + Math.random() * 4e5),
    cpuHistory: Array.from({ length: 40 }, () => 10 + Math.random() * 30),
    devices: {
      lukonnect: true,
      mouse: { percent: 26, remainingSec: 84_000 },
      headset: { percent: 82, charging: "Şarj olmuyor" },
      fan: { on: true, speed: 60 },
    },
    clips: [
      { id: "c1", text: "#FF375F", color: "#FF375F", at: 1 },
      { id: "c2", text: "#30D158", color: "#30D158", at: 2 },
      { id: "c3", text: "#0A84FF", color: "#0A84FF", at: 3 },
      { id: "c4", text: "https://github.com/tauri-apps/tauri", color: null, at: 4 },
      { id: "c5", text: "Toplantı notları: perşembe 14:00", color: null, at: 5, pinned: true },
      { id: "c7", kind: "files", text: "rapor.pdf, sunum.docx", paths: ["C:/rapor.pdf", "C:/sunum.docx"], color: null, at: 7, app: "explorer" },
      { id: "c8", kind: "image", text: "1920×1080", path: "C:/x.png", color: null, at: 8, app: "snippingtool" },
      { id: "c6", text: "npm run tauri build", color: null, at: 6 },
    ],
    shelf: [
      { id: "s1", path: "C:/rapor.pdf", name: "rapor.pdf", ext: "pdf", size: 1_240_000, isDir: false, isImage: false, addedAt: 1 },
      { id: "s2", path: "C:/proje.zip", name: "proje.zip", ext: "zip", size: 48_000_000, isDir: false, isImage: false, addedAt: 2, pinned: true },
      { id: "s3", path: "C:/sunum.docx", name: "sunum.docx", ext: "docx", size: 380_000, isDir: false, isImage: false, addedAt: 3 },
      { id: "s4", path: "C:/Fotoğraflar", name: "Fotoğraflar", ext: "", size: 0, isDir: true, isImage: false, addedAt: 4 },
    ],
    alarms: [
      { id: "a1", hour: 7, minute: 30, label: tr ? "Kalk" : "Wake up", repeat: "weekdays", enabled: true, next: Date.now() + 8.5 * 3600_000 },
      { id: "a2", hour: 14, minute: 0, label: tr ? "Toplantı" : "Meeting", repeat: "once", enabled: false, next: null },
    ],
    note: mode === "note" ? DEMO_NOTE : "",
    pads: [
      { id: "p1", title: "Not 1", text: DEMO_NOTE, at: Date.now() },
      { id: "p2", title: "Fikirler", text: "Raf sallama", at: Date.now() },
      { id: "p3", title: "Not 3", text: "", at: Date.now() },
    ],
    padId: "p1",
    stopwatch: mode === "watchmini" || params0.has("sw") ? { startedAt: Date.now() - 754_300, acc: 0, laps: params0.has("sw") ? [512_400, 260_100] : [] } : null,
    extSyncedAt: 0,
    extEvents: CLAUDE_IDLE.includes(mode) && !params0.has("event") ? [] : [
      { id: "e1", day: dayKey(), time: "14:00", title: "Sprint planlama", start: Date.now() + 12 * 60_000, end: Date.now() + 72 * 60_000, allDay: false },
      { id: "e2", day: dayKey(), time: "", title: "Annemin doğum günü", start: Date.now(), end: Date.now() + 86_400_000, allDay: true },
    ],
    focus: mode === "focus" && !params0.has("sw") ? { phase: "work", endsAt: Date.now() + 14 * 60_000 + 5000, left: 0, total: 25 * 60_000, round: 2 } : null,
    notifications: [
      { id: 1, app: "Discord", appId: "d", title: "Ayşe", body: "Akşam maça geliyor musun?", icon: null, at: Date.now() - 3 * 60_000 },
      { id: 2, app: "WhatsApp", appId: "w", title: "Annem", body: "Eve gelirken ekmek al", icon: null, at: Date.now() - 50 * 60_000 },
      { id: 3, app: "Outlook", appId: "o", title: "Toplantı daveti", body: "Perşembe 14:00 · Proje değerlendirme", icon: null, at: Date.now() - 4 * 3600_000 },
    ],
    pinnedApps: [
      { id: "p1", name: "Spotify", path: "x" },
      { id: "p2", name: "Discord", path: "y" },
      { id: "p3", name: "Steam", path: "z" },
    ],
    // &homekeys: ana sayfanın alt sırasında kısayol tuşları
    deck: params0.has("homekeys")
      ? [
          { id: "d-mic", label: "Mikrofon", icon: "mic", color: "#f2a33a", steps: [{ kind: "quick", key: "mic" }], home: true },
          { id: "k2", label: "Oyun modu", icon: "scene", color: "#8f6bff", steps: [{ kind: "quick", key: "mic", on: false }, { kind: "open", path: "y", name: "Discord" }, { kind: "power", action: "desktop" }], home: true, hotkey: "Ctrl+Alt+1" },
          { id: "d-lock", label: "Kilitle", icon: "lock", color: "#3fbfa5", steps: [{ kind: "power", action: "lock" }], home: true },
        ]
      : null,
    automations: [
      { id: "a1", label: "Gece modu", on: true, only: [{ kind: "notGame" }, { kind: "between", from: "22:00", to: "02:00" }], last: Date.now() - 86_400_000, when: { kind: "time", at: "23:00", days: [] }, steps: [{ kind: "quick", key: "dark", on: true }, { kind: "brightness", value: 30 }, { kind: "volume", value: 20 }, { kind: "say", text: "Gece moduna geçtim, ekranı kararttım" }] },
      { id: "a4", label: "Eve hoş geldin", on: true, ask: true, last: Date.now() - 40 * 60_000, when: { kind: "phone", event: "home" }, steps: [{ kind: "say", text: "Hoş geldin! Müziği açayım mı?" }, { kind: "media", action: "toggle" }] },
      { id: "a2", label: "Discord açılınca", on: true, when: { kind: "app", name: "Discord" }, steps: [{ kind: "quick", key: "mic", on: false }] },
      { id: "a3", label: "Ayrılınca mikrofon kapansın", on: false, when: { kind: "lock", locked: true }, steps: [{ kind: "quick", key: "mic", on: true }] },
    ],
    autoLog: [
      { id: "a4", label: "Eve hoş geldin", at: Date.now() - 40 * 60_000, status: "ran" },
      { id: "a2", label: "Discord açılınca", at: Date.now() - 3 * 3600_000, status: "ran" },
      { id: "a1", label: "Gece modu", at: Date.now() - 86_400_000, status: "ran" },
      { id: "a1", label: "Gece modu", at: Date.now() - 2 * 86_400_000, status: "skipped" },
      { id: "a4", label: "Eve hoş geldin", at: Date.now() - 2 * 86_400_000 - 3600_000, status: "declined" },
    ],
    // &ask: adada "çalışsın mı?" kartı
    autoAsk: params0.has("ask") ? { id: "a4", label: "Eve hoş geldin", detail: "Telefon eve gelince" } : null,
    scores: { catch: 17, simon: 6 },
    days: Object.fromEntries(
      // İki hafta: karne geçen haftayla kıyaslar
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const j = i % 7;
        const k = i < 7 ? 1 : 0.7;
        return [key, { music: 60 + j * 9, focus: Math.round([45, 90, 20, 75, 0, 110, 60][j] * k), pomodoros: Math.round([2, 4, 1, 3, 0, 4, 2][j] * k), game: [30, 0, 120, 0, 200, 15, 40][j], active: [260, 410, 180, 380, 90, 450, 300][j], notifs: 12, care: 8, moodSum: 70 * 60, moodN: 60, water: [3, 5, 2, 4, 6, 1, 4][j], mouse: 41_000 + j * 9000 }];
      }),
    ),
    weather: { city: "İstanbul", temp: 18, high: 21, low: 13, sky: "partly", isDay: true, rainChance: 20, at: Date.now() },
    diary: (() => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return {
        [dayKey(y)]: { text: "Bugün Luko Figma'ya öyle bir daldı ki farenin pili %7'ye kadar düştü, ben de bir ara pil yerine ona kahve önerecektim. Araya iki bölüm Mehmed sıkıştırdı, sonra suçluluk duygusuyla dört saat VS Code'a gömüldü. İmleç bugün tam 1,3 km yürüdü; ben olsam yorulurdum. Neyse ki beş bardak suyu unutmadı, aferin ona.", at: Date.now() - 9 * 3600_000 },
        [dayKey()]: { text: "Sabah Spotify açıldı, öğlen Discord, akşam yine Figma: Luko'nun günü bir üçgen gibiydi. Ben de köşemde oturup ona su hatırlattım, iki kez dinledi. Fare bugün 900 metre yol yaptı, benden daha sportif.", at: Date.now() - 600_000 },
      };
    })(),
    // Oyun geçmişi: bir yıldan fazla, her gün değil
    gameLog: Object.fromEntries(
      Array.from({ length: 420 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if ((i * 7) % 5 > 2) return null;
        const games: Record<string, number> = {};
        if (i % 3 !== 1) games["Valorant"] = (40 + ((i * 37) % 110)) * 60;
        if (i % 4 === 0) games["Elden Ring"] = (60 + ((i * 53) % 140)) * 60;
        if (i % 6 === 2) games["Rocket League"] = (20 + ((i * 11) % 50)) * 60;
        if (i % 9 === 5) games["Minecraft"] = (30 + ((i * 29) % 90)) * 60;
        return Object.keys(games).length ? [dayKey(d), games] : null;
      }).filter((x): x is [string, Record<string, number>] => !!x),
    ),
    privacy: { mic: mode === "privacy" || TABS.includes(mode as Tab) ? ["Discord"] : [], camera: [] },
  });
  // ?lyrics → şarkı sözleri açık · ?live → yayın maskesi · yıl özeti örnek verisi
  if (params0.has("lyrics")) useNook.setState({ settings: { ...useNook.getState().settings, lyrics: true } });
  if (params0.has("live")) useNook.setState({ liveManual: true, liveAuto: { on: true, source: "Teams" } });
  {
    const y = String(new Date().getFullYear());
    const hours = Array.from({ length: 24 }, (_, h) => Math.round(Math.max(0, Math.sin(((h - 7) / 24) * Math.PI * 2) * 900 + (h >= 20 ? 1200 : 0) + (h < 2 ? 700 : 0))));
    useNook.setState({
      year: {
        [y]: {
          active: 52_000, music: 14_400, focus: 6_200, pomodoros: 214, game: 9_800, notifs: 3_120, care: 860, water: 412, plays: 96, feeds: 143, songs: 2_870,
          hours, days: Array.from({ length: 180 }, (_, i) => dayKey(new Date(Date.now() - i * 86_400_000))),
          artists: { "The Weeknd": 2_100, "Sezen Aksu": 1_640, "Daft Punk": 980, Tarkan: 700 },
        },
      },
      scores: { catch: 17, simon: 9, whack: 42, aim: 31 },
    });
  }
  const params = new URLSearchParams(location.search);
  // ?ask=… → soruyu yerel yapay zekâya gönder (uçtan uca sohbet testi)
  const ask = params.get("ask");
  if (ask) window.setTimeout(() => void import("../lib/chat").then((m) => m.sendChat(ask)), 800);
  // ?dd=N → N. açılır seçimi aç (menü adanın içinde mi denetimi)
  const dd = params.get("dd");
  if (dd)
    window.setTimeout(() => {
      const b = document.querySelectorAll<HTMLButtonElement>("[data-dropdown]")[Number(dd)];
      b?.scrollIntoView({ block: "center" });
      window.setTimeout(() => b?.click(), 150);
    }, 900);
  const expr = params.get("expr");
  if (expr) useNook.setState({ antic: expr as never });
  // ?sleep=blanket|bubble|nap → uyku; ?talk → sohbette cevap yazıyor; ?dance=N → dans figürü
  const sleep = params.get("sleep");
  if (sleep) useNook.setState({ asleep: true, media: null });
  if (params.has("talk")) useNook.setState({ talking: true, chatBusy: true, media: null });
  if (expr) useNook.setState({ media: null });
  // ?busy → Nook düşünür (yörünge gözler + mavi rozet)
  if (params.has("busy")) useNook.setState({ busy: ["preview"] });
  // Açılış animasyonu yalnızca ?preview=intro'da
  useNook.setState({ intro: mode === "intro", toured: true, settings: { ...useNook.getState().settings, weather: false, dailySummary: false } });
  // Yeni sürümün notu kendiliğinden açılıp önizlenen paneli örtmesin
  if (mode !== "notes") void import("../lib/notes").then((m) => useNook.setState({ notesSeen: m.latestNote().version }));
  // Tanıtım videosu adayı kendisi sürer (dev/Reel): durum dondurulmaz
  if (mode === "reel" || mode === "reel03") return;
  // ?profile=work|game|fun → ana sayfa profili
  const profile = params.get("profile");
  if (profile) useNook.getState().updateSettings({ homeProfile: profile as never });
  // ?lock → parola kilidi açık (yalnızca görünüm: hiçbir parola tutmaz)
  if (params.has("lock")) useNook.getState().updateSettings({ lockEnabled: true, lockHash: "00:" + "x" });
  if (mode === "calendar" && !useNook.getState().events.length) {
    const st = useNook.getState();
    const d = (n: number) => dayKey(new Date(Date.now() + n * 86_400_000));
    st.addEvent({ day: d(0), time: "10:30", title: "Sprint toplantısı", remind: 10 });
    st.addEvent({ day: d(0), time: "", title: "Annemi ara", remind: -1 });
    st.addEvent({ day: d(0), time: "19:00", title: "Halı saha", remind: 60 });
    st.addEvent({ day: d(3), time: "14:00", title: "Diş hekimi", remind: 1440 });
    st.addEvent({ day: d(9), time: "", title: "Kira", remind: 0 });
  }
  if (mode === "remind" && !useNook.getState().events.length) {
    const st = useNook.getState();
    const at = (min: number) => {
      const x = new Date(Date.now() + min * 60_000);
      return { day: dayKey(x), time: x.toTimeString().slice(0, 5) };
    };
    st.addEvent({ ...at(12), title: "Çamaşırı as", remind: 0, reminder: true });
    st.addEvent({ ...at(95), title: "İlacını iç", remind: 0, reminder: true });
    st.addEvent({ ...at(60 * 20), title: "Faturayı öde", remind: 0, reminder: true });
    st.addEvent({ day: dayKey(new Date(Date.now() + 86_400_000)), time: "10:30", title: "Sprint toplantısı", remind: 10 });
    st.addEvent({ ...at(-90), title: "Kargoyu al", remind: -1, reminder: true });
  }
  // ?scroll=px → görünüm panelinin aşağısı
  // ?askclip → Pano'daki ilk metin çeviri izni bekliyor (Gemini anahtarı yok)
  if (params.has("askclip")) {
    const c = useNook.getState().clips.find((x) => !x.color && (x.kind ?? "text") === "text");
    if (c) useNook.getState().patchClip(c.id, { askTranslate: true, translation: undefined });
  }
  if (params.get("scroll")) window.setInterval(() => document.querySelectorAll(".overflow-y-auto").forEach((el) => (el.scrollTop = Number(params.get("scroll")))), 500);
  // ?sec=Başlık → Ayarlar'da o bölüme kaydır
  if (params.get("sec")) window.setInterval(() => document.querySelector(`[data-sec="${params.get("sec")}"]`)?.scrollIntoView({ block: "start" }), 500);
  // ?look=şekil,göz,gözlük,başlık,boyun,doku&color=… &name=…
  const q = new URLSearchParams(location.search);
  const lk = q.get("look")?.split(",");
  if (lk || q.get("color") || q.get("name")) {
    const cur = useNook.getState().settings;
    const look = lk ? { shape: lk[0], eyes: lk[1] ?? "pill", glasses: lk[2] ?? "none", head: lk[3] ?? "none", neck: lk[4] ?? "none", texture: lk[5] ?? "smooth" } : cur.look;
    useNook.setState({ settings: { ...cur, look: look as typeof cur.look, faceColor: q.get("color") ?? cur.faceColor, nookName: q.get("name") ?? cur.nookName } });
  }

  if (mode === "move") {
    // ?preview=move&fx=beam → kaybolup belirmeyi döngüde oynatır (fx yoksa sırayla hepsi)
    useNook.setState({ media: null });
    const fx = params.get("fx");
    const kinds = ["beam", "warp", "portal", "jump", "slide", "glitch"] as const;
    let i = 0;
    const cycle = () => {
      const kind = (fx as (typeof kinds)[number]) || kinds[i++ % kinds.length];
      useNook.setState({ move: { kind, dir: 1, phase: "out" }, relocating: true });
      window.setTimeout(() => useNook.setState({ move: { kind, dir: 1, phase: "in" }, relocating: false }), 700);
      window.setTimeout(() => useNook.setState({ move: null }), 1600);
    };
    cycle();
    window.setInterval(cycle, 2400);
  } else if (mode === "brief") {
    // ?dry → bugün su yok (taşma denetimi)
    if (params.has("dry")) {
      const days = useNook.getState().days;
      useNook.setState({ days: { ...days, [dayKey()]: { ...days[dayKey()], water: 0 } } });
    }
    // ?longline → uzun günün mesajı (taşma denetimi)
    if (params.has("longline"))
      localStorage.setItem("nook-today-line", JSON.stringify({ day: dayKey(), text: "Günaydın Luko! Bugün İstanbul parçalı bulutlu, akşam Lanterns'in yeni bölümü var; önce suyunu içmeyi unutma, sonra keyfine bak." }));
    useNook.setState({ media: null, brief: true, settings: { ...useNook.getState().settings, weather: false, userName: "Luko" } });
    window.setTimeout(() => useNook.setState({ weather: { city: "İstanbul", temp: 18, high: 21, low: 13, sky: "partly", isDay: true, rainChance: 20, at: Date.now() } }), 300);
  } else if (mode === "archive") {
    useNook.setState({
      media: null,
      hovered: true,
      pinned: true,
      tab: "archive",
      archive: {
        path: "C:\Users\Luko\Downloads\Ödev teslim.zip",
        kind: "zip",
        entries: [
          { path: "Görseller", size: 0, dir: true, encrypted: false },
          { path: "Görseller/çizim.png", size: 482_113, dir: false, encrypted: false },
          { path: "Görseller/kapak.jpg", size: 1_204_331, dir: false, encrypted: false },
          { path: "rapor.pdf", size: 2_301_442, dir: false, encrypted: false },
          { path: "notlar.txt", size: 3_120, dir: false, encrypted: false },
          { path: "gizli.docx", size: 88_000, dir: false, encrypted: true },
        ],
      },
    });
  } else if (mode === "report" || mode === "notes") {
    // Karne ve yama notları artık Nook Studio'da: ?preview=notes&v=0.3.0 → Studio'nun o notu
    const v = params.get("v");
    location.replace(`/?preview=studio&still#${mode}${mode === "notes" && v ? `:${v}` : ""}`);
  } else if (mode === "tour") {
    useNook.setState({ media: null, tour: true, tourStep: Number(params.get("step") ?? 0) });
  } else if (TABS.includes(mode as Tab)) {
    if (mode === "notify" && !useNook.getState().nookNotifs.length) {
      const at = Date.now();
      useNook.setState({
        nookNotifs: [
          { id: "n1", kind: "argus", title: "Bölüm işaretlendi", detail: "Lanterns S1B8", at: at - 2 * 60_000 },
          { id: "n2", kind: "argus", title: "Africa · Toto", detail: "Lanterns S1B2 · 18:40 · Argus'a eklendi", icon: ART, at: at - 14 * 60_000 },
          { id: "n3", kind: "usb-in", title: "USB takıldı", detail: "SanDisk 64 GB", at: at - 70 * 60_000 },
          { id: "n4", kind: "battery-low", title: "Pil azaldı", detail: "%15 kaldı", at: at - 5 * 3_600_000 },
        ],
      });
    }
    if (mode === "hum" && !useNook.getState().hums.length) {
      const at = Date.now();
      useNook.setState({
        hums: [
          { id: "a", key: "a", title: "Never Gonna Give You Up", artist: "Rick Astley", album: "Whenever You Need Somebody", cover: ART, at: at - 4 * 60_000, auto: false },
          { id: "b", key: "b", title: "Bir Derdim Var", artist: "mor ve ötesi", album: "Dünya Yalan Söylüyor", cover: ART, at: at - 52 * 60_000, auto: true },
          { id: "c", key: "c", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", cover: null, at: at - 26 * 3_600_000, auto: true },
          { id: "d", key: "d", title: "Gülpembe", artist: "Barış Manço", album: "Sahibinden İhtiyaçtan", cover: ART, at: at - 4 * 86_400_000, auto: false },
        ],
      });
    }
    useNook.setState({ hovered: true, tab: mode as Tab });
    // ?newcomer → ilk haftadaki kullanıcı (çiplerde açıklama)
    if (params.has("newcomer")) useNook.setState({ days: {}, moduleUse: {} });
    // ?pos=0.8,0.85 → ada taşınmış (ekranın oranı olarak)
    const pos = params.get("pos")?.split(",").map(Number);
    if (pos?.length === 2) useNook.getState().updateSettings({ islandPos: { fx: pos[0], fy: pos[1] } });
    // ?big → tam ekran
    if (params.has("big")) window.setTimeout(() => void import("../lib/big").then((m) => m.enterBig()), 100);
    // ?bigstate → büyük adanın düzeni doğrudan (tarayıcıda pencere büyütülemez)
    if (params.has("bigstate")) useNook.setState({ big: { width: Math.min(1360, window.innerWidth - 56), height: Math.min(820, window.innerHeight - 48) } });
    // Panels açılınca çalan müzik yüzünden medyaya geçer; istenen sekmeye geri dön
    window.setTimeout(() => useNook.getState().setTab(mode as Tab), 50);
  } else if (mode.startsWith("osd")) {
    s.setMedia(null);
    const v = { osd: [0.62, false, 1], osddown: [0.3, false, -1], osdloud: [0.92, false, 1], osdmute: [0.4, true, -1], osdlight: [0.7, false, 1] }[mode] ?? [0.62, false, 1];
    useNook.setState({ media: null, osd: { kind: mode === "osdlight" ? "brightness" : "volume", value: v[0] as number, muted: v[1] as boolean, dir: v[2] as number } });
  } else if (mode === "welcome") {
    useNook.setState({ media: null, toasts: [{ id: "w", kind: "welcome", title: "Az daha kayıp ilanı veriyordum, 1 saat 20 dakikadır yoktun", detail: "Luko, bir daha bu kadar uzun gitme, tamam mı?", ms: 99999 }] });
  } else if (mode === "toast") {
    useNook.setState({ media: null, toasts: [{ id: "t", kind: "device-low", title: "Mouse pili azalıyor", detail: "%10 kaldı" }] });
  } else if (mode === "search") {
    useNook.setState({ searching: true });
  } else if (mode === "collapsed" || mode === "privacy") {
    useNook.setState({ media: null });
  } else if (mode === "gate") {
    useNook.setState({ media: null, gate: true, notesSeen: "999", settings: { ...useNook.getState().settings, lockHash: "a:b" } });
  } else if (mode === "reminder" || mode === "drinking" || mode === "water") {
    useNook.setState({ media: null, reminder: { kind: "water", phase: mode === "drinking" ? "drinking" : "due" }, antic: mode === "drinking" ? "drink" : null });
  } else if (mode === "eye" || mode === "eyerest") {
    useNook.setState({ media: null, reminder: { kind: "eye", phase: mode === "eyerest" ? "resting" : "due" }, antic: "wink" });
  } else if (mode === "stretch" || mode === "stretching") {
    useNook.setState({ media: null, reminder: { kind: "stretch", phase: mode === "stretching" ? "stretching" : "due" }, antic: "stretch" });
  } else if (mode === "homeq") {
    // Müziksiz ana sayfa (çipler)
    useNook.setState({ media: null, hovered: true, tab: "home" });
  } else if (mode === "claudeask" || mode === "claudeq") {
    useNook.setState({ media: null });
  } else if (mode === "ringing") {
    useNook.setState({ media: null, ringing: { id: "r", hour: 7, minute: 30, label: tr ? "Toplantı" : "Meeting", repeat: "once", enabled: false, next: null } });
  } else if (mode === "feeding") {
    useNook.setState({ media: null, mood: "hungry" });
  } else if (mode === "hang" || mode === "fish" || mode === "camp") {
    useNook.setState({ media: null, outing: mode });
  } else if (mode === "sleepcap") {
    useNook.setState({ media: null, asleep: true });
  } else if (mode === "claudemini") {
    useNook.setState({ media: null });
  } else if (mode === "split") {
    // Müzik çalarken Pomodoro: ada bölünür
    useNook.setState({ focus: { phase: "work", endsAt: Date.now() + 14 * 60_000, left: 0, total: 25 * 60_000, round: 1 } });
  } else if (mode === "guard") {
    useNook.setState({ media: null, guard: { site: params.get("site") ?? "YouTube" }, focus: { phase: "work", endsAt: Date.now() + 14 * 60_000 + 5000, left: 0, total: 25 * 60_000, round: 1 } });
  } else if (mode === "focusmini") {
    useNook.setState({ media: null, focus: { phase: "work", endsAt: Date.now() + 14 * 60_000, left: 0, total: 25 * 60_000, round: 1 } });
  } else if (mode === "watchmini" || mode === "eventmini") {
    useNook.setState({ media: null });
  } else if (mode === "humlisten" || mode === "humfound" || mode === "hummiss") {
    // ?move=0–5 → dinlerkenki hareket
    const move = Number(params.get("move") ?? 0);
    const track = { key: "1", title: "Never Gonna Give You Up", artist: "Rick Astley", album: "Whenever You Need Somebody", released: "1987", cover: ART };
    useNook.setState({
      media: null,
      hum: mode === "humlisten" ? { phase: "listening", move } : mode === "humfound" ? { phase: "found", move, track } : { phase: (["silent", "noDevice", "error"].includes(params.get("phase") ?? "") ? params.get("phase") : "none") as "none", move, message: params.get("msg") ?? undefined },
    });
  } else if (mode === "listen") {
    useNook.setState({ media: null, listening: true });
  } else if (mode === "notifytoast") {
    useNook.setState({ media: null, toasts: [{ id: "n", kind: "notify", title: "Ayşe", detail: "Akşam maça geliyor musun?", ms: 99999 }] });
  } else if (mode === "download") {
    useNook.setState({ media: null, downloads: [{ id: "d", name: "kurulum.exe", received: 42e6, speed: 8.4 * 1024 ** 2 }] });
  } else if (mode === "updating" || mode === "restarting") {
    // Güncelleme kapsülü: ?p=yüzde
    useNook.setState({ media: null });
    void import("../lib/update").then((m) => m.useUpdate.setState({ available: "0.3.1", progress: mode === "restarting" ? 100 : Number(params.get("p") ?? 42), restarting: mode === "restarting" }));
  } else if (mode === "halloween" || mode === "knock" || mode === "candy" || mode === "trick") {
    useNook.setState({ media: null });
    void import("../lib/halloween").then((m) => {
      const p = mode === "candy" ? "candy" : mode === "trick" ? "trick" : mode === "knock" ? "knocking" : "asking";
      m.useHalloween.setState({ phase: p });
    });
  } else if (mode === "atmos") {
    const sky = (params.get("sky") ?? "rain") as any;
    useNook.setState({ media: null, weather: { city: "İstanbul", temp: 16, high: 18, low: 12, sky, isDay: params.get("night") !== "1", rainChance: 40, at: Date.now() } });
  }
  // "music": kapalı ada + mini oynatıcı (varsayılan veriler)

  // Önizlemede durumun kendiliğinden değişmesini engelle.
  const freeze = useNook.getState();
  useNook.setState = ((orig) => (partial: Parameters<typeof orig>[0], replace?: boolean) => {
    const next = typeof partial === "function" ? partial(useNook.getState()) : partial;
    const blocked = ["big", "hovered", "osd", "toasts", "searching", "antic", "tab", "guard", "outing"];
    const filtered = Object.fromEntries(Object.entries(next as object).filter(([k]) => !blocked.includes(k)));
    orig(filtered as never, replace as never);
  })(useNook.setState) as typeof useNook.setState;
  void freeze;
}
