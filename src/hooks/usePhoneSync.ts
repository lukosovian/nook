/**
 * Nook Mobil: pano geçmişi ve not sekmeleri köprüye aynalanır (telefon oradan okur); telefondan gelen
 * not ve görünüm değişiklikleri ("nook://remote") buradaki depoya uygulanır. Yalnızca ana adada çalışır.
 */
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { inTauri, isPrimary, subscribe } from "../lib/bridge";
import { useNook, type Pad } from "../store/nook";
import { normalizeColor, normalizeLook, type Look } from "../lib/look";
import { useClaude } from "../lib/claude";
import { drankWater, snoozeWater, waterInfo } from "./useFeatures";

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
  const { clips, pads, padId, hums, shelf } = useNook.getState();
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
      claude: claudeMirror(),
      water: waterInfo(),
      shelf: shelf.map((i) => ({ id: i.id, name: i.name, ext: i.ext, size: i.size, isDir: i.isDir, isImage: i.isImage, pinned: !!i.pinned, addedAt: i.addedAt, path: i.path })),
      hums: hums.slice(0, MAX_HUMS).map((h) => ({ id: h.id, title: h.title, artist: h.artist, cover: h.cover ?? null, url: h.url ?? null, at: h.at, phone: !!h.phone })),
    },
  }).catch(() => {});
}

/** Telefondaki Claude ekranı: oturumlar (en yeni önce), bekleyen onaylar, plan kullanımı */
function claudeMirror() {
  const { setup, sessions, asks, plan } = useClaude.getState();
  return {
    present: !!setup?.present,
    hooked: !!setup?.hooked,
    sessions: Object.values(sessions)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12)
      .map(({ id, project, state, action, prompt, reply, updatedAt, turnAt, edits, commands, files }) => ({ id, project, state, action, prompt, reply, updatedAt, turnAt, edits, commands, files })),
    asks: asks.map(({ askId, session, project, tool, title, detail, questions, canAlways, at }) => ({ askId, session, project, tool, title, detail, questions, canAlways, at })),
    plan,
  };
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
      if (st.clips !== prev.clips || st.pads !== prev.pads || st.padId !== prev.padId || st.hums !== prev.hums || st.shelf !== prev.shelf || st.reminder !== prev.reminder || st.settings.waterEvery !== prev.settings.waterEvery) schedule();
    });
    // Su sayacı dakikada bir ilerler: telefonun gördüğü tahmin tazelensin
    const tick = window.setInterval(mirror, 60_000);
    // Claude'da onay isteği hemen telefona yansısın
    const unsubClaude = useClaude.subscribe((st, prev) => {
      if (st.asks !== prev.asks) {
        window.clearTimeout(timer);
        mirror();
      } else if (st.sessions !== prev.sessions || st.plan !== prev.plan || st.setup !== prev.setup) schedule();
    });
    const off = subscribe<{ kind: string; cmd: NoteCmd; op?: string; own?: boolean; id?: string; look?: Partial<Look>; color?: string | null }>("nook://remote", (e) => {
      if (e.kind === "note") applyNote(e.cmd);
      if (e.kind === "shelf" && e.op === "remove" && e.id) useNook.getState().removeShelf(e.id);
      // Telefondaki su hatırlatmasına cevap: yalnızca PC'de de hatırlatma bekliyorsa (iki kez sayılmasın)
      if (e.kind === "water") {
        const due = waterInfo().due;
        // Telefon kendi sayacıyla hatırlattıysa (PC'nin başında değilken) içilen yine sayılır
        if (e.op === "drank" && (due || e.own)) drankWater();
        if (e.op === "snooze" && due) snoozeWater();
      }
      // Telefondan görünüm değişti
      if (e.kind === "look") {
        const s = useNook.getState();
        s.updateSettings({ look: normalizeLook(e.look), faceColor: e.color ? normalizeColor(e.color) : s.settings.faceColor });
      }
    });
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
      unsub();
      unsubClaude();
      off();
    };
  }, []);
}
