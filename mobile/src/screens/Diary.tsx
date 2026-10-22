import { useEffect, useState } from "react";
import { cached, getDiary, today, type Pairing, type PcDiary } from "../lib/pc";
import { tintText, TopBar, useBackButton } from "../ui";
import type { Conn } from "../App";

export const DIARY = "#9B7BFF";

export function dayLabel(day: string) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  if (day === today()) return "Bugün";
  if (day === yk) return "Dün";
  const [yy, mm, dd] = day.split("-").map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

/** PC'deki günlük (son görülen önbellekte; PC açıkken tazelenir) */
export function useDiary(pairing: Pairing, online: boolean) {
  const [list, setList] = useState<PcDiary[]>(() => cached<PcDiary[]>("diary") ?? []);
  useEffect(() => {
    if (online) void getDiary(pairing).then(setList).catch(() => {});
  }, [pairing, online]);
  return list;
}

/** Nook'un günlüğü: PC'deki Nook her gece günü kendi ağzından yazar */
export function DiaryScreen({ pairing, conn, onBack }: { pairing: Pairing; conn: Conn; onBack: () => void }) {
  useBackButton(onBack);
  const list = useDiary(pairing, conn === "online");
  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4 pb-6">
      <TopBar title="Nook'un günlüğü" nook="today" onBack={() => history.back()} />
      <p className="-mt-1 px-1 text-[13px] leading-snug text-label-3">PC'deki Nook her gece günü kendi ağzından yazıyor.</p>
      {list.length === 0 && <p className="mt-8 text-center text-[13.5px] text-label-3">Henüz bir sayfa yok.</p>}
      <div className="flex flex-col gap-2.5">
        {list.map((d) => (
          <div key={d.day} className="rounded-3xl bg-card p-4">
            <p className="text-[12px] font-bold" style={{ color: tintText(DIARY) }}>
              {dayLabel(d.day)}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-label-2">{d.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
