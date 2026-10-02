import { ArrowDown, ArrowUp } from "lucide-react";
import { formatSize } from "../../lib/format";
import { useNook } from "../../store/nook";
import { ACCENT, Bar, levelColor, MiniNook, tintText } from "../ui/primitives";

/** CPU, bellek, disk satırları + ağ grafiği. Rust saniyede bir günceller. */
export function StatsPanel() {
  const stats = useNook((s) => s.stats);
  const netHistory = useNook((s) => s.netHistory);
  if (!stats) return <div className="flex h-full items-center justify-center text-[12px] text-label-3">Ölçülüyor…</div>;

  const memPct = stats.memTotal ? (stats.memUsed / stats.memTotal) * 100 : 0;
  const diskPct = stats.diskTotal ? (stats.diskUsed / stats.diskTotal) * 100 : 0;
  const b = stats.battery;

  return (
    <div className="flex h-full flex-col gap-2">
      <Row label="İşlemci" pct={stats.cpu} value={`%${Math.round(stats.cpu)}`} />
      <Row label="Bellek" pct={memPct} value={`${gb(stats.memUsed)} / ${gb(stats.memTotal)} GB`} />
      <Row label="Disk C:" pct={diskPct} value={`${gb(stats.diskTotal - stats.diskUsed, 0)} GB boş`} />
      {b && <Row label="Pil" pct={100 - b.percent} value={`%${b.percent}${b.charging ? " · şarjda" : ""}`} color={b.charging ? ACCENT.green : levelColor(b.percent)} />}

      <div className="mt-auto flex items-center gap-3 rounded-[14px] bg-well px-3 py-2">
        <div className="shrink-0 space-y-0.5 text-[11.5px] font-medium tabular-nums">
          <p className="flex items-center gap-1" style={{ color: tintText(ACCENT.teal) }}>
            <ArrowDown size={11} strokeWidth={2.8} />
            {rate(stats.netDown)}
          </p>
          <p className="flex items-center gap-1 text-label-2">
            <ArrowUp size={11} strokeWidth={2.8} />
            {rate(stats.netUp)}
          </p>
        </div>
        <Spark values={netHistory} />
      </div>
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
