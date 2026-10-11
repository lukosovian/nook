import { useCallback, useEffect, useState } from "react";
import { DEMO_PAIRING, getStatus, loadPairing, PcError, savePairing, type Pairing, type Status } from "./lib/pc";
import { PairScreen } from "./screens/Pair";
import { HomeScreen, type Screen } from "./screens/Home";
import { PcScreen } from "./screens/Pc";
import { ArgusScreen } from "./screens/Argus";
import { MediaScreen } from "./screens/Media";
import { ClipsScreen } from "./screens/Clips";
import { NotesScreen } from "./screens/Notes";
import { HumScreen } from "./screens/Hum";
import { tourSeen, TourScreen } from "./screens/Tour";

const POLL_MS = 5000;

export type Conn = "connecting" | "online" | "offline" | "auth";

/** PC durumu: uygulama öndeyken beş saniyede bir tazelenir */
function useStatus(pairing: Pairing | null) {
  const [status, setStatus] = useState<Status | null>(null);
  const [conn, setConn] = useState<Conn>("connecting");
  const refresh = useCallback(async () => {
    if (!pairing) return;
    try {
      const st = await getStatus(pairing);
      setStatus(st);
      setConn("online");
      // PC'yi açmak için gereken ağ kartı adresi değiştiyse sakla (PC kapalıyken lazım olacak)
      if (st.mac && st.mac !== pairing.mac) {
        pairing.mac = st.mac;
        savePairing(pairing);
      }
      if (st.wan && st.wan !== pairing.wan) {
        pairing.wan = st.wan;
        savePairing(pairing);
      }
      // Yeni adresler (ör. PC'ye sonradan Tailscale kuruldu) eklenir; eskiler silinmez: evden çıkınca
      // ev ağı adresi işe yaramasa da Tailscale'inki yaramaya devam eder
      const fresh = (st.hosts ?? []).filter((h) => !pairing.hosts.includes(h));
      if (fresh.length) {
        pairing.hosts = [...fresh.filter((h) => h.startsWith("100.")), ...pairing.hosts, ...fresh.filter((h) => !h.startsWith("100."))];
        savePairing(pairing);
      }
    } catch (e) {
      setConn(e instanceof PcError && e.kind === "auth" ? "auth" : "offline");
    }
  }, [pairing]);
  useEffect(() => {
    if (!pairing) return;
    void refresh();
    let t = window.setInterval(() => void refresh(), POLL_MS);
    const onVis = () => {
      window.clearInterval(t);
      if (document.visibilityState === "visible") {
        void refresh();
        t = window.setInterval(() => void refresh(), POLL_MS);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pairing, refresh]);
  return { status, conn, setConn };
}

export function App() {
  const [pairing, setPairing] = useState<Pairing | null>(() => {
    const demo = import.meta.env.DEV ? new URLSearchParams(location.search).get("demo") : null;
    return demo && demo !== "pair" ? DEMO_PAIRING : loadPairing();
  });
  const [screen, setScreen] = useState<Screen>(() => {
    const s = import.meta.env.DEV ? new URLSearchParams(location.search).get("demo") : null;
    return s === "pc" || s === "argus" || s === "media" || s === "clips" || s === "notes" || s === "hum" ? s : "home";
  });
  const { status, conn, setConn } = useStatus(pairing);
  // İlk açılışta tanıtım (menüden de açılır)
  const [tour, setTour] = useState(() => (import.meta.env.DEV && new URLSearchParams(location.search).get("demo") === "tour") || !tourSeen());

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
}
