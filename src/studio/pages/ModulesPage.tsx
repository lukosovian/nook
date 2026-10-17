/** Studio › Modüller: profiller, ana sayfadaki modüllerin sırası ve görünürlüğü, kapalı adanın hâlleri */
import { motion } from "motion/react";
import { Check, LayoutGrid, Plus } from "lucide-react";
import { allProfiles, MAX_PROFILES, newProfile, userProfiles } from "../../lib/profiles";
import { useNook } from "../../store/nook";
import { ModulesGrid } from "../../components/panels/Modules";
import { ACCENT, tintBg, tintText } from "../../components/ui/primitives";
import { CapsuleSettings } from "./CapsuleSettings";
import { tt } from "../../lib/i18n";
import { Page, PageHeader, Panel } from "../ui";

export function ModulesPage() {
  const profileId = useNook((s) => s.settings.homeProfile);
  const custom = useNook((s) => s.settings.profiles);
  const update = useNook((st) => st.updateSettings);
  const addProfile = () => {
    const st = useNook.getState();
    const list = userProfiles(st.settings.profiles);
    const p = newProfile(list);
    st.updateSettings({ profiles: [...list, p], homeProfile: p.id });
    st.setHomeEdit(true);
  };

  return (
    <Page wide>
      <PageHeader icon={LayoutGrid} color={ACCENT.green} title={tt("Modüller")} subtitle={tt("Ana sayfada neler, hangi sırayla dursun")} />

      <Panel title={tt("Profiller")} hint={tt("İş, oyun, eğlence: her profil kendi modüllerini öne çıkarır ya da yalnızca onları gösterir")} className="mb-4">
        <div className="flex flex-wrap gap-2">
          {allProfiles(custom).map((p) => {
            const on = p.id === profileId;
            return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => update({ homeProfile: p.id })}
                className="flex items-center gap-2 rounded-[13px] border px-3.5 py-2 text-[13px] font-semibold"
                style={on ? { background: tintBg(p.color, 18), borderColor: tintBg(p.color, 50), color: tintText(p.color) } : { background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.08)", color: "var(--color-label-2)" }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                {p.label}
                {p.id !== "all" && <span className="text-[11px] font-medium text-label-3">{tt("{0} modül", p.ids.length)}</span>}
                {on && <Check size={14} />}
              </motion.button>
            );
          })}
          {userProfiles(custom).length < MAX_PROFILES && (
            <button onClick={addProfile} className="flex items-center gap-1.5 rounded-[13px] border border-dashed border-white/[0.14] px-3.5 py-2 text-[13px] font-semibold text-label-3 hover:border-white/30 hover:text-label">
              <Plus size={14} /> {tt("Yeni profil")}
            </button>
          )}
        </div>
      </Panel>

      <Panel title={tt("Bütün modüller")} hint={tt("Düzenle'ye bas: sürükleyip sırala, göz simgesiyle ana sayfadan gizle (profil seçiliyse profile ekle/çıkar)")} className="mb-4">
        <div style={{ zoom: 1.3, height: 262 }}>
          <ModulesGrid manage />
        </div>
      </Panel>

      <CapsuleSettings />
    </Page>
  );
}
