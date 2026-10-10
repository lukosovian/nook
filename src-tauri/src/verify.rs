//! Parolayı unutunca: Windows Hello (PIN, parmak izi, yüz) ile "bu bilgisayarın sahibi benim"
//! doğrulaması. Doğrulanırsa kalkan ya da açılış kilidi parolasız açılır; parola Ayarlar'dan
//! yenilenir. Pencere Nook'un penceresine bağlanır ki tam ekran kalkanın arkasında kalmasın.

/// Windows Hello ile doğrula. `Ok(true)`: doğrulandı, `Ok(false)`: vazgeçildi/olmadı,
/// `Err("unavailable")`: bu bilgisayarda Windows Hello (PIN) kurulu değil.
#[tauri::command]
pub async fn verify_windows_user(window: tauri::WebviewWindow, message: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
        tauri::async_runtime::spawn_blocking(move || imp::verify(hwnd, &message)).await.map_err(|e| e.to_string())?
    }
    #[cfg(not(windows))]
    {
        let _ = (window, message);
        Err("unavailable".into())
    }
}

#[cfg(windows)]
mod imp {
    use windows::core::HSTRING;
    use windows::Security::Credentials::UI::{UserConsentVerificationResult, UserConsentVerifier, UserConsentVerifierAvailability};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::WinRT::IUserConsentVerifierInterop;
    use windows_future::IAsyncOperation;

    pub fn verify(hwnd: isize, message: &str) -> Result<bool, String> {
        let available = UserConsentVerifier::CheckAvailabilityAsync().and_then(|op| op.join()).map_err(|e| e.to_string())?;
        if available != UserConsentVerifierAvailability::Available {
            return Err("unavailable".into());
        }
        let interop = windows::core::factory::<UserConsentVerifier, IUserConsentVerifierInterop>().map_err(|e| e.to_string())?;
        let op: IAsyncOperation<UserConsentVerificationResult> =
            unsafe { interop.RequestVerificationForWindowAsync(HWND(hwnd as _), &HSTRING::from(message)) }.map_err(|e| e.to_string())?;
        let result = op.join().map_err(|e| e.to_string())?;
        crate::log::write("info", &format!("windows hello: {result:?}"));
        Ok(result == UserConsentVerificationResult::Verified)
    }
}
