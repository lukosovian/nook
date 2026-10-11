/**
 * Nook Mobil: pano geçmişi ve not sekmeleri köprüye aynalanır (telefon oradan okur); telefondan gelen
 * not değişiklikleri ("nook://remote") buradaki depoya uygulanır. Yalnızca ana adada çalışır.
 */
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { inTauri, isPrimary, subscribe } from "../lib/bridge";
import { useNook, type Pad } from "../store/nook";

/** Telefona gönderilen geçmiş en fazla bu kadar */
const MAX_CLIPS = 80;
const MAX_HUMS = 40;

interface NoteCmd {
  op: "set" | "add" | "remove" | "rename";
  id: string;
  text?: string;
  title?: string;
}

function mirror() {
  const { clips, pads, padId, hums } = useNook.getState();
  void invoke("remote_mirror", {
    data: {
      clips: clips.slice(0, MAX_CLIPS).map((c) => ({
        id: c.id,
        kind: c.kind ?? "text",
        text: c.text,
        color: c.color,
        at: c.at,
        app: c.app ?? null,
        pinned: !!c.pinned,
        // Görselin önbellekteki dosyası: telefon yalnızca bu kimlikle isteyebilir
        path: c.kind === "image" ? c.path ?? null : null,
        files: c.kind === "files" ? (c.paths ?? []).length : 0,
      })),
      pads: pads.map((p) => ({ id: p.id, title: p.title, text: p.text, at: p.at })),
      padId,
      hums: hums.slice(0, MAX_HUMS).map((h) => ({ id: h.id, title: h.title, artist: h.artist, cover: h.cover ?? null, url: h.url ?? null, at: h.at, phone: !!h.phone })),
    },
  }).catch(() => {});
}

function applyNote(cmd: NoteCmd) {
  const s = useNook.getState();
  switch (cmd.op) {
    case "set":
      // Açık sekme düzenleniyorsa ekrandaki metin de değişsin; değilse yalnızca o sekme
      if (cmd.id === s.padId) s.setNote(cmd.text ?? "");
      else useNook.setState({ pads: s.pads.map((p) => (p.id === cmd.id ? { ...p, text: cmd.text ?? "", at: Date.now() } : p)) });
      break;
    case "add": {
      if (s.pads.some((p) => p.id === cmd.id)) break;
      let n = s.pads.length + 1;
      while (s.pads.some((p) => p.title === `Not ${n}`)) n++;
      const pad: Pad = { id: cmd.id, title: cmd.title?.trim() || `Not ${n}`, text: cmd.text ?? "", at: Date.now() };
      // PC'de açık sekme değişmez
      useNook.setState({ pads: [...s.pads, pad] });
      break;
    }
    case "remove":
      s.removePad(cmd.id);
      break;
    case "rename":
      if (cmd.title) s.renamePad(cmd.id, cmd.title);
      break;
  }
}

export function usePhoneSync() {
  useEffect(() => {
    if (!inTauri || !isPrimary) return;
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(mirror, 600);
    };
    mirror();
    const unsub = useNook.subscribe((st, prev) => {
      if (st.clips !== prev.clips || st.pads !== prev.pads || st.padId !== prev.padId || st.hums !== prev.hums) schedule();
    });
    const off = subscribe<{ kind: string; cmd: NoteCmd }>("nook://remote", (e) => {
      if (e.kind === "note") applyNote(e.cmd);
    });
    return () => {
      window.clearTimeout(timer);
      unsub();
      off();
    };
  }, []);
}
