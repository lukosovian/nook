//! "Hey Nook": seslenince dinleyen Nook.
//!
//! Mikrofon sürekli, yalnızca bu bilgisayarda dinlenir; hiçbir ses dışarı gitmez. Kullanıcı
//! Ayarlar'da "Hey Nook"u üç kez söyleyerek sesini tanıtır; her örneğin ses izi (MFCC) saklanır.
//! Konuşma başlayınca baştaki kısım örneklerle zaman esnetmeli karşılaştırmayla (DTW) ölçülür;
//! yeterince benziyorsa Nook uyanır, ardından söylenen komut kaydedilir ve sesli komutla aynı
//! yoldan ("nook://voice") Gemini'ye gider. Yani yalnızca "Hey Nook"tan sonraki cümle gönderilir.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

const RATE: usize = 16_000;
/// 10 ms'lik kare (hem ses etkinliği hem MFCC adımı)
const HOP: usize = 160;
const WIN: usize = 400;
const NFFT: usize = 512;
const NMEL: usize = 26;
const NCEP: usize = 12;
/// Tanıtım için kaç örnek
pub const NEED: usize = 3;

// ------------------------------------------------------------------ ayarlar ve örnekler

#[derive(Serialize, Deserialize, Default, Clone)]
struct Store {
    /// Her örneğin ses izi: kare × NCEP (ortalaması çıkarılmış)
    templates: Vec<Vec<Vec<f32>>>,
    /// Örneklerin kendi aralarındaki ortalama uzaklık (eşiğin temeli)
    base: f32,
}

fn store_path() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(|p| PathBuf::from(p).join("Nook").join("wake.json"))
}

fn load() -> Store {
    store_path().and_then(|p| std::fs::read(p).ok()).and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}

fn save(s: &Store) -> Result<(), String> {
    let p = store_path().ok_or("klasör yok")?;
    if let Some(d) = p.parent() {
        let _ = std::fs::create_dir_all(d);
    }
    std::fs::write(p, serde_json::to_vec(s).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

struct Config {
    enabled: bool,
    /// 0 (az tetiklenir) … 1 (kolay tetiklenir)
    sensitivity: f32,
}

static CONFIG: Mutex<Config> = Mutex::new(Config { enabled: false, sensitivity: 0.5 });
/// Tanıtım sürerken dinleyici tetiklenmesin
static ENROLLING: AtomicBool = AtomicBool::new(false);
/// Tanıtımda toplanan örnekler (kaydedilmeden önce)
static PENDING: Mutex<Vec<Vec<Vec<f32>>>> = Mutex::new(Vec::new());

struct Listener {
    stop: Arc<AtomicBool>,
}
static LISTENER: Mutex<Option<Listener>> = Mutex::new(None);
static APP: Mutex<Option<AppHandle>> = Mutex::new(None);

// ------------------------------------------------------------------ MFCC

struct Features {
    fft: Arc<dyn rustfft::Fft<f32>>,
    window: Vec<f32>,
    mel: Vec<Vec<(usize, f32)>>,
    dct: Vec<Vec<f32>>,
}

impl Features {
    fn new() -> Self {
        let fft = rustfft::FftPlanner::new().plan_fft_forward(NFFT);
        let window = (0..WIN).map(|i| 0.54 - 0.46 * (2.0 * std::f32::consts::PI * i as f32 / (WIN - 1) as f32).cos()).collect();
        let hz2mel = |f: f32| 2595.0 * (1.0 + f / 700.0).log10();
        let mel2hz = |m: f32| 700.0 * (10f32.powf(m / 2595.0) - 1.0);
        let (lo, hi) = (hz2mel(60.0), hz2mel(7600.0));
        let pts: Vec<f32> = (0..NMEL + 2).map(|i| mel2hz(lo + (hi - lo) * i as f32 / (NMEL + 1) as f32) * NFFT as f32 / RATE as f32).collect();
        let mel = (0..NMEL)
            .map(|m| {
                let (a, b, c) = (pts[m], pts[m + 1], pts[m + 2]);
                (a.floor() as usize..=c.ceil() as usize)
                    .filter(|&k| k <= NFFT / 2)
                    .filter_map(|k| {
                        let f = k as f32;
                        let w = if f < b { (f - a) / (b - a) } else { (c - f) / (c - b) };
                        (w > 0.0).then_some((k, w))
                    })
                    .collect()
            })
            .collect();
        let dct = (1..=NCEP)
            .map(|c| (0..NMEL).map(|m| (std::f32::consts::PI * c as f32 * (m as f32 + 0.5) / NMEL as f32).cos()).collect())
            .collect();
        Features { fft, window, mel, dct }
    }

    /// 16 kHz sesin MFCC'leri (c0 hariç), her kare için NCEP sayı
    fn mfcc(&self, x: &[f32]) -> Vec<Vec<f32>> {
        if x.len() < WIN {
            return Vec::new();
        }
        let mut out = Vec::with_capacity((x.len() - WIN) / HOP + 1);
        let mut buf = vec![rustfft::num_complex::Complex32::new(0.0, 0.0); NFFT];
        let mut start = 0;
        while start + WIN <= x.len() {
            for (i, b) in buf.iter_mut().enumerate() {
                *b = if i < WIN {
                    let prev = if start + i > 0 { x[start + i - 1] } else { 0.0 };
                    rustfft::num_complex::Complex32::new((x[start + i] - 0.97 * prev) * self.window[i], 0.0)
                } else {
                    rustfft::num_complex::Complex32::new(0.0, 0.0)
                };
            }
            self.fft.process(&mut buf);
            let logmel: Vec<f32> = self.mel.iter().map(|f| (f.iter().map(|&(k, w)| buf[k].norm_sqr() * w).sum::<f32>() + 1e-9).ln()).collect();
            out.push(self.dct.iter().map(|row| row.iter().zip(&logmel).map(|(a, b)| a * b).sum()).collect());
            start += HOP;
        }
        out
    }
}

/// Ortalamayı çıkar (mikrofon ve oda farkı silinsin)
fn normalize(mut f: Vec<Vec<f32>>) -> Vec<Vec<f32>> {
    if f.is_empty() {
        return f;
    }
    let n = f.len() as f32;
    let mean: Vec<f32> = (0..NCEP).map(|c| f.iter().map(|r| r[c]).sum::<f32>() / n).collect();
    for r in &mut f {
        for (v, m) in r.iter_mut().zip(&mean) {
            *v -= m;
        }
    }
    f
}

fn cos_dist(a: &[f32], b: &[f32]) -> f32 {
    let (mut ab, mut aa, mut bb) = (0f32, 0f32, 0f32);
    for (x, y) in a.iter().zip(b) {
        ab += x * y;
        aa += x * x;
        bb += y * y;
    }
    1.0 - ab / (aa.sqrt() * bb.sqrt() + 1e-9)
}

/// Örneğin, adayın başında (ilk 300 ms içinde başlayıp) geçtiği en iyi yer: ortalama kare uzaklığı ve bittiği kare
fn dtw(t: &[Vec<f32>], c: &[Vec<f32>]) -> (f32, usize) {
    let (n, m) = (t.len(), c.len());
    if n < 5 || m < n / 2 {
        return (f32::MAX, 0);
    }
    const FREE_START: usize = 30;
    let inf = f32::MAX / 4.0;
    let mut d = vec![inf; n * m];
    let mut l = vec![1f32; n * m];
    for j in 0..m {
        let cost = cos_dist(&t[0], &c[j]);
        if j < FREE_START {
            d[j] = cost;
        } else if d[j - 1] < inf {
            d[j] = d[j - 1] + cost;
            l[j] = l[j - 1] + 1.0;
        }
    }
    for i in 1..n {
        for j in 0..m {
            let cost = cos_dist(&t[i], &c[j]);
            let up = (d[(i - 1) * m + j], l[(i - 1) * m + j]);
            let mut best = up;
            if j > 0 {
                for cand in [(d[i * m + j - 1], l[i * m + j - 1]), (d[(i - 1) * m + j - 1], l[(i - 1) * m + j - 1])] {
                    if cand.0 / cand.1 < best.0 / best.1 {
                        best = cand;
                    }
                }
            }
            if best.0 < inf {
                d[i * m + j] = best.0 + cost;
                l[i * m + j] = best.1 + 1.0;
            }
        }
    }
    let lo = (n * 6 / 10).min(m - 1);
    (lo..m).map(|j| (d[(n - 1) * m + j] / l[(n - 1) * m + j], j)).fold((f32::MAX, 0), |a, b| if b.0 < a.0 { b } else { a })
}

/// Aday sesi örneklerle karşılaştır: (en iyi iki eşleşmenin ortalaması, eşleşmenin bittiği örnek)
fn compare(store: &Store, feats: &Features, audio: &[f32]) -> (f32, usize) {
    let longest = store.templates.iter().map(Vec::len).max().unwrap_or(0);
    let c = normalize(feats.mfcc(&audio[..audio.len().min((longest * 16 / 10 + 30) * HOP + WIN)]));
    let mut scores: Vec<(f32, usize)> = store.templates.iter().map(|t| dtw(t, &c)).collect();
    scores.sort_by(|a, b| a.0.total_cmp(&b.0));
    let Some(&(best, end)) = scores.first() else { return (f32::MAX, 0) };
    let avg = scores.iter().take(2).map(|s| s.0).sum::<f32>() / scores.len().min(2) as f32;
    (avg.max(best), (end + 1) * HOP + WIN / 2)
}

/// Eşik: örneklerin kendi aralarındaki uzaklığın duyarlılığa göre bir katı. Örnekler çok
/// tutarlıysa (sessiz oda) eşik fazla daralmasın diye alt sınırı, gevşemesin diye üst sınırı var.
fn threshold(store: &Store, sensitivity: f32) -> f32 {
    let s = sensitivity.clamp(0.0, 1.0);
    (store.base * (1.5 + 0.8 * s)).clamp(0.08 + 0.06 * s, 0.32)
}

// ------------------------------------------------------------------ ses etkinliği

/// 10 ms'lik karelerin enerjisine bakan basit ses etkinliği algılayıcı; gürültü tabanını kendisi izler
struct Vad {
    noise: f32,
}

impl Vad {
    fn new() -> Self {
        Vad { noise: 0.002 }
    }
    fn speech(&mut self, frame: &[f32]) -> bool {
        let e = (frame.iter().map(|s| s * s).sum::<f32>() / frame.len() as f32).sqrt();
        let on = e > (self.noise * 3.2).max(0.006);
        // Sessizken tabana hızlı in, konuşurken çok yavaş çık
        self.noise = if e < self.noise { self.noise * 0.9 + e * 0.1 } else if !on { self.noise * 0.995 + e * 0.005 } else { self.noise * 0.9995 + e * 0.0005 };
        on
    }
}

// ------------------------------------------------------------------ dinleyici

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Heard {
    /// 0 (hiç benzemiyor) … 1 (eşiğin tam altında ve daha iyi)
    score: f32,
    woke: bool,
}

enum Phase {
    Idle,
    /// Konuşma başladı: uyandırma sözü için ses toplanıyor
    Collect { audio: Vec<f32>, silent: usize },
    /// Konuşma eşleşmedi; susana kadar bekle
    Skip { silent: usize },
    /// Uyandı: komut kaydediliyor
    Command { audio: Vec<f32>, silent: usize, spoke: bool, started: Instant },
}

fn run(stop: Arc<AtomicBool>, app: AppHandle) {
    let feats = Features::new();
    let mut store = load();
    let mut loaded = Instant::now();
    let mut vad = Vad::new();
    let mut phase = Phase::Idle;
    let mut preroll: std::collections::VecDeque<f32> = std::collections::VecDeque::with_capacity(HOP * 25);
    let mut cooldown = Instant::now();
    let mut peak = 0f32;
    let mut last_level = Instant::now();

    let result = imp::capture(&stop, |frame| {
        // Örnekler yeniden kaydedildiyse yükle
        if loaded.elapsed() > Duration::from_secs(5) {
            store = load();
            loaded = Instant::now();
        }
        let speech = vad.speech(frame);
        let busy = ENROLLING.load(Ordering::Relaxed) || crate::voice::active();
        phase = match std::mem::replace(&mut phase, Phase::Idle) {
            Phase::Idle => {
                if speech && !busy && Instant::now() >= cooldown && !store.templates.is_empty() {
                    let mut audio: Vec<f32> = preroll.iter().copied().collect();
                    audio.extend_from_slice(frame);
                    Phase::Collect { audio, silent: 0 }
                } else {
                    Phase::Idle
                }
            }
            Phase::Collect { mut audio, mut silent } => {
                audio.extend_from_slice(frame);
                silent = if speech { 0 } else { silent + 1 };
                let longest = store.templates.iter().map(Vec::len).max().unwrap_or(80);
                let enough = audio.len() >= (longest * 16 / 10 + 30) * HOP + WIN;
                // Söz bitti (300 ms sessizlik) ya da yeterince ses toplandı: karşılaştır
                if silent >= 30 || enough {
                    let (dist, end) = compare(&store, &feats, &audio);
                    let thr = threshold(&store, CONFIG.lock().unwrap().sensitivity);
                    let woke = dist <= thr;
                    let _ = app.emit("nook://wake-heard", Heard { score: (thr / dist.max(1e-6)).min(1.5) / 1.5, woke });
                    if woke {
                        let target = crate::shortcut::target(&app);
                        let _ = app.emit_to(target.as_str(), "nook://voice", crate::shortcut::VoiceEvent::Start);
                        let rest = audio.get(end.min(audio.len())..).unwrap_or_default().to_vec();
                        // Uyandırma sözüyle komut bir solukta söylendiyse komutun başı zaten elde
                        let spoke = rest.len() > RATE / 3 && silent < 30;
                        Phase::Command { audio: rest, silent: if spoke { 0 } else { silent }, spoke, started: Instant::now() }
                    } else if silent >= 30 {
                        Phase::Idle
                    } else {
                        Phase::Skip { silent }
                    }
                } else {
                    Phase::Collect { audio, silent }
                }
            }
            Phase::Skip { silent } => {
                let silent = if speech { 0 } else { silent + 1 };
                if silent >= 30 {
                    Phase::Idle
                } else {
                    Phase::Skip { silent }
                }
            }
            Phase::Command { mut audio, mut silent, mut spoke, started } => {
                audio.extend_from_slice(frame);
                if speech {
                    spoke = true;
                    silent = 0;
                } else {
                    silent += 1;
                }
                peak = frame.iter().fold(peak, |p, s| p.max(s.abs()));
                if last_level.elapsed() > Duration::from_millis(70) {
                    let _ = app.emit("nook://voice-level", (peak * 3.0).min(1.0));
                    peak = 0.0;
                    last_level = Instant::now();
                }
                let waited = started.elapsed();
                // Komut bitti: konuştuktan sonra 1 sn sessizlik, hiç konuşmadan 6 sn, ya da 15 sn
                let done = (spoke && silent >= 100) || (!spoke && waited > Duration::from_secs(6)) || waited > Duration::from_secs(15);
                if done {
                    let _ = app.emit("nook://voice-level", 0f32);
                    let keep = audio.len().saturating_sub(silent.saturating_sub(20) * HOP);
                    audio.truncate(keep);
                    let wav = spoke.then(|| crate::voice::wav_base64(&audio, RATE as u32));
                    let target = crate::shortcut::target(&app);
                    let _ = app.emit_to(target.as_str(), "nook://voice", crate::shortcut::VoiceEvent::Done { audio: wav });
                    cooldown = Instant::now() + Duration::from_millis(1500);
                    Phase::Idle
                } else {
                    Phase::Command { audio, silent, spoke, started }
                }
            }
        };
        if preroll.len() + frame.len() > HOP * 25 {
            preroll.drain(..frame.len().min(preroll.len()));
        }
        preroll.extend(frame.iter().copied());
        true
    });
    if let Err(e) = result {
        crate::log::write("warn", &format!("hey nook: {e}"));
        let _ = app.emit("nook://wake-error", e);
    }
}

/// Ayara göre dinleyiciyi başlat ya da durdur
fn refresh() {
    let want = CONFIG.lock().unwrap().enabled && !load().templates.is_empty();
    let mut l = LISTENER.lock().unwrap();
    if want == l.is_some() {
        return;
    }
    if let Some(old) = l.take() {
        old.stop.store(true, Ordering::Relaxed);
    }
    if want {
        let Some(app) = APP.lock().unwrap().clone() else { return };
        let stop = Arc::new(AtomicBool::new(false));
        let flag = stop.clone();
        let _ = std::thread::Builder::new().name("nook-wake".into()).spawn(move || run(flag, app));
        *l = Some(Listener { stop });
    }
}

pub fn init(app: &AppHandle) {
    *APP.lock().unwrap() = Some(app.clone());
}

// ------------------------------------------------------------------ komutlar

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WakeStatus {
    /// Kaç örnek kayıtlı (0 ise tanıtılmamış)
    trained: usize,
    listening: bool,
}

#[tauri::command]
pub fn wake_config(enabled: bool, sensitivity: f32) -> WakeStatus {
    {
        let mut c = CONFIG.lock().unwrap();
        c.enabled = enabled;
        c.sensitivity = sensitivity;
    }
    refresh();
    wake_status()
}

#[tauri::command]
pub fn wake_status() -> WakeStatus {
    WakeStatus { trained: load().templates.len(), listening: LISTENER.lock().unwrap().is_some() }
}

/// Tanıtım: bir "Hey Nook" örneği kaydet (konuşma başlayıp bitene kadar; en çok 6 sn beklenir)
#[tauri::command]
pub async fn wake_enroll(app: AppHandle) -> Result<usize, String> {
    ENROLLING.store(true, Ordering::Relaxed);
    let res = tauri::async_runtime::spawn_blocking(move || record_utterance(&app)).await.map_err(|e| e.to_string());
    ENROLLING.store(false, Ordering::Relaxed);
    let audio = res??;
    let feats = Features::new().mfcc(&audio);
    if feats.len() < 20 {
        return Err("Çok kısa geldi; biraz daha yavaş söyle".into());
    }
    if feats.len() > 220 {
        return Err("Çok uzun geldi; yalnızca \"Hey Nook\" de".into());
    }
    let mut p = PENDING.lock().unwrap();
    p.push(normalize(feats));
    Ok(p.len())
}

#[tauri::command]
pub fn wake_enroll_reset() {
    PENDING.lock().unwrap().clear();
}

/// Toplanan örnekleri kaydet; birbirine yeterince benzemiyorlarsa reddet
#[tauri::command]
pub fn wake_enroll_save() -> Result<WakeStatus, String> {
    let templates = std::mem::take(&mut *PENDING.lock().unwrap());
    if templates.len() < NEED {
        return Err(format!("{NEED} örnek gerekiyor"));
    }
    let mut dists = Vec::new();
    for (i, a) in templates.iter().enumerate() {
        for (j, b) in templates.iter().enumerate() {
            if i != j {
                dists.push(dtw(a, b).0);
            }
        }
    }
    let base = dists.iter().sum::<f32>() / dists.len() as f32;
    if base > 0.55 {
        return Err("Örnekler birbirine benzemedi; sessiz bir yerde, aynı şekilde tekrar dene".into());
    }
    save(&Store { templates, base: base.max(0.08) })?;
    refresh();
    Ok(wake_status())
}

#[tauri::command]
pub fn wake_forget() -> WakeStatus {
    if let Some(p) = store_path() {
        let _ = std::fs::remove_file(p);
    }
    refresh();
    wake_status()
}

/// Tek bir söz: konuşma başlayınca kaydet, 400 ms susunca bitir
fn record_utterance(app: &AppHandle) -> Result<Vec<f32>, String> {
    let stop = AtomicBool::new(false);
    let mut vad = Vad::new();
    let mut audio = Vec::new();
    let mut preroll: std::collections::VecDeque<f32> = std::collections::VecDeque::new();
    let (mut spoke, mut silent) = (false, 0usize);
    let started = Instant::now();
    let mut warm = 0usize;
    let mut peak = 0f32;
    imp::capture(&stop, |frame| {
        // İlk 200 ms gürültü tabanını öğrensin
        warm += 1;
        let speech = vad.speech(frame) && warm > 20;
        peak = frame.iter().fold(peak, |p, s| p.max(s.abs()));
        if warm % 7 == 0 {
            let _ = app.emit("nook://voice-level", (peak * 3.0).min(1.0));
            peak = 0.0;
        }
        if !spoke {
            preroll.extend(frame.iter().copied());
            while preroll.len() > HOP * 15 {
                preroll.pop_front();
            }
            if speech {
                spoke = true;
                audio.extend(preroll.drain(..));
            }
            return started.elapsed() < Duration::from_secs(6);
        }
        audio.extend_from_slice(frame);
        silent = if speech { 0 } else { silent + 1 };
        silent < 40 && audio.len() < RATE * 3
    })?;
    let _ = app.emit("nook://voice-level", 0f32);
    if !spoke {
        return Err("Ses duyamadım; mikrofonu kontrol et".into());
    }
    let keep = audio.len().saturating_sub(silent.saturating_sub(5) * HOP);
    audio.truncate(keep);
    Ok(audio)
}

// ------------------------------------------------------------------ mikrofon

#[cfg(windows)]
mod imp {
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::time::Duration;

    use windows::Win32::Media::Audio::{
        eCapture, eConsole, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator, MMDeviceEnumerator, AUDCLNT_SHAREMODE_SHARED, WAVEFORMATEX,
    };
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_MULTITHREADED};

    const AUDCLNT_BUFFERFLAGS_SILENT: u32 = 0x2;
    const WAVE_FORMAT_PCM: u16 = 1;

    /// Varsayılan mikrofondan 16 kHz mono, 10 ms'lik karelerle besler; `on` false dönünce ya da
    /// `stop` kalkınca biter. Varsayılan mikrofon değişirse (ya da çıkarılırsa) yeniden açar.
    pub fn capture(stop: &AtomicBool, mut on: impl FnMut(&[f32]) -> bool) -> Result<(), String> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        let mut fails = 0;
        while !stop.load(Ordering::Relaxed) {
            match unsafe { session(stop, &mut on) } {
                Ok(true) => return Ok(()),
                Ok(false) => fails = 0,
                Err(e) => {
                    fails += 1;
                    if fails > 3 {
                        return Err(e);
                    }
                    std::thread::sleep(Duration::from_secs(2));
                }
            }
        }
        Ok(())
    }

    /// Ok(true): çağıran bitirdi · Ok(false): aygıt değişti, yeniden aç
    unsafe fn session(stop: &AtomicBool, on: &mut impl FnMut(&[f32]) -> bool) -> Result<bool, String> {
        let err = |e: windows::core::Error| format!("mikrofon açılamadı: {e}");
        let en: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(err)?;
        let device = en.GetDefaultAudioEndpoint(eCapture, eConsole).map_err(|_| "mikrofon bulunamadı".to_string())?;
        let id = device.GetId().ok().map(|p| p.to_string().unwrap_or_default());
        let client: IAudioClient = device.Activate(CLSCTX_ALL, None).map_err(err)?;
        let fmt_ptr = client.GetMixFormat().map_err(err)?;
        let fmt: WAVEFORMATEX = *fmt_ptr;
        let init = client.Initialize(AUDCLNT_SHAREMODE_SHARED, 0, 10_000_000, 0, fmt_ptr, None);
        CoTaskMemFree(Some(fmt_ptr as _));
        init.map_err(err)?;
        let capture: IAudioCaptureClient = client.GetService().map_err(err)?;
        client.Start().map_err(err)?;

        let channels = fmt.nChannels.max(1) as usize;
        let is_pcm16 = fmt.wBitsPerSample == 16 && (fmt.wFormatTag == WAVE_FORMAT_PCM || fmt.cbSize >= 22);
        let ratio = fmt.nSamplesPerSec as f64 / super::RATE as f64;
        let mut raw: Vec<f32> = Vec::new();
        let mut pos = 0f64;
        let mut out: Vec<f32> = Vec::with_capacity(super::HOP * 4);
        let mut checked = std::time::Instant::now();
        let finish = |client: &IAudioClient, r| {
            let _ = client.Stop();
            r
        };

        while !stop.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_millis(20));
            // Varsayılan mikrofon değişti mi
            if checked.elapsed() > Duration::from_secs(3) {
                checked = std::time::Instant::now();
                let now = en.GetDefaultAudioEndpoint(eCapture, eConsole).ok().and_then(|d| d.GetId().ok()).map(|p| p.to_string().unwrap_or_default());
                if now != id {
                    return Ok(finish(&client, false));
                }
            }
            loop {
                let n = match capture.GetNextPacketSize() {
                    Ok(n) => n,
                    Err(_) => return Ok(finish(&client, false)),
                };
                if n == 0 {
                    break;
                }
                let (mut data, mut frames, mut flags) = (std::ptr::null_mut::<u8>(), 0u32, 0u32);
                if capture.GetBuffer(&mut data, &mut frames, &mut flags, None, None).is_err() {
                    return Ok(finish(&client, false));
                }
                let silent = flags & AUDCLNT_BUFFERFLAGS_SILENT != 0 || data.is_null();
                for f in 0..frames as usize {
                    let mut sum = 0f32;
                    if !silent {
                        for ch in 0..channels {
                            let i = f * channels + ch;
                            sum += if is_pcm16 { *(data as *const i16).add(i) as f32 / 32768.0 } else { *(data as *const f32).add(i) };
                        }
                    }
                    raw.push(sum / channels as f32);
                }
                let _ = capture.ReleaseBuffer(frames);
            }
            // 16 kHz'e doğrusal aradeğerleme
            while pos + 1.0 < raw.len() as f64 {
                let j = pos as usize;
                let frac = (pos - j as f64) as f32;
                out.push(raw[j] + (raw[j + 1] - raw[j]) * frac);
                pos += ratio;
            }
            let used = (pos as usize).min(raw.len());
            raw.drain(..used);
            pos -= used as f64;
            let mut start = 0;
            while out.len() - start >= super::HOP {
                if !on(&out[start..start + super::HOP]) {
                    return Ok(finish(&client, true));
                }
                start += super::HOP;
            }
            out.drain(..start);
        }
        Ok(finish(&client, true))
    }
}

#[cfg(not(windows))]
mod imp {
    use std::sync::atomic::AtomicBool;
    pub fn capture(_s: &AtomicBool, _on: impl FnMut(&[f32]) -> bool) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Ayrı bir klasördeki 16 kHz mono WAV'larla (tests/wake/*.wav, isteğe bağlı) uçtan uca deneme:
    /// "hey*.wav" örnekleri tanıtılır, "hey_test*.wav" uyandırmalı, "other*.wav" uyandırmamalı.
    fn read_wav(p: &std::path::Path) -> Vec<f32> {
        let b = std::fs::read(p).unwrap();
        let data = b.windows(4).position(|w| w == b"data").unwrap() + 8;
        b[data..].chunks_exact(2).map(|c| i16::from_le_bytes([c[0], c[1]]) as f32 / 32768.0).collect()
    }

    #[test]
    fn wake_samples() {
        let Some(dir) = std::env::var_os("NOOK_WAKE_TEST").map(PathBuf::from) else { return };
        let feats = Features::new();
        let mut files: Vec<_> = std::fs::read_dir(&dir).unwrap().map(|e| e.unwrap().path()).collect();
        files.sort();
        let name = |p: &PathBuf| p.file_name().unwrap().to_string_lossy().to_string();
        // Tanıtımdaki gibi baştaki ve sondaki sessizlik atılır
        let trim = |a: Vec<f32>| {
            let loud: Vec<usize> = a.chunks(HOP).enumerate().filter(|(_, c)| c.iter().map(|s| s * s).sum::<f32>() / c.len() as f32 > 1e-4).map(|(i, _)| i).collect();
            let (s, e) = (loud.first().copied().unwrap_or(0).saturating_sub(5), (loud.last().copied().unwrap_or(0) + 5).min(a.len() / HOP));
            a[s * HOP..e * HOP].to_vec()
        };
        let templates: Vec<_> = files.iter().filter(|p| name(p).starts_with("enroll")).map(|p| normalize(feats.mfcc(&trim(read_wav(p))))).collect();
        let mut dists = Vec::new();
        for (i, a) in templates.iter().enumerate() {
            for (j, b) in templates.iter().enumerate() {
                if i != j {
                    dists.push(dtw(a, b).0);
                }
            }
        }
        let base = dists.iter().sum::<f32>() / dists.len() as f32;
        let store = Store { templates, base };
        let thr = threshold(&store, 0.5);
        println!("base {base:.3} thr {thr:.3}");
        for p in files.iter().filter(|p| !name(p).starts_with("enroll")) {
            let mut audio = vec![0f32; HOP * 20];
            audio.extend(read_wav(p));
            let (d, end) = compare(&store, &feats, &audio);
            println!("{} dist {d:.3} end {:.2}s {}", name(p), end as f32 / RATE as f32, if d <= thr { "UYANDI" } else { "-" });
        }
    }
}
