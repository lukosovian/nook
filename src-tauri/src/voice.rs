//! Sesli komut: varsayılan mikrofondan (WASAPI, paylaşımlı mod) kayıt alır.
//! Kısayol basılı tutulurken ya da sohbetteki mikrofon düğmesiyle başlar; bitince
//! 16 kHz mono WAV (base64) olarak döner — Gemini bunu yazıya çevirir.
//! Kayıt sırasında ses seviyesi "nook://voice-level" ile yayınlanır (Nook'un kulak animasyonu).

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use base64::Engine;
use tauri::{AppHandle, Emitter};

/// Bundan uzun kayıt kendiliğinden biter.
const MAX: Duration = Duration::from_secs(30);
const OUT_RATE: u32 = 16_000;

struct Recording {
    stop: Arc<AtomicBool>,
    handle: JoinHandle<Result<(Vec<f32>, u32), String>>,
    started: Instant,
}

static REC: Mutex<Option<Recording>> = Mutex::new(None);

/// Kayıt başlat (zaten sürüyorsa bir şey yapma).
pub fn start(app: &AppHandle) -> bool {
    let mut rec = REC.lock().unwrap();
    if rec.is_some() {
        return false;
    }
    let stop = Arc::new(AtomicBool::new(false));
    let flag = stop.clone();
    let app = app.clone();
    let handle = thread::spawn(move || imp::record(&flag, &app));
    *rec = Some(Recording { stop, handle, started: Instant::now() });
    true
}

/// Kaydı bitir; çok kısaysa (yanlışlıkla basma) `Ok(None)`.
pub fn stop() -> Result<Option<String>, String> {
    let Some(rec) = REC.lock().unwrap().take() else { return Ok(None) };
    rec.stop.store(true, Ordering::Relaxed);
    let short = rec.started.elapsed() < Duration::from_millis(400);
    let (samples, rate) = rec.handle.join().map_err(|_| "kayıt çöktü".to_string())??;
    if short || samples.is_empty() {
        return Ok(None);
    }
    Ok(Some(base64::engine::general_purpose::STANDARD.encode(wav(&resample(&samples, rate, OUT_RATE), OUT_RATE))))
}

#[tauri::command]
pub fn voice_start(app: AppHandle) -> bool {
    start(&app)
}

/// Base64 WAV; kayıt yoksa/çok kısaysa null.
#[tauri::command]
pub async fn voice_stop() -> Result<Option<String>, String> {
    stop()
}

/// Doğrusal aradeğerleme ile örnekleme hızı dönüşümü (konuşma için yeterli).
fn resample(input: &[f32], from: u32, to: u32) -> Vec<f32> {
    if from == to || input.is_empty() {
        return input.to_vec();
    }
    let ratio = from as f64 / to as f64;
    let n = (input.len() as f64 / ratio) as usize;
    (0..n)
        .map(|i| {
            let pos = i as f64 * ratio;
            let j = pos as usize;
            let frac = (pos - j as f64) as f32;
            let a = input[j];
            let b = *input.get(j + 1).unwrap_or(&a);
            a + (b - a) * frac
        })
        .collect()
}

fn wav(samples: &[f32], rate: u32) -> Vec<u8> {
    let data_len = (samples.len() * 2) as u32;
    let mut out = Vec::with_capacity(44 + data_len as usize);
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&(36 + data_len).to_le_bytes());
    out.extend_from_slice(b"WAVEfmt ");
    out.extend_from_slice(&16u32.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes()); // PCM
    out.extend_from_slice(&1u16.to_le_bytes()); // mono
    out.extend_from_slice(&rate.to_le_bytes());
    out.extend_from_slice(&(rate * 2).to_le_bytes());
    out.extend_from_slice(&2u16.to_le_bytes());
    out.extend_from_slice(&16u16.to_le_bytes());
    out.extend_from_slice(b"data");
    out.extend_from_slice(&data_len.to_le_bytes());
    for s in samples {
        out.extend_from_slice(&((s.clamp(-1.0, 1.0) * 32767.0) as i16).to_le_bytes());
    }
    out
}

fn emit_level(app: &AppHandle, level: f32) {
    let _ = app.emit("nook://voice-level", level);
}

#[cfg(windows)]
mod imp {
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::time::{Duration, Instant};

    use tauri::AppHandle;
    use windows::Win32::Media::Audio::{
        eCapture, eConsole, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator, MMDeviceEnumerator, AUDCLNT_SHAREMODE_SHARED, WAVEFORMATEX,
    };
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_MULTITHREADED};

    const AUDCLNT_BUFFERFLAGS_SILENT: u32 = 0x2;
    const WAVE_FORMAT_PCM: u16 = 1;

    pub fn record(stop: &AtomicBool, app: &AppHandle) -> Result<(Vec<f32>, u32), String> {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let err = |e: windows::core::Error| format!("mikrofon açılamadı: {e}");
            let en: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(err)?;
            let device = en.GetDefaultAudioEndpoint(eCapture, eConsole).map_err(|_| "mikrofon bulunamadı".to_string())?;
            let client: IAudioClient = device.Activate(CLSCTX_ALL, None).map_err(err)?;
            let fmt_ptr = client.GetMixFormat().map_err(err)?;
            let fmt: WAVEFORMATEX = *fmt_ptr;
            let init = client.Initialize(AUDCLNT_SHAREMODE_SHARED, 0, 10_000_000, 0, fmt_ptr, None);
            CoTaskMemFree(Some(fmt_ptr as _));
            init.map_err(err)?;
            let capture: IAudioCaptureClient = client.GetService().map_err(err)?;
            client.Start().map_err(err)?;

            let channels = fmt.nChannels.max(1) as usize;
            let bits = fmt.wBitsPerSample;
            // Paylaşımlı modun karışım biçimi pratikte hep 32 bit float; 16 bit PCM'i de destekle
            let is_pcm16 = bits == 16 && (fmt.wFormatTag == WAVE_FORMAT_PCM || fmt.cbSize >= 22);
            let mut out: Vec<f32> = Vec::with_capacity(fmt.nSamplesPerSec as usize * 10);
            let started = Instant::now();
            let mut last_level = Instant::now();
            let mut peak = 0f32;

            while !stop.load(Ordering::Relaxed) && started.elapsed() < super::MAX {
                std::thread::sleep(Duration::from_millis(15));
                loop {
                    let n = capture.GetNextPacketSize().unwrap_or(0);
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
                                sum += if is_pcm16 {
                                    *(data as *const i16).add(i) as f32 / 32768.0
                                } else {
                                    *(data as *const f32).add(i)
                                };
                            }
                        }
                        let s = sum / channels as f32;
                        peak = peak.max(s.abs());
                        out.push(s);
                    }
                    let _ = capture.ReleaseBuffer(frames);
                }
                if last_level.elapsed() > Duration::from_millis(70) {
                    super::emit_level(app, (peak * 3.0).min(1.0));
                    peak = 0.0;
                    last_level = Instant::now();
                }
            }
            let _ = client.Stop();
            super::emit_level(app, 0.0);
            Ok((out, fmt.nSamplesPerSec))
        }
    }
}

#[cfg(not(windows))]
mod imp {
    use std::sync::atomic::AtomicBool;
    use tauri::AppHandle;
    pub fn record(_s: &AtomicBool, _a: &AppHandle) -> Result<(Vec<f32>, u32), String> {
        Err("yalnızca Windows".into())
    }
}
