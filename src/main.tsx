// İlk sırada kalmalı: Motion requestAnimationFrame'i içe aktarılırken yakalar
import "./lib/frameCap";
import { loadLocale } from "./lib/i18n";
import "./styles.css";

// Önce yalnızca seçili dilin sözlüğü, sonra uygulama: birçok modül tt()'yi yüklenirken (sabit listelerde)
// çağırır, o yüzden sözlük onlardan ÖNCE hazır olmalı. Bu dosyaya başka içe aktarma ekleme (bkz. boot.tsx).
void loadLocale().then(() => import("./boot"));
