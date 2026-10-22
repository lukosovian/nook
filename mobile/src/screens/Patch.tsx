import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cached, getPatchNotes, type Pairing, type PcNote, type Status } from "../lib/pc";
import { appVersion } from "../lib/update";
import { tintBg, tintText, TopBar, useBackButton } from "../ui";
import type { Conn } from "../App";

const ACCENT = "#9B7BFF";

/** PC'deki Nook'un yama notları (telefonun notları da aynı listede) ve iki tarafın sürümü */
export function PatchScreen({ pairing, status, conn, onBack }: { pairing: Pairing; status: Status | null; conn: Conn; onBack: () => void }) {
  useBackButton(onBack);
  const online = conn === "online";
  const [notes, setNotes] = useState<PcNote[] | null>(() => cached<PcNote[]>("patchNotes"));
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const mobile = useAppVersion();
  useEffect(() => {
    if (!online) return;
    getPatchNotes(pairing)
      .then((n) => {
        setNotes(n);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [pairing, online]);
  const shown = open ?? notes?.[0]?.version ?? null;

  return (
    <div className="safe flex min-h-screen flex-col gap-4 px-4 pb-6">
      <TopBar title="Yama notları" nook="notes" onBack={() => history.back()} />

      <section className="grid grid-cols-2 gap-2.5">
        <Version label="Nook Mobil" value={mobile} />
        <Version label="PC'deki Nook" value={status?.version ?? null} />
      </section>

      {!notes?.length && (
        <p className="mt-8 px-6 text-center text-[13.5px] leading-relaxed text-label-3">
          {!online ? "PC açılınca yama notları buraya gelir." : failed ? "PC'deki Nook bu ekranı henüz bilmiyor: PC'yi güncelleyince notlar burada görünür." : "Yükleniyor…"}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {(notes ?? []).map((n) => {
          const isOpen = shown === n.version;
          return (
            <section
              key={n.version}
              className="overflow-hidden rounded-3xl border"
              style={n.major ? { background: `linear-gradient(160deg, ${tintBg(ACCENT, 18)}, ${tintBg(ACCENT, 5)})`, borderColor: tintBg(ACCENT, 34) } : { background: "var(--color-card)", borderColor: "var(--color-edge)" }}
            >
              <button onClick={() => setOpen(isOpen ? "" : n.version)} className="flex w-full items-start gap-3 p-4 text-left">
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-round text-[19px] font-extrabold" style={{ color: tintText(ACCENT) }}>
                      {n.version}
                    </span>
                    <span className="text-[12px] text-label-3">{n.date}</span>
                  </span>
                  <span className="mt-1 block text-[13.5px] leading-snug text-label-2">{n.headline}</span>
                </span>
                <ChevronDown size={18} className={`mt-1.5 shrink-0 text-label-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                    <div className="flex flex-col gap-3 px-4 pb-4">
                      {n.items.map((i) => (
                        <div key={i.title} className="border-t border-edge pt-3">
                          <p className="text-[14.5px] font-bold">{i.title}</p>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-label-2">{i.text}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Version({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-3xl bg-card p-3.5">
      <p className="text-[11.5px] text-label-3">{label}</p>
      <p className="mt-0.5 font-round text-[20px] font-extrabold">{value ?? "—"}</p>
    </div>
  );
}

/** Telefondaki uygulamanın sürümü (tarayıcı önizlemesinde package.json'daki) */
export function useAppVersion() {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    void appVersion().then((x) => setV(x ?? (import.meta.env.DEV ? "0.3.0" : null)));
  }, []);
  return v;
}
