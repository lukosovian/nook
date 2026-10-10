//! Hum: bilgisayarda çalan şarkıyı bulur (Shazam gibi). Mikrofon değil, Windows'un dahili sesi
//! (varsayılan çıkışın WASAPI "loopback" kaydı) dinlenir. Sesten Shazam'ın parmak izi (imza)
//! çıkarılır; sesin kendisi değil, yalnızca bu imza gönderilir.
//!
//! - Elle Hum (kısayol / çip): `hum_listen` 12 sn'ye kadar dinler, 3 sn'de bir sorar, bulunca biter.
//!   Dinlerken ses şiddeti bantları "nook://hum-level" ile yayınlanır (adanın dalga animasyonu).
//! - Otomatik Hum (ayar): arkada dinler, müzik çalarken arada bir sorar, yeni bulduğu şarkıyı
//!   "nook://hum-found" ile bildirir. Oyundayken ve mikrofon kullanılırken (görüşme) sormaz.
//! - İzlerken Hum (ayar): Argus'taki bir dizi/film çalarken arayüz `hum_watching(true)` der; otomatik
//!   Hum gibi dinler, bulduğu şarkıyı içeriğin kaçıncı dakikasında çaldığı hesaplansın diye sesin ne
//!   kadar önce başladığıyla (`agoMs`) bildirir — arayüz Argus'a yazar.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::state::Shared;

const RATE: u32 = 16_000;
/// Tamponda tutulan son ses (Shazam en fazla ~12 sn'lik imza ister)
const KEEP: usize = 12 * RATE as usize;
/// Elle Hum'da sorma anları (dinlemeye başladıktan sonra) ve en uzun dinleme
const TRIES: [u64; 4] = [3, 6, 9, 12];
/// Otomatik Hum'da sorulan ses uzunluğu
const AUTO_LEN: usize = 10 * RATE as usize;
/// Arada bundan uzun sessizlik olursa (çıkışa hiç ses gitmedi) eski ses atılır: iki şarkı karışmasın
const GAP: Duration = Duration::from_millis(1500);

#[derive(Clone, Serialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    /// Shazam'daki kimliği (aynı şarkı iki kez kaydedilmesin)
    pub key: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub released: Option<String>,
    pub genre: Option<String>,
    /// Kapak (büyük boy)
    pub cover: Option<String>,
    /// Shazam sayfası
    pub url: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum Outcome {
    Found { track: Track },
    /// Dinlendi ama tanınmadı
    None,
    /// Çıkışa hiç ses gitmedi
    Silent,
    /// Ses çıkışı (hoparlör/kulaklık) açılamadı; dinlenecek bir şey yok
    NoDevice,
    Cancelled,
    Error { message: String },
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Found {
    track: Track,
    auto: bool,
    /// İzlerken Hum: tanınan sesin başı kaç ms önceydi
    ago_ms: Option<u64>,
}

/// Son 12 sn (16 kHz mono) ve en son ses gelen an
struct Buffer {
    samples: VecDeque<f32>,
    /// Bugüne kadar yazılan örnek sayısı (elle Hum'da "yeni" sesi ölçmek için)
    written: u64,
    last_packet: Option<Instant>,
}

static BUF: Mutex<Buffer> = Mutex::new(Buffer { samples: VecDeque::new(), written: 0, last_packet: None });
/// Kayıt iş parçacığı çalışıyor
static CAPTURING: AtomicBool = AtomicBool::new(false);
/// Elle Hum sürüyor (seviyeler yayınlanır, kayıt kapanmaz)
static MANUAL: AtomicBool = AtomicBool::new(false);
static CANCEL: AtomicBool = AtomicBool::new(false);
/// Son kayıt denemesi ses çıkışını açamadı (çıkış yok ya da kullanılamıyor)
static NO_DEVICE: AtomicBool = AtomicBool::new(false);
/// Son bulunan şarkı: otomatik Hum aynı şarkıyı tekrar bildirmesin
static LAST_KEY: Mutex<String> = Mutex::new(String::new());
/// Son bulunan şarkının anı: izlerken aynı şarkı bir süre sonra yeniden çalarsa yine bildirilir
static LAST_AT: Mutex<Option<Instant>> = Mutex::new(None);
/// Argus'taki bir dizi/film çalıyor ve "izlerken dinle" açık (arayüz söyler)
static WATCHING: AtomicBool = AtomicBool::new(false);
/// İzlerken aynı şarkı bundan sonra yeniden bulunursa yeni bir sahne sayılır
const WATCH_REPEAT: Duration = Duration::from_secs(5 * 60);

fn want_capture(shared: &Shared) -> bool {
    MANUAL.load(Ordering::Relaxed) || WATCHING.load(Ordering::Relaxed) || shared.settings().hum_auto
}

/// İzlerken Hum: Argus'taki bir şey çalmaya başlayınca açılır, bitince kapanır.
#[tauri::command]
pub fn hum_watching(on: bool) {
    WATCHING.store(on, Ordering::Relaxed);
}

/// Kayıt açık değilse başlat; istenmediğinde kendi kapanır.
fn ensure_capture(app: &AppHandle, shared: &Arc<Shared>) {
    if CAPTURING.swap(true, Ordering::SeqCst) {
        return;
    }
    let (app, shared) = (app.clone(), shared.clone());
    thread::Builder::new()
        .name("nook-hum-capture".into())
        .spawn(move || {
            let res = imp::capture(&app, &shared);
            if let Err(e) = res {
                crate::log::write("warn", &format!("hum: kayıt: {e}"));
            }
            CAPTURING.store(false, Ordering::SeqCst);
        })
        .ok();
}

fn push(samples: &[f32]) {
    if samples.is_empty() {
        return;
    }
    let mut b = BUF.lock().unwrap();
    if b.last_packet.is_some_and(|t| t.elapsed() > GAP) {
        b.samples.clear();
    }
    b.samples.extend(samples.iter().copied());
    let extra = b.samples.len().saturating_sub(KEEP);
    b.samples.drain(..extra);
    b.written += samples.len() as u64;
    b.last_packet = Some(Instant::now());
}

/// Tamponun son `n` örneği
fn tail(n: usize) -> Vec<f32> {
    let b = BUF.lock().unwrap();
    let start = b.samples.len().saturating_sub(n);
    b.samples.range(start..).copied().collect()
}

/// Son `secs` saniyede duyulur bir ses var mı (sessiz paketler sıfır olarak yazılır)
fn audible(samples: &[f32]) -> bool {
    if samples.is_empty() {
        return false;
    }
    let rms = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    rms > 0.004
}

/// Elle Hum: dinler, bulana kadar 3 sn'de bir sorar (en fazla 12 sn).
#[tauri::command]
pub async fn hum_listen(app: AppHandle, shared: tauri::State<'_, Arc<Shared>>) -> Result<Outcome, String> {
    let shared = shared.inner().clone();
    if MANUAL.swap(true, Ordering::SeqCst) {
        return Ok(Outcome::Cancelled);
    }
    CANCEL.store(false, Ordering::SeqCst);
    let out = tauri::async_runtime::spawn_blocking(move || listen(&app, &shared)).await.unwrap_or_else(|e| Outcome::Error { message: e.to_string() });
    MANUAL.store(false, Ordering::SeqCst);
    if let Outcome::Found { track } = &out {
        *LAST_KEY.lock().unwrap() = track.key.clone();
        *LAST_AT.lock().unwrap() = Some(Instant::now());
    }
    crate::log::write(
        "info",
        &format!(
            "hum: {}",
            match &out {
                Outcome::Found { track } => format!("{} – {}", track.artist, track.title),
                Outcome::None => "bulunamadı".into(),
                Outcome::Silent => "ses yok".into(),
                Outcome::NoDevice => "ses çıkışı açılamadı".into(),
                Outcome::Cancelled => "vazgeçildi".into(),
                Outcome::Error { message } => message.clone(),
            }
        ),
    );
    Ok(out)
}

#[tauri::command]
pub fn hum_cancel() {
    CANCEL.store(true, Ordering::SeqCst);
}

fn listen(app: &AppHandle, shared: &Arc<Shared>) -> Outcome {
    ensure_capture(app, shared);
    let started = Instant::now();
    // Otomatik Hum zaten dinliyorsa tamponda az önceki ses de var: hemen bir kez sor
    let mut tried_early = false;
    let mut next = 0;
    let mut heard = false;
    let mut last_err = None;
    loop {
        thread::sleep(Duration::from_millis(100));
        if CANCEL.load(Ordering::SeqCst) {
            return Outcome::Cancelled;
        }
        // Önceki kayıt tam o sırada kapanıyor olabilir: kapandıysa yeniden aç
        ensure_capture(app, shared);
        let secs = started.elapsed().as_secs();
        let early = !tried_early && started.elapsed() > Duration::from_millis(300);
        if !early && (next >= TRIES.len() || secs < TRIES[next]) {
            continue;
        }
        if early {
            tried_early = true;
            // En az 4 sn'lik duyulur ses yoksa bekle
            let s = tail(KEEP);
            if s.len() < 4 * RATE as usize || !audible(&s[s.len() - RATE as usize..]) {
                continue;
            }
        } else {
            next += 1;
        }
        let s = tail(KEEP);
        if !audible(&s) {
            if next >= TRIES.len() {
                break;
            }
            continue;
        }
        heard = true;
        match recognize(&s) {
            Ok(Some(track)) => return Outcome::Found { track },
            Ok(None) => {}
            Err(e) => last_err = Some(e),
        }
        if next >= TRIES.len() {
            break;
        }
    }
    if !heard {
        // "Ses yok" denince nedenini görebilmek için: hiç ses geldi mi, ne kadar yüksekti
        let s = tail(KEEP);
        let rms = if s.is_empty() { 0.0 } else { (s.iter().map(|x| x * x).sum::<f32>() / s.len() as f32).sqrt() };
        let written = BUF.lock().unwrap().written;
        crate::log::write("info", &format!("hum: tampon {} örnek, rms {rms:.5}, toplam {written}, kayıt {}", s.len(), CAPTURING.load(Ordering::SeqCst)));
    }
    match (heard, last_err) {
        (false, _) if NO_DEVICE.load(Ordering::SeqCst) => Outcome::NoDevice,
        (false, _) => Outcome::Silent,
        (true, Some(message)) => Outcome::Error { message },
        (true, None) => Outcome::None,
    }
}

/// Otomatik Hum: ayar açıkken arkada dinler, müzik çalıyorsa arada bir sorar.
pub fn spawn(app: AppHandle, shared: Arc<Shared>) {
    thread::Builder::new()
        .name("nook-hum-auto".into())
        .spawn(move || {
            let mut next_try = Instant::now();
            loop {
                thread::sleep(Duration::from_secs(2));
                let watching = WATCHING.load(Ordering::Relaxed);
                if !(shared.settings().hum_auto || watching) || MANUAL.load(Ordering::Relaxed) {
                    continue;
                }
                ensure_capture(&app, &shared);
                if Instant::now() < next_try {
                    continue;
                }
                // Oyundayken ve görüşmedeyken sormaz (mikrofon kullanılıyorsa)
                if shared.game_screen.lock().unwrap().is_some() {
                    continue;
                }
                let s = tail(AUTO_LEN);
                if s.len() < AUTO_LEN || !audible(&s[s.len() - 2 * RATE as usize..]) || !audible(&s[..2 * RATE as usize]) {
                    continue;
                }
                if !crate::privacy::mic_apps().is_empty() {
                    next_try = Instant::now() + Duration::from_secs(30);
                    continue;
                }
                // Örneğin başı: şu an − örnek uzunluğu (sorma süresi sonra eklenir)
                let asked = Instant::now();
                next_try = Instant::now()
                    + match recognize(&s) {
                        Ok(Some(track)) => {
                            let mut last = LAST_KEY.lock().unwrap();
                            let mut at = LAST_AT.lock().unwrap();
                            let again = watching && at.is_some_and(|t| t.elapsed() > WATCH_REPEAT);
                            if *last != track.key || again {
                                *last = track.key.clone();
                                *at = Some(Instant::now());
                                crate::log::write("info", &format!("hum (otomatik): {} – {}", track.artist, track.title));
                                let ago_ms = watching.then(|| (AUTO_LEN as u64 * 1000 / RATE as u64) + asked.elapsed().as_millis() as u64);
                                let _ = app.emit("nook://hum-found", Found { track, auto: true, ago_ms });
                                Duration::from_secs(60)
                            } else {
                                Duration::from_secs(45)
                            }
                        }
                        Ok(None) => Duration::from_secs(20),
                        Err(e) => {
                            crate::log::write("warn", &format!("hum (otomatik): {e}"));
                            Duration::from_secs(120)
                        }
                    };
            }
        })
        .expect("hum iş parçacığı başlatılamadı");
}

// ---------------------------------------------------------------------------------------------
// Ses şiddeti bantları (dalga animasyonu)

const BANDS: usize = 24;

struct Meter {
    fft: Arc<dyn rustfft::Fft<f32>>,
    window: Vec<f32>,
    smooth: [f32; BANDS],
}

impl Meter {
    const N: usize = 1024;

    fn new() -> Self {
        let fft = rustfft::FftPlanner::new().plan_fft_forward(Self::N);
        let window = (0..Self::N).map(|i| 0.5 - 0.5 * (2.0 * std::f32::consts::PI * i as f32 / (Self::N - 1) as f32).cos()).collect();
        Meter { fft, window, smooth: [0.0; BANDS] }
    }

    /// 60 Hz–7 kHz arası, logaritmik aralıklı bantlar (0–1)
    fn levels(&mut self, samples: &[f32]) -> Vec<f32> {
        use rustfft::num_complex::Complex;
        let mut buf: Vec<Complex<f32>> = (0..Self::N)
            .map(|i| Complex { re: samples.get(samples.len().wrapping_sub(Self::N) + i).copied().unwrap_or(0.0) * self.window[i], im: 0.0 })
            .collect();
        if samples.len() < Self::N {
            buf.iter_mut().for_each(|c| c.re = 0.0);
        }
        self.fft.process(&mut buf);
        let hz = RATE as f32 / Self::N as f32;
        (0..BANDS)
            .map(|b| {
                let f0 = 60.0 * (7000.0f32 / 60.0).powf(b as f32 / BANDS as f32);
                let f1 = 60.0 * (7000.0f32 / 60.0).powf((b + 1) as f32 / BANDS as f32);
                let (i0, i1) = ((f0 / hz) as usize, ((f1 / hz) as usize).max((f0 / hz) as usize + 1));
                let e = buf[i0..i1.min(Self::N / 2)].iter().map(|c| c.norm()).fold(0.0f32, f32::max);
                // dB'ye çevir, 0–1'e sıkıştır
                let v = ((20.0 * (e + 1e-6).log10() + 10.0) / 50.0).clamp(0.0, 1.0);
                let s = &mut self.smooth[b];
                *s = if v > *s { v } else { *s * 0.8 + v * 0.2 };
                *s
            })
            .collect()
    }
}

// ---------------------------------------------------------------------------------------------
// Örnekleme hızı dönüşümü: kutu süzgeci (örtüşmeyi azaltır) + doğrusal aradeğerleme, akış hâlinde

struct Resampler {
    step: f64,
    t: f64,
    last: f32,
    /// Kutu süzgecinin son örnekleri
    hist: VecDeque<f32>,
    width: usize,
    sum: f32,
}

impl Resampler {
    fn new(from: u32) -> Self {
        let step = from as f64 / RATE as f64;
        Resampler { step, t: 0.0, last: 0.0, hist: VecDeque::new(), width: step.round().max(1.0) as usize, sum: 0.0 }
    }

    fn push(&mut self, input: &[f32], out: &mut Vec<f32>) {
        if input.is_empty() {
            return;
        }
        let filtered: Vec<f32> = input
            .iter()
            .map(|&x| {
                self.hist.push_back(x);
                self.sum += x;
                if self.hist.len() > self.width {
                    self.sum -= self.hist.pop_front().unwrap();
                }
                self.sum / self.hist.len() as f32
            })
            .collect();
        let len = filtered.len() as f64;
        let at = |i: isize| if i < 0 { self.last } else { filtered[i as usize] };
        while self.t < len - 1.0 {
            let i = self.t.floor();
            let frac = (self.t - i) as f32;
            let (a, b) = (at(i as isize), at(i as isize + 1));
            out.push(a + (b - a) * frac);
            self.t += self.step;
        }
        self.t -= len;
        self.last = *filtered.last().unwrap();
    }
}

// ---------------------------------------------------------------------------------------------
// Shazam imzası. Algoritma, Shazam'ın açık kaynak yeniden uygulamalarındakiyle (SongRec) aynı:
// 2048 noktalı FFT (128 örnekte bir), zaman/frekans tepeleri, dört frekans bandı.

mod signature {
    use std::collections::BTreeMap;
    use std::sync::Arc;

    use rustfft::num_complex::Complex;

    struct Peak {
        pass: u32,
        magnitude: u16,
        bin: u16,
    }

    struct Generator {
        fft: Arc<dyn rustfft::Fft<f32>>,
        window: Vec<f32>,
        ring: Vec<f32>,
        ring_pos: usize,
        ffts: Vec<Vec<f32>>,
        ffts_pos: usize,
        spread: Vec<Vec<f32>>,
        spread_pos: usize,
        spread_written: u32,
        bands: BTreeMap<u32, Vec<Peak>>,
    }

    impl Generator {
        fn new() -> Self {
            Generator {
                fft: rustfft::FftPlanner::new().plan_fft_forward(2048),
                window: (0..2048).map(|i| 0.5 * (1.0 - (2.0 * std::f32::consts::PI * (i + 1) as f32 / 2049.0).cos())).collect(),
                ring: vec![0.0; 2048],
                ring_pos: 0,
                ffts: vec![vec![0.0; 1025]; 256],
                ffts_pos: 0,
                spread: vec![vec![0.0; 1025]; 256],
                spread_pos: 0,
                spread_written: 0,
                bands: BTreeMap::new(),
            }
        }

        fn chunk(&mut self, chunk: &[f32]) {
            // Halka tampona yaz, en eskiden başlayarak pencereyle çarp
            for &s in chunk {
                self.ring[self.ring_pos] = s;
                self.ring_pos = (self.ring_pos + 1) % 2048;
            }
            let mut buf: Vec<Complex<f32>> = (0..2048).map(|i| Complex { re: self.ring[(self.ring_pos + i) % 2048] * self.window[i], im: 0.0 }).collect();
            self.fft.process(&mut buf);
            let out: Vec<f32> = buf[..1025].iter().map(|c| ((c.re * c.re + c.im * c.im) / (1 << 17) as f32).max(1e-10)).collect();
            self.ffts[self.ffts_pos] = out;
            self.ffts_pos = (self.ffts_pos + 1) % 256;

            self.spread_peaks();
            if self.spread_written >= 46 {
                self.recognize_peaks();
            }
        }

        fn spread_peaks(&mut self) {
            let last = &self.ffts[(self.ffts_pos + 255) % 256];
            let mut spread = last.clone();
            for p in 0..=1022 {
                spread[p] = spread[p].max(spread[p + 1]).max(spread[p + 2]);
            }
            for p in 0..=1024 {
                for back in [1usize, 3, 6] {
                    let idx = (self.spread_pos + 256 - back) % 256;
                    let v = self.spread[idx][p].max(spread[p]);
                    self.spread[idx][p] = v;
                }
            }
            self.spread[self.spread_pos] = spread;
            self.spread_pos = (self.spread_pos + 1) % 256;
            self.spread_written += 1;
        }

        fn recognize_peaks(&mut self) {
            let at = |pos: usize, off: isize| ((pos as isize + off).rem_euclid(256)) as usize;
            let f46 = &self.ffts[at(self.ffts_pos, -46)];
            let s49 = &self.spread[at(self.spread_pos, -49)];
            for bin in 10..=1014usize {
                if !(f46[bin] >= 1.0 / 64.0 && f46[bin] >= s49[bin - 1]) {
                    continue;
                }
                let mut max_near = 0.0f32;
                for off in [-10isize, -7, -4, -3, 1, 2, 5, 8] {
                    max_near = max_near.max(s49[(bin as isize + off) as usize]);
                }
                if f46[bin] <= max_near {
                    continue;
                }
                let mut max_other = max_near;
                for off in [-53isize, -45, 165, 172, 179, 186, 193, 200, 214, 221, 228, 235, 242, 249] {
                    max_other = max_other.max(self.spread[at(self.spread_pos, off)][bin - 1]);
                }
                if f46[bin] <= max_other {
                    continue;
                }
                let pass = self.spread_written - 46;
                let mag = |v: f32| v.ln().max(1.0 / 64.0) * 1477.3 + 6144.0;
                let (m, before, after) = (mag(f46[bin]), mag(f46[bin - 1]), mag(f46[bin + 1]));
                let var1 = m * 2.0 - before - after;
                if var1 <= 0.0 {
                    continue;
                }
                let var2 = (after - before) * 32.0 / var1;
                let corrected = bin as i32 * 64 + var2 as i32;
                let hz = corrected as f32 * (16000.0 / 2.0 / 1024.0 / 64.0);
                let band = match hz as i32 {
                    250..=519 => 0,
                    520..=1449 => 1,
                    1450..=3499 => 2,
                    3500..=5500 => 3,
                    _ => continue,
                };
                self.bands.entry(band).or_default().push(Peak { pass, magnitude: m as u16, bin: corrected as u16 });
            }
        }

        fn encode(&self, samples: usize) -> Vec<u8> {
            let mut out: Vec<u8> = Vec::new();
            let w32 = |o: &mut Vec<u8>, v: u32| o.extend_from_slice(&v.to_le_bytes());
            w32(&mut out, 0xcafe2580);
            w32(&mut out, 0); // crc32
            w32(&mut out, 0); // boyut − başlık
            w32(&mut out, 0x94119c00);
            for _ in 0..3 {
                w32(&mut out, 0);
            }
            w32(&mut out, 3 << 27); // 16 kHz
            for _ in 0..2 {
                w32(&mut out, 0);
            }
            w32(&mut out, samples as u32 + (16000.0 * 0.24) as u32);
            w32(&mut out, (15 << 19) + 0x40000);
            w32(&mut out, 0x40000000);
            w32(&mut out, 0); // boyut − başlık
            for (band, peaks) in &self.bands {
                let mut buf: Vec<u8> = Vec::new();
                let mut pass = 0u32;
                for p in peaks {
                    if p.pass - pass >= 255 {
                        buf.push(0xff);
                        buf.extend_from_slice(&p.pass.to_le_bytes());
                        pass = p.pass;
                    }
                    buf.push((p.pass - pass) as u8);
                    buf.extend_from_slice(&p.magnitude.to_le_bytes());
                    buf.extend_from_slice(&p.bin.to_le_bytes());
                    pass = p.pass;
                }
                w32(&mut out, 0x60030040 + band);
                w32(&mut out, buf.len() as u32);
                out.extend_from_slice(&buf);
                out.extend(std::iter::repeat(0).take((4 - buf.len() % 4) % 4));
            }
            let size = (out.len() - 48) as u32;
            out[8..12].copy_from_slice(&size.to_le_bytes());
            out[52..56].copy_from_slice(&size.to_le_bytes());
            let crc = crc32fast::hash(&out[8..]);
            out[4..8].copy_from_slice(&crc.to_le_bytes());
            out
        }
    }

    /// 16 kHz mono (−1…1) sesten imza
    pub fn make(samples: &[f32]) -> Vec<u8> {
        let mut g = Generator::new();
        let scaled: Vec<f32> = samples.iter().map(|s| (s.clamp(-1.0, 1.0) * 32767.0).round()).collect();
        for chunk in scaled.chunks_exact(128) {
            g.chunk(chunk);
        }
        g.encode(samples.len())
    }
}

/// Rastgele görünen bir UUID (Shazam isteğin adresinde ister)
fn uuid() -> String {
    use std::hash::{BuildHasher, Hasher};
    let mut bytes = [0u8; 16];
    for (i, part) in bytes.chunks_mut(8).enumerate() {
        let mut h = std::collections::hash_map::RandomState::new().build_hasher();
        h.write_u128(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0) + i as u128);
        part.copy_from_slice(&h.finish().to_le_bytes());
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let hex: String = bytes.iter().map(|b| format!("{b:02X}")).collect();
    format!("{}-{}-{}-{}-{}", &hex[..8], &hex[8..12], &hex[12..16], &hex[16..20], &hex[20..])
}

/// İmzayı Shazam'a sor. Tanınmazsa `Ok(None)`.
pub fn recognize(samples: &[f32]) -> Result<Option<Track>, String> {
    use base64::Engine;
    // Shazam ~12 sn'den uzununu kabul etmez
    let samples = &samples[samples.len().saturating_sub(KEEP)..];
    let sig = signature::make(samples);
    let uri = format!("data:audio/vnd.shazam.sig;base64,{}", base64::engine::general_purpose::STANDARD.encode(&sig));
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
    let body = serde_json::json!({
        "geolocation": { "altitude": 300, "latitude": 41, "longitude": 29 },
        "signature": { "samplems": samples.len() as u64 * 1000 / RATE as u64, "timestamp": now as u32, "uri": uri },
        "timestamp": now as u32,
        "timezone": "Europe/Istanbul",
    });
    let url = format!("https://amp.shazam.com/discovery/v5/en/US/android/-/tag/{}/{}", uuid(), uuid());
    let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(12)).build();
    let res = agent
        .post(&url)
        .query("sync", "true")
        .query("webv3", "true")
        .query("sampling", "true")
        .query("connected", "")
        .query("shazamapiversion", "v3")
        .query("sharehub", "true")
        .query("video", "v3")
        .set("User-Agent", "Dalvik/2.1.0 (Linux; U; Android 11; Pixel 4 Build/RQ3A.210805.001.A1)")
        .set("Content-Language", "en_US")
        .send_json(body);
    let v: serde_json::Value = match res {
        Ok(r) => r.into_json().map_err(|e| format!("cevap okunamadı: {e}"))?,
        Err(ureq::Error::Status(code, _)) => return Err(format!("Shazam {code} döndü")),
        Err(e) => return Err(format!("bağlanılamadı: {e}")),
    };
    Ok(parse(&v))
}

fn parse(v: &serde_json::Value) -> Option<Track> {
    let t = v.get("track")?;
    let s = |v: &serde_json::Value| v.as_str().map(str::to_string).filter(|x| !x.is_empty());
    let meta = |name: &str| {
        t["sections"].as_array()?.iter().filter(|sec| sec["type"] == "SONG").find_map(|sec| {
            sec["metadata"].as_array()?.iter().find(|m| m["title"] == name).and_then(|m| s(&m["text"]))
        })
    };
    Some(Track {
        key: s(&t["key"]).unwrap_or_default(),
        title: s(&t["title"])?,
        artist: s(&t["subtitle"]).unwrap_or_default(),
        album: meta("Album"),
        released: meta("Released"),
        genre: s(&t["genres"]["primary"]),
        cover: s(&t["images"]["coverarthq"]).or_else(|| s(&t["images"]["coverart"])),
        url: s(&t["url"]),
    })
}

/// Geliştirme: 16 kHz mono f32 ham dosyayı tanı (`cargo test hum_file -- --ignored`, HUM_RAW=yol)
#[cfg(test)]
mod tests {
    #[test]
    #[ignore]
    fn hum_file() {
        let path = std::env::var("HUM_RAW").expect("HUM_RAW");
        let bytes = std::fs::read(path).unwrap();
        let mut samples: Vec<f32> = bytes.chunks_exact(4).map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]])).collect();
        // HUM_RATE verilirse ses o hızdadır: kayıttaki gibi paket paket 16 kHz'e indir
        if let Ok(rate) = std::env::var("HUM_RATE") {
            let mut rs = super::Resampler::new(rate.parse().unwrap());
            let mut out = Vec::new();
            for chunk in samples.chunks(480) {
                rs.push(chunk, &mut out);
            }
            samples = out;
        }
        let r = super::recognize(&samples);
        println!("{r:?}");
        assert!(matches!(r, Ok(Some(_))));
    }
}

#[cfg(windows)]
mod imp {
    use std::sync::Arc;
    use std::time::{Duration, Instant};

    use tauri::{AppHandle, Emitter};
    use windows::Win32::Media::Audio::{
        eConsole, eRender, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator, MMDeviceEnumerator, AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK, WAVEFORMATEX,
    };
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_MULTITHREADED};

    use crate::state::Shared;

    const AUDCLNT_BUFFERFLAGS_SILENT: u32 = 0x2;
    const WAVE_FORMAT_PCM: u16 = 1;

    fn default_id(en: &IMMDeviceEnumerator) -> Option<String> {
        unsafe {
            let d = en.GetDefaultAudioEndpoint(eRender, eConsole).ok()?;
            let id = d.GetId().ok()?;
            let s = id.to_string().ok();
            CoTaskMemFree(Some(id.0 as _));
            s
        }
    }

    /// Varsayılan çıkışı dinler; çıkış değişirse yenisine geçer. İstenmeyince döner.
    pub fn capture(app: &AppHandle, shared: &Arc<Shared>) -> Result<(), String> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let en: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(|e| e.to_string())?;
            loop {
                if !super::want_capture(shared) {
                    return Ok(());
                }
                match session(app, shared, &en) {
                    Ok(true) => continue, // çıkış değişti
                    Ok(false) => return Ok(()),
                    Err(e) => {
                        crate::log::write("warn", &format!("hum: {e}"));
                        super::NO_DEVICE.store(true, std::sync::atomic::Ordering::SeqCst);
                        std::thread::sleep(Duration::from_secs(2));
                    }
                }
            }
        }
    }

    /// Tek cihazla kayıt. `Ok(true)`: varsayılan çıkış değişti, yeniden aç.
    unsafe fn session(app: &AppHandle, shared: &Arc<Shared>, en: &IMMDeviceEnumerator) -> Result<bool, String> {
        let err = |e: windows::core::Error| format!("dahili ses açılamadı: {e}");
        let id = default_id(en);
        let device = en.GetDefaultAudioEndpoint(eRender, eConsole).map_err(|_| "ses çıkışı yok".to_string())?;
        let client: IAudioClient = device.Activate(CLSCTX_ALL, None).map_err(err)?;
        let fmt_ptr = client.GetMixFormat().map_err(err)?;
        let fmt: WAVEFORMATEX = *fmt_ptr;
        let init = client.Initialize(AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK, 10_000_000, 0, fmt_ptr, None);
        CoTaskMemFree(Some(fmt_ptr as _));
        init.map_err(err)?;
        let capture: IAudioCaptureClient = client.GetService().map_err(err)?;
        client.Start().map_err(err)?;
        super::NO_DEVICE.store(false, std::sync::atomic::Ordering::SeqCst);

        let channels = fmt.nChannels.max(1) as usize;
        let is_pcm16 = fmt.wBitsPerSample == 16 && (fmt.wFormatTag == WAVE_FORMAT_PCM || fmt.cbSize >= 22);
        let mut rs = super::Resampler::new(fmt.nSamplesPerSec);
        let mut meter: Option<super::Meter> = None;
        let mut mono: Vec<f32> = Vec::new();
        let mut out: Vec<f32> = Vec::new();
        let mut last_level = Instant::now();
        let mut last_check = Instant::now();

        let result = loop {
            std::thread::sleep(Duration::from_millis(20));
            mono.clear();
            loop {
                let n = match capture.GetNextPacketSize() {
                    Ok(n) => n,
                    Err(e) => return Err(format!("kayıt kesildi: {e}")),
                };
                if n == 0 {
                    break;
                }
                let (mut data, mut frames, mut flags) = (std::ptr::null_mut::<u8>(), 0u32, 0u32);
                if capture.GetBuffer(&mut data, &mut frames, &mut flags, None, None).is_err() {
                    break;
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
                    mono.push(sum / channels as f32);
                }
                let _ = capture.ReleaseBuffer(frames);
            }
            if !mono.is_empty() {
                out.clear();
                rs.push(&mono, &mut out);
                super::push(&out);
            }

            let manual = super::MANUAL.load(std::sync::atomic::Ordering::Relaxed);
            // Elle Hum: ses bantları ~30 kez/sn (paket gelmese de sıfıra insin diye)
            if manual && last_level.elapsed() >= Duration::from_millis(33) {
                last_level = Instant::now();
                let fresh = super::BUF.lock().unwrap().last_packet.is_some_and(|t| t.elapsed() < Duration::from_millis(200));
                let m = meter.get_or_insert_with(super::Meter::new);
                let s = if fresh { super::tail(super::Meter::N) } else { Vec::new() };
                let _ = app.emit("nook://hum-level", m.levels(&s));
            }

            if last_check.elapsed() >= Duration::from_secs(3) {
                last_check = Instant::now();
                if default_id(en) != id {
                    break Ok(true);
                }
                if !super::want_capture(shared) {
                    break Ok(false);
                }
            }
        };
        let _ = client.Stop();
        result
    }
}

#[cfg(not(windows))]
mod imp {
    use std::sync::Arc;
    use tauri::AppHandle;
    pub fn capture(_app: &AppHandle, _shared: &Arc<crate::state::Shared>) -> Result<(), String> {
        Err("yalnızca Windows".into())
    }
}

/// Geliştirme: dahili ses kaydı açılıyor mu (`cargo test loopback_probe -- --ignored --nocapture`)
#[cfg(all(test, windows))]
mod probe {
    use std::time::{Duration, Instant};
    use windows::Win32::Media::Audio::{eConsole, eRender, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator, MMDeviceEnumerator, AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK};
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};

    #[test]
    #[ignore]
    fn loopback_probe() {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let en: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).unwrap();
            let device = en.GetDefaultAudioEndpoint(eRender, eConsole).unwrap();
            let client: IAudioClient = device.Activate(CLSCTX_ALL, None).unwrap();
            let fmt = client.GetMixFormat().unwrap();
            let f = *fmt;
            let (rate, ch, bits, tag) = (f.nSamplesPerSec, f.nChannels, f.wBitsPerSample, f.wFormatTag);
            println!("biçim: {rate} Hz, {ch} kanal, {bits} bit, etiket {tag:#x}");
            client.Initialize(AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK, 10_000_000, 0, fmt, None).unwrap();
            let capture: IAudioCaptureClient = client.GetService().unwrap();
            client.Start().unwrap();
            let (mut frames_total, mut packets) = (0u32, 0u32);
            let started = Instant::now();
            while started.elapsed() < Duration::from_secs(3) {
                std::thread::sleep(Duration::from_millis(20));
                while capture.GetNextPacketSize().unwrap() > 0 {
                    let (mut data, mut frames, mut flags) = (std::ptr::null_mut::<u8>(), 0u32, 0u32);
                    capture.GetBuffer(&mut data, &mut frames, &mut flags, None, None).unwrap();
                    frames_total += frames;
                    packets += 1;
                    capture.ReleaseBuffer(frames).unwrap();
                }
            }
            let _ = client.Stop();
            println!("3 sn: {packets} paket, {frames_total} kare");
        }
    }
}
