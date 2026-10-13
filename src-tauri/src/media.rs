//! "Şu an çalan" izleyici. Windows'un sistem medya oturumunu (GSMTC) okur:
//! Spotify, tarayıcıda YouTube, Apple Music, VLC… medya tuşlarını destekleyen her şey.
//! Parça/oynatma durumu değişince, oynarken de periyodik olarak webview'a yayınlar.

use std::sync::atomic::{AtomicBool, Ordering};

use serde::Serialize;

/// Frontend yeni açıldığında son durumu (kapak dahil) yeniden istemek için.
static RESEND: AtomicBool = AtomicBool::new(false);


#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Media {
    title: String,
    artist: String,
    album: String,
    app: String,
    playing: bool,
    position_ms: u64,
    duration_ms: u64,
    /// Parça kimliği; kapak yalnızca bu değişince (bir kez) gönderilir.
    track_key: String,
    /// data: URL; yalnızca yeni yüklendiğinde dolu.
    artwork: Option<String>,
}

/// Son durum (telefon "şu an çalan"ı sorunca): parça, alındığı an ve kapak (data URL)
static NOW: std::sync::Mutex<Option<(Media, std::time::Instant)>> = std::sync::Mutex::new(None);
static ART: std::sync::Mutex<Option<(String, String)>> = std::sync::Mutex::new(None);

fn remember(media: Option<&Media>) {
    let Some(m) = media else {
        *NOW.lock().unwrap() = None;
        return;
    };
    if let Some(art) = &m.artwork {
        *ART.lock().unwrap() = Some((m.track_key.clone(), art.clone()));
    }
    *NOW.lock().unwrap() = Some((Media { artwork: None, ..m.clone() }, std::time::Instant::now()));
}

/// Şu an çalan (konum, alındığından beri geçen süre eklenerek) — yoksa None
pub fn now_playing() -> Option<serde_json::Value> {
    let (m, at) = NOW.lock().unwrap().clone()?;
    let pos = if m.playing { (m.position_ms + at.elapsed().as_millis() as u64).min(m.duration_ms.max(m.position_ms)) } else { m.position_ms };
    let has_art = ART.lock().unwrap().as_ref().is_some_and(|(k, _)| *k == m.track_key);
    Some(serde_json::json!({
        "title": m.title, "artist": m.artist, "album": m.album, "app": m.app, "playing": m.playing,
        "positionMs": pos, "durationMs": m.duration_ms, "trackKey": m.track_key, "hasArt": has_art,
    }))
}

/// Çalan parçanın kapağı: (MIME, bayt)
pub fn artwork_bytes() -> Option<(String, Vec<u8>)> {
    use base64::Engine;
    let key = NOW.lock().unwrap().as_ref()?.0.track_key.clone();
    let (k, url) = ART.lock().unwrap().clone()?;
    if k != key {
        return None;
    }
    let (head, data) = url.strip_prefix("data:")?.split_once(";base64,")?;
    Some((head.to_owned(), base64::engine::general_purpose::STANDARD.decode(data).ok()?))
}

#[tauri::command]
pub fn media_resync() {
    RESEND.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub fn media_control(action: String) -> Result<(), String> {
    imp::control(&action)
}

/// Çalan şarkıyı/videoyu verilen ana (ms) sar. Uygulama izin vermiyorsa hata
#[tauri::command]
pub async fn media_seek(ms: u64) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || imp::seek(ms)).await.map_err(|e| e.to_string())?
}

/// Telefondan sarma (köprü zaten kendi iş parçacığında)
pub fn imp_seek(ms: u64) -> Result<(), String> {
    imp::seek(ms)
}

/// Çalan bütün medya oturumlarını duraklat (gizlilik kalkanı). Duraklatılan oldu mu döner.
pub fn pause_all() -> bool {
    imp::pause_all()
}

pub use imp::spawn;

#[cfg(windows)]
mod imp {
    use std::sync::atomic::Ordering;
    use std::thread;
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    use base64::{engine::general_purpose::STANDARD, Engine};
    use tauri::{AppHandle, Emitter};
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSession as Session,
        GlobalSystemMediaTransportControlsSessionManager as Manager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    };
    use windows::Storage::Streams::DataReader;

    use super::{Media, RESEND};

    const POLL: Duration = Duration::from_millis(700);
    /// Oynarken ilerleme çubuğu kaymasın diye bu aralıkla pozisyonu yeniden gönder.
    const RESYNC: Duration = Duration::from_secs(5);
    /// Kapak bazen parça bilgisinden biraz sonra hazır olur — birkaç kez dene.
    const ART_TRIES: u8 = 4;
    /// 1601-01-01 ile 1970-01-01 arası, 100 ns biriminde (Windows DateTime).
    const EPOCH_DIFF_100NS: i64 = 116_444_736_000_000_000;

    pub fn spawn(app: AppHandle) {
        thread::Builder::new()
            .name("nook-media".into())
            .spawn(move || {
                let mut manager: Option<Manager> = None;
                let mut last_sig = String::new();
                let mut last_emit = Instant::now();
                let mut art_key = String::new();
                let mut art_tries = 0u8;

                loop {
                    if RESEND.swap(false, Ordering::Relaxed) {
                        last_sig.clear();
                        art_key.clear();
                    }
                    if manager.is_none() {
                        manager = Manager::RequestAsync().and_then(|op| op.join()).ok();
                    }

                    let snap = manager.as_ref().and_then(|m| snapshot(m).ok().flatten());
                    match snap {
                        None => {
                            if last_sig != "none" {
                                last_sig = "none".into();
                                art_key.clear();
                                super::remember(None);
                                let _ = app.emit("nook://media", Option::<Media>::None);
                            }
                        }
                        Some((session, mut media)) => {
                            if media.track_key != art_key {
                                art_key = media.track_key.clone();
                                art_tries = 0;
                            }
                            let mut force = false;
                            if art_tries < ART_TRIES {
                                art_tries += 1;
                                if let Some(art) = artwork(&session) {
                                    media.artwork = Some(art);
                                    art_tries = ART_TRIES;
                                    force = true;
                                }
                            }

                            super::remember(Some(&media));
                            let sig = format!("{}|{}|{}", media.track_key, media.playing, media.duration_ms);
                            if force || sig != last_sig || (media.playing && last_emit.elapsed() >= RESYNC) {
                                last_sig = sig;
                                last_emit = Instant::now();
                                let _ = app.emit("nook://media", Some(media));
                            }
                        }
                    }

                    thread::sleep(POLL);
                }
            })
            .expect("media thread başlatılamadı");
    }

    fn snapshot(manager: &Manager) -> windows::core::Result<Option<(Session, Media)>> {
        let Ok(session) = manager.GetCurrentSession() else { return Ok(None) };
        let props = session.TryGetMediaPropertiesAsync()?.join()?;
        let title = props.Title()?.to_string();
        if title.is_empty() {
            return Ok(None);
        }
        let artist = props.Artist()?.to_string();
        let album = props.AlbumTitle()?.to_string();
        let app = session.SourceAppUserModelId()?.to_string();
        let playing = session.GetPlaybackInfo()?.PlaybackStatus()? == Status::Playing;

        let (mut position_ms, mut duration_ms) = (0u64, 0u64);
        if let Ok(t) = session.GetTimelineProperties() {
            let end = t.EndTime()?.Duration - t.StartTime()?.Duration;
            let mut pos = t.Position()?.Duration;
            // Position, LastUpdatedTime anındaki değerdir; oynuyorsa geçen süreyi ekle.
            if playing {
                let updated = t.LastUpdatedTime()?.UniversalTime;
                if updated > 0 {
                    pos += (now_100ns() - updated).max(0);
                }
            }
            if end > 0 {
                duration_ms = (end / 10_000) as u64;
                position_ms = (pos.clamp(0, end) / 10_000) as u64;
            }
        }

        let track_key = format!("{app}\u{1f}{title}\u{1f}{artist}\u{1f}{album}");
        Ok(Some((
            session,
            Media { title, artist, album, app, playing, position_ms, duration_ms, track_key, artwork: None },
        )))
    }

    fn artwork(session: &Session) -> Option<String> {
        let read = || -> windows::core::Result<Option<String>> {
            let props = session.TryGetMediaPropertiesAsync()?.join()?;
            let Ok(thumb) = props.Thumbnail() else { return Ok(None) };
            let stream = thumb.OpenReadAsync()?.join()?;
            let size = stream.Size()? as u32;
            if size == 0 {
                return Ok(None);
            }
            let reader = DataReader::CreateDataReader(&stream)?;
            reader.LoadAsync(size)?.join()?;
            let mut buf = vec![0u8; size as usize];
            reader.ReadBytes(&mut buf)?;
            let mime = stream.ContentType().map(|m| m.to_string()).unwrap_or_default();
            let mime = if mime.starts_with("image/") { mime } else { "image/png".into() };
            Ok(Some(format!("data:{mime};base64,{}", STANDARD.encode(buf))))
        };
        read().ok().flatten()
    }

    fn now_100ns() -> i64 {
        let unix = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
        (unix.as_nanos() / 100) as i64 + EPOCH_DIFF_100NS
    }

    pub fn pause_all() -> bool {
        let run = || -> windows::core::Result<bool> {
            let sessions = Manager::RequestAsync()?.join()?.GetSessions()?;
            let mut paused = false;
            for s in sessions {
                let playing = s.GetPlaybackInfo().and_then(|i| i.PlaybackStatus()).is_ok_and(|st| st == Status::Playing);
                if playing && s.TryPauseAsync().and_then(|op| op.join()).unwrap_or(false) {
                    paused = true;
                }
            }
            if paused {
                RESEND.store(true, Ordering::Relaxed);
            }
            Ok(paused)
        };
        run().unwrap_or(false)
    }

    pub fn seek(ms: u64) -> Result<(), String> {
        let run = || -> windows::core::Result<bool> {
            let session = Manager::RequestAsync()?.join()?.GetCurrentSession()?;
            // Konum, zaman çizelgesinin verdiği değerle aynı ölçekte (100 ns)
            let ok = session.TryChangePlaybackPositionAsync(ms as i64 * 10_000)?.join()?;
            if ok {
                RESEND.store(true, Ordering::Relaxed);
            }
            Ok(ok)
        };
        match run() {
            Ok(true) => Ok(()),
            Ok(false) => Err("Bu uygulama ileri geri sarmaya izin vermiyor".into()),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn control(action: &str) -> Result<(), String> {
        let run = || -> windows::core::Result<()> {
            let session = Manager::RequestAsync()?.join()?.GetCurrentSession()?;
            match action {
                "toggle" => session.TryTogglePlayPauseAsync()?.join()?,
                "next" => session.TrySkipNextAsync()?.join()?,
                "prev" => session.TrySkipPreviousAsync()?.join()?,
                _ => return Ok(()),
            };
            RESEND.store(true, Ordering::Relaxed);
            Ok(())
        };
        run().map_err(|e| e.to_string())
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn spawn(_app: tauri::AppHandle) {}
    pub fn pause_all() -> bool {
        false
    }
    pub fn control(_action: &str) -> Result<(), String> {
        Err("yalnızca Windows'ta destekleniyor".into())
    }
    pub fn seek(_ms: u64) -> Result<(), String> {
        Err("yalnızca Windows'ta destekleniyor".into())
    }
}
