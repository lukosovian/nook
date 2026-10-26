/**
 * Bütün modüller: kaydırmasız renkli ızgara (her biri giyinik küçük bir Nook). "Düzenle" ile sürükleyip
 * sıralanır, göz simgesiyle ana sayfadan gizlenir; bir profil seçiliyken o profilin bölümleri seçilir.
 */
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { Check, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { useNook, type Tab } from "../../store/nook";
import { allProfiles, userProfiles, type ProfileDef } from "../../lib/profiles";
import { tintBg, tintText } from "../ui/primitives";
import { tt } from "../../lib/i18n";
import { Breath, byProfile, ChipNook, openModule, useAvailable, useModuleStatus, type ChipState, type ModuleDef, type Status } from "./moduleData";

const TILE_H = 66;

/** `manage`: Studio'da yalnızca düzenlenir (kareye basınca adada bölüm açılmaz) */
export function ModulesGrid({ manage = false }: { manage?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  useScrollMemory("modules", scroller);
  const sub = useModuleStatus();
  const hidden = useNook((s) => s.settings.homeHidden);
  const profileId = useNook((s) => s.settings.homeProfile);
  const profiles = useNook((s) => s.settings.profiles);
  const active = allProfiles(profiles).find((p) => p.id === profileId);
  // Bir profil seçiliyken düzenleme o profilin bölümlerini seçer; "Hepsi"de ana sayfadan gizler
  const forProfile = active && active.id !== "all" ? active : null;
  const editing = useNook((s) => s.homeEdit);
  const setEditing = (on: boolean) => useNook.getState().setHomeEdit(on);
  // Geliştirmede ?edit ile düzenleme kipi açık başlar (önizleme)
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(location.search).has("edit")) useNook.getState().setHomeEdit(true);
    // Izgaradan çıkınca düzenleme biter
    return () => useNook.getState().setHomeEdit(false);
  }, []);
  // Sürüklerken sıra yerelde tutulur, bırakınca kaydedilir
  const [draft, setDraft] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const cells = useRef<Map<string, HTMLElement>>(new Map());
  // Sürüklenen kopya: imleci her karede izler (React yeniden çizilmez)
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const drag = useRef<{ id: string; dx: number; dy: number; slots: { x: number; y: number }[]; px: number; py: number; raf: number } | null>(null);

  const available = useAvailable(draft);
  // Düzenlerken profil uygulanmaz: bütün sıra görünür. Gizlenenler ızgarada yine durur (ana sayfada yok).
  const modules = editing ? available : byProfile(available, active);

  const toggleHidden = (id: string) => {
    const s = useNook.getState();
    if (forProfile) {
      // Profil: bölüm profile girer / çıkar
      const ids = forProfile.ids.includes(id as Tab) ? forProfile.ids.filter((x) => x !== id) : [...forProfile.ids, id as Tab];
      s.updateSettings({ profiles: userProfiles(s.settings.profiles).map((p) => (p.id === forProfile.id ? { ...p, ids } : p)) });
      return;
    }
    const list = s.settings.homeHidden;
    s.updateSettings({ homeHidden: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };
  /** Soluk görünen: profilde değil ya da ana sayfadan gizli */
  const isOff = (id: string) => (forProfile ? !forProfile.ids.includes(id as Tab) : hidden.includes(id));

  /** İmlecin kaydırılan içerikteki yeri */
  const local = (clientX: number, clientY: number) => {
    const el = scroller.current!;
    const r = el.getBoundingClientRect();
    // Tam ekranda içerik yakınlaştırılır (zoom): ekran px'ini içeriğin kendi px'ine çevir
    const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
    return { x: (clientX - r.left) / k + el.scrollLeft, y: (clientY - r.top) / k + el.scrollTop };
  };

  // Kopyanın merkezine en yakın hücreye taşı (yalnızca sıra değişince yeniden çizilir)
  const retarget = () => {
    const d = drag.current;
    const el = cells.current.get(d?.id ?? "");
    if (!d || !el) return;
    const p = local(d.px, d.py);
    const cx = p.x - d.dx + el.offsetWidth / 2;
    const cy = p.y - d.dy + el.offsetHeight / 2;
    gx.set(p.x - d.dx);
    gy.set(p.y - d.dy);
    let best = 0;
    let bestD = Infinity;
    d.slots.forEach((s, i) => {
      const dist = Math.hypot(s.x + el.offsetWidth / 2 - cx, s.y + el.offsetHeight / 2 - cy);
      if (dist < bestD) {
        bestD = dist;
        best = i;
      }
    });
    setDraft((cur) => {
      const ids = cur ?? available.map((m) => m.id);
      if (ids.indexOf(d.id) === best) return cur ?? ids;
      const next = ids.filter((x) => x !== d.id);
      next.splice(best, 0, d.id);
      return next;
    });
  };

  // Kenara yaklaşınca liste kendiliğinden kayar
  const autoscroll = () => {
    const d = drag.current;
    const el = scroller.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const edge = 28;
    const v = d.py < r.top + edge ? -(r.top + edge - d.py) / 3 : d.py > r.bottom - edge ? (d.py - (r.bottom - edge)) / 3 : 0;
    if (v) {
      el.scrollTop += Math.max(-9, Math.min(9, v));
      retarget();
    }
    d.raf = requestAnimationFrame(autoscroll);
  };

  const onPointerDown = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (!editing || e.button !== 0) return;
    const el = e.currentTarget;
    const start = { x: e.clientX, y: e.clientY };
    const move = (ev: PointerEvent) => {
      if (!drag.current) {
        // Küçük titremeler sürükleme sayılmaz
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return;
        const p = local(start.x, start.y);
        const ids = available.map((m) => m.id);
        drag.current = {
          id,
          dx: p.x - el.offsetLeft,
          dy: p.y - el.offsetTop,
          // Her sıra numarasının hücresi (ızgara sabit: sıra değişse de yerler aynı)
          slots: ids.map((cid) => {
            const c = cells.current.get(cid)!;
            return { x: c.offsetLeft, y: c.offsetTop };
          }),
          px: ev.clientX,
          py: ev.clientY,
          raf: 0,
        };
        gx.set(el.offsetLeft);
        gy.set(el.offsetTop);
        setDraft(ids);
        setDragId(id);
        drag.current.raf = requestAnimationFrame(autoscroll);
      }
      drag.current.px = ev.clientX;
      drag.current.py = ev.clientY;
      retarget();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = drag.current;
      if (!d) return;
      cancelAnimationFrame(d.raf);
      drag.current = null;
      // Kopya yerine süzülür, sonra kaybolur
      const target = cells.current.get(d.id);
      const done = () => {
        setDragId(null);
        setDraft((cur) => {
          if (cur) useNook.getState().updateSettings({ homeOrder: cur });
          return null;
        });
      };
      if (!target) return done();
      void animate(gx, target.offsetLeft, { type: "spring", stiffness: 520, damping: 38 });
      void animate(gy, target.offsetTop, { type: "spring", stiffness: 520, damping: 38 }).then(done);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const ghost = dragId ? modules.find((m) => m.id === dragId) : null;
  // Hep üç sıra: modül eklendikçe sütun artar, ızgara kaydırma çubuğuna taşmaz
  const cols = Math.max(6, Math.ceil(modules.length / 3));
  const tight = cols >= 8;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-hidden pt-1.5 pb-1">
        <div className="grid gap-1.5" style={{ gridAutoRows: TILE_H, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {modules.map((m, i) => {
            const st = sub[m.id];
            const state: ChipState = st?.state ?? "idle";
            const off = isOff(m.id);
            const lifted = m.id === dragId;
            return (
              <motion.div
                key={m.id}
                ref={(el: HTMLDivElement | null) => {
                  if (el) cells.current.set(m.id, el);
                  else cells.current.delete(m.id);
                }}
                layout={editing ? "position" : false}
                transition={{ layout: { type: "spring", stiffness: 520, damping: 40 } }}
                onPointerDown={(e) => onPointerDown(m.id, e)}
                className={`relative min-w-0 ${editing ? "cursor-grab touch-none select-none" : ""}`}
              >
                {lifted ? (
                  // Kalkan karenin yeri: kesik çizgili boş yuva
                  <div className="h-full w-full rounded-[16px] border border-dashed" style={{ borderColor: tintBg(m.color, 45), background: tintBg(m.color, 5) }} />
                ) : (
                  <>
                    {(state === "active" || state === "alert") && !editing && <Breath color={m.color} alert={state === "alert"} radius={16} />}
                    <Tile m={m} st={st} state={state} dim={editing ? off : !forProfile && off} editing={editing} manage={manage} tight={tight} delay={Math.min(i, 18) * 0.012} />
                    {editing && (
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => toggleHidden(m.id)}
                        title={forProfile ? (off ? tt("Bu profile ekle") : tt("Bu profilden çıkar")) : off ? tt("Ana sayfada göster") : tt("Ana sayfada gizle")}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-label-2 hover:bg-black/70 hover:text-label"
                      >
                        {off ? <EyeOff size={10} strokeWidth={2.4} /> : <Eye size={10} strokeWidth={2.4} />}
                      </button>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
        {/* Elde tutulan kare */}
        {ghost && (
          <motion.div
            className="pointer-events-none absolute left-0 top-0 z-30"
            style={{ x: gx, y: gy, width: cells.current.get(ghost.id)?.offsetWidth, height: TILE_H }}
            initial={{ scale: 1 }}
            animate={{ scale: 1.06, rotate: -2 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
          >
            <div className="h-full w-full rounded-[16px] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.9)]">
              <Tile m={ghost} st={sub[ghost.id]} state={sub[ghost.id]?.state ?? "idle"} dim={isOff(ghost.id)} editing tight={tight} delay={0} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Alt çubuk: ipucu ya da profil düzenleyici, sağda Düzenle / Bitti */}
      <div className="flex shrink-0 items-center gap-2 rounded-[14px] border border-dashed border-white/[0.09] bg-white/[0.02] py-1 pl-3 pr-1">
        {editing && forProfile ? (
          <ProfileEditor key={forProfile.id} profile={forProfile} />
        ) : (
          <p className="min-w-0 flex-1 truncate text-[10.5px] text-label-3">
            {editing ? tt("Sürükleyip sırala · göz simgesiyle ana sayfadan gizle") : tt("Sık açtıkların ana sayfada üstte durur")}
          </p>
        )}
        <motion.button
          onClick={() => setEditing(!editing)}
          whileTap={{ scale: 0.95 }}
          className={`flex shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 py-[5px] text-[11px] font-semibold transition-colors ${
            editing ? "bg-white/[0.14] text-label" : "bg-white/[0.06] text-label-2 hover:bg-white/[0.1] hover:text-label"
          }`}
        >
          {editing ? <Check size={12} strokeWidth={2.6} /> : <SlidersHorizontal size={11} strokeWidth={2.4} />}
          {editing ? tt("Bitti") : tt("Düzenle")}
        </motion.button>
      </div>
    </div>
  );
}

/** Izgaradaki kare: ortada giyinik Nook, altında ad ve kısa bilgi */
function Tile({ m, st, state, dim, editing, manage = false, tight = false, delay }: { m: ModuleDef; st: Status | undefined; state: ChipState; dim: boolean; editing: boolean; manage?: boolean; tight?: boolean; delay: number }) {
  const on = state === "active" || state === "alert";
  return (
    <motion.button
      onClick={() => !editing && !manage && openModule(m.id)}
      title={st?.text ? `${m.desc} · ${st.text}` : m.desc}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: dim ? 0.35 : state === "empty" ? 0.75 : 1, scale: 1 }}
      whileHover={editing ? undefined : { y: -2 }}
      whileTap={editing ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 30, delay }}
      className={`flex h-full w-full min-w-0 flex-col items-center justify-center gap-1 rounded-[16px] border ${tight ? "px-0.5" : "px-1"} ${editing ? "pointer-events-none" : ""}`}
      style={{
        background: `linear-gradient(160deg, ${tintBg(m.color, on ? 22 : 14)} 0%, ${tintBg(m.color, 5)} 100%)`,
        borderColor: tintBg(m.color, on ? 62 : 30),
      }}
    >
      <ChipNook id={m.id} color={m.color} state={state} soon={!!st?.soon} size={26} />
      <span className={`w-full truncate text-center font-bold ${tight ? "text-[10px] tracking-tight" : "text-[11px]"}`} style={{ color: tintText(m.color) }}>
        {m.label}
      </span>
    </motion.button>
  );
}

/** Düzenleme kipinde seçili profil: adı, "yalnızca bunlar" ya da "öne çıkar", silme */
function ProfileEditor({ profile }: { profile: ProfileDef }) {
  const [confirm, setConfirm] = useState(false);
  const save = (patch: Partial<ProfileDef>) => {
    const s = useNook.getState();
    s.updateSettings({ profiles: userProfiles(s.settings.profiles).map((p) => (p.id === profile.id ? { ...p, ...patch } : p)) });
  };
  const remove = () => {
    if (!confirm) return setConfirm(true);
    const s = useNook.getState();
    s.updateSettings({ profiles: userProfiles(s.settings.profiles).filter((p) => p.id !== profile.id), homeProfile: "all" });
    s.setHomeEdit(false);
  };
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5" title={tt("Göz simgesiyle bölümü bu profile ekle ya da çıkar")}>
      <input
        defaultValue={profile.label}
        maxLength={14}
        spellCheck={false}
        onBlur={(e) => e.target.value.trim() && save({ label: e.target.value.trim() })}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        title={tt("Profilin adı")}
        className="h-6 w-28 min-w-0 rounded-full bg-black/30 px-2.5 text-[11px] font-medium outline-none focus:bg-black/50"
        style={{ color: tintText(profile.color) }}
      />
      <button
        onClick={() => save({ only: !profile.only })}
        title={tt("Seçilmeyen bölümler gizlensin mi, yoksa arkada mı dursun")}
        className="shrink-0 whitespace-nowrap rounded-full bg-black/30 px-2 py-[3px] text-[10px] font-medium text-label-2 hover:text-label"
      >
        {profile.only ? tt("Yalnızca seçilenler") : tt("Seçilenler önde")}
      </button>
      <button
        onClick={remove}
        onMouseLeave={() => setConfirm(false)}
        className="shrink-0 whitespace-nowrap rounded-full border border-red/30 bg-red/[0.07] px-2 py-[3px] text-[10px] font-medium text-red/90 hover:bg-red/15"
      >
        {confirm ? tt("Emin misin? Sil") : tt("Profili sil")}
      </button>
    </div>
  );
}
