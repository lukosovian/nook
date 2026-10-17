/** Nook'un kısa karşılamaları: saate ve keyfe göre, aynısı art arda gelmez (ada açılınca balonda, Studio'da) */
import { isSleeping, SULK_BELOW, useNook } from "../store/nook";
import { tt } from "./i18n";

let last = "";

export function pickGreeting() {
  const s = useNook.getState();
  const h = new Date().getHours();
  let pool: string[];
  if (isSleeping(s)) pool = [tt("Zzz… ah, selam"), tt("Uyuyordum ama… selam!"), tt("Hıı? Buradayım")];
  else if (s.affection < SULK_BELOW) pool = [tt("Hıh."), tt("Hatırladın demek"), tt("Kimler gelmiş…")];
  else {
    pool = [tt("Merhaba!"), tt("Selam!"), tt("Hey!"), tt("Naber?"), tt("Hoş geldin!"), tt("Yine sen!"), tt("Buradayım!"), tt("Ne yapıyoruz?"), tt("Özledim!")];
    if (h >= 5 && h < 12) pool.push(tt("Günaydın!"), tt("Günaydın, kahve?"));
    else if (h >= 18 && h < 23) pool.push(tt("İyi akşamlar!"), tt("Akşam oldu bile"));
    else if (h >= 23 || h < 5) pool.push(tt("Gece kuşu!"), tt("Hâlâ ayakta mısın?"));
    if (s.affection > 85) pool.push(tt("Seni görmek güzel!"), tt("En sevdiğim insan!"));
  }
  const choices = pool.filter((g) => g !== last);
  last = choices[Math.floor(Math.random() * choices.length)] ?? pool[0];
  return last;
}
