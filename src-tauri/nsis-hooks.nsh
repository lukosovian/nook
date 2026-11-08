; Nook kaldırılırken: Claude Code'un ayarlarındaki (~/.claude/settings.json) Nook hook'larını ve
; durum satırını sil — yoksa Claude Code her olayda artık olmayan nook.exe'yi çağırıp hata verir.
; Aynı komut Nook'un sistemde bıraktıklarını da temizler (güvenlik duvarı kuralları, modem yönlendirmesi,
; Tailscale'in girişsiz çalışma ayarı, telefon eşleştirme anahtarı, günlükler, ses modeli).
; Güncellemede (/UPDATE) dokunma: yeni sürüm aynı yerde aynı hook'larla çalışmaya devam eder.
!macro NSIS_HOOK_PREUNINSTALL
  ${If} $UpdateMode <> 1
    ${If} ${FileExists} "$INSTDIR\${MAINBINARYNAME}.exe"
      ExecWait '"$INSTDIR\${MAINBINARYNAME}.exe" claude-uninstall'
    ${EndIf}
  ${EndIf}
!macroend
