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

#[tauri::command]
pub fn media_resync() {
    RESEND.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub fn media_control(action: String) -> Result<(), String> {
    imp::control(&action)
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
}
