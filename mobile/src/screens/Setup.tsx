import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, CircleHelp, X } from "lucide-react";
import { setupItems, wakeTestItem, type Guide, type SetupItem, type SetupReport } from "@nook/lib/wakeGuide";
import { cached, getSetup, wakeTest, type Pairing } from "../lib/pc";
import { native } from "../lib/native";
import { errText, tintBg, tintText } from "../ui";

const GREEN = "#3ccf6e";
const RED = "#f0545c";

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60_000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} sa önce` : `${Math.round(h / 24)} gün önce`;
}

async function openStore() {
  const url = "https://play.google.com/store/apps/details?id=com.tailscale.ipn";
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

/**
 * Uzaktan açma ve evden uzakta bağlanma kontrol listesi, nasıl yapılır tarifleriyle (BIOS, modem…).
 * PC açıkken tazelenir; kapalıyken son saklanan rapor gösterilir.
 */
export function SetupView({ pairing, online, mac }: { pairing: Pairing; online: boolean; mac?: string | null }) {
  const [report, setReport] = useState<SetupReport | null>(() => cached<SetupReport>("setup"));
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testErr, setTestErr] = useState<string | null>(null);
  useEffect(() => {
    if (!online) return;
    setLoading(true);
    getSetup(pairing)
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pairing, online]);

  if (!report)
    return (
      <p className="rounded-3xl bg-card p-4 text-[13px] leading-snug text-label-3">
        {loading ? "PC kontrol ediliyor…" : "PC açıkken bir kez bu ekrana gir: Nook neyin hazır olduğunu kontrol edip burada saklar; PC kapalıyken de bakabilirsin."}
      </p>
    );
  const { connect, wake } = setupItems(report);
  const test = async () => {
    setTesting(true);
    setTestErr(null);
    try {
      const t = await wakeTest(pairing, mac);
      // Sonuç hemen gösterilir (PC birkaç saniye daha dinlemeyi sürdürür)
      if (t) setReport((r) => (r ? { ...r, wake: { ...r.wake, test: { ...t, listening: false } } } : r));
    } catch (e) {
      setTestErr(errText(e));
    } finally {
      setTesting(false);
    }
  };
  const testItem = report.wake.test && report.wake.on ? wakeTestItem(report.wake, report.outside.lanIp, report.outside.mac) : null;
  const wakeItems = testItem ? [...wake.filter((w) => w.id !== "test"), testItem] : wake;
  const canTest = online && report.wake.on && !report.wake.cgnat && !!report.wake.target;
  const tsPhone = native ? native.tailscaleInstalled() : null;
  const phone: SetupItem[] =
    tsPhone === null
      ? []
      : [
          tsPhone
            ? { id: "ts-phone", ok: true, text: "Telefonda Tailscale kurulu (Nook gerektiğinde açıp kapatır)" }
            : {
                id: "ts-phone",
                ok: false,
                text: "Telefonda Tailscale yok",
                guide: { steps: ["Play Store'dan Tailscale'i kur.", "PC'dekiyle aynı hesapla giriş yap.", "İlk açılışta VPN iznine Tamam de; sonrasını Nook kendisi açıp kapatır."] },
              },
        ];
  return (
    <div className="flex flex-col gap-3">
      <Group title="Evden uzaktayken bağlanma" items={[...connect, ...phone]} action={tsPhone === false ? { label: "Tailscale'i Play Store'da aç", run: () => void openStore() } : undefined} />
      <Group
        title="Telefondan PC'yi açma"
        items={wakeItems}
        action={canTest ? { label: testing ? "Sınanıyor…" : "Dışarıdan açmayı sına", run: () => void test(), disabled: testing } : undefined}
        hint={canTest ? (testErr ?? "Telefonda Wi-Fi'ı kapat, mobil verideyken bas: paket modemden PC'ye geçiyor mu bakılır.") : undefined}
      />
      <p className="px-1 text-[11.5px] text-label-3">
        {online ? (loading ? "Kontrol ediliyor…" : "Az önce kontrol edildi") : `PC kapalı: ${ago(report.at)} yapılan kontrol gösteriliyor`}
      </p>
    </div>
  );
}

function Group({ title, items, action, hint }: { title: string; items: SetupItem[]; action?: { label: string; run: () => void; disabled?: boolean }; hint?: string }) {
  return (
    <section className="rounded-3xl bg-card p-2">
      <h3 className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-label-3">{title}</h3>
      {items.map((it) => (
        <Item key={it.id} item={it} />
      ))}
      {action && (
        <button disabled={action.disabled} onClick={action.run} className="mx-1 mb-1 mt-1.5 w-[calc(100%-0.5rem)] rounded-2xl py-3 text-[14px] font-bold text-black disabled:opacity-60" style={{ background: "#2B8CFF" }}>
          {action.label}
        </button>
      )}
      {hint && <p className="px-2.5 pb-1.5 pt-1 text-[11.5px] leading-snug text-label-3">{hint}</p>}
    </section>
  );
}

function Item({ item }: { item: SetupItem }) {
  const [open, setOpen] = useState(false);
  const color = item.ok === true ? GREEN : item.ok === false ? RED : "#8a8a93";
  const Icon = item.ok === true ? Check : item.ok === false ? X : CircleHelp;
  return (
    <div className="rounded-2xl">
      <button disabled={!item.guide} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left active:bg-well">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: tintBg(color, 18), color: tintText(color) }}>
          <Icon size={14} strokeWidth={2.8} />
        </span>
        <span className="min-w-0 flex-1 text-[13.5px] leading-snug">{item.text}</span>
        {item.guide && <ChevronDown size={17} className={`shrink-0 text-label-3 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      <AnimatePresence initial={false}>
        {open && item.guide && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <GuideBody guide={item.guide} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GuideBody({ guide }: { guide: Guide }) {
  return (
    <div className="mx-2 mb-2 rounded-2xl bg-well px-3 py-2.5 text-[13px] leading-snug text-label-2">
      {guide.title && <p className="mb-1 text-[12px] font-semibold text-label-3">{guide.title}</p>}
      <ol className="list-decimal space-y-1 pl-4">
        {guide.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {guide.note && <p className="mt-2 text-[12px] text-label-3">{guide.note}</p>}
    </div>
  );
}
