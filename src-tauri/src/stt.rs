//! Yerel konuşma tanıma (Whisper, whisper.cpp): sesli komut internete gitmeden, Gemini kotası
//! harcamadan bu bilgisayarda yazıya dökülür. Model bir kez indirilir (%LOCALAPPDATA%\Nook\whisper),
//! ilk kullanımda belleğe yüklenir ve orada kalır.

use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Mutex;
use std::time::Instant;

use base64::Engine;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

/// Türkçede doğruluk/hız dengesi: "small", 5 bit nicemlenmiş (~190 MB)
const MODEL: &str = "ggml-small-q5_1.bin";
const URL: &str = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin";
/// Yarım inmiş dosya model sayılmasın
const MIN_BYTES: u64 = 150_000_000;

static CTX: Mutex<Option<WhisperContext>> = Mutex::new(None);
static DOWNLOADING: AtomicBool = AtomicBool::new(false);
/// İndirme yüzdesi × 10
static PROGRESS: AtomicU32 = AtomicU32::new(0);

fn model_path() -> Option<PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(|p| PathBuf::from(p).join("Nook").join("whisper").join(MODEL))
}

fn installed() -> bool {
    model_path().and_then(|p| std::fs::metadata(p).ok()).is_some_and(|m| m.len() >= MIN_BYTES)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SttStatus {
    installed: bool,
    downloading: bool,
    /// 0–100
    progress: f32,
    loaded: bool,
}

#[tauri::command]
pub fn stt_status() -> SttStatus {
    SttStatus {
        installed: installed(),
        downloading: DOWNLOADING.load(Ordering::Relaxed),
        progress: PROGRESS.load(Ordering::Relaxed) as f32 / 10.0,
        loaded: CTX.lock().unwrap().is_some(),
    }
}

/// Modeli indir (arka planda); ilerleme "nook://stt-progress" ile, bitince "nook://stt-ready"
#[tauri::command]
pub fn stt_download(app: AppHandle) -> Result<(), String> {
    if installed() {
        return Ok(());
    }
    if DOWNLOADING.swap(true, Ordering::Relaxed) {
        return Ok(());
    }
    PROGRESS.store(0, Ordering::Relaxed);
    std::thread::Builder::new()
        .name("nook-stt-download".into())
        .spawn(move || {
            let res = download(&app);
            DOWNLOADING.store(false, Ordering::Relaxed);
            match res {
                Ok(()) => {
                    let _ = app.emit("nook://stt-ready", true);
                    // İlk komut beklemesin
                    let _ = load();
                }
                Err(e) => {
                    crate::log::write("warn", &format!("whisper indirme: {e}"));
                    let _ = app.emit("nook://stt-ready", e);
                }
            }
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn download(app: &AppHandle) -> Result<(), String> {
    let path = model_path().ok_or("klasör yok")?;
    if let Some(d) = path.parent() {
        std::fs::create_dir_all(d).map_err(|e| e.to_string())?;
    }
    let part = path.with_extension("part");
    let resp = ureq::get(URL).timeout(std::time::Duration::from_secs(60 * 30)).call().map_err(|e| e.to_string())?;
    let total: u64 = resp.header("Content-Length").and_then(|v| v.parse().ok()).unwrap_or(190_000_000);
    let mut reader = resp.into_reader();
    let mut file = std::fs::File::create(&part).map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; 256 * 1024];
    let mut got = 0u64;
    let mut last = Instant::now();
    loop {
        let n = reader.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        got += n as u64;
        if last.elapsed().as_millis() > 250 {
            last = Instant::now();
            let pct = (got as f64 / total as f64 * 100.0).min(100.0);
            PROGRESS.store((pct * 10.0) as u32, Ordering::Relaxed);
            let _ = app.emit("nook://stt-progress", pct);
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    drop(file);
    if got < MIN_BYTES {
        let _ = std::fs::remove_file(&part);
        return Err("indirme yarım kaldı".into());
    }
    std::fs::rename(&part, &path).map_err(|e| e.to_string())?;
    PROGRESS.store(1000, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub fn stt_delete() -> SttStatus {
    *CTX.lock().unwrap() = None;
    if let Some(p) = model_path() {
        let _ = std::fs::remove_file(p);
    }
    stt_status()
}

/// Modeli belleğe yükle (yüklüyse bir şey yapma)
fn load() -> Result<(), String> {
    let mut ctx = CTX.lock().unwrap();
    if ctx.is_some() {
        return Ok(());
    }
    let path = model_path().filter(|_| installed()).ok_or("model indirilmemiş")?;
    let t0 = Instant::now();
    let c = WhisperContext::new_with_params(&path, WhisperContextParameters::default()).map_err(|e| format!("model yüklenemedi: {e}"))?;
    crate::log::write("info", &format!("whisper yüklendi: {} ms", t0.elapsed().as_millis()));
    *ctx = Some(c);
    Ok(())
}

/// Sesli komut açılınca modeli şimdiden yükle (ilk komut beklemesin)
#[tauri::command]
pub async fn stt_preload() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(load).await.map_err(|e| e.to_string())?
}

/// Base64 WAV (16 kHz, 16 bit, mono) → metin. `prompt`: geçebilecek adlar (uygulamalar…), tanımaya ipucu.
/// `lang`: Nook'un dili (tr, en…); verilmezse Türkçe.
#[tauri::command]
pub async fn stt_transcribe(audio: String, prompt: String, lang: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || transcribe(&audio, &prompt, lang.as_deref().unwrap_or("tr"))).await.map_err(|e| e.to_string())?
}

fn transcribe(audio: &str, prompt: &str, lang: &str) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD.decode(audio).map_err(|e| e.to_string())?;
    let data = bytes.windows(4).position(|w| w == b"data").map(|i| i + 8).ok_or("WAV değil")?;
    let samples: Vec<f32> = bytes[data..].chunks_exact(2).map(|c| i16::from_le_bytes([c[0], c[1]]) as f32 / 32768.0).collect();
    run(samples, prompt, lang)
}

/// Model indirilmiş mi ("Hey Nook" doğrulaması için)
pub fn ready() -> bool {
    installed()
}

/// "Hey Nook" doğrulaması: uyandırma sözüne benzeyen ses gerçekten "Nook" mu? Model indirilmemişse None
/// (o zaman yalnızca ses örnekleriyle karşılaştırma geçerli). Kalıp benzerliği öksürüğü, "Hey Luko"yu,
/// televizyondaki konuşmayı da yakalayabiliyordu; yazıya dökülünce "nuk/nook/nok" geçmeli.
pub fn heard_nook(samples: &[f32]) -> Option<bool> {
    if !installed() {
        return None;
    }
    if load().is_err() {
        return None;
    }
    // İpucusuz "Hey Nook" → "HENOK", "Hanyuk"; "Nook" ipucuyla doğru yazılıyor, "Hey look", "Hey Luke",
    // "Notebook" yine olduğu gibi kalıyor ("Hey Nook!" ipucu ise "Hey now"u "Hey No!" yapıyordu)
    let text = run(samples.to_vec(), "Nook", "tr").ok()?;
    let ok = says_nook(&text);
    crate::log::write("info", &format!("hey nook doğrulama: {text:?} → {}", if ok { "evet" } else { "hayır" }));
    Some(ok)
}

/// Whisper "Nook"u çoğunlukla "Nook", "Nuk", "Nok", "Nug", "Nuuk" diye yazar; "Hey" ile bitişik de olabilir
fn says_nook(text: &str) -> bool {
    let low: String = text.to_lowercase().chars().map(|c| if c.is_alphanumeric() { c } else { ' ' }).collect();
    low.split_whitespace().any(|w| {
        let w = w.strip_prefix("hey").filter(|r| !r.is_empty()).unwrap_or(w);
        let w = w.strip_prefix("hay").filter(|r| !r.is_empty()).unwrap_or(w);
        // n + 1-2 sesli (o, u, ü, ö, 0) + k/g/q, ardından en fazla bir harf ("nook'u" → "nooku"; "nokta" değil)
        let c: Vec<char> = w.chars().collect();
        let vowel = |ch: char| "ouüö0".contains(ch);
        let vowels = c.iter().skip(1).take_while(|ch| vowel(**ch)).count();
        c.first() == Some(&'n') && (1..=2).contains(&vowels) && c.get(1 + vowels).is_some_and(|ch| "kgq".contains(*ch)) && c.len() <= vowels + 3
    })
}

fn run(mut samples: Vec<f32>, prompt: &str, lang: &str) -> Result<String, String> {
    // Whisper en az 1 sn ister
    if samples.len() < 16_000 {
        samples.resize(16_000, 0.0);
    }
    let secs = samples.len() as f32 / 16_000.0;

    load()?;
    let guard = CTX.lock().unwrap();
    let ctx = guard.as_ref().ok_or("model yok")?;
    let mut state = ctx.create_state().map_err(|e| e.to_string())?;
    let mut p = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    // Whisper'ın bildiği dillerden biri (Nook'un dilleri hepsi öyle); değilse Türkçe
    p.set_language(Some(if lang.len() == 2 { lang } else { "tr" }));
    // Fiziksel çekirdek kadar (SMT iş parçacıkları ggml'de hızlandırmıyor)
    p.set_n_threads((std::thread::available_parallelism().map_or(4, |n| n.get()) / 2).clamp(2, 8) as i32);
    p.set_translate(false);
    p.set_no_context(true);
    p.set_single_segment(true);
    p.set_no_timestamps(true);
    p.set_suppress_blank(true);
    p.set_temperature(0.0);
    // Beğenmediği sonucu daha yüksek sıcaklıkla yeniden çözmesin (kısa komutta 5-6 kat yavaşlatıyordu)
    p.set_temperature_inc(0.0);
    p.set_print_progress(false);
    p.set_print_realtime(false);
    p.set_print_special(false);
    p.set_print_timestamps(false);
    // Kısa komutta 30 sn'lik pencerenin tamamını işlemek gereksiz: sesin süresine göre (çok daha hızlı)
    p.set_audio_ctx(((secs * 50.0) as i32 + 300).clamp(512, 1500));
    if !prompt.is_empty() {
        p.set_initial_prompt(prompt);
    }
    let t0 = Instant::now();
    state.full(p, &samples).map_err(|e| e.to_string())?;
    let text: String = state.as_iter().filter_map(|s| s.to_str_lossy().ok().map(|t| t.into_owned())).collect::<Vec<_>>().join(" ");
    crate::log::write("info", &format!("whisper: {:.1} sn ses, {} ms", secs, t0.elapsed().as_millis()));
    Ok(text.trim().to_string())
}

pub fn init() {
    // whisper.cpp'nin ayrıntılı günlüğü konsola dökülmesin
    whisper_rs::install_logging_hooks();
}

#[cfg(test)]
mod tests {
    #[test]
    fn says_nook_variants() {
        for t in ["Hey Nook!", "hey nuk", "Heynuk.", "Hey, Nok", "Hey Nuuk", "Hey Nook, YouTube'da lo-fi aç", "nooku aç"] {
            assert!(super::says_nook(t), "{t}");
        }
        for t in ["Hey Luko", "Tamam", "nokta koy", "Hey, ne oluyor?", "Bilmiyorum", "hey now", "Okay"] {
            assert!(!super::says_nook(t), "{t}");
        }
    }

    /// "Hey Nook" doğrulaması: NOOK_WAKE_VERIFY klasöründeki yes_*.wav kabul, no_*.wav ret edilmeli
    #[test]
    fn wake_verify() {
        let Some(dir) = std::env::var_os("NOOK_WAKE_VERIFY") else { return };
        let mut files: Vec<_> = std::fs::read_dir(dir).unwrap().map(|e| e.unwrap().path()).collect();
        files.sort();
        for f in files {
            let bytes = std::fs::read(&f).unwrap();
            let data = bytes.windows(4).position(|w| w == b"data").unwrap() + 8;
            let samples: Vec<f32> = bytes[data..].chunks_exact(2).map(|c| i16::from_le_bytes([c[0], c[1]]) as f32 / 32768.0).collect();
            let t0 = std::time::Instant::now();
            let ok = super::heard_nook(&samples);
            let ms = t0.elapsed().as_millis();
            let mut out = Vec::new();
            for prompt in ["Nook"] {
                let text = super::run(samples.clone(), prompt, "tr").unwrap_or_default();
                out.push(format!("[{}] {text:?}", if super::says_nook(&text) { "+" } else { "-" }));
            }
            println!("{} → {ok:?} ({ms} ms) {}", f.file_name().unwrap().to_string_lossy(), out.join("  "));
        }
    }

    /// Hız ölçümü: NOOK_STT_TEST klasöründeki WAV'lar (model indirilmiş olmalı)
    #[test]
    fn stt_bench() {
        let Some(dir) = std::env::var_os("NOOK_STT_TEST") else { return };
        use base64::Engine;
        let mut files: Vec<_> = std::fs::read_dir(dir).unwrap().map(|e| e.unwrap().path()).collect();
        files.sort();
        for p in files.iter().filter(|p| p.extension().is_some_and(|e| e == "wav")).take(6) {
            let b64 = base64::engine::general_purpose::STANDARD.encode(std::fs::read(p).unwrap());
            let t0 = std::time::Instant::now();
            let text = super::transcribe(&b64, "Hey Nook, Argus'u aç. Spotify'ı aç.", "tr").unwrap();
            println!("{:?} {} ms → {text}", p.file_name().unwrap(), t0.elapsed().as_millis());
        }
    }
}
