import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BellRing } from "lucide-react";
import { native } from "../lib/native";
import { tintBg, tintText, TopBar, useBackButton } from "../ui";

const PURPLE = "#9B7BFF";

interface Prefs {
  on: boolean;
  muted: string[];
  apps: Record<string, string>;
  queued: number;
}

const DEMO: Prefs = { on: true, muted: ["com.instagram.android"], apps: { "com.whatsapp": "WhatsApp", "com.instagram.android": "Instagram", "com.google.android.gm": "Gmail" }, queued: 0 };

function read(): Prefs | null {
  try {
    return native ? (JSON.parse(native.notifPrefs()) as Prefs) : import.meta.env.DEV ? DEMO : null;
  } catch {
    return null;
  }
}

/** Bildirimler: telefona gelen bildirimler PC'deki Nook'a düşer (Android'in bildirim erişimi izniyle) */
export function NotifyScreen({ onBack }: { onBack: () => void }) {
  useBackButton(onBack);
  const [access, setAccess] = useState(() => native?.notifAccess() ?? !!import.meta.env.DEV);
  const [prefs, setPrefs] = useState<Prefs | null>(read);

  // Ayarlardan izin verip dönünce
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      setAccess(native?.notifAccess() ?? !!import.meta.env.DEV);
      setPrefs(read());
    };
    document.addEventListener("visibilitychange", check);
    const t = window.setInterval(check, 4000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(t);
    };
  }, []);

  const save = (p: Prefs) => {
    setPrefs(p);
    native?.setNotifPrefs(JSON.stringify({ on: p.on, muted: p.muted }));
  };

  const apps = Object.entries(prefs?.apps ?? {}).sort((a, b) => a[1].localeCompare(b[1], "tr"));

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4 pb-6">
      <TopBar title="Bildirimler" nook="notify" onBack={() => history.back()} />

      <section className="rounded-3xl p-4" style={{ background: tintBg(PURPLE, 10), border: `1px solid ${tintBg(PURPLE, 28)}` }}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: tintBg(PURPLE, 22), color: tintText(PURPLE) }}>
            <BellRing size={20} />
          </span>
          <p className="text-[13.5px] leading-snug text-label-2">
            Telefonuna gelen bildirimler (WhatsApp, Instagram, aramalar…) PC'deki Nook'ta görünür: adada kart olarak ve Bildirimler › Telefon sekmesinde. PC kapalıyken gelenler PC açılınca gider.
          </p>
        </div>
        {!access && (
          <>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => native?.openNotifAccess()}
              className="mt-3 w-full rounded-2xl py-3.5 text-[15px] font-bold text-black"
              style={{ background: PURPLE }}
            >
              Bildirim erişimini aç
            </motion.button>
            <p className="mt-2 text-[12px] leading-snug text-label-3">Açılan listede Nook'u bul, izin ver ve geri dön. Nook bildirimleri yalnızca senin PC'ne gönderir.</p>
          </>
        )}
      </section>

      {access && prefs && (
        <>
          <section className="rounded-3xl bg-card p-1.5">
            <Row label="PC'ye gönder" sub={prefs.on ? "Açık" : "Kapalı"} on={prefs.on} onChange={(on) => save({ ...prefs, on })} />
          </section>
          {prefs.queued > 0 && <p className="-mt-2 px-2 text-[12px] text-label-3">{prefs.queued} bildirim PC açılınca gönderilecek.</p>}

          {prefs.on && (
            <>
              <h2 className="-mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">Uygulamalar</h2>
              {apps.length === 0 ? (
                <p className="px-1 text-[13px] text-label-3">Bildirim geldikçe uygulamalar burada listelenir; istemediklerini kapatabilirsin.</p>
              ) : (
                <section className="rounded-3xl bg-card p-1.5">
                  {apps.map(([pkg, name]) => {
                    const on = !prefs.muted.includes(pkg);
                    return (
                      <Row
                        key={pkg}
                        label={name}
                        sub={on ? "PC'ye gider" : "Gönderilmiyor"}
                        on={on}
                        onChange={(v) => save({ ...prefs, muted: v ? prefs.muted.filter((m) => m !== pkg) : [...prefs.muted, pkg] })}
                      />
                    );
                  })}
                </section>
              )}
            </>
          )}
          <p className="px-1 text-[11.5px] leading-snug text-label-3">Müzik, indirme, navigasyon gibi süren bildirimler gönderilmez. PC'de görünmüyorsa PC'de Bildirimler › “Adada göster” açık mı bak.</p>
        </>
      )}
    </div>
  );
}

function Row({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left active:bg-well">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium">{label}</span>
        <span className="block text-[12px] text-label-3">{sub}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "" : "bg-well-hi"}`} style={on ? { background: PURPLE } : undefined}>
        <motion.span layout className={`absolute top-1 h-5 w-5 rounded-full bg-white ${on ? "right-1" : "left-1"}`} />
      </span>
    </button>
  );
}
