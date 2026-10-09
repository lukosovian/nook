/**
 * Yama notları: her sürümde neler geldi, görseli ve animasyonuyla. Güncellemeden sonraki ilk açılışta
 * ada büyüyüp en yeni notu bir kez gösterir (görülen bir daha kendiliğinden açılmaz); eskilere
 * "Yama notları" çipinden bakılır. Yeni sürümde NOTES'un başına bir kayıt eklemek yeter.
 */
import { playAntic } from "../hooks/useAntics";
import { isPrimary, setWindowSize } from "./bridge";
import { TOUR_WINDOW } from "./layout";
import { useNook } from "../store/nook";
import { tt } from "./i18n";

/** Notun görseli (components/notes/Demos'ta çizilir) */
export type DemoId =
  | "lang"
  | "scale"
  | "cvd"
  | "glow"
  | "nowcards"
  | "bodies"
  | "textures"
  | "colors"
  | "perch"
  | "dangle"
  | "fishing"
  | "guard"
  | "halloween"
  | "notes"
  | "move"
  | "intro"
  | "noglow"
  | "reload"
  | "shapes"
  | "crowd"
  | "fullscreen"
  | "alarm"
  | "glasses"
  | "look"
  | "drag"
  | "lookchip"
  | "games"
  | "mixer"
  | "archive"
  | "shield"
  | "sensitive"
  | "chips"
  | "clipboard"
  | "pads"
  | "shake"
  | "route"
  | "calsync"
  | "system"
  | "soundside"
  | "profiles"
  | "lyrics"
  | "live"
  | "year"
  | "shieldmic"
  | "teamsmic"
  | "scenepick"
  | "lively"
  | "newwear"
  | "report"
  | "watchtime"
  | "claudeask"
  | "claudeplan"
  | "langs"
  | "hum"
  | "humlog"
  | "alarmedit"
  | "alarmwait"
  | "sounds"
  | "settabs"
  | "tournew"
  | "tray"
  | "quiet"
  | "shortcuts"
  | "hello"
  | "translateask"
  | "errors"
  | "tourkeys"
  | "flash"
  | "fixes";

export interface NoteItem {
  title: string;
  text: string;
  demo: DemoId;
}

export interface PatchNote {
  version: string;
  date: string;
  /** Sürümün tek satırlık özeti (listede görünür) */
  headline: string;
  items: NoteItem[];
}

export const NOTES: PatchNote[] = [
  {
    version: "0.2.50",
    date: tt("9 Ekim 2026"),
    headline: tt("İlk kez kuranlar için düzeltmeler"),
    items: [
      {
        title: tt("Tepsi simgesi artık bir menü"),
        text: tt("Sağ alttaki Nook simgesine sol tıklayınca ada açılır. Sağ tıkta kısa bir menü var: adayı aç, adayı ortala, Nook nedir?, 1 saat sessiz, güncellemeleri denetle ve çıkış. Ada ekranda kaybolursa ya da tam ekranda gizli kalırsa buradan ulaşırsın."),
        demo: "tray",
      },
      {
        title: tt("1 saat sessiz"),
        text: tt("Tepsi menüsünden bir saatliğine sustur: olay kartları, Windows bildirimleri, göz ve su hatırlatmaları, Nook'un sesleri gelmez. Alarmlar, takvim ve pil uyarısı yine çalar. Bitirmek için aynı yere bas."),
        demo: "quiet",
      },
      {
        title: tt("Bütün kısayollar tek yerde"),
        text: tt("Ayarlar › Kısayollar'da Nook'un bütün kısayolları bir arada. Bir kısayol bu bilgisayardaki bir programın bilinen kısayolunu elinden alıyorsa (Word'de Özel Yapıştır, tarayıcıda sekme arama, VS Code, JetBrains) turuncu uyarı çıkar; aynı tuşları iki işe verirsen de söyler. Tanıtımın kısayol sayfası da uyarır. Düz metin yapıştırmanın yeni kurulumlarda kısayolu yok."),
        demo: "shortcuts",
      },
      {
        title: tt("Parolanı mı unuttun?"),
        text: tt("Kalkan ya da açılış kilidinde bir kez yanlış parola yazınca \"Parolanı mı unuttun?\" çıkar. Windows Hello'yla (PIN, parmak izi, yüz) doğrularsan kilit açılır, Ayarlar'dan yeni parola koyarsın. Görev Yöneticisi'ne gerek kalmadı."),
        demo: "hello",
      },
      {
        title: tt("Çeviri için izin"),
        text: tt("Gemini anahtarın yoksa kopyaladığın yabancı metin artık sormadan ücretsiz çeviri servisine (MyMemory) gitmez. Pano'da \"Çevireyim mi?\" çıkar: Çevir, Hep çevir ya da Hayır. Ayarlar › Bildirimler'den de değiştirebilirsin."),
        demo: "translateask",
      },
      {
        title: tt("Anlaşılır hata mesajları"),
        text: tt("\"Failed to fetch\" gibi İngilizce hatalar yerine ne olduğunu söylerim: internet yoksa, anahtarın izni yoksa, Gemini bu ülkede kapalıysa. Hum ses çıkışını açamazsa \"Hoparlör ya da kulaklık bağlı mı?\" der, her hatada Tekrar dene düğmesi var. Bildirim kaydı okunamıyorsa \"Bildirim yok\" demem, söylerim."),
        demo: "errors",
      },
      {
        title: tt("Tanıtım klavyeyle"),
        text: tt("Tanıtımda → ve Enter ileri, ← geri götürür, Esc kapatır. \"Tanıtımı geç\" düğmesi daha belirgin. Kalkan ve Hum sayfalarındaki kısayollar senin seçtiğin tuşlarla yazılır; kısayol sayfasında raf ve yayın maskesi de var."),
        demo: "tourkeys",
      },
      {
        title: tt("Pro'nun kotası dolunca Flash"),
        text: tt("Ücretsiz Gemini anahtarında Pro modelin kotası çok düşük. Dolarsa cevabı Flash verir ve bundan sonra hep Flash'la konuşurum; Ayarlar › Yapay zekâ'dan geri alabilirsin. Model seçiminin altında hangisinin ne işe yaradığı yazıyor."),
        demo: "flash",
      },
      {
        title: tt("Küçük düzeltmeler"),
        text: tt("Hava durumunda şehir adı seçtiğin dilde. Ayarlar'da kaydırınca üst şerit doğru bölümü gösterir, Hum'un da sekmesi var. Nook kaldırılınca Claude Code'daki Nook ayarlarını da siler. Argus yalnızca Türkçe olduğu için başka dillerde önerilmez; kurulum betiği de tekrar ne yapacağını doğru söyler. Güncelleme denetimi her dilde."),
        demo: "fixes",
      },
    ],
  },
  {
    version: "0.2.49",
    date: tt("9 Ekim 2026"),
    headline: tt("Tanıtım yenilendi"),
    items: [
      {
        title: tt("\"Nook nedir?\" yenilendi"),
        text: tt("Tanıtıma yeni sayfalar geldi: gizlilik kalkanı (gerçek sahnelerle), Hum, günün düzeni (takvim, alarm, odak bekçisi), Nook'un ekranda dolaşması ve Claude Code (yalnızca bilgisayarında Claude Code varsa). Kısayollar sayfasında Hum ve kalkan da var; çipler sayfası sürükleme, profiller ve adayı taşımayı anlatıyor. Ayarlar › Nook nedir? ile açabilirsin."),
        demo: "tournew",
      },
    ],
  },
  {
    version: "0.2.48",
    date: tt("9 Ekim 2026"),
    headline: tt("Nook artık ses çıkarıyor"),
    items: [
      {
        title: tt("Nook'un sesleri"),
        text: tt("Ada açılıp kapanırken, bildirim gelince, şarj ya da indirme bitince, su ve mola hatırlatmalarında, Hum şarkıyı bulunca, Nook yemek yiyip sevinince kısa ve yumuşak sesler çıkar. Ayarlar › Ses'ten kapatabilir, Kısık / Orta / Yüksek seçebilirsin. Oyunda, tam ekranda ve Hum dinlerken susar; Windows bildirimleri zaten kendi sesini çaldığı için onlarda ses yok."),
        demo: "sounds",
      },
      {
        title: tt("Ayarlarda sekmeler ortada"),
        text: tt("Ayarlarda aşağı ya da yukarı kaydırdıkça üstteki şeritte seçili sekme ortada durur; öncesi ve sonrası hep görünür, bir sonrakine tek tıkla geçersin."),
        demo: "settabs",
      },
    ],
  },
  {
    version: "0.2.47",
    date: tt("9 Ekim 2026"),
    headline: tt("Hum: çalan şarkıyı bul"),
    items: [
      {
        title: tt("Hum"),
        text: tt("Video, dizi ya da filmde çalan şarkıyı bulur. Ctrl+Alt+M'ye bas (ya da sağdaki Hum çipine dokun): Nook DJ kulaklığını takıp dinlemeye başlar, ada sesle birlikte dalgalanır. Şarkının adı, sanatçısı, albümü ve kapağı gelir; Spotify ya da YouTube'da tek tıkla açarsın. Mikrofon değil, bilgisayarın kendi sesi dinlenir."),
        demo: "hum",
      },
      {
        title: tt("Otomatik Hum ve geçmiş"),
        text: tt("Ayarlardan Otomatik Hum'u açarsan Nook ada kapalıyken de arkada dinler, bulduğu şarkıları kaydeder. Bulunan her şarkı Hum çipindeki geçmişte durur. Oyundayken ve görüşmedeyken dinlemez; sesin kendisi gönderilmez, yalnızca parmak izi."),
        demo: "humlog",
      },
      {
        title: tt("Alarmı düzenle"),
        text: tt("Kurulu bir alarmın saatine ya da adına tıkla, değiştir, Kaydet'e bas. Artık silip yeniden kurmak yok."),
        demo: "alarmedit",
      },
      {
        title: tt("Alarm sen kapatana kadar bekler"),
        text: tt("Oyundayken çalan alarm kaçmaz: oyundan çıktığında adada seni bekler, sen kapatana kadar durur (ses 3 dakika sonra susar). O sırada gelen bildirimler de kaybolmaz, alarmı kapatınca sırayla gelir."),
        demo: "alarmwait",
      },
    ],
  },
  {
    version: "0.2.46",
    date: tt("8 Ekim 2026"),
    headline: tt("Bütün diller güncel"),
    items: [
      {
        title: tt("Yeni özellikler 9 dilde"),
        text: tt("Son sürümlerde gelen her şey (Claude Code, kalkan sahneleri, karne, yıl özeti, pano, şarkı sözleri…) artık İngilizce, İspanyolca, Portekizce, Almanca, Fransızca, Rusça, Çince ve Japonca da. Yüzdeler ve ondalık sayılar da seçtiğin dilin yazımıyla görünür."),
        demo: "langs",
      },
    ],
  },
  {
    version: "0.2.45",
    date: tt("8 Ekim 2026"),
    headline: tt("Claude Code adada"),
    items: [
      {
        title: tt("Claude Code'u adadan yönet"),
        text: tt("Ana sayfadaki Claude çipinden Claude Code'u bir kez bağla: oturumların hangi projede ne yaptığını (komut, dosya düzenleme) canlı görürsün. Başka bir penceredeyken izin isterse ada kart açar; İzin ver, Her zaman, Reddet ya da terminalde cevapla. Soru sorarsa seçenekler adada çıkar, iş bitince ada haber verir. Bilgisayarında Claude Code yoksa çip görünmez."),
        demo: "claudeask",
      },
      {
        title: tt("Claude plan limiti"),
        text: tt("5 saatlik ve haftalık Claude limitinin ne kadar dolduğu ve ne zaman sıfırlanacağı Claude bölümünde görünür (Pro ve Max). %80'e gelince ve dolunca ada bir kez uyarır."),
        demo: "claudeplan",
      },
    ],
  },
  {
    version: "0.2.44",
    date: tt("8 Ekim 2026"),
    headline: tt("Argus süresi doğru sayılıyor"),
    items: [
      {
        title: tt("İzleme süresi tam ekranda da doğru"),
        text: tt("Video tam ekrandayken Nook izlediğin süreyi eksik sayıyordu (26 dk izleyince 5 dk görünüyordu). Artık gerçekte geçen süre sayılır; 15 dk dolunca \"bitti mi?\" sorusu zamanında gelir."),
        demo: "watchtime",
      },
    ],
  },
  {
    version: "0.2.43",
    date: tt("8 Ekim 2026"),
    headline: tt("Karne büyüdü"),
    items: [
      {
        title: tt("Yeni karne"),
        text: tt("Karne artık büyük adada açılır. Harf notunun yanında hangi puanın hangi harf olduğu, notun parça parça nasıl çıktığı ve en kolay puanın nereden geleceği yazar. Günlük grafikte odak süresi ayrı görünür; ekran, odak, Pomodoro, su, müzik, oyun ve Nook'la ilgilenme geçen haftayla kıyaslanır."),
        demo: "report",
      },
    ],
  },
  {
    version: "0.2.42",
    date: tt("7 Ekim 2026"),
    headline: tt("Şarkı sözleri, yayın maskesi, yıl özeti"),
    items: [
      {
        title: tt("Şarkı sözleri"),
        text: tt("Medya'da \"Sözler\"e bas: çalan şarkının sözleri müzikle birlikte akar, şu anki satır parlar. Erken ya da geç kalırsa ±0,5 sn kaydır. Açık adada şarkının altında da o anki satır görünür. Sözler lrclib.net'ten gelir."),
        demo: "lyrics",
      },
      {
        title: tt("Canlı yayındayız"),
        text: tt("Teams, Zoom, Meet ya da tarayıcıdan ekran paylaşınca, OBS açıkken Nook eline mikrofon alır, CANLI tabelasını açar; Not, Pano, Bildirimler, Sohbet ve Takvim buzlanır, bildirim kartlarında içerik görünmez. Ctrl+Alt+L elle açar / kapatır."),
        demo: "live",
      },
      {
        title: tt("Yıl özeti"),
        text: tt("Ana sayfadaki Yıl özeti: birlikte geçen saatler, en çok hangi saatte buradaydın, en çok dinlediğin sanatçılar, Pomodoro turları, oynattığın oyunlar, içilen su. Aralık sonunda kendiliğinden gelir; kayıt bugünden başlar."),
        demo: "year",
      },
      {
        title: tt("Ses kartı adayla gider"),
        text: tt("Ada taşınınca yanındaki ses kartı da gelir; ekranın solunda yer yoksa adanın sağına geçer. Çıkışı listeden seç, uygulamaların yüzdesi görünür. Üst çubuktaki hoparlörle kartı aç / kapat; büyük adada ses ayarları Nook'un altında."),
        demo: "soundside",
      },
      {
        title: tt("Kendi profillerin"),
        text: tt("Ana sayfada profil şeridindeki + ile yeni profil ekle, göz simgesiyle hangi bölümlerin gireceğini seç; adını değiştir ya da profili sil."),
        demo: "profiles",
      },
      {
        title: tt("Pano yenilendi"),
        text: tt("Arama, sabitleme, görsel ve dosya geçmişi, kaydı açıp düzenleme. Ctrl+Alt+V düz metin yapıştırır; pano kilitlenince ya da birkaç dakika sonra boşalabilir; parola yöneticilerinin kopyaları hiç kaydedilmez. Renk HEX, RGB ya da HSL kopyalanır."),
        demo: "clipboard",
      },
      {
        title: tt("Karalama defterinde sekmeler"),
        text: tt("En fazla 8 not, kendiliğinden kaydedilir; çift tıkla adını değiştir. Başlık, kalın, liste ve görev kutularıyla biçimli önizleme, dosyaya kaydetme."),
        demo: "pads",
      },
      {
        title: tt("Raf: salla, sabitle"),
        text: tt("Bir dosyayı sürüklerken fareyi sağa sola salla, raf açılsın. Ctrl+Alt+S Gezgin'de seçili dosyaları rafa ekler. İğneyle sabitlenen öğe raftan düşmez; \"Birlikte aç\" da var."),
        demo: "shake",
      },
      {
        title: tt("Uygulama başına ses çıkışı"),
        text: tt("Kontrol › Uygulama sesi: oyun hoparlörden, Discord kulaklıktan; çıkışı ve mikrofonu oradan seç, uygulamaları üste sabitle ya da gizle. Kulaklık çıkınca ses kısılabilir, kısayolla çıkışlar arasında dönülebilir."),
        demo: "route",
      },
      {
        title: tt("Google / Outlook takvimi ve geri sayım"),
        text: tt("Ayarlar › Takvim'e takviminin gizli iCal adresini ekle: etkinlikler Takvim'de görünür, vakti yaklaşınca haber verir. Toplantıya bir saat kala kapalı adada geri sayım; Odak'ta kronometre."),
        demo: "calsync",
      },
      {
        title: tt("Sistem ayrıntıları"),
        text: tt("Ekran kartı kullanımı, bütün diskler ve sağlıkları, USB'yi güvenle çıkarma, yerel IP, oturumdaki trafik ve hız testi. İşlemci ya da bellek uzun süre dolu kalırsa, disk dolarsa Nook uyarır."),
        demo: "system",
      },
    ],
  },
  {
    version: "0.2.41",
    date: tt("7 Ekim 2026"),
    headline: tt("Sahneni seç, kalkandan sesi yönet"),
    items: [
      {
        title: tt("Hangi sahne gelsin"),
        text: tt("Ayarlar › Gizlilik kalkanı: sahneler karışık, sırayla ya da hep aynısı gelsin; karışık ve sırayla modunda hangi sahnelerin geleceğini seç."),
        demo: "scenepick",
      },
      {
        title: tt("Kalkandan mikrofon ve ses"),
        text: tt("Sağ üstteki mikrofon ve hoparlöre tıklayınca kapanır / açılır (kilitliyken önce parola sorar). Kalkan açılınca mikrofon ve görüşme sesi kapansın mı, Ayarlar'dan seç."),
        demo: "shieldmic",
      },
      {
        title: tt("Teams'te mikrofon kapalı kalmıyor"),
        text: tt("Görüşmedeyken kalkan mikrofonu susturmak yerine seviyesini sıfıra indirir; Teams kendi düğmesini kapatmaz, kalkan kalkınca mikrofon eski seviyesine döner."),
        demo: "teamsmic",
      },
      {
        title: tt("Daha canlı sahneler"),
        text: tt("Nook'lar göz kırpar, etrafa bakınır, zıplarken çömelip yaylanır. Karakterler artık birkaç saniyede bir değil, sahnenin bir olayında dönüşür: iksir dökülünce, deney patlayınca, ışık sönünce…"),
        demo: "lively",
      },
      {
        title: tt("Yeni 3B aksesuarlar"),
        text: tt("Kovboy, korsan, hasır şapka, kondüktör kepi, miğfer, baret, koruyucu gözlük, göz bandı ve atkı: Görünüm'de seçebilirsin, sahnelerde de bunları giyerler."),
        demo: "newwear",
      },
    ],
  },
  {
    version: "0.2.40",
    date: tt("6 Ekim 2026"),
    headline: tt("Kalkana 12 yeni sahne"),
    items: [
      {
        title: tt("12 yeni kalkan sahnesi"),
        text: tt("Atari salonu, deniz altı, sera, gece treni, sinema, Vahşi Batı, korsan gemisi, çılgın laboratuvar, lavanta tarlası, sığınak, dönme dolap ve eskiz defteri. Her birinin kendi saati var: skor tabelası, pirinç lombar, buğulu cam, tren bileti, Nixie tüpleri, balona bağlı bilet…"),
        demo: "shield",
      },
      {
        title: tt("Kalkanda sade sağ tık"),
        text: tt("Kalkanda sağ tıklayınca tarayıcı menüsü yerine yalnızca Yenile çıkar; yeni bir sahne gelir."),
        demo: "shield",
      },
      {
        title: tt("Mikrofon daha güvenilir geri açılır"),
        text: tt("Kalkan birden fazla mikrofonu kapatır ve kalkınca yalnızca kendi kapattıklarını geri açar; kalkan hemen yeniden açılsa da mikrofon unutulmaz."),
        demo: "mixer",
      },
    ],
  },
  {
    version: "0.2.39",
    date: tt("6 Ekim 2026"),
    headline: tt("Sahneye göre saat, değişen Nook'lar"),
    items: [
      {
        title: tt("Her sahnenin kendi saati"),
        text: tt("Saat artık sahnenin bir parçası: kampta ahşap tabela, kafede kara tahta, diskoda neon, uzayda ekran, sahilde uçağın çektiği afiş, kütüphanede parşömen… Hiçbir şeyin önüne geçmez."),
        demo: "shield",
      },
      {
        title: tt("Sahnedeki Nook'lar değişir"),
        text: tt("Roller aynı, oyuncular değişir: her Nook birkaç saniyede bir küçük bir toz bulutuyla başka bir gövdeye, renge ve dokuya dönüşür."),
        demo: "bodies",
      },
      {
        title: tt("Görüşmede karşı tarafın sesi de kapanır"),
        text: tt("Kalkan açılınca mikrofonu kullanan uygulamanın (Discord, Teams, Zoom…) sesi kapanır, kalkınca geri açılır. Köşedeki rozet artık yalnızca simge."),
        demo: "mixer",
      },
    ],
  },
  {
    version: "0.2.38",
    date: tt("6 Ekim 2026"),
    headline: tt("Parolalı kalkan, 10 canlı sahne, takvim"),
    items: [
      {
        title: tt("Gizlilik kalkanı yenilendi"),
        text: tt("Her açılışta 10 canlı sahneden biri (kamp ateşi, kafe, disko, uzay, sahil, kütüphane, maden, zen, atölye, kar), üstte saat, tarih ve hava. Medya durur; mikrofon açıksa kalkan boyunca kapanır, sonra geri açılır. İstersen parolayla kilitlenir ve bilgisayar açılınca parola sorar."),
        demo: "shield",
      },
      {
        title: tt("Takvim ve profiller"),
        text: tt("Yeni Takvim bölümü: etkinlik ekle, saatinde ya da önceden hatırlatsın. Ana sayfanın üstünden İş, Oyun ya da Eğlence profilini seç; o işe yarayan bölümler öne çıkar."),
        demo: "chips",
      },
      {
        title: tt("Ses kartı ve Nişan oyunu"),
        text: tt("Ada açılınca solunda ses kartı: çıkış cihazı, ses, mikrofon ve uygulama sesleri (Ayarlar'dan kapatılır). Oyunlara Nişan eklendi: hedefler küçülmeden vur. Köstebek'te kutular artık kaymıyor."),
        demo: "games",
      },
    ],
  },
  {
    version: "0.2.37",
    date: tt("6 Ekim 2026"),
    headline: tt("Nook artık 9 dil konuşuyor"),
    items: [
      {
        title: tt("9 dil"),
        text: tt("Türkçe, English, Español, Português, Deutsch, Français, Русский, 简体中文 ve 日本語. İlk açılışta tanıtımın ilk sayfasından ya da Ayarlar › Dil'den seç; Nook'la sohbet de senin dilinde olur."),
        demo: "lang",
      },
      {
        title: tt("Arayüz boyutu"),
        text: tt("Ayarlar › Erişilebilirlik: adayı %80 ile %150 arasında büyüt ya da küçült. 4K ekranda da küçük dizüstünde de rahat okunur."),
        demo: "scale",
      },
      {
        title: tt("Renk körü paletleri"),
        text: tt("Protanopi, döteranopi ve tritanopi için vurgu renkleri birbirinden kolay ayrılan tonlara geçer; hata, tamam, uyarı ve alarm renkleri karışmaz."),
        demo: "cvd",
      },
    ],
  },
  {
    version: "0.2.36",
    date: tt("6 Ekim 2026"),
    headline: tt("Yeni gövdeler, dokular, renkler"),
    items: [
      {
        title: tt("Beş yeni gövde"),
        text: tt("Şeker küp, Yumurta, Yıldız, Kedi ve Ayıcık. Görünüm › Gövde'den seç; her biri bütün dokular ve aksesuarlarla giyilebilir."),
        demo: "bodies",
      },
      {
        title: tt("Dört yeni doku"),
        text: tt("Vinil ve Peluş'un yanına Mat kil, ıslak parlak Jöle, ortamı yansıtan Metalik ve uğur böceği gibi Benekli geldi."),
        demo: "textures",
      },
      { title: tt("20 renk"), text: tt("Kiraz, gök mavisi, zümrüt, fosforlu yeşil, çivit, şeker pembesi, karamel, krem, gümüş ve lacivert eklendi."), demo: "colors" },
      {
        title: tt("Şu an kartları"),
        text: tt("Nook'un yanındaki bilgiler düzenli küçük kartlara dönüştü: renkli ikon, alt satırda ayrıntı (sanatçı, kaç dakika sonra, hava), sağda saat ya da yüzde, şarkıda ve Pomodoro'da ilerleme çubuğu."),
        demo: "nowcards",
      },
    ],
  },
  {
    version: "0.2.35",
    date: tt("6 Ekim 2026"),
    headline: tt("Daha canlı ana sayfa"),
    items: [
      {
        title: tt("Meşgul bölümler parlar"),
        text: tt("Müzik çalarken Medya, Pomodoro sürerken Pomodoro çipi kendi renginde yavaşça nefes alır; boş olanlar (Raf, Not…) soluk kalır. Çiplerdeki Nook'lar da kıpırdar: ara sıra göz kırpar, alarm yaklaşınca zıplar."),
        demo: "glow",
      },
      {
        title: tt("Ana sayfayı düzenle"),
        text: tt("Çiplerin sonundaki Düzenle'ye bas: çipi tutup istediğin yere sürükle, kullanmadıklarını göz simgesiyle gizle. Ayarlar'da üstte bölüm sekmeleri var, Temizle gibi düğmeler çerçeveli."),
        demo: "chips",
      },
    ],
  },
  {
    version: "0.2.34",
    date: tt("6 Ekim 2026"),
    headline: tt("Nook dışarı çıkıyor"),
    items: [
      {
        title: tt("Pencere üstüne tüneme"),
        text: tt("Nook ara sıra adadan atlayıp önündeki pencerenin başlık çubuğuna oturur. Pencereyi taşıdıkça dengesini kaybetmemek için sendeler, başka pencereye geçince ona zıplar. Adanın üstüne gelince hemen geri döner."),
        demo: "perch",
      },
      {
        title: tt("Adadan iple sarkma"),
        text: tt("Uzun süre ekranın alt kısmında çalışırken Nook adanın altından minik bir iple sarkıp seni izler. Fareyi ona yaklaştırırsan ipi hızla sarıp adaya kaçar."),
        demo: "dangle",
      },
      {
        title: tt("Masaüstü balıkçılığı"),
        text: tt("Bilgisayar boştayken Nook adanın kenarına oturup masaüstüne olta sallar. Bazen eski bir çöp dosyası çıkar, bazen parlak bir yıldız; döndüğünde neler tuttuğunu anlatır."),
        demo: "fishing",
      },
      {
        title: tt("Odak bekçisi"),
        text: tt("Pomodoro başlayınca Nook masasına geçer. Çalışırken YouTube, X gibi bir siteye girersen cama vurup saati gösterir: \"Çalışmıyor muyduk?\" Siteleri Ayarlar › Odak bekçisi'nden değiştirebilirsin."),
        demo: "guard",
      },
    ],
  },
  {
    version: "0.2.33",
    date: tt("6 Ekim 2026"),
    headline: tt("Gizlilik kalkanı ve arşivin içi"),
    items: [
      {
        title: tt("Arşivi açmadan içine bak"),
        text: tt("Bir .zip ya da .rar dosyasını adanın üstüne bırak: içindekiler listelenir, klasörlerde gezebilirsin. İstediğin dosyayı tutup masaüstüne, klasöre ya da Discord'a sürükle; çift tıklayınca açılır."),
        demo: "archive",
      },
      {
        title: tt("Gizlilik kalkanı"),
        text: tt("Odaya biri girdi mi? Ctrl+Alt+H'ye bas: bütün ekranları uyuyan Nook'lar kaplar. Tekrar bas, Esc ya da çift tıkla, geri gelsin. Kısayolu Ayarlar'dan değiştirebilirsin."),
        demo: "shield",
      },
      {
        title: tt("Hassas veri koruyucu"),
        text: tt("Panoya kart numarası, IBAN, API anahtarı ya da şifre kopyalanınca Nook kilitle uyarır, Pano geçmişine eklemez ve 60 saniye sonra panodan siler. Hepsi bu bilgisayarda olur, hiçbir yere gönderilmez."),
        demo: "sensitive",
      },
      { title: tt("Çiplerde giyinik Nook'lar"), text: tt("Ana sayfadaki her çipin Nook'u artık işine göre giyinik: Medya'da kulaklık, Pomodoro'da filizli domates, Karne'de monokl…"), demo: "chips" },
    ],
  },
  {
    version: "0.2.32",
    date: tt("6 Ekim 2026"),
    headline: tt("Yeni oyunlar, uygulama sesi"),
    items: [
      { title: tt("Üç yeni oyun"), text: tt("Köstebek, Eşleştir ve Zıpla. Oyun bölümünde artık beş oyun var, her birinin rekoru ayrı."), demo: "games" },
      {
        title: tt("Uygulama bazlı ses"),
        text: tt("Kontrol › Uygulama sesi: her uygulamanın sesini ayrı ayrı aç, kıs ya da sustur. Parlaklığı değiştirmeye izin vermeyen ekranlarda parlaklık kaydırıcısı artık görünmüyor."),
        demo: "mixer",
      },
      {
        title: tt("Bugün'e dokun"),
        text: tt("Günün özetindeki kartlara dokununca ilgili bölüm açılır: alarm, karne, bildirimler, diziler. Karne'de notun nasıl hesaplandığı da artık görünüyor."),
        demo: "notes",
      },
      {
        title: tt("Yeni adlar"),
        text: tt("Müzik → Medya, İzliyorum → Argus, Odak → Pomodoro, Cihazlar → Lukonnect. Tam ekranda önizlemeler de düzgün oynuyor."),
        demo: "lookchip",
      },
    ],
  },
  {
    version: "0.2.31",
    date: tt("5 Ekim 2026"),
    headline: tt("Adayı istediğin yere taşı"),
    items: [
      {
        title: tt("Sürükle, bırak"),
        text: tt("Açık adanın üstündeki ✥ tutamacını basılı tutup sürükle: ada ekranda istediğin yere gider, üst kenara yaklaştırınca oraya yapışır. Geri almak için sağ tık › Ortala ya da Ayarlar › Adanın yeri › Ortala."),
        demo: "drag",
      },
      { title: tt("Görünüm çipi"), text: tt("Nook'unu giydirmek için artık ana sayfadaki Görünüm çipine dokunman yeter."), demo: "lookchip" },
    ],
  },
  {
    version: "0.2.30",
    date: tt("5 Ekim 2026"),
    headline: tt("Donmalar bitti"),
    items: [
      {
        title: tt("Nook artık donmuyor"),
        text: tt("3B Nook'u çizen gölgelendirici Windows'ta dakikalarca derleniyor, bu sırada her şey donuyordu. Artık bir saniyeden kısa sürüyor ve arka planda hazırlanıyor: Yenile, açılış ve önizlemeler akıcı."),
        demo: "reload",
      },
      {
        title: tt("Kostümler kaybolmuyor"),
        text: tt("Cadılar Bayramı kostümü seçince Nook'lar kaybolmuyor; Cadılar Bayramı parçaları da yalnızca kendi bölümünde, iki kez görünmüyor."),
        demo: "halloween",
      },
      {
        title: tt("Arkadaki ışık söndü"),
        text: tt("Açık adada Nook'un arkasındaki beyaz parıltı kaldırıldı; yalnızca bir durum varken renkli parlar."),
        demo: "noglow",
      },
    ],
  },
  {
    version: "0.2.29",
    date: tt("5 Ekim 2026"),
    headline: tt("Cadılar Bayramı geldi"),
    items: [
      {
        title: tt("Cadılar Bayramı Nook'ları"),
        text: tt("Balkabağı ve hayalet gövdeler; cadı şapkası, şeytan boynuzu ve yarasa tokası. Görünüm'de tek dokunuşla giyilen hazır kostümler."),
        demo: "halloween",
      },
      {
        title: tt("Yama notları"),
        text: tt("Güncellemeden sonra Nook neler geldiğini bir kez gösterir. Eskilerine ana sayfadaki Yama notları çipinden bakabilirsin."),
        demo: "notes",
      },
    ],
  },
  {
    version: "0.2.28",
    date: tt("5 Ekim 2026"),
    headline: tt("Animasyonlara önizleme"),
    items: [
      { title: tt("Geçiş önizlemesi"), text: tt("Ayarlar'da ekranlar arası geçişin yanındaki ▶ ile efekti iki mini ekranda izle; seçim değişince de oynar."), demo: "move" },
      { title: tt("Açılış önizlemesi"), text: tt("Açılış animasyonu mini adada, senin Nook'unla oynar. \"Her seferinde farklı\" seçiliyse her basışta başkası."), demo: "intro" },
      { title: tt("Yenile donmaz"), text: tt("Sağ tık › Yenile'den sonra ada tıklamaları ve odağı tutmaz; yeniden yüklenirken her şey sıfırlanır."), demo: "reload" },
    ],
  },
  {
    version: "0.2.27",
    date: tt("5 Ekim 2026"),
    headline: tt("Adanın arkası artık parlamıyor"),
    items: [
      { title: tt("Arkadaki ışık gitti"), text: tt("Nook'un arkasındaki parıltı şeffaf pencereden dışarı sızıp adanın altında mavi-beyaz bir ışık yakıyordu. Düzeldi."), demo: "noglow" },
    ],
  },
  {
    version: "0.2.26",
    date: tt("4 Ekim 2026"),
    headline: tt("Nook kalabalığı ve tam ekran"),
    items: [
      { title: tt("Tanıtımda Nook kalabalığı"), text: tt("Parlayan \"nook\" yazısı ve iç içe dizilmiş peluş Nook'lar; üzerine gelince adını söyler."), demo: "crowd" },
      { title: tt("Yeni gövde ve başlıklar"), text: tt("Damla gövde; kep, tavşan kulağı, filiz, çiçek ve yıldız tokası, salyangoz gözleri."), demo: "shapes" },
      { title: tt("Tam ekran"), text: tt("Açık ada sağ üstteki düğmeyle ekrana yayılır, Esc ile döner."), demo: "fullscreen" },
    ],
  },
  {
    version: "0.2.24",
    date: tt("4 Ekim 2026"),
    headline: tt("Oyunda alarm hemen görünür"),
    items: [{ title: tt("Alarm oyunda da çalar"), text: tt("Vakti gelince Nook tam ekran oyunun üstünde bile hemen haber verir."), demo: "alarm" }],
  },
  {
    version: "0.2.23",
    date: tt("4 Ekim 2026"),
    headline: tt("Gözlükler yerine oturdu"),
    items: [{ title: tt("Gözler camın içinde"), text: tt("Gözlük takınca gözler camların ardında kalır, köprü düzeldi."), demo: "glasses" }],
  },
  {
    version: "0.2.22",
    date: tt("4 Ekim 2026"),
    headline: tt("Nook 3B oldu"),
    items: [
      { title: tt("Dots tarzı 3B Nook"), text: tt("Vinil ya da peluş gövde, canlı renkler, siyah parlak aksesuarlar: gözlük, bere, melon, kulaklık, anten, fiyonk, papyon."), demo: "look" },
    ],
  },
  {
    version: "0.2.20",
    date: tt("3 Ekim 2026"),
    headline: tt("Ekranlar arası geçiş efektleri"),
    items: [{ title: tt("Işınlan, zıpla, kay"), text: tt("İmleci takip ederken ada ekrandan ekrana ışınlanma, ışık hızı, portal, zıplama, kayma ya da dijital bozulmayla geçer."), demo: "move" }],
  },
  {
    version: "0.2.17",
    date: tt("3 Ekim 2026"),
    headline: tt("Star Trek açılışı"),
    items: [{ title: tt("Açılış animasyonları"), text: tt("Yıldız gemisi geçer, Nook altın ışıltıyla ışınlanır. Toz, halkalar, konfeti, kabarcıklar ve daha fazlası."), demo: "intro" }],
  },
];

export const latestNote = () => NOTES[0];

/** Aynı gün çıkan sürümler tek notta: sürüm numaraları ayrı kalır, yenilikler birlikte gösterilir */
export interface DayNote {
  date: string;
  /** En yeniden eskiye */
  versions: string[];
  headline: string;
  items: (NoteItem & { version: string })[];
}

export const DAYS: DayNote[] = NOTES.reduce<DayNote[]>((days, n) => {
  const day = days.find((d) => d.date === n.date);
  const items = n.items.map((it) => ({ ...it, version: n.version }));
  if (day) {
    day.versions.push(n.version);
    day.items.push(...items);
  } else days.push({ date: n.date, versions: [n.version], headline: n.headline, items });
  return days;
}, []);

/** Sürümün bulunduğu gün */
export const dayOf = (version: string) => DAYS.find((d) => d.versions.includes(version)) ?? DAYS[0];

/** Ada küçülme animasyonu bitmeden pencere küçülmesin */
const SHRINK_AFTER_MS = 700;
/** Hiç dokunulmazsa açık kalma süresi */
const AUTO_CLOSE_MS = 30_000;

let shrinkTimer = 0;
let closeTimer = 0;
let unsub: (() => void) | null = null;

/** En yeni not henüz kendiliğinden gösterilmedi mi */
export function notesDue() {
  const s = useNook.getState();
  return isPrimary && s.toured && s.notesSeen !== latestNote().version;
}

/** Yama notlarını aç; `version` verilirse o sürümün notuyla */
export async function openNotes(version?: string) {
  if (!isPrimary) return;
  const s = useNook.getState();
  if (s.tour) return;
  if (version) pendingVersion = version;
  if (s.notes) return;
  window.clearTimeout(shrinkTimer);
  s.setSearching(false);
  if (s.brief) s.setBrief(false);
  if (s.report) s.setReport(false);
  // Bir kez görülen not bir daha kendiliğinden açılmaz
  s.setNotesSeen(latestNote().version);
  await setWindowSize(TOUR_WINDOW.width, TOUR_WINDOW.height).catch(() => undefined);
  const wasInside = useNook.getState().hovered;
  useNook.getState().setNotes(true);
  playAntic("hop");

  // İmleç içerideyken açıldıysa (çip) ya da sonradan girdiyse: çıkınca kapan
  let entered = wasInside;
  window.clearTimeout(closeTimer);
  if (!entered) closeTimer = window.setTimeout(closeNotes, AUTO_CLOSE_MS);
  unsub?.();
  unsub = useNook.subscribe((st, prev) => {
    if (!st.notes) return;
    if (st.hovered && !prev.hovered) {
      entered = true;
      window.clearTimeout(closeTimer);
    } else if (!st.hovered && prev.hovered && entered && !st.holds.length) closeNotes();
    if (st.fullscreen || st.ringing || st.searching) closeNotes();
  });
}

/** Açılışta gösterilecek sürüm (çipten açılınca en yenisi) */
let pendingVersion: string | null = null;
export const takePendingVersion = () => {
  const v = pendingVersion;
  pendingVersion = null;
  return v;
};

export function closeNotes() {
  window.clearTimeout(closeTimer);
  unsub?.();
  unsub = null;
  const s = useNook.getState();
  if (!s.notes) return;
  s.setNotes(false);
  window.clearTimeout(shrinkTimer);
  shrinkTimer = window.setTimeout(() => {
    const st = useNook.getState();
    if (!st.brief && !st.tour && !st.notes && !st.report && !st.big) void setWindowSize().catch(() => undefined);
  }, SHRINK_AFTER_MS);
}
