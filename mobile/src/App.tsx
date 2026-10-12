import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { DEMO_PAIRING, findHost, getStatus, loadPairing, PcError, savePairing, type Pairing, type Status } from "./lib/pc";
import { native, onNative } from "./lib/native";
import { ensureTunnel } from "./lib/diagnose";
import { flush } from "./lib/outbox";
import { PairScreen } from "./screens/Pair";
import { HomeScreen, type Screen } from "./screens/Home";
import { PcScreen } from "./screens/Pc";
import { ArgusScreen } from "./screens/Argus";
import { MediaScreen } from "./screens/Media";
import { ClipsScreen } from "./screens/Clips";
import { NotesScreen } from "./screens/Notes";
import { HumScreen } from "./screens/Hum";
import { NotifyScreen } from "./screens/Notify";
import { LookScreen } from "./screens/Look";
import { ClaudeScreen } from "./screens/Claude";
import { ShareSheet, type Shared } from "./screens/Share";
import { tourSeen, TourScreen } from "./screens/Tour";
import { useToast } from "./ui";

const POLL_MS = 5000;

export type Conn = "connecting" | "online" | "offline" | "auth";

/**
 * PC durumu: uygulama öndeyken beş saniyede bir tazelenir. Tek bir kaçan yanıt "ulaşılamıyor" demez
 * (Wi-Fi bir anlık takılabilir): art arda iki kez yanıt gelmezse çevrimdışı sayılır. Evden uzaktaysa
 * ve Tailscale kapalıysa Nook açar.
 */
function useStatus(pairing: Pairing | null, onOnline: () => void) {
  const [status, setStatus] = useState<Status | null>(null);
  const [conn, setConn] = useState<Conn>("connecting");
  const fails = useRef(0);
  const connRef = useRef(conn);
  connRef.current = conn;
  const onlineCb = useRef(onOnline);
  onlineCb.current = onOnline;
  const tunnelTried = useRef(false);

  const refresh = useCallback(async () => {
    if (!pairing) return;
    try {
      const st = await getStatus(pairing);
      fails.current = 0;
      tunnelTried.current = false;
      setStatus(st);
      if (connRef.current !== "online") {
        setConn("online");
        onlineCb.current();
      }
      // PC'yi açmak için gereken ağ kartı adresi değiştiyse sakla (PC kapalıyken lazım olacak)
      let changed = false;
      if (st.mac && st.mac !== pairing.mac) {
        pairing.mac = st.mac;
        changed = true;
      }
      if (st.wan && st.wan !== pairing.wan) {
        pairing.wan = st.wan;
        changed = true;
      }
      // Yeni adresler (ör. PC'ye sonradan Tailscale kuruldu) eklenir; eskiler silinmez: evden çıkınca
      // ev ağı adresi işe yaramasa da Tailscale'inki yaramaya devam eder
      const fresh = (st.hosts ?? []).filter((h) => !pairing.hosts.includes(h));
      if (fresh.length) {
        pairing.hosts = [...fresh.filter((h) => h.startsWith("100.")), ...pairing.hosts, ...fresh.filter((h) => !h.startsWith("100."))];
        changed = true;
      }
      if (changed) savePairing(pairing);
    } catch (e) {
      if (e instanceof PcError && e.kind === "auth") return setConn("auth");
      fails.current++;
      // Evden uzaktaysak ve Tailscale kapalıysa aç, birkaç saniye sonra yeniden dene
      if (!tunnelTried.current && ensureTunnel(pairing)) {
        tunnelTried.current = true;
        window.setTimeout(() => void refresh(), 3500);
        window.setTimeout(() => void refresh(), 8000);
        if (connRef.current !== "online") setConn("connecting");
        return;
      }
      if (fails.current >= 2 || connRef.current !== "online") setConn("offline");
    }
  }, [pairing]);

  useEffect(() => {
    if (!pairing) return;
    // Açılışta: dışarıdaysak Tailscale'i hemen aç, sonra bütün adresleri yoklayıp yakın olanı seç
    if (ensureTunnel(pairing)) tunnelTried.current = true;
    void findHost(pairing).finally(() => void refresh());
    let t = window.setInterval(() => void refresh(), POLL_MS);
    const resume = () => {
      window.clearInterval(t);
      if (document.visibilityState === "visible") {
        // Ağ değişmiş olabilir (evden çıkıldı / eve gelindi): adresleri yeniden yokla
        void findHost(pairing).finally(() => void refresh());
        t = window.setInterval(() => void refresh(), POLL_MS);
      }
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [pairing, refresh]);
  return { status, conn, setConn, refresh };
}

export function App() {
  const [pairing, setPairing] = useState<Pairing | null>(() => {
    const demo = import.meta.env.DEV ? new URLSearchParams(location.search).get("demo") : null;
    return demo && demo !== "pair" ? DEMO_PAIRING : loadPairing();
  });
  const [screen, setScreen] = useState<Screen>(() => {
    const s = import.meta.env.DEV ? new URLSearchParams(location.search).get("demo") : null;
    return s === "pc" || s === "argus" || s === "media" || s === "clips" || s === "notes" || s === "hum" || s === "notify" || s === "look" || s === "claude" ? s : "home";
  });
  const [toast, say] = useToast();
  // PC açılınca: PC kapalıyken yazılan notlar, panoya gönderilenler, Hum kayıtları ve telefonun bildirimleri gider
  const onOnline = () => {
    if (!pairing) return;
    native?.flushOutbox();
    void flush(pairing).then((r) => {
      if (r.found.length) say(`PC kapalıyken dinlediğin şarkı bulundu: ${r.found.map((t) => t.title).join(", ")}`);
      else if (r.sent) say("PC kapalıyken yaptıkların PC'ye gönderildi");
    });
  };
  const { status, conn, setConn, refresh } = useStatus(pairing, onOnline);
  // İlk açılışta tanıtım (menüden de açılır)
  const [tour, setTour] = useState(() => {
    const demo = import.meta.env.DEV ? new URLSearchParams(location.search).get("demo") : null;
    return demo === "tour" || (!demo && !tourSeen());
  });
  const [shared, setShared] = useState<Shared | null>(null);

  // Bildirim servisi eski eşleşmeyi bilmiyor olabilir (önceki sürümden güncellendi)
  useEffect(() => {
    if (pairing && pairing.key !== "demo") savePairing(pairing);
  }, [pairing]);

  // Başka uygulamadan "Paylaş › Nook"
  useEffect(() => {
    const read = () => {
      try {
        const raw = native?.peekShare();
        if (raw) setShared(JSON.parse(raw) as Shared);
      } catch {
        /* bozuk paylaşım */
      }
    };
    read();
    const offShare = onNative("share", read);
    const offResume = onNative("resume", () => void refresh());
    return () => {
      offShare();
      offResume();
    };
  }, [refresh]);

  if (tour) return <TourScreen onDone={() => setTour(false)} />;

  if (!pairing)
    return (
      <PairScreen
        onPaired={(p) => {
          savePairing(p);
          setPairing(p);
        }}
      />
    );
  const home = () => setScreen("home");
  const common = { pairing, status, conn, onBack: home };
  const page = (() => {
    switch (screen) {
      case "pc":
        return <PcScreen {...common} onOffline={() => setConn("offline")} />;
      case "argus":
        return <ArgusScreen {...common} />;
      case "media":
        return <MediaScreen {...common} />;
      case "clips":
        return <ClipsScreen {...common} />;
      case "notes":
        return <NotesScreen {...common} />;
      case "hum":
        return <HumScreen {...common} />;
      case "notify":
        return <NotifyScreen {...common} />;
      case "look":
        return <LookScreen {...common} />;
      case "claude":
        return <ClaudeScreen {...common} />;
      default:
        return (
          <HomeScreen
            {...common}
            onOpen={setScreen}
            onTour={() => setTour(true)}
            onUnpair={() => {
              savePairing(null);
              setPairing(null);
            }}
          />
        );
    }
  })();
  return (
    <>
      {page}
      <AnimatePresence>
        {shared && (
          <ShareSheet
            key="share"
            pairing={pairing}
            shared={shared}
            online={conn === "online"}
            onDone={(msg) => {
              native?.clearShare();
              setShared(null);
              if (msg) say(msg);
            }}
          />
        )}
      </AnimatePresence>
      {toast}
    </>
  );
}
