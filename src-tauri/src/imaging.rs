//! Görsel yardımcıları:
//!  - Dosya/kısayol/uygulama ikonu → PNG data URL (Kısayollar, bildirim kartları)
//!  - Uygulama kimliğinden (AUMID) görünen ad: "com.squirrel.Discord.Discord" → "Discord"
//!  - İmlecin olduğu ekranın görüntüsü → JPEG data URL ("Ekrana sor")

use std::collections::HashMap;
use std::sync::Mutex;

use base64::Engine;

fn data_url(mime: &str, bytes: &[u8]) -> String {
    format!("data:{mime};base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes))
}

pub fn encode_png(w: u32, h: u32, rgba: &[u8]) -> Option<Vec<u8>> {
    let mut out = Vec::new();
    {
        let mut enc = png::Encoder::new(&mut out, w, h);
        enc.set_color(png::ColorType::Rgba);
        enc.set_depth(png::BitDepth::Eight);
        let mut writer = enc.write_header().ok()?;
        writer.write_image_data(rgba).ok()?;
    }
    Some(out)
}

pub fn encode_jpeg(w: u16, h: u16, rgb: &[u8], quality: u8) -> Option<Vec<u8>> {
    let mut out = Vec::new();
    jpeg_encoder::Encoder::new(&mut out, quality).encode(rgb, w, h, jpeg_encoder::ColorType::Rgb).ok()?;
    Some(out)
}

/// Aynı ikon tekrar tekrar çıkarılmasın (bildirimler, kısayol listesi).
static ICONS: Mutex<Option<HashMap<(String, u32), Option<String>>>> = Mutex::new(None);
static NAMES: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

/// Dosyanın, klasörün, .lnk kısayolunun ya da `shell:AppsFolder\<AUMID>` uygulamasının ikonu.
#[tauri::command]
pub async fn file_icon(path: String, size: Option<u32>) -> Option<String> {
    icon(&path, size.unwrap_or(48))
}

pub fn icon(path: &str, size: u32) -> Option<String> {
    let key = (path.to_owned(), size);
    if let Some(hit) = ICONS.lock().unwrap().get_or_insert_with(HashMap::new).get(&key) {
        return hit.clone();
    }
    let made = imp::icon_rgba(path, size).and_then(|(w, h, rgba)| encode_png(w, h, &rgba)).map(|png| data_url("image/png", &png));
    ICONS.lock().unwrap().get_or_insert_with(HashMap::new).insert(key, made.clone());
    made
}

/// Bildirim gönderen uygulamanın adı. Başlat menüsünde kayıtlıysa oradaki ad, değilse kimlikten tahmin.
pub fn app_name(aumid: &str) -> String {
    if let Some(hit) = NAMES.lock().unwrap().get_or_insert_with(HashMap::new).get(aumid) {
        return hit.clone();
    }
    let name = imp::display_name(&format!("shell:AppsFolder\\{aumid}")).filter(|n| !n.is_empty()).unwrap_or_else(|| guess_name(aumid));
    NAMES.lock().unwrap().get_or_insert_with(HashMap::new).insert(aumid.to_owned(), name.clone());
    name
}

/// "5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App" → "WhatsApp"
fn guess_name(aumid: &str) -> String {
    let base = aumid.split('!').next().unwrap_or(aumid);
    let base = base.split('_').next().unwrap_or(base);
    let last = base.rsplit(['.', '\\', '/']).find(|s| !s.is_empty()).unwrap_or(base);
    let last = last.trim_end_matches(".exe").trim_end_matches("Desktop");
    if last.is_empty() {
        aumid.to_owned()
    } else {
        last.to_owned()
    }
}

/// İmlecin olduğu ekranın görüntüsü; uzun kenarı en fazla `max` px (Gemini'ye giden boyut küçük kalsın).
#[tauri::command]
pub async fn capture_screen() -> Result<String, String> {
    capture(1600)
}

pub fn capture(max: u32) -> Result<String, String> {
    Ok(data_url("image/jpeg", &capture_jpeg(max, 82)?))
}

/// Bağlı ekranlar soldan sağa: (x, y, genişlik, yükseklik), ana ekran mı
pub fn monitors() -> Vec<((i32, i32, i32, i32), bool)> {
    let mut m = imp::monitors();
    m.sort_by_key(|((x, y, _, _), _)| (*x, *y));
    m
}

/// Belirli bir ekranın (sıra `monitors()` ile aynı) ya da `None` ise tüm ekranların birlikte görüntüsü, ham JPEG
pub fn capture_monitor_jpeg(index: Option<usize>, max: u32, quality: u8) -> Result<Vec<u8>, String> {
    let mons = monitors();
    let rect = match index {
        Some(i) => mons.get(i).map(|m| m.0).ok_or("böyle bir ekran yok")?,
        None => {
            let l = mons.iter().map(|m| m.0 .0).min().ok_or("ekran bulunamadı")?;
            let t = mons.iter().map(|m| m.0 .1).min().unwrap_or(0);
            let r = mons.iter().map(|m| m.0 .0 + m.0 .2).max().unwrap_or(0);
            let b = mons.iter().map(|m| m.0 .1 + m.0 .3).max().unwrap_or(0);
            (l, t, r - l, b - t)
        }
    };
    let (w, h, rgb) = imp::capture_rect_rgb(rect, max).ok_or("ekran görüntüsü alınamadı")?;
    encode_jpeg(w as u16, h as u16, &rgb, quality).ok_or_else(|| "görüntü kodlanamadı".into())
}

/// Masaüstünün bir bölgesi (sanal masaüstü koordinatlarında), uzun kenarı en fazla `max`: genişlik, yükseklik, RGB
pub fn capture_rect_rgb(rect: (i32, i32, i32, i32), max: u32) -> Option<(u32, u32, Vec<u8>)> {
    imp::capture_rect_rgb(rect, max)
}

/// İmlecin olduğu ekranın görüntüsü, ham JPEG (telefona gönderilen ekran görüntüsü)
pub fn capture_jpeg(max: u32, quality: u8) -> Result<Vec<u8>, String> {
    let (w, h, rgb) = imp::capture_rgb(max).ok_or("ekran görüntüsü alınamadı")?;
    encode_jpeg(w as u16, h as u16, &rgb, quality).ok_or_else(|| "görüntü kodlanamadı".into())
}

#[cfg(windows)]
mod imp {
    use windows::core::{Interface, HSTRING};
    use windows::Win32::Foundation::{POINT, SIZE};
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits, GetMonitorInfoW, GetObjectW, MonitorFromPoint,
        ReleaseDC, SelectObject, SetStretchBltMode, StretchBlt, BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HALFTONE, HBITMAP,
        HDC, MONITORINFO, MONITOR_DEFAULTTONEAREST, SRCCOPY, EnumDisplayMonitors, HMONITOR,
    };
    use windows::Win32::Foundation::{LPARAM, RECT};
    use windows::core::BOOL;
    use windows::Win32::System::Com::{CoInitializeEx, CoTaskMemFree, COINIT_MULTITHREADED};
    use windows::Win32::UI::Shell::{IShellItem, IShellItemImageFactory, SHCreateItemFromParsingName, SIGDN_NORMALDISPLAY, SIIGBF_BIGGERSIZEOK, SIIGBF_ICONONLY};
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    fn com() {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
    }

    /// 32 bit, yukarıdan aşağı BGRA piksel okuması.
    unsafe fn read_bgra(dc: HDC, bmp: HBITMAP, w: i32, h: i32) -> Option<Vec<u8>> {
        let mut info = BITMAPINFO::default();
        info.bmiHeader = BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: w,
            biHeight: -h,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        };
        let mut buf = vec![0u8; (w * h * 4) as usize];
        let lines = GetDIBits(dc, bmp, 0, h as u32, Some(buf.as_mut_ptr().cast()), &mut info, DIB_RGB_COLORS);
        (lines == h).then_some(buf)
    }

    pub fn icon_rgba(path: &str, size: u32) -> Option<(u32, u32, Vec<u8>)> {
        com();
        unsafe {
            let item: IShellItem = SHCreateItemFromParsingName(&HSTRING::from(path), None).ok()?;
            let factory: IShellItemImageFactory = item.cast().ok()?;
            let bmp = factory.GetImage(SIZE { cx: size as i32, cy: size as i32 }, SIIGBF_ICONONLY | SIIGBF_BIGGERSIZEOK).ok()?;
            let mut meta = BITMAP::default();
            GetObjectW(bmp.into(), std::mem::size_of::<BITMAP>() as i32, Some((&mut meta as *mut BITMAP).cast()));
            let (w, h) = (meta.bmWidth, meta.bmHeight.abs());
            let dc = CreateCompatibleDC(None);
            let px = read_bgra(dc, bmp, w, h);
            let _ = DeleteDC(dc);
            let _ = DeleteObject(bmp.into());
            let mut px = px?;
            // BGRA (önceden çarpılmış alfa) → düz RGBA
            for p in px.chunks_exact_mut(4) {
                let a = p[3] as u32;
                let (b, g, r) = (p[0] as u32, p[1] as u32, p[2] as u32);
                let un = |c: u32| if a == 0 { 0 } else { (c * 255 / a).min(255) as u8 };
                p[0] = un(r);
                p[1] = un(g);
                p[2] = un(b);
            }
            Some((w as u32, h as u32, px))
        }
    }

    pub fn display_name(parsing: &str) -> Option<String> {
        com();
        unsafe {
            let item: IShellItem = SHCreateItemFromParsingName(&HSTRING::from(parsing), None).ok()?;
            let p = item.GetDisplayName(SIGDN_NORMALDISPLAY).ok()?;
            let s = p.to_string().ok();
            CoTaskMemFree(Some(p.0 as _));
            s
        }
    }

    pub fn capture_rgb(max: u32) -> Option<(u32, u32, Vec<u8>)> {
        unsafe {
            let mut pt = POINT::default();
            let _ = GetCursorPos(&mut pt);
            let mut mi = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
            if !GetMonitorInfoW(MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST), &mut mi).as_bool() {
                return None;
            }
            let r = mi.rcMonitor;
            capture_rect_rgb((r.left, r.top, r.right - r.left, r.bottom - r.top), max)
        }
    }

    /// Bağlı ekranlar (sanal masaüstü koordinatlarında x, y, genişlik, yükseklik; ana ekran mı)
    pub fn monitors() -> Vec<((i32, i32, i32, i32), bool)> {
        unsafe extern "system" fn each(mon: HMONITOR, _dc: HDC, _r: *mut RECT, data: LPARAM) -> BOOL {
            let out = &mut *(data.0 as *mut Vec<((i32, i32, i32, i32), bool)>);
            let mut mi = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
            if GetMonitorInfoW(mon, &mut mi).as_bool() {
                let r = mi.rcMonitor;
                out.push(((r.left, r.top, r.right - r.left, r.bottom - r.top), mi.dwFlags & 1 != 0));
            }
            BOOL(1)
        }
        let mut out: Vec<((i32, i32, i32, i32), bool)> = Vec::new();
        unsafe {
            let _ = EnumDisplayMonitors(None, None, Some(each), LPARAM(&mut out as *mut _ as isize));
        }
        out
    }

    /// Masaüstünün bir bölgesi (x, y, genişlik, yükseklik), uzun kenarı en fazla `max` piksel
    pub fn capture_rect_rgb((x, y, sw, sh): (i32, i32, i32, i32), max: u32) -> Option<(u32, u32, Vec<u8>)> {
        unsafe {
            let r = RECT { left: x, top: y, right: x + sw, bottom: y + sh };
            let scale = (max as f64 / sw.max(sh) as f64).min(1.0);
            let (w, h) = (((sw as f64) * scale).round() as i32, ((sh as f64) * scale).round() as i32);

            let screen = GetDC(None);
            let mem = CreateCompatibleDC(Some(screen));
            let bmp = CreateCompatibleBitmap(screen, w, h);
            let old = SelectObject(mem, bmp.into());
            SetStretchBltMode(mem, HALFTONE);
            let ok = StretchBlt(mem, 0, 0, w, h, Some(screen), r.left, r.top, sw, sh, SRCCOPY).as_bool();
            SelectObject(mem, old);
            let px = if ok { read_bgra(mem, bmp, w, h) } else { None };
            let _ = DeleteObject(bmp.into());
            let _ = DeleteDC(mem);
            ReleaseDC(None, screen);

            let px = px?;
            let mut rgb = Vec::with_capacity((w * h * 3) as usize);
            for p in px.chunks_exact(4) {
                rgb.extend_from_slice(&[p[2], p[1], p[0]]);
            }
            Some((w as u32, h as u32, rgb))
        }
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn icon_rgba(_p: &str, _s: u32) -> Option<(u32, u32, Vec<u8>)> {
        None
    }
    pub fn display_name(_p: &str) -> Option<String> {
        None
    }
    pub fn capture_rgb(_m: u32) -> Option<(u32, u32, Vec<u8>)> {
        None
    }
    pub fn monitors() -> Vec<((i32, i32, i32, i32), bool)> {
        Vec::new()
    }
    pub fn capture_rect_rgb(_r: (i32, i32, i32, i32), _m: u32) -> Option<(u32, u32, Vec<u8>)> {
        None
    }
}

#[cfg(test)]
mod tests {
    /// Elle çalıştırılır: bağlı ekranları yakalayıp NOOK_SHOT_DIR'e yazar
    #[test]
    #[ignore]
    fn capture_each_monitor() {
        let dir = std::env::var("NOOK_SHOT_DIR").unwrap();
        let mons = super::monitors();
        println!("ekranlar: {mons:?}");
        for i in 0..mons.len() {
            std::fs::write(format!("{dir}/mon{i}.jpg"), super::capture_monitor_jpeg(Some(i), 800, 70).unwrap()).unwrap();
        }
        std::fs::write(format!("{dir}/all.jpg"), super::capture_monitor_jpeg(None, 1200, 70).unwrap()).unwrap();
    }
}
