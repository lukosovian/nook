import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Gauge, HardDrive, Usb } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { diskEject, diskHealth, localIp, speedTest, systemDisks, systemUptime, type DiskVolume, type PhysicalDisk } from "../../lib/bridge";
import { formatSize } from "../../lib/format";
import { useNook } from "../../store/nook";
import { ACCENT, Bar, levelColor, MiniNook, tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";

/** CPU, GPU, bellek, pil; ağ grafiği ve ayrıntıları; bütün diskler. Rust saniyede bir günceller. */
export function StatsPanel() {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("stats", scroller);
  const stats = useNook((s) => s.stats);
  const netHistory = useNook((s) => s.netHistory);
  if (!stats) return <div className="flex h-full items-center justify-center text-[12px] text-label-3">{tt("Ölçülüyor…")}</div>;

  const memPct = stats.memTotal ? (stats.memUsed / stats.memTotal) * 100 : 0;
  const b = stats.battery;

  return (
    <div ref={scroller} className="-mr-1.5 h-full space-y-2.5 overflow-y-auto pr-1.5">
      <div className="space-y-2">
        <Row label={tt("İşlemci")} pct={stats.cpu} value={`%${Math.round(stats.cpu)}`} />
        {stats.gpu != null && <Row label={tt("Ekran kartı")} pct={stats.gpu} value={`%${Math.round(stats.gpu)}`} />}
        <Row label={tt("Bellek")} pct={memPct} value={`${gb(stats.memUsed)} / ${gb(stats.memTotal)} GB`} />
        {b && <Row label={tt("Pil")} pct={100 - b.percent} value={`%${b.percent}${b.charging ? tt(" · şarjda") : ""}`} color={b.charging ? ACCENT.green : levelColor(b.percent)} />}
      </div>

      <Network down={stats.netDown} up={stats.netUp} history={netHistory} />
      <Disks />
      <Uptime />
    </div>
  );
}

/** Bayt → "9,4" (GB, Türkçe ondalık) */
const gb = (bytes: number, digits = 1) => (bytes / 1024 ** 3).toFixed(digits).replace(".", ",");
const rate = (bps: number) => (bps < 1024 ? `${bps} B/s` : `${formatSize(bps)}/s`);

function Row({ label, pct, value, color }: { label: string; pct: number; value: string; color?: string }) {
  const c = color ?? levelColor(pct, true);
  return (
    <div className="flex items-center gap-2.5">
      <MiniNook color={c} size={18} eyes={pct > 85 ? "closed" : "open"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between text-[11.5px]">
          <span className="font-medium text-label">{label}</span>
          <span className="tabular-nums text-label-2">{value}</span>
        </div>
        <Bar pct={pct} color={c} className="mt-1" />
      </div>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-label-3">{children}</p>;
}

/** Anlık hız + grafik; altında yerel IP, bu oturumun toplamı ve hız testi */
function Network({ down, up, history }: { down: number; up: number; history: number[] }) {
  const totals = useNook((s) => s.netTotals);
  const [ip, setIp] = useState<string | null>(null);
  const [test, setTest] = useState<{ busy: boolean; mbps: number | null; error: string | null }>({ busy: false, mbps: null, error: null });
  useEffect(() => void localIp().then(setIp).catch(() => {}), []);
  const run = () => {
    setTest({ busy: true, mbps: null, error: null });
    useNook.getState().setHold("speed-test", true);
    speedTest()
      .then((mbps) => setTest({ busy: false, mbps, error: null }))
      .catch((e) => setTest({ busy: false, mbps: null, error: String(e) }))
      .finally(() => useNook.getState().setHold("speed-test", false));
  };
  return (
    <div>
      <Title>{tt("Ağ")}</Title>
      <div className="rounded-[14px] bg-well px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="shrink-0 space-y-0.5 text-[11.5px] font-medium tabular-nums">
            <p className="flex items-center gap-1" style={{ color: tintText(ACCENT.teal) }}>
              <ArrowDown size={11} strokeWidth={2.8} />
              {rate(down)}
            </p>
            <p className="flex items-center gap-1 text-label-2">
              <ArrowUp size={11} strokeWidth={2.8} />
              {rate(up)}
            </p>
          </div>
          <Spark values={history} />
        </div>
        <div className="mt-1.5 flex items-center gap-2 border-t border-white/[0.05] pt-1.5 text-[10.5px] text-label-3">
          {ip && <span className="tabular-nums" title={tt("Yerel IP")}>{ip}</span>}
          <span className="tabular-nums" title={tt("Nook açıldığından beri")}>
            {tt("Oturum")} ↓{formatSize(totals.down)} ↑{formatSize(totals.up)}
          </span>
          <button
            onClick={run}
            disabled={test.busy}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-full border px-2 py-[2px] font-medium disabled:opacity-60"
            style={{ background: tintBg(ACCENT.teal, 12), borderColor: tintBg(ACCENT.teal, 32), color: tintText(ACCENT.teal) }}
            title={test.error ?? tt("Cloudflare'den ~25 MB indirir")}
          >
            <Gauge size={10} strokeWidth={2.6} />
            {test.busy ? tt("Ölçülüyor…") : test.mbps != null ? `${test.mbps.toFixed(test.mbps < 10 ? 1 : 0).replace(".", ",")} Mbit/s` : test.error ? tt("Olmadı") : tt("Hız testi")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Bütün diskler: doluluk, USB'yi güvenle çıkar; altında fiziksel disklerin sağlığı */
function Disks() {
  const [vols, setVols] = useState<DiskVolume[]>([]);
  const [health, setHealth] = useState<PhysicalDisk[]>([]);
  const [eject, setEject] = useState<Record<string, string>>({});
  useEffect(() => {
    const load = () => void systemDisks().then(setVols).catch(() => {});
    load();
    void diskHealth().then(setHealth).catch(() => {});
    const t = window.setInterval(load, 10_000);
    return () => window.clearInterval(t);
  }, []);
  const doEject = (root: string) => {
    setEject((e) => ({ ...e, [root]: tt("Çıkarılıyor…") }));
    diskEject(root)
      .then(() => {
        setEject((e) => ({ ...e, [root]: tt("Çıkarılabilir") }));
        window.setTimeout(() => void systemDisks().then(setVols), 1500);
      })
      .catch((err) => setEject((e) => ({ ...e, [root]: String(err) })));
  };
  if (!vols.length) return null;
  return (
    <div>
      <Title>{tt("Diskler")}</Title>
      <div className="space-y-1.5">
        {vols.map((v) => {
          const pct = (v.used / v.total) * 100;
          const c = levelColor(pct, true);
          const letter = v.root.slice(0, 2);
          return (
            <div key={v.root} className="flex items-center gap-2.5">
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center" style={{ color: tintText(c) }}>
                {v.removable ? <Usb size={13} strokeWidth={2.4} /> : <HardDrive size={13} strokeWidth={2.4} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                  <span className="truncate font-medium text-label">
                    {letter} {v.label && <span className="font-normal text-label-3">{v.label}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-label-2">{tt("{0} GB boş", gb(v.total - v.used, v.total > 200 * 1024 ** 3 ? 0 : 1))}</span>
                </div>
                <Bar pct={pct} color={c} className="mt-1" />
              </div>
              {v.removable && (
                <button
                  onClick={() => doEject(v.root)}
                  disabled={!!eject[v.root] && eject[v.root] === tt("Çıkarılıyor…")}
                  title={eject[v.root] ?? tt("Güvenle çıkar")}
                  className="shrink-0 rounded-full border px-2 py-[2px] text-[10px] font-medium"
                  style={{ background: tintBg(ACCENT.blue, 12), borderColor: tintBg(ACCENT.blue, 32), color: tintText(ACCENT.blue) }}
                >
                  {eject[v.root] && eject[v.root].length < 16 ? eject[v.root] : tt("Çıkar")}
                </button>
              )}
            </div>
          );
        })}
        {health.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {health.map((d, i) => {
              const color = d.health === "healthy" ? ACCENT.green : d.health === "warning" ? ACCENT.yellow : d.health === "unhealthy" ? ACCENT.red : ACCENT.gray;
              const word = d.health === "healthy" ? tt("Sağlıklı") : d.health === "warning" ? tt("Uyarı") : d.health === "unhealthy" ? tt("Arızalı") : tt("Bilinmiyor");
              return (
                <span key={i} className="flex max-w-full items-center gap-1 rounded-full bg-well px-2 py-[2px] text-[10px] text-label-2" title={`${d.name} · ${formatSize(d.size)}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
                  <span className="truncate">{d.media ? `${d.media} · ` : ""}{d.name}</span>
                  <span style={{ color: tintText(color) }}>{word}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Bilgisayar ne zamandır açık */
function Uptime() {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    const load = () => void systemUptime().then(setSecs).catch(() => {});
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, []);
  if (secs == null) return null;
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const text = d ? tt("{0} gün {1} sa", d, h) : h ? tt("{0} sa {1} dk", h, m) : tt("{0} dk", m);
  return <p className="pb-1 text-[10.5px] text-label-3">{tt("Bilgisayar açık: {0}", text)}</p>;
}

/** Ağ hızı çizgi grafiği (son 40 sn), kendi maksimumuna göre ölçekli. */
function Spark({ values }: { values: number[] }) {
  const W = 100;
  const H = 26;
  if (values.length < 2) return <div className="h-[26px] flex-1" />;
  const max = Math.max(1, ...values);
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(H - (v / max) * (H - 3) - 1.5).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[26px] min-w-0 flex-1">
      <defs>
        <linearGradient id="net-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={ACCENT.teal} stopOpacity="0.35" />
          <stop offset="1" stopColor={ACCENT.teal} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill="url(#net-fill)" />
      <polyline points={pts.join(" ")} fill="none" stroke={ACCENT.teal} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
