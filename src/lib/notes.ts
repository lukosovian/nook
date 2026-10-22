/**
 * Yama notları: her sürümde neler geldi, görseli ve animasyonuyla. Güncellemeden sonraki ilk açılışta
 * Nook Studio en yeni notla bir kez açılır (görülen bir daha kendiliğinden açılmaz); eskilere
 * Studio › Yama notları'ndan bakılır. Yeni sürümde NOTES'un başına bir kayıt eklemek yeter.
 */
import { playAntic } from "../hooks/useAntics";
import { isPrimary } from "./bridge";
import { openStudio } from "./studio";
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
  | "trayopen"
  | "humwatch"
  | "humcopy"
  | "nooknotifs"
  | "whitebg"
  | "cardsides"
  | "ontop"
  | "argusnew"
  | "argusyear"
  | "argusnokey"
  | "phone"
  | "phonescreens"
  | "phoneargus"
  | "phonemedia"
  | "phonewake"
  | "phoneclip"
  | "phonenote"
  | "phonelive"
  | "phonehum"
  | "phonestats"
  | "wakesetup"
  | "outside"
  | "wakeoutside"
  | "phoneinstall"
  | "phonetour"
  | "modemfind"
  | "phonetunnel"
  | "phonediagnose"
  | "phonenotify"
  | "phoneoffline"
  | "phoneshot"
  | "phonescreen"
  | "phoneguide"
  | "phoneupdate"
  | "phoneshare"
  | "collection"
  | "newparts"
  | "facewear"
  | "heynook"
  | "voicetools"
  | "geminimodels"
  | "voicefast"
  | "phoneshelf"
  | "argusyt"
  | "wakeverify"
  | "voiceen"
  | "bigpos"
  | "seek"
  | "settingsgrid"
  | "favorites"
  | "explain"
  | "claudesettle"
  | "mobile060"
  | "remotectl"
  | "waketest"
  | "wakeback"
  | "alarmgame"
  | "shuffle"
  | "localstt"
  | "supporters"
  | "investor"
  | "gamelog"
  | "todaydiary"
  | "planstale"
  | "splithover"
  | "nohalo"
  | "quiet"
  | "shortcuts"
  | "hello"
  | "translateask"
  | "errors"
  | "tourkeys"
  | "flash"
  | "fixes"
  | "island03"
  | "sizes"
  | "grid03"
  | "humnote"
  | "argusblue"
  | "cards03"
  | "clipcards"
  | "deck"
  | "capsules"
  | "splitpill"
  | "campfire"
  | "studio"
  | "reportweeks"
  | "powertimer"
  | "media03"
  | "look03"
  | "fixes03"
  | "remind03"
  | "tour03"
  | "big03"
  | "capsulecfg"
  | "update03"
  | "studiohome03"
  | "karne03"
  | "settings03"
  | "argus03"
  | "updateanims03"
  | "diary03"
  | "fixes03b"
  | "mobile03"
  | "automations"
  | "deckapps"
  | "homekeys"
  | "deckreset"
  | "newsteps"
  | "deckhotkey"
  | "voicekeys"
  | "autoconds"
  | "phonetrig"
  | "autoask"
  | "autolog"
  | "mobile031";

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
  /** Büyük sürüm (0.3.0 gibi): notlarda kocaman ve renkli görünür */
  major?: boolean;
  items: NoteItem[];
}

export const NOTES: PatchNote[] = [
  {
    version: "0.3.1",
    date: tt("23 Ekim 2026"),
    headline: tt("Kısayollarda otomasyonlar, Studio'da oyun geçmişi, Bugün'de bugünün günlüğü, destekçilerde Yatırımcı rozeti ve yenilenen Nook Mobil"),
    items: [
      {
        title: tt("Otomasyonlar: bu olunca şunu yap"),
        text: tt("Studio › Kısayollar'da yeni Otomasyonlar sekmesi. Bir şey olunca Nook senin yerine yapıyor: saat gelince (istediğin günlerde), Nook açılınca, bir uygulama açılınca, oyun başlayınca ya da bitince, şarj takılınca ya da çıkınca, pil azalınca, Bluetooth cihaz bağlanınca, USB takılınca, internet gidip gelince, bilgisayarın başına dönünce ya da boşta kalınca, kilitleyince. Yapacakları tuşlardaki adımların aynısı: uygulama ya da site aç, mikrofon, ses, karanlık mod, medya, Pomodoro, kalkan… Hazır örneklerle (Gece modu, Günaydın, Ayrılınca mikrofon kapansın, Oyun bitince mola, Şarj çıkınca tasarruf) tek tıkla başlayabilir, her birini anahtarıyla açıp kapatabilirsin. Çalışınca adada kısaca görünüyor."),
        demo: "automations",
      },
      {
        title: tt("Rutinlere yeni adımlar"),
        text: tt("Tuşlara ve otomasyonlara ses seviyesi, parlaklık, “Nook söylesin” (adada senin yazdığın bir cümle), bekle, Wi-Fi ve Bluetooth adımları geldi. Mikrofon, ses ve karanlık mod gibi adımlarda artık aç/kapa yerine kesin “aç” ya da “kapat” seçebiliyorsun: adımın üstündeki küçük düğmeye bas."),
        demo: "newsteps",
      },
      {
        title: tt("Uygulama tuşları öbür tuşların arasında"),
        text: tt("Kısayollar'da uygulamalar artık ayrı bir bölümde, altta durmuyor: eklediğin uygulama ve klasörler kendi simgeleriyle öbür tuşların arasına giriyor, onlar gibi sıralanıp silinebiliyor. Daha önce eklediklerin de kendiliğinden taşındı. Studio'da boş bir tuşa uygulama eklersen tuş o uygulamanın adını ve simgesini alıyor."),
        demo: "deckapps",
      },
      {
        title: tt("Kısayollar ana sayfada"),
        text: tt("Studio › Kısayollar'da bir tuşu seçip “Ana sayfada göster”i açınca o tuş adanın ana sayfasında, alt sırada da duruyor: adayı aç, tek tıkla çalıştır; Kısayollar modülüne girmen gerekmiyor. Birkaç tuş seçersen simge simge sıralanıyor."),
        demo: "homekeys",
      },
      {
        title: tt("Varsayılan tuşlar geri gelir"),
        text: tt("Kısayollar'daki bütün tuşları silersen boş kalmıyor: “Varsayılanları geri getir”e basınca Mikrofon, Ses, Masaüstü ve Kilitle geri geliyor. Studio › Kısayollar'da da “Varsayılanlara dön” düğmesi var."),
        demo: "deckreset",
      },
      {
        title: tt("Tuşlara klavye kısayolu"),
        text: tt("Studio › Kısayollar'da bir tuşa klavye kısayolu verebilirsin (ör. Ctrl+Alt+1): ada kapalıyken de, hangi programdaysan bastığında tuş çalışıyor. Seçtiğin tuşlar Nook'un başka bir kısayolunda, başka bir tuşta ya da bu bilgisayardaki bilinen bir programda varsa turuncu uyarı çıkıyor."),
        demo: "deckhotkey",
      },
      {
        title: tt("Tuşlar ve otomasyonlar sesle çalışıyor"),
        text: tt("Sesli komutta tuşun ya da otomasyonun adını söylemen yetiyor: “Hey Nook, gece modu”, “oyun modunu çalıştır”. Ad Nook'un kendi komutlarından önce denenir; “sesi aç” gibi yerleşik komutlar bozulmasın diye ekli hâller (“gece modunu”) ancak o komutlar anlamazsa eşleşiyor. Otomasyon sesle çalıştırılınca tetikleyicisini ve koşullarını beklemiyor."),
        demo: "voicekeys",
      },
      {
        title: tt("Otomasyonlara koşul"),
        text: tt("Otomasyon tetiklense de yalnızca istediğin durumda çalışsın: oyunda değilsem, belli bir saat aralığındaysa (22:00–08:00 gibi gece yarısını aşabilir), bilgisayar şarjdaysa ya da pildeyse, bilgisayarın başındaysam. Birkaç koşul eklersen hepsi tutmalı. Hazır “Gece modu” örneği artık oyundayken karartmıyor."),
        demo: "autoconds",
      },
      {
        title: tt("Telefonla tetiklenen otomasyonlar"),
        text: tt("Nook Mobil eşliyse yeni tetikleyiciler var: telefon eve gelince, telefon şarja takılınca ve şarjdan çıkınca. “Eve geldi”, telefon en az 20 dakika ev ağından hiç bağlanmamışken Wi-Fi'ye bağlanıp PC'ye ev ağından ulaşınca sayılıyor (Tailscale ile dışarıdan bağlanmak sayılmıyor). Telefon tarafı Bildirim erişimi izniyle çalışan servisi kullanıyor, uygulama kapalıyken de. Yeni “Eve hoş geldin” örneğiyle başlayabilirsin."),
        demo: "phonetrig",
      },
      {
        title: tt("Çalışmadan önce sorsun"),
        text: tt("Otomasyonda “Çalışmadan önce sor”u açarsan Nook tetiklenince adada “… çalışsın mı?” diye soruyor: “Çalıştır” ya da “Hayır”. 45 saniye içinde cevap vermezsen çalışmıyor."),
        demo: "autoask",
      },
      {
        title: tt("Son çalışanlar"),
        text: tt("Otomasyonlar sekmesinde yeni “Son çalışanlar” kartı: hangi otomasyonun ne zaman çalıştığı, koşulu tutmadığı için atlandığı, sorulup çalıştırılmadığı ya da hata verdiği. Her otomasyonun satırında da en son ne zaman çalıştığı yazıyor."),
        demo: "autolog",
      },
      {
        title: tt("Oyun geçmişi"),
        text: tt("Studio'da yeni Oyunlar sayfası: tam ekran oynadığın her oyunun süresi kendiliğinden kaydediliyor. Gün gün, ay ay, yıl yıl bak; bir aya ya da güne tıklayınca o döneme iniyorsun. Hangi oyunu ne kadar oynadığın, payı ve kaç gün açtığın yanında."),
        demo: "gamelog",
      },
      {
        title: tt("Bugün'de bugünün günlüğü"),
        text: tt("Bugün modülündeki günün özeti artık dünkü değil, bugünün günlüğünü gösteriyor; günlük gece yazılınca kartların üstüne yerleşiyor."),
        demo: "todaydiary",
      },
      {
        title: tt("Destekçilerde Yatırımcı rozeti"),
        text: tt("Studio › Ayarlar › Hakkında › Destekçiler'de Nook'un yatırımcısı en başta, altın halkalı profil fotoğrafı ve “Yatırımcı” rozetiyle görünüyor."),
        demo: "investor",
      },
      {
        title: tt("Claude kullanımı ne zaman güncellendi"),
        text: tt("Claude modülündeki 5 saatlik ve haftalık göstergelerin altında, kullanımın en son ne zaman güncellendiği yazıyor. Bu sayılar yalnızca Claude Code cevap verdikçe yenileniyor; 10 dakikadan eski kalınca göstergeler soluklaşıyor. Arada Claude uygulamasında harcadığın kullanım da Claude Code'a bir mesaj atınca buraya geliyor."),
        demo: "planstale",
      },
      {
        title: tt("Bölünmüş adada doğru bölüm açılıyor"),
        text: tt("Kapalı ada ikiye bölündüğünde (örneğin Claude çalışırken müzik de çalıyorsa) ana kapsülün üstüne gelince ada artık müziğe değil, o kapsülün kendi bölümüne açılıyor. Yandaki baloncuğun üstüne gelince de baloncuğun bölümü açılıyor."),
        demo: "splithover",
      },
      {
        title: tt("Nook Mobil 0.3.1"),
        text: tt("Nook Mobil'in ana ekranı yenilendi: üstte canlı Nook'un ve bilgisayarın durumu tek kartta, Nook'lar büyük kartlarda; Nook'un günlüğü ortadan kalkıp alttaki “Daha fazla”ya geçti. Yama notları artık telefonda da okunuyor; telefonun ve PC'nin Nook sürümü orada ve ana ekranın en altında yazıyor. Su bildirimindeki “İçtim” hemen kapanıyor ve PC'ye gidiyor. PC kapalıyken Hum'la dinlediğin şarkı, PC açılınca Nook hazır olur olmaz bulunuyor; bulunamazsa söylüyor. Uzaktan kontrolde klavyeyi kapattıktan sonra her dokunuşta yeniden açılmıyor. PC'yi telefondan açma paketi yarım dakika boyunca birkaç kez gidiyor; telefondan kapatırken yanıt vermeyen bir uygulama kapanmayı sonsuza dek bekletmiyor. Evden uzakta başka bir Wi-Fi'dayken de Tailscale açılıp PC'ye bağlanıyor."),
        demo: "mobile031",
      },
    ],
  },
  {
    version: "0.3.0",
    date: tt("16 Ekim 2026"),
    major: true,
    headline: tt("Nook 0.3: yepyeni ada, her modülün kendi boyutu, kapalı ada kapsülleri ve Nook Studio"),
    items: [
      {
        title: tt("Nook Studio: ayarların ve büyük sayfaların yeni evi"),
        text: tt("Nook artık bir masaüstü uygulaması da: Nook Studio. Adanın sol çubuğundaki Nook Studio düğmesine, dişliye ya da tepsideki “Nook Studio”ya basınca ada kapanıp Studio açılıyor. Solda bölümler var (sürüm, sol alttaki Nook kutunun içinde): Ana sayfa (selam veren büyük Nook, bu haftanın günlük grafiği, bugünün sayıları düne göre, yenilikler, karnen, tuşların), Görünüm, Kısayollar, Modüller, Karne, Yıl özeti, Yama notları ve Ayarlar. Bütün ayarlar kategori kategori, kart kart burada; soldaki kategoriye basınca oraya kayıyor, üstten arayabiliyorsun. Ada hafifledi: hızlı işler adada, ayar ve büyük sayfalar Studio'da."),
        demo: "studio",
      },
      {
        title: tt("Yeni ada: sol çubuk, durum çubuğu, bento"),
        text: tt("Açık ada baştan tasarlandı. Solda dikey bir çubuk var: Ana sayfa, Tüm modüller, Sohbet ve Ara; seçili olan kendi renginde (başlığın yanındaki noktayla aynı). Altta Nook Studio, Görünüm ve Ayarlar düğmeleri Studio'yu açar. Üstte profiller; sağda mikrofonu kullanan uygulama, hava, kurulu alarm varsa çan ve saati, tarih ve kalın saat. Bir modüle girince sol üstteki geri okuyla girdiğin yere (ana sayfa ya da modüller) dönüyorsun. Ada açılınca Nook başının üstündeki balonda kısa bir selam veriyor (Merhaba!, Naber?, Gece kuşu!…). Ana sayfada solda Nook ve şu anki iki işin, sağda en çok açtığın iki modül büyük kartlarda, sonraki dördü küçük kartlarda, altta hızlı çipler ve “Tüm modüller”."),
        demo: "island03",
      },
      {
        title: tt("Her modülün kendi ada boyutu"),
        text: tt("Bütün modüller aynı kalıba sıkıştırılmıyor artık: Argus geniş, Pomodoro kompakt, Medya orta boy… Bir modülden ötekine geçince ada yayla esneyerek yeni boyutuna geçiyor; yanındaki ses ve Argus kartları da ona göre kayıyor."),
        demo: "sizes",
      },
      {
        title: tt("Tüm modüller tek ızgarada"),
        text: tt("Soldaki ızgara simgesi bütün modülleri kaydırma çubuğu olmadan, hep üç sıra hâlinde renkli karelerde gösteriyor (yeni modül gelince sütun artıyor), her biri giyinik küçük Nook'uyla. “Düzenle” ile sürükleyip sıralıyor, göz simgesiyle ana sayfadan gizliyorsun; bir profil seçiliyse o profile ekleyip çıkarıyorsun."),
        demo: "grid03",
      },
      {
        title: tt("Hum ve Not baştan"),
        text: tt("Hum'da en son bulunan şarkı büyük kapağıyla solda (Spotify, YouTube, kopyala), sağda “Şimdi dinlet”, otomatik Hum ve geçmiş. Not bir deftere döndü: solda sayfalar ve ilk satırları, sağda çizgili kâğıt; başlık, kalın, liste, görev, alıntı ve kod düğmeleri var. Biçimli önizlemede görev kutularına tıklayınca işaretleniyor."),
        demo: "humnote",
      },
      {
        title: tt("Argus kendi renginde"),
        text: tt("Argus modülü (bilgisayarda da telefonda da) turuncu değil, Argus'un kendi camgöbeği-mavisinde. İzlediğin diziler yan yana kartlarda: afiş, tür, sıradaki bölüm, ilerleme ve tek tıkla “+1 bölüm izledim”."),
        demo: "argusblue",
      },
      {
        title: tt("Pomodoro, Sistem, Lukonnect, Kontrol ve Alarm yenilendi"),
        text: tt("Pomodoro'da kocaman sayaç, ilerleme çubuğu ve büyük düğme; odak bekçisi, bildirim yok, göz molası ve su tek dokunuşluk çiplerde. Sistem'de işlemci (son 40 sn'nin grafiğiyle), ekran kartı ve bellek ayrı kartlarda. Lukonnect'te kulaklık, mouse ve vantilatör yan yana büyük kartlarda. Kontrol'de yatay ses ve parlaklık kaydırıcıları, altında büyük aç/kapa kareleri. Alarm'da solda büyük rakamlı yeni alarm kartı, sağda sıradaki alarmın geri sayımı ve hızlı “+5 dk” düğmeleri."),
        demo: "cards03",
      },
      {
        title: tt("Pano türüne göre, Bildirimler uygulama renginde"),
        text: tt("Pano iki sütunlu kartlarda: her kaydın türü (Metin, Kod, Bağlantı, Renk, Görsel, Dosya) rozetinde yazıyor, görseller kartın arka planında. Bildirimler'de her uygulama kendi renginde, tek tek silinebiliyor. Raf'ta toplam boyut görünüyor."),
        demo: "clipcards",
      },
      {
        title: tt("Kısayollar artık bir Stream Deck"),
        text: tt("Kısayollar modülü, ana sayfanın kartlarıyla aynı görünen basılabilir tuşlara döndü: mikrofonu ya da sesi aç/kapa (tuşun ışığı hâlini gösterir), karanlık mod, masaüstünü göster (her şeyi küçült), kilitle, ekranı kapat, oynat/sonraki, Pomodoro, gizlilik kalkanı, Hum, uyku, yeniden başlat, kapat. Kapatma, yeniden başlatma ve uyku yanlışlıkla basılmasın diye ikinci basışta çalışır. Nook Studio › Kısayollar'da tuşun adını, simgesini, rengini seçiyor, tek basışta birkaç işi sırayla yapan rutinler kuruyorsun (ör. “Oyun modu”: Discord'u aç, mikrofonu aç, masaüstünü temizle)."),
        demo: "deck",
      },
      {
        title: tt("Kapalı ada kapsülleri"),
        text: tt("Kapalı ada o an ne oluyorsa onun kapsülüne dönüşüyor: müzikte dönen plak, ritim tutan Nook, şarkı adı ve dalga; Pomodoro'da “Derin odak”, kalın süre ve yüzde; Claude Code çalışırken projesi ve yaptığı iş; Nook uyurken süzülen “z”ler. Boştayken Nook'un yanında kalın saat ve hava duruyor (Studio › Modüller › Kapalı ada'dan kapatılır)."),
        demo: "capsules",
      },
      {
        title: tt("Bölünmüş ada"),
        text: tt("İki iş aynı anda sürerken (müzik çalarken Pomodoro, Claude çalışırken müzik gibi) ikincisi adanın yanında küçük bir baloncukta duruyor. Baloncuğun üstüne gelince ada o işin modülüyle açılıyor."),
        demo: "splitpill",
      },
      {
        title: tt("Gece kamp ateşi, balık tutma düzeldi"),
        text: tt("Gece bilgisayar boştayken Nook adada kamp ateşi yakıp marshmallow kızartıyor; bazen biri yanıyor, dönünce kaç tane kızarttığını anlatıyor. Gündüz balık tutarken Nook artık adanın altındaki boşlukta değil, adanın sağ ucunda oturuyor; olta adanın kenarından uzanıyor, misina masaüstüne sarkıyor."),
        demo: "campfire",
      },
      {
        title: tt("Karne, Yıl özeti ve Yama notları Studio'da"),
        text: tt("Karne Studio'da geniş bir sayfa: harf notu, haftalık grafik, notun dökümü, sayaçlar ve son 8 haftanın gidişatı; geçmiş haftalara tek tek bakabiliyorsun. Yıl özeti bütün sayfalarıyla tek bir kart duvarında. Yama notları solda zaman çizgisi ve arama, sağda içindekiler ve her yenilik büyük görseliyle yan yana; güncellemeden sonra Studio yeni notla bir kez kendiliğinden açılıyor."),
        demo: "reportweeks",
      },
      {
        title: tt("Zamanlı kapatma"),
        text: tt("Kontrol › Zamanlı kapat: bilgisayar 15 dk, yarım saat, 1-3 saat sonra ya da seçtiğin saatte kapansın, yeniden başlasın ya da uyusun. Kuruluyken adanın sağ üstünde kırmızı bir geri sayım duruyor; son dakikada Nook uyarıyor, “+15 dk” ya da “Vazgeç” ile değiştiriyorsun. Nook Mobil › Bilgisayar'dan da kurulur, uzatılır, iptal edilir; telefondan gizlilik kalkanını da açabiliyorsun."),
        demo: "powertimer",
      },
      {
        title: tt("Medya yenilendi"),
        text: tt("Kapağın renkleri bütün kartı boyuyor; kapak büyüdü, şarkı adı daha belirgin, ilerleme çubuğu kalın. Ortada beyaz, yuvarlak bir oynat/duraklat düğmesi var (oynat üçgeni tam ortada); çalarken çevresinde pembe bir hale nefes alıyor, basınca simge dönerek değişiyor."),
        demo: "media03",
      },
      {
        title: tt("Görünüm sekmeli ve donmuyor"),
        text: tt("Studio › Görünüm artık sekmeli: Koleksiyon (Öne çıkanlar, Karakterler, Meslekler, Tarzlar, Hayvanlar…), Gövde, Doku, Renk, Gözler, Gözlük, Başlık, Boyun, Yüz. Koleksiyon'un hazır Nook'ları uygulamayla birlikte geliyor, ilk açılışta da beklemeden anında görünüyor; öbür sekmelerin Nook'ları sen bakarken arkada hazırlanıyor, sekmeye geçince dolu geliyor; bir kez çizilen bir daha hiç beklemiyor. Sayfa açılırken donmuyor. Bir şey seçince soldaki Nook sevinip zıplıyor, pırıltı saçıyor. Şapkalar her gövdenin tepesine oturuyor (yumurta, küp, üçgen gibi gövdelerde havada kalmıyor), polis ve hemşire başlığı başa iniyor, uzaylı anteni belirginleşti. Koleksiyonda mesleği olmayanlar (Neon, Uykucu…) Tarzlar'a taşındı."),
        demo: "look03",
      },
      {
        title: tt("Düzeltmeler"),
        text: tt("Ekran görüntüsü alırken ekran alıntısı aracı oyun sanılıp “ScreenClippingHost başlıyor · iyi oyunlar” denmiyor (ShareX, Lightshot gibi araçlar ve Windows'un kendi tam ekran katmanları da). Argus, izlediğin fragmanı, klibi, incelemeyi ya da çok kısa videoyu bölüm sanıp “işaretleyeyim mi?” diye sormuyor. Kopyaladığın yabancı metnin çevirisi çok daha hızlı: en hızlı Gemini modeli düşünmeden hemen çeviriyor, 2 saniyede cevap gelmezse ikinci model de devreye giriyor ve hangisi önce biterse o geliyor; yine olmazsa Pano'daki kartta “Tekrar dene” çıkıyor. Studio › Ayarlar'da en alttaki Hakkında'ya basınca soldaki seçim artık Telefon'da kalmıyor. Studio ana sayfasındaki selam balonu Nook'un arkasında kalmıyor; Studio'daki Kısayollar tuşları adadakilerle aynı renkli kartlar oldu; Studio'nun menü simgeleri yenilendi (seçili olan kendi renginde dolu). Sürüm numarası Kur'dan sonra da her yerde 0.3.0 yazıyor."),
        demo: "fixes03",
      },
      {
        title: tt("Hatırlatıcı kendi modülünde"),
        text: tt("Hatırlatıcı Takvim'den çıktı, kendi modülü oldu. Neyi hatırlatacağımı yaz, ne zaman olacağını seç (10 dk, 30 dk, 1 saat, 3 saat, bu akşam, yarın sabah ya da bir saat) ve ekle; “çamaşırı as 20 dk” ya da “toplantı 14:30” diye yazarsan süreyi kendim anlarım. Vakti gelince alarm gibi çalarım. Sağda yaklaşanlar (takvim etkinliklerinin hatırlatmaları da “Takvimden” diye) ve geçenler; Takvim artık yalnızca etkinlikler, Alarm yalnızca alarmlar."),
        demo: "remind03",
      },
      {
        title: tt("Tanıtım yenilendi, Studio'da da"),
        text: tt("“Nook nedir?” tanıtımı 0.3'e göre baştan anlatıyor: yeni ada (dikey çubuk, ana sayfa kartları, geri oku, tam ekran), Nook Studio, Hatırlatıcı ve zamanlı kapatma, Studio › Görünüm'deki koleksiyon. Studio › Ayarlar › Hakkında'dan ya da Studio ana sayfasındaki “Nook'u tanı”dan Studio'nun içinde de açılıyor: solda Nook ve anlatım, sağda canlandırma; oklarla geziliyor."),
        demo: "tour03",
      },
      {
        title: tt("Tam ekranda modüller bozulmuyor"),
        text: tt("Ada tam ekran olunca modüllerin içi artık boşluğa yayılmıyor: her modül kendi düzenini koruyup ekrana sığacak kadar büyüyor. Takvim'in günleri uzayıp bozulmuyor, Hatırlatıcı'nın düğmesi kaybolmuyor; yazılar, düğmeler, listeler birlikte büyüyor."),
        demo: "big03",
      },
      {
        title: tt("Kapalı ada ayarları gelişti"),
        text: tt("Studio › Modüller › Kapalı ada'da her kapsülün kartında kendi canlı önizlemesi var: hangisini ayarlıyorsan onun kapalı adası hemen orada değişiyor. Her kapsülü (müzik, Pomodoro, Claude Code, yaklaşan etkinlik, kronometre, indirme, dinliyor, uyku, saat ve hava) tek tek açıp kapatıyorsun; içlerinde neyin görüneceğini de seçiyorsun: müzikte kapak, şarkı adı, sanatçı, dalga (şarkı adını kapatınca sanatçı üste çıkıyor, ikisini de kapatınca yalnızca dönen plak, Nook ve dalga kalıyor); saatte saniye, hava, tarih; Pomodoro'da yüzde ve ilerleme çizgisi; Claude'da yaptığı iş. Kapattığın parça yer kaplamıyor, kapsül küçülüyor. Bölünmüş adayı ve baloncuğun üstüne gelince açılmasını da ayrı ayrı kapatabiliyorsun."),
        demo: "capsulecfg",
      },
      {
        title: tt("Güncelleme adada, kurulum penceresi yok"),
        text: tt("Güncellerken arkada kurulum penceresi açılmıyor. Kapalı ada güncelleme kapsülüne dönüşüp indirmeyi animasyonla gösteriyor (on çeşidi var, aşağıda), bitince Nook sessizce kapanıp yeni sürümle kendiliğinden geri geliyor. Studio'dan “Güncelle”ye bassan da kurulumu ada yapıyor, ilerleme Studio'da da görünüyor."),
        demo: "update03",
      },
      {
        title: tt("Studio'da arama çubuğu ve sohbet"),
        text: tt("Studio'nun ana sayfasında Nook'un yanında gerçek bir arama çubuğu var: yazdıkça sonuçlar hemen altında açılıyor (hesap, birim, döviz, çeviri, emoji, uygulama, web, not), Enter'la çalışıyor; hesap ve çeviri gibi sonuçlar kopyalanınca satırda “Kopyalandı” yazıyor. Aşağıda kocaman bir sohbet kartı var: Nook'la orada, geniş ekranda konuşuyorsun. Hiçbiri adaya atmıyor. Sağ üstteki kart artık ne olduğunu söylüyor: “Bilgisayar başında”, yani son 7 günde Nook'un seni bilgisayarda gördüğü süre (o uyurken sayılmıyor), altında günlük ortalaması. Bugünün kutularında Pomodoro yerine Nook'la ilgilenme var."),
        demo: "studiohome03",
      },
      {
        title: tt("Karne Pomodoro'ya bakmıyor"),
        text: tt("Haftalık karne artık Pomodoro'yu kullanmayanları cezalandırmıyor. Not dört şeyden çıkıyor: Nook'la kaç gün birlikteydiniz, günde kaç bardak su içtin, Nook'la ne kadar ilgilendin ve onun keyfi. Grafikte çubuk bilgisayar başında geçen süre, içindeki dolu kısım müzikle geçen; kutularda Pomodoro yerine birlikte geçen gün ve keyif. Hiç açılmamış haftalar boş görünüyor. Karne sayfası da ferahladı: grafik genişledi, döküm ve sayılar yan yana."),
        demo: "karne03",
      },
      {
        title: tt("Ayarlar menü menü, Hakkında'da büyük sürüm"),
        text: tt("Studio'daki Ayarlar artık bütün kategorileri alt alta kaydırmıyor: soldan hangisine basarsan sağda yalnızca o görünüyor. Ararken bütün kategorilerde arıyor. Hakkında'da, telefonlardaki gibi büyük Nook'un yanında kocaman, renkli sürüm numarası duruyor (büyük sürümse “Büyük güncelleme” rozetiyle); güncel olup olmadığın ve denetle düğmesi yanında. Yama notlarında da 0.3.0 gibi büyük sürümler listede renkli, iri bir kartla ve başlıkta dev sürüm numarasıyla görünüyor."),
        demo: "settings03",
      },
      {
        title: tt("Argus Studio'da"),
        text: tt("Studio'nun solunda Argus da var, Argus'un kendi renkleriyle: izlediğin diziler sıradaki bölümü ve ne kadarını izlediğinle (“İzledim”e basınca bölüm işaretleniyor), bu hafta kaç bölüm ve film izlediğin, yayın takvimi ve “Ne izlesem?” önerisi. Profil, yeni bölüm haberleri ve izlediğini fark etme ayarları da aynı sayfada. Argus bu bilgisayarda yoksa orada Argus'un tanıtımı ve kurulumu çıkıyor."),
        demo: "argus03",
      },
      {
        title: tt("Güncelleme animasyonları: on çeşit, sen seç"),
        text: tt("Güncellenirken kapalı adada artık on farklı animasyondan biri oynuyor: Halka, Roket (pistte yol alıp bitince fırlıyor), Kargo (bantta kayan paket eve varınca açılıp konfeti saçıyor), Pil (dolup şimşek çakıyor), Filiz (büyüyüp çiçek açıyor), Kahve (fincan dolup tütüyor), Retro (piksel çubuk, sonunda LEVEL UP), Yörünge, Balon (şişip patlıyor) ve Dalga (bütün kapsül suyla doluyor). Ayarlar › Ada ve Nook › Animasyonlar'da hepsi küçük kapsüllerde canlı oynuyor; hep birini seçebilir, “Sırayla” ya da “Karışık” diyebilirsin. “Adada dene” ile seçtiğin animasyon hemen kapalı adada baştan sona oynuyor. Bitiş anı da biraz uzadı, artık rahatça görülüyor."),
        demo: "updateanims03",
      },
      {
        title: tt("Nook'un günlüğü"),
        text: tt("Nook gün boyu hangi programda ne kadar kaldığını, imlecin ekranda kaç metre yürüdüğünü, kablosuz farenin pilinin nereye kadar düştüğünü, Argus'ta ne izlediğini, müziği, suyu ve odağı aklında tutuyor; gece 22.30'dan sonra (ya da ertesi sabah ilk açılışta) Gemini ile günü kendi ağzından 3-4 cümlelik mizahi bir günlüğe yazıyor. Günlük Studio ana sayfasında (oklarla önceki günler, “Bugünü şimdi yaz” ile hemen), sabahki günün özetinde ve Nook Mobil'in ana ekranında. Ayarlar › Ada ve Nook'tan kapatılabiliyor; yalnızca sayılar Gemini'ye gidiyor."),
        demo: "diary03",
      },
      {
        title: tt("Çeviri ve telefon bağlantısı düzeltmeleri"),
        text: tt("Kopyalanan yabancı metnin çevirisi bazen hiç gelmiyordu: Gemini boş cevap verince “çeviri yok” sayılıyordu, artık öbür model deneniyor. ö, ü, ç'li Almanca ve Fransızca metinler Türkçe sanılıp çevrilmiyordu; artık iki dilin ipuçları tartılıyor, kelime kelime ipucu olmayan kısa İngilizce cümleler de çevriliyor. Evden uzaktayken telefonun PC'ye ulaşamamasının bir sebebi de bulundu: Tailscale kapanınca Nook onu yeniden bağlamaya çalışıyor ama Tailscale bir ayar eksik dediği için her seferinde reddediyordu; artık Tailscale'in istediği tam komutla bağlanıyor. Telefondan gelen bildirimler de böylece yeniden yolda."),
        demo: "fixes03b",
      },
      {
        title: tt("Nook Mobil 0.3"),
        text: tt("Nook Mobil › Bilgisayar'dan zamanlı kapatmayı kurup uzatabiliyor, iptal edebiliyor, gizlilik kalkanını açıp kapatabiliyorsun. Ana ekranda Nook'un günlüğü var; dokununca önceki günler de açılıyor. Argus ekranı artık Argus'un kendi renginde. Bildirimler ekranında “Pil kısıtlamasını kaldır” ve “Otomatik başlatmayı aç” düğmeleri var: telefon Nook'u arka planda durdurmasın, bildirimler PC'ye topluca değil anında gitsin. PC'ye ulaşılamayan bildirimler de artık bekletilip kendiliğinden yeniden gönderiliyor."),
        demo: "mobile03",
      },
    ],
  },
  {
    version: "0.2.61",
    date: tt("14 Ekim 2026"),
    headline: tt("Nook Mobil: telefondan uzaktan kontrol, evden uzaktayken açma düzeltmesi"),
    items: [
      {
        title: tt("Telefondan uzaktan kontrol"),
        text: tt("Nook Mobil › Bilgisayar › Uzaktan kontrol: PC'nin ekranı telefonda canlı görünüyor, telefon yatay ve tam ekran oluyor. Fare kipinde parmağını kaydırınca imleç gidiyor, dokununca tıklıyor, iki kez dokunup sürükleyince sürüklüyor, iki parmakla sayfayı kaydırıyor, iki parmakla dokununca ya da basılı tutunca sağ tıklıyor; iki parmağı açınca yakınlaşıyor. Dokun kipinde parmağın değdiği yere tıklıyor. Klavye düğmesiyle telefon klavyesinden yazıyorsun; Ctrl, Alt, Shift, Win, Esc, Tab, ok ve F tuşları da var. Birden çok ekran varsa üstten seçiliyor. Güvenlik için PC'de Ayarlar › Telefon › “Telefondan uzaktan kontrol”den açılıyor; kontrol başlayınca adada görünüyor."),
        demo: "remotectl",
      },
      {
        title: tt("Evden uzaktayken açma: üç yol ve “Sına” düğmesi"),
        text: tt("Bazı modemler uyandırma paketini evdeki ağa iletmiyor, bazı operatörler de 9 numaralı portu dışarıdan kesiyor; bu yüzden telefon mobil verideyken PC açılmayabiliyordu. Nook artık modemde üç ayrı yol kuruyor ve telefon hepsine gönderiyor. Nook Mobil › Bilgisayar'daki “Dışarıdan açmayı sına”ya PC açıkken, telefon mobil verideyken basınca paketin modemden geçip PC'ye ulaşıp ulaşmadığı, ulaşmıyorsa modemde ne yapman gerektiği yazıyor. Sınama için PC'de Ayarlar › Telefon'daki güvenlik duvarı iznini bir kez daha vermen gerekiyor."),
        demo: "waketest",
      },
    ],
  },
  {
    version: "0.2.60",
    date: tt("13 Ekim 2026"),
    headline: tt("“Hey Nook” yalnızca seslenince uyanıyor, İngilizce sesli komut, telefondan rafa"),
    items: [
      {
        title: tt("“Hey Nook” artık yalnızca gerçekten seslenince uyanıyor"),
        text: tt("Nook bazen sen seslenmeden (konuşurken, öksürünce, televizyon açıkken) dinlemeye geçiyor, seslendiğinde de bazen duymuyordu. Artık sesine benzeyen her şeyi bir de bu bilgisayardaki yazıya dökme modeline dinletiyor; yalnızca gerçekten “Nook” dendiyse uyanıyor. “Hey look”, “Hey Luke”, “Notebook” gibi benzer sözler ve gürültü elendiği için seslenmeni de daha kolay yakalıyor. Bunun için Ayarlar › Hey Nook › “Bilgisayarda yazıya dök” modeli indirilmiş olmalı."),
        demo: "wakeverify",
      },
      {
        title: tt("İngilizce sesli komut"),
        text: tt("Nook İngilizceyken sesli komutlar da İngilizce anlaşılıyor: bilgisayarda yazıya dökme seçili dili kullanıyor, “Open Spotify”, “Play lo-fi on YouTube Music”, “Set the volume to 40”, “Next song”, “Turn off Wi-Fi”, “Set a timer for 10 minutes” gibi komutlar Gemini'ye sorulmadan anında yapılıyor. Türkçede de “Instagram'ı aç” gibi I ile başlayan adlar artık doğru açılıyor."),
        demo: "voiceen",
      },
      {
        title: tt("Telefondan paylaşılan dosya rafa düşüyor"),
        text: tt("Nook Mobil'de bir fotoğrafı ya da dosyayı Paylaş › Nook ile gönderince dosya yine İndirilenler › Nook Mobil'e kaydediliyor, ayrıca adadaki rafa düşüyor. Oradan istediğin yere sürükleyip bırakabilirsin."),
        demo: "phoneshelf",
      },
      {
        title: tt("YouTube videoları için “Argus'ta yok” sorusu bitti"),
        text: tt("15 dakikadan uzun bir YouTube videosunun başlığında bir filmin ya da dizinin adı geçince (inceleme, özet, tepki videosu) Nook onu film sanıp “Argus'ta yok, ekleyeyim mi?” diye soruyordu. Artık yalnızca başlık gerçekten o filmin ya da dizinin adıysa veya başlıkta bölüm numarası varsa soruyor."),
        demo: "argusyt",
      },
      {
        title: tt("Taşıdığın ada tam ekranda da yerinde açılıyor"),
        text: tt("Adayı ekranın altına ya da kenarına taşıdıktan sonra açık adada sağ üstteki tam ekran düğmesine basınca ada ekranın üst ortasına kaçıyordu. Artık Nook neredeyse orada büyüyor (ekrandan taşmadan), küçülürken de yerinde kalıyor."),
        demo: "bigpos",
      },
      {
        title: tt("Şarkıyı istediğin saniyeye sar"),
        text: tt("Medya'daki ilerleme çubuğuna tıklayınca ya da sürükleyince çalan şarkı veya video o ana atlıyor; sürüklerken süre yazısı gideceği yeri gösteriyor. Spotify, YouTube ve sarmaya izin veren her uygulamada çalışıyor; Nook Mobil'in Medya ekranından da yapılabiliyor."),
        demo: "seek",
      },
      {
        title: tt("Yeni Ayarlar: kategoriler ve arama"),
        text: tt("Ayarlar tek uzun liste olmaktan çıktı. Açınca Genel, Ada ve Nook, Bildirimler, Sağlık, Oyun, Gizlilik, Asistan, Modüller, Kısayollar, Telefon ve Hakkında kartları geliyor; birine basınca yalnızca o konunun ayarları açılıyor. Üstteki kutuya yazınca (“su”, “kilit”, “alarm”) bütün ayarlarda arıyor. Satırların başlıkları kısaldı, altında ne işe yaradığı tek cümleyle yazıyor."),
        demo: "settingsgrid",
      },
      {
        title: tt("Ana sayfada sık kullandıkların üstte"),
        text: tt("Ana sayfadaki bölümler artık iki kısım: en çok açtığın altı bölüm üstte büyük çip olarak, gerisi altta “Tümü”nde küçük çip olarak duruyor. Nook hangilerini sık açtığını kendisi öğreniyor; son zamanlarda açtıkların daha ağır basıyor, uzun süre açmadığın aşağı iniyor. Çalan müzik, bekleyen onay gibi bir şey olan bölüm hangi kısımda olursa olsun parlıyor. Düzenle'den sıralama ve gizleme eskisi gibi."),
        demo: "favorites",
      },
      {
        title: tt("Yeni gelene çipler ne olduğunu söylüyor"),
        text: tt("Nook'u yeni kuranlar ana sayfada “Hum ne, Argus ne, Kontrol ne?” diye kalıyordu. İlk hafta henüz açmadığın bölümlerin çipinde ne işe yaradığı yazıyor (Hum: çalan şarkıyı bul, Argus: dizi ve film listen…); bir kez açınca canlı bilgisine dönüyor. Üstüne gelince açıklama herkese her zaman çıkıyor."),
        demo: "explain",
      },
      {
        title: tt("Claude'un sorusu terminalde cevaplanınca ada kapanıyor"),
        text: tt("Claude Code birden çok soru sorduğunda adada çıkan kart, soruyu terminalden cevaplasan da adada kalıyor, ada da hiçbir şekilde kapanmıyordu. Artık Claude devam edince kart hemen kalkıyor, ada da eskisi gibi kapanıyor; arada kaçan bir istek olursa iki dakika içinde kendiliğinden temizleniyor."),
        demo: "claudesettle",
      },
      {
        title: tt("Nook Mobil: Raf, su hatırlatması, bildirim düzeltmesi"),
        text: tt("Telefonda yeni Raf bölümü: PC'deki rafın dosyaları görünüyor, dokununca telefona inip açılıyor, + ile telefondan dosya gönderince PC'de rafa düşüyor. Su hatırlatması artık telefonda da çıkıyor; “İçtim” ya da “Sonra” hangi taraftan denirse ikisinde de kapanıyor, PC kapalıyken telefon kendisi hatırlatıyor. Güncellemeden sonra telefon bildirimlerinin PC'ye gelmemesi düzeldi; Bildirimler'deki “Deneme bildirimi gönder” ile çalışıp çalışmadığını görebilirsin. Medya ekranında da şarkıyı istediğin saniyeye sarabiliyorsun."),
        demo: "mobile060",
      },
    ],
  },
  {
    version: "0.2.59",
    date: tt("12 Ekim 2026"),
    headline: tt("Sesli komut internetsiz ve anında, oyunda alarm oyunu alta atmıyor"),
    items: [
      {
        title: tt("Sesli komut bilgisayarda yazıya dökülüyor (internetsiz)"),
        text: tt("Ayarlar › Hey Nook › “Bilgisayarda yazıya dök”ten modeli bir kez indir (190 MB): sesli komutların artık Gemini'ye gitmeden, bu bilgisayarda yaklaşık bir saniyede yazıya dökülüyor. Gemini'nin kotası dolsa da, internet kesilse de “Argus'u aç”, “Tarkan çal”, “sesi yüzde yüz yap” gibi komutlar çalışıyor; bilgisayarındaki uygulama adlarını da tanıyor. Yalnızca Nook'un kendi bilmediği sorular Gemini'ye gidiyor."),
        demo: "localstt",
      },
      {
        title: tt("Duyduğunu gösteriyor, sık komutları beklemeden yapıyor"),
        text: tt("Sesli komut verince Nook önce duyduğu cümleyi adada gösteriyor. “Spotify'ı aç”, “Discord'u aç”, “Gmail'i aç”, “Tarkan çal”, “YouTube Music'ten … aç”, “sesi yüzde 40 yap” (yazıyla da: “yüzde yetmiş beş”), “sesi sonuna kadar aç”, “sesi biraz kıs”, “sonraki şarkı”, “durdur”, “Wi-Fi'ı kapat”, “Bluetooth aç”, “karanlık modu aç”, “10 dakikalık sayaç kur” gibi komutlar artık Gemini'ye sorulmadan, bilgisayarda anında yapılıyor. Daha uzun istekler Gemini'ye gidiyor ama seçili model Pro olsa da sesli komutta hızlı model kullanılıyor; uzun uzun dönüp “Gemini cevap vermedi” demesi bitti. Bilgisayarındaki uygulama adlarını (Argus, Discord…) artık daha doğru duyuyor, “Hey Nook”la tek solukta söylenen komutun başı kesilmiyor; ne istediğini anlamazsa tahminle rastgele bir şey açmak yerine soruyor."),
        demo: "voicefast",
      },
      {
        title: tt("“Hey Nook” deyince ses veriyor ve adaya dönüyor"),
        text: tt("Nook seni duyduğunda kısa bir ses çıkarıyor. O sırada ekranda geziniyorsa ya da bir panel açıksa bırakıp adaya dönüyor ve kulak kabartıp dinliyor."),
        demo: "wakeback",
      },
      {
        title: tt("Oyundayken alarm oyunu alta atmıyor"),
        text: tt("Tam ekran oyun oynarken alarm çalınca Nook adayı oyunun üstüne çıkarıyordu; bazı oyunlar bunu odak kaybı sayıp alta düşüyordu. Artık oyundayken (DirectX'in özel tam ekran kipi dahil) alarm yalnızca çalıyor, ada oyunun üstüne çıkmıyor; oyundan çıkınca alarm adada seni bekliyor. Özel tam ekran kipindeki oyunlarda da ada artık kendiliğinden gizleniyor."),
        demo: "alarmgame",
      },
      {
        title: tt("“Şaşırt beni” bütün parçalarıyla anında geliyor"),
        text: tt("Görünüm'de “Şaşırt beni”ye basınca Nook önce düz gelip şapkası, gözlüğü sonradan beliriyordu. Artık sıradaki görünüm önceden hazırlanıyor; basınca gövde, doku ve aksesuarlar birlikte geliyor. Başka bir parça seçerken de Nook bir an düz küreye dönmüyor, yenisi hazır olunca tek seferde değişiyor."),
        demo: "shuffle",
      },
      {
        title: tt("Adanın arkasındaki gri parlama gitti"),
        text: tt("Fare adanın üstündeyken, özellikle koyu pencerelerin (oyun, Discord) önünde adanın kenarında gri bir hare beliriyordu. Adanın gölgesi kaldırıldı ve pencerenin zemini her açılışta yeniden şeffaflaştırılıyor; kenar artık temiz."),
        demo: "nohalo",
      },
      {
        title: tt("Destekçiler"),
        text: tt("Ayarlar'da yeni Destekçiler bölümünde Nook'a GitHub'da yıldız verenler profil fotoğraflarıyla görünüyor; birine basınca GitHub sayfası açılıyor. Yeni bir yıldız gelince Nook adada teşekkür ediyor. Sen de “GitHub'da yıldız ver”e basıp destek olabilirsin."),
        demo: "supporters",
      },
    ],
  },
  {
    version: "0.2.58",
    date: tt("12 Ekim 2026"),
    headline: tt("“Hey Nook” diye seslen, Görünüm'de 80'e yakın hazır Nook"),
    items: [
      {
        title: tt("“Hey Nook” diye seslenince dinliyor"),
        text: tt("Ayarlar › Hey Nook'tan sesini tanıt (üç kez “Hey Nook” de) ve aç: artık kısayola basmadan “Hey Nook, YouTube Music'ten Tarkan aç”, “Hey Nook, yarın 8'e alarm kur” diyebilirsin. Adını tek solukta komutla da söyleyebilirsin, “Hey Nook” deyip durunca da Nook kulak kabartıp komutu bekliyor. Mikrofon yalnızca bu bilgisayarda dinleniyor; yalnızca “Hey Nook”tan sonraki cümle Gemini'ye gidiyor. Kendi kendine uyanıyorsa ya da seni duymuyorsa duyarlılığı Ayarlar'dan değiştirebilirsin."),
        demo: "heynook",
      },
      {
        title: tt("Sesle şarkı çal, site aç, sesi ayarla"),
        text: tt("Nook artık istediğin şarkıyı bulup YouTube Music'te (ya da YouTube'da) hemen çalıyor; Spotify dersen Spotify'da arıyor. “Gmail'i aç”, “Ekşi Sözlük'ü aç” gibi siteleri açıyor, “sesi yüzde 30 yap” deyince ses düzeyini ayarlıyor. Hepsi hem “Hey Nook”la hem sesli komut kısayoluyla hem de sohbete yazarak çalışıyor."),
        demo: "voicetools",
      },
      {
        title: tt("Gemini'de kapanmış modeller listeden çıktı"),
        text: tt("Ayarlar › Yapay zekâ'daki model listesinde Google'ın kapattığı ya da anahtarına açık olmayan modeller artık görünmüyor; her model günde bir kez yoklanıyor, çalışmayan çıkarılıyor. Seçili model kapanmışsa Nook kendiliğinden en yeni çalışan Pro modele geçiyor."),
        demo: "geminimodels",
      },
      {
        title: tt("Koleksiyon: tek dokunuşla hazır Nook'lar"),
        text: tt("Görünüm'ün en üstünde yeni Koleksiyon var; 80'e yakın hazır Nook kategorilere ayrılmış: Öne çıkanlar (Astronot, Kral, Melek, Kardan adam, Noel Baba…), Meslekler (Polis, Hemşire, Viking, Şövalye, Pilot, Dedektif, Korsan, Palyaço, Robot…), Hayvanlar (Kurbağa, Panda, Tilki, Penguen, Baykuş, Arı, Yengeç, Ejderha…), Yiyecekler (Karpuz, Cupcake, Dondurma, Donut, Ananas…), Doğa (Yağmur, Fırtına, Kristal, Kaktüs, Güneş, Ay…) ve Malzemeler (Mermer, Cam, Ekose, Kot, Krom…). Birine dokununca Nook'un gövdesi, rengi ve aksesuarları birlikte değişiyor; sonra istediğin parçayı tek tek değiştirebilirsin."),
        demo: "collection",
      },
      {
        title: tt("Yeni gövdeler, dokular ve başlıklar"),
        text: tt("Gövde'ye 32 yeni biçim geldi: hayvanlar (kurbağa, panda, tilki, penguen, baykuş, ördek, arı, yengeç, ejderha), yiyecekler (çilek, mantar, karpuz, cupcake, dondurma, şeker, donut, marşmelov, ananas, palamut, portakal, kiraz) ve doğa (alev, damlacık, yağmur ve fırtına bulutu, kristal, yaprak, kaktüs, kaya, kütük, güneş, ay). Doku'ya Galaksi, Örgü, Lav, Kamuflaj, Mermer, Cam, Işıltı, Ekose, Çizgili, Kot, Piksel, Kabarık, Altın ve Krom; Başlık'a Taç, Hale, Parti, Ponponlu bere, Aşçı, Mantar, Astronot, Büyücü, Noel, Cin, Polis, Hemşire, Viking, Şövalye, Pilot, Kaşif, Dedektif, Madenci, Uyku başlığı, Palyaço peruğu, Bandana, Kulaklı bere, Kar kulaklığı ve Robot eklendi. Hepsi birbiriyle ve her renkle birleşebiliyor."),
        demo: "newparts",
      },
      {
        title: tt("Maskeler, yüz süsleri ve yeni gözler"),
        text: tt("Gözlük'e Kahraman ve Balo maskesi, Neon panjur gözlük ve Şnorkel; yeni Yüz ve süs bölümüne Bıyık, Sakal, Palyaço burnu ve Nook'un yanında süzülen Nota, Parıltı, Baloncuk eklendi. Gözler'de artık Mutlu, Sıkı, Göz kırpma ve Robot gözler de var."),
        demo: "facewear",
      },
    ],
  },
  {
    version: "0.2.57",
    date: tt("11 Ekim 2026"),
    headline: tt("Nook Mobil: sağlam bağlantı, bildirimler, PC kapalıyken de çalışma"),
    items: [
      {
        title: tt("Bağlantı kendini toparlıyor, Tailscale kendiliğinden açılıyor"),
        text: tt("Telefondaki Nook artık bilgisayarın bütün adreslerini aynı anda deniyor ve hangisi cevap verirse ondan bağlanıyor; ev ağında saniyelerce beklemek ve bir anlık kopmada “Ulaşılamıyor”a düşmek bitti. Evden uzaktaysan Nook Mobil Tailscale'i kendisi açıyor, Nook'tan çıkınca kapatıyor (sen açtıysan dokunmuyor). Bilgisayarda Tailscale kapanırsa Nook iki dakika içinde yeniden açıyor ve Windows'a giriş yapılmadan da çalışacak şekilde ayarlıyor."),
        demo: "phonetunnel",
      },
      {
        title: tt("Bağlanamayınca nedenini söylüyor"),
        text: tt("Bilgisayara ulaşılamayınca telefondaki Nook neden olduğunu söylüyor: aynı Wi-Fi'desin ama PC kapalı, telefonda Tailscale yok ya da Tailscale açılamadı. Her durumda yapılacak tek adım düğme olarak çıkıyor: PC'yi aç, Play Store'da aç ya da Tailscale'i aç."),
        demo: "phonediagnose",
      },
      {
        title: tt("Telefonun bildirimleri bilgisayarda"),
        text: tt("Telefondaki Nook'ta Bildirimler'e girip bildirim erişimine izin verince WhatsApp, Instagram, Gmail gibi uygulamaların bildirimleri bilgisayardaki Nook'ta adada kart olarak çıkıyor ve Bildirimler panelinin yeni Telefon sekmesinde birikiyor. İstemediğin uygulamaları tek tek kapatabilirsin; müzik ve indirme gibi süren bildirimler gelmez. Bilgisayar kapalıyken gelenler açılınca listeye düşer."),
        demo: "phonenotify",
      },
      {
        title: tt("Bilgisayar kapalıyken de Not, Pano, Hum ve Argus"),
        text: tt("Bilgisayar kapalıyken telefonda Not, Pano, Hum ve Argus artık açılıyor. Not'ta yazdıkların, Pano'dan gönderdiklerin telefonda saklanıyor ve bilgisayar açılınca gidiyor; aynı not bilgisayarda da değiştiyse hiçbir şey kaybolmuyor, telefondaki hali “(telefon)” adıyla ayrı not oluyor. Hum dinleyip kaydediyor, şarkı bilgisayar açılınca bulunup geçmişe ekleniyor. Argus son görülen listeyi gösteriyor."),
        demo: "phoneoffline",
      },
      {
        title: tt("Ekran görüntüsünü yakınlaştır, telefona ya da bilgisayara kaydet"),
        text: tt("Telefondan aldığın ekran görüntüsünü iki parmakla büyütüp kaydırabilir, iki kez dokunarak yakınlaştırabilirsin. Altındaki düğmelerle telefonun galerisine (Resimler › Nook) kaydedebilir, istediğin uygulamayla paylaşabilir ya da bilgisayarın Ekran görüntüleri klasörüne kaydedebilirsin."),
        demo: "phoneshot",
      },
      {
        title: tt("Ekranı kapat, sonra yine telefondan aç"),
        text: tt("Telefondan bilgisayarın ekranını kapatınca düğme “Ekranı aç”a dönüşüyor; basınca ekran geri geliyor. Bilgisayarda biri fareye ya da klavyeye dokunursa düğme kendiliğinden “Ekranı kapat”a döner."),
        demo: "phonescreen",
      },
      {
        title: tt("Uzaktan açma rehberi telefonda, bilgisayar kapalıyken de"),
        text: tt("Telefondaki Nook'ta Bilgisayar ekranında uzaktan açma ve dışarıdan bağlanma için ne hazır ne eksik listeleniyor; her eksiğe dokununca nasıl yapılacağı adım adım çıkıyor. BIOS tarifi bilgisayarının anakartına ya da dizüstü modeline göre (Nook dizüstü olduğunu kendisi anlıyor), modem tarifi modemin markasına göre veriliyor; Windows'un açılışta şifre sorduğunu da söylüyor. Liste bilgisayar kapalıyken de son kontrolle görünüyor; aynı tarifler bilgisayarda Ayarlar › Telefon'da da var."),
        demo: "phoneguide",
      },
      {
        title: tt("Güncelleme uygulamanın içinde kuruluyor"),
        text: tt("Nook Mobil'de Güncelle'ye basınca yeni sürüm artık tarayıcıya gitmeden uygulamanın içinde iniyor ve Android'in kurulum penceresi kendiliğinden açılıyor; indirilenler klasöründe dosya aramana gerek yok. İlk seferde Android “bu kaynaktan yükle” izni isterse izin verip geri dönmen yeterli, kaldığı yerden devam ediyor."),
        demo: "phoneupdate",
      },
      {
        title: tt("Başka uygulamadan bilgisayara gönder"),
        text: tt("Galeride, WhatsApp'ta ya da herhangi bir uygulamada Paylaş'a basıp Nook'u seçince fotoğraf, video ve dosyalar bilgisayarda İndirilenler › Nook Mobil klasörüne gidiyor; yazı ve bağlantılar bilgisayarın panosuna kopyalanıyor (bilgisayar kapalıysa açılınca)."),
        demo: "phoneshare",
      },
    ],
  },
  {
    version: "0.2.56",
    date: tt("11 Ekim 2026"),
    headline: tt("Dışarıdan açma daha çok bilgisayarda çalışıyor"),
    items: [
      {
        title: tt("VPN açıkken ve yeni modemlerde de modem bulunuyor"),
        text: tt("Bilgisayarda bir VPN açıksa Nook artık onu ağ kartı sanmıyor; modeme bağlı gerçek kartı seçiyor, Wake-on-LAN ve modem ayarını ona göre yapıyor. Yeni nesil modemler (UPnP IGD 2) de artık tanınıyor. Ayarlar › Telefon › Telefondan PC'yi açma bölümü ağ kartı bulunamasa da görünüyor ve nedenini söylüyor; “Evden uzaktayken de açılabilsin” satırı modem aranırken de görünüyor."),
        demo: "modemfind",
      },
    ],
  },
  {
    version: "0.2.55",
    date: tt("11 Ekim 2026"),
    headline: tt("Telefondan bilgisayarına bağlan"),
    items: [
      {
        title: tt("Nook Mobil köprüsü"),
        text: tt("Ayarlar › Telefon'dan açınca telefondaki Nook bu bilgisayara bağlanabiliyor. Kodu göster'e basıp QR'ı telefonla okutman yeterli. Telefondan ekran görüntüsü alabilir, bilgisayarı kilitleyebilir, ekranı kapatabilir, uyutabilir, yeniden başlatabilir ya da kapatabilirsin; işlemcinin, belleğin ve diskin durumunu da görürsün. Bağlantı yalnızca eşleştirdiğin telefona açık, her istek imzalı. Bilgisayara ve telefona Tailscale kurarsan dışarıdayken de çalışıyor."),
        demo: "phone",
      },
      {
        title: tt("İki ekranın varsa hangisi olduğunu soruyor"),
        text: tt("Bilgisayarına birden çok monitör bağlıysa telefondan ekran görüntüsü isteyince Nook hangi ekranı istediğini soruyor: ekranlar masadaki gibi yan yana çiziliyor, ana ekran mavi. Hepsini tek görüntüde de alabilirsin. Görüntüye bakarken üstteki Ekran 1, Ekran 2 ve Hepsi düğmeleriyle diğerine geçebilir, yenile düğmesiyle tazeleyebilirsin."),
        demo: "phonescreens",
      },
      {
        title: tt("Telefondan Argus"),
        text: tt("Telefondaki Nook'ta Argus'a girip “Ne izlesem?”e basınca Argus'taki Ne İzlesem ayarlarınla (filtre, arşivden ya da TMDB'den) bir şey seçiliyor. Devam sekmesinde yarım kalan dizilerin sıradaki bölümü duruyor; İzledim'e basınca bilgisayardaki Argus'a yazılıyor. Diziye dokununca bölümleri sezon sezon listeleniyor: istediğin bölümleri işaretleyip işaretini kaldırabilir, Sezonu bitir'le bir sezonun hepsini tek seferde işaretleyebilirsin. İzledim sekmesinden izlediğin bir şeyi arayıp işaretleyebilir, arşivinde yoksa TMDB'den ekleyebilirsin. Argus kapalıysa Nook onu arkada açıp işi bitince kapatıyor."),
        demo: "phoneargus",
      },
      {
        title: tt("Telefondan Medya"),
        text: tt("Bilgisayarda çalan şarkı ya da video kapağıyla telefonda görünüyor. Telefondan oynatıp duraklatabilir, önceki ya da sonrakine geçebilir, bilgisayarın sesini açıp kısabilir ya da sessize alabilirsin."),
        demo: "phonemedia",
      },
      {
        title: tt("Telefondan bilgisayarı açma"),
        text: tt("Bilgisayar kapalıyken telefondaki Nook'ta “PC'yi aç” düğmesi çıkıyor; basınca telefon uyandırma sinyali (Wake-on-LAN) gönderiyor ve bilgisayar açılıyor. Bilgisayar kabloyla bağlı olmalı ve BIOS'ta Wake-on-LAN açık olmalı; evdeyken hep çalışır, dışarıdan açmak için aşağıdaki “Dışarıdan aç”a bak."),
        demo: "phonewake",
      },
      {
        title: tt("Telefondan Pano"),
        text: tt("Bilgisayarda kopyaladıkların telefondaki Nook'un Pano bölümünde listeleniyor; birine dokununca telefonun panosuna kopyalanıyor, görsellere dokununca açılıyor. Telefonda yazdığın ya da kopyaladığın bir metni de tek dokunuşla bilgisayarın panosuna gönderebilirsin; bilgisayarda Ctrl+V ile yapıştırırsın."),
        demo: "phoneclip",
      },
      {
        title: tt("Telefondan Not"),
        text: tt("Nook'taki not sekmelerin telefonda da açılıyor. Telefonda yazdığın kısa bir aradan sonra bilgisayardaki nota kaydediliyor, bilgisayarda yazdığın da telefona geliyor. Telefondan yeni not açabilir, notun adını değiştirebilir ya da silebilirsin."),
        demo: "phonenote",
      },
      {
        title: tt("Telefonda canlı Nook"),
        text: tt("Telefondaki Nook'un ana ekranında artık bilgisayarın adı yerine en üstte ortada Nook duruyor, bilgisayardaki adada olduğu gibi canlı: göz kırpıyor, etrafına bakınıyor, ara sıra esneyip zıplıyor. Bilgisayarda müzik çalınca dans ediyor, bilgisayara ulaşılamayınca uyuyor. Dokununca tepki veriyor."),
        demo: "phonelive",
      },
      {
        title: tt("Telefonda Hum"),
        text: tt("Kafede, arabada ya da televizyonda çalan bir şarkıyı merak edersen telefondaki Nook'ta Hum'a dokun: telefonun mikrofonu birkaç saniye dinliyor, bilgisayar şarkıyı tanıyor. Bulunan şarkı bilgisayardaki Hum geçmişine telefon işaretiyle ekleniyor; bilgisayarda Argus'ta bir şey izlerken ve İzlerken Hum açıksa o içeriğin Müzikler listesine de yazılıyor."),
        demo: "phonehum",
      },
      {
        title: tt("Bilgisayarın durumu tek bakışta"),
        text: tt("Telefondaki Nook'un ana ekranında Bilgisayar çipi artık tüm satırı kaplıyor: bilgisayarın ne kadar süredir açık olduğu, işlemci, bellek ve diskte kalan boş yer canlı olarak içinde."),
        demo: "phonestats",
      },
      {
        title: tt("Telefondan açmaya hazırlık"),
        text: tt("Ayarlar › Telefon › Telefondan PC'yi açma, bilgisayarın uzaktan açılmaya hazır olup olmadığını gösteriyor: kabloyla bağlı mı, Hızlı Başlangıç kapalı mı, ağ kartı bilgisayarı uyandırabiliyor mu. Eksikleri Düzelt'e basıp tek bir Windows izniyle düzeltiyorsun. BIOS'taki ayarı ise Nook anakartının markasını tanıyıp hangi menüde olduğunu tarif ediyor."),
        demo: "wakesetup",
      },
      {
        title: tt("Evden uzaktayken de bağlan"),
        text: tt("Ayarlar › Telefon › Evden uzaktayken bağlanma, dışarıdan bağlanmak için gerekenleri sırayla gösteriyor: ücretsiz Tailscale'i tek tıkla kurabilir, giriş yapıp güvenlik duvarına izin verebilirsin. Telefona Tailscale'i kurmak için de bir QR kod var. Telefon yeni adresi kendisi öğreniyor; eşleşme kodunu yeniden okutman gerekmiyor."),
        demo: "outside",
      },
      {
        title: tt("Dışarıdan aç"),
        text: tt("Telefondan PC'yi açma altındaki “Evden uzaktayken de açılabilsin” anahtarını açınca Nook modemini kendisi ayarlıyor (UPnP); modem arayüzüne girmen gerekmiyor. Böylece mobil veriyle dışarıdayken de “PC'yi aç”a basıp bilgisayarını açabiliyorsun. Modem buna izin vermiyorsa Nook söylüyor ve elle nasıl yapılacağını gösteriyor."),
        demo: "wakeoutside",
      },
      {
        title: tt("Telefona kur, kendiliğinden güncellensin"),
        text: tt("Ayarlar › Telefon › Telefona Nook Mobil'i kur'daki QR kodu telefonla okutunca Nook Mobil iniyor (Android). Android bilinmeyen uygulamaları yükleme izni isteyebilir. Sonraki sürümler çıkınca uygulamanın ana ekranında Güncelle kartı beliriyor; dokunman yeterli."),
        demo: "phoneinstall",
      },
      {
        title: tt("Telefonda tanıtım"),
        text: tt("Nook Mobil ilk açıldığında sayfa sayfa kendini tanıtıyor: her bölümün Nook'u kendi renginde, neler yapabildiğini anlatıyor; son sayfada bilgisayarını ekliyorsun. Sonradan ana ekrandaki menüden “Nook Mobil'i tanı” ile yeniden açabilirsin."),
        demo: "phonetour",
      },
    ],
  },
  {
    version: "0.2.54",
    date: tt("10 Ekim 2026"),
    headline: tt("Listende olmayan film yanlış kayıtla karışmıyor"),
    items: [
      {
        title: tt("Benzeyen ad artık yanlış kayıt sayılmıyor"),
        text: tt("İzlediğin film listende yoksa ve adı listedeki başka bir kayda benziyorsa (Avatar Aang izlerken Avatar 1 gibi) Nook artık o kaydı göstermiyor. Önce TMDB'de doğrusunu arıyor; bulamazsa hiçbir şey göstermiyor. Başlıkta yıl yazıyorsa (\"… (2026)\") aynı adlı eski film ya da dizi yerine o yılın içeriği seçiliyor."),
        demo: "argusyear",
      },
      {
        title: tt("TMDB anahtarı yoksa söylüyor"),
        text: tt("Listende olmayanı tanımak için Argus'ta TMDB API anahtarı gerekiyor. Anahtar girilmemişse ve uzun bir şey izliyorsan Nook günde bir kez \"İzlediğini tanıyamadım\" diyor ve anahtarın nereye girileceğini gösteriyor (Argus › Ayarlar › Veritabanı › API)."),
        demo: "argusnokey",
      },
    ],
  },
  {
    version: "0.2.53",
    date: tt("10 Ekim 2026"),
    headline: tt("Ada hep üstte, Argus'ta olmayanı da tanıyor"),
    items: [
      {
        title: tt("Ada klasörlerin altında kalmıyor"),
        text: tt("Bir klasör ya da tarayıcı öne gelince ada, ses kartı ve Argus kartı bazen onların altında kalıyordu. Artık Windows onları alta itse de Nook hemen yeniden en üste çıkarıyor (tam ekran oyunlara dokunmadan)."),
        demo: "ontop",
      },
      {
        title: tt("Argus'ta olmayanı da tanıyor"),
        text: tt("İzlediğin şeyin adı Argus'taki bir kayda yalnızca benziyorsa (Avatar Aang'ı izlerken eski Avatar filmi gibi) artık onu göstermiyor; içeriği TMDB'de bulup doğrusunu tanıyor. Argus'ta yoksa birkaç dakika izledikten sonra \"Argus'ta yok, ekleyeyim mi?\" diye soruyor; Ekle'ye basınca afişi ve bölümleriyle Argus'a ekleniyor, izleyince \"bitti mi?\" sorusu yine geliyor. Başlık başka dilde olsa da (İngilizce başlık, Türkçe kayıt) aynı kayıt bulunuyor. Argus'ta TMDB API anahtarı girilmiş olmalı."),
        demo: "argusnew",
      },
    ],
  },
  {
    version: "0.2.52",
    date: tt("10 Ekim 2026"),
    headline: tt("Nook'un bildirim geçmişi, kenarda kartlar yerinde"),
    items: [
      {
        title: tt("Bildirimlerde Nook'un geçmişi"),
        text: tt("Bildirimler çipinde Windows ve Nook sekmeleri var. Nook sekmesinde adada çıkan kartların geçmişi duruyor: işaretlenen bölümler, bulunan şarkılar, takılan USB'ler, uyarılar… 1 saat sessizdeyken gösterilmeyenler de buraya yazılır."),
        demo: "nooknotifs",
      },
      {
        title: tt("Kenardaki adada kartlar yerinde"),
        text: tt("Ada ekranın sağına taşınınca Argus kartı ekrandan taşıyordu; sola taşınınca ses kartı Argus kartının altında kalıp görünmüyordu. Artık kart kendi tarafına sığmazsa öbür tarafa geçiyor, iki kart aynı taraftaysa yan yana diziliyor."),
        demo: "cardsides",
      },
      {
        title: tt("Hum'da kopyalayınca belli oluyor"),
        text: tt("Hum geçmişinde bir şarkıyı kopyalayınca satır yeşil parlıyor, yanında \"Kopyalandı\" yazıyor ve simge tike dönüyor."),
        demo: "humcopy",
      },
      {
        title: tt("Dönüşte ada beyazlaşmıyor"),
        text: tt("Nook bir pencereye tünedikten ya da balık tuttuktan sonra adanın arkası beyaz kalabiliyordu. Artık Nook döndüğünde ve ekran uykudan uyanınca ada yeniden siyah, arkası şeffaf oluyor."),
        demo: "whitebg",
      },
    ],
  },
  {
    version: "0.2.51",
    date: tt("10 Ekim 2026"),
    headline: tt("İzlerken Hum: dizinin, filmin müzikleri Argus'ta"),
    items: [
      {
        title: tt("İzlerken Hum"),
        text: tt("Argus'taki bir diziyi ya da filmi izlerken Hum arkada dinler; çalan şarkıyı bulup hangi dakikada çaldığıyla Argus'taki detay penceresinin Müzikler bölümüne yazar (Argus kapalıyken de). Dizilerde bölüm bölüm ayrılır. Ayarlar › Argus › \"İzlerken içindeki müzikleri bul (Hum)\" ile açılır. İzlerken kısayolla elle Hum yaparsan bulduğun şarkı da oraya gider. Argus'un da güncel olması gerekir."),
        demo: "humwatch",
      },
      {
        title: tt("Tepsiden \"Adayı aç\" düzeldi"),
        text: tt("Tepsi menüsündeki \"Adayı aç\" ve simgeye sol tık adayı açmıyordu, yalnızca tıklanabilir yapıyordu. Artık ada açılır ve imleç tepside dururken de açık kalır. İmleç adaya girip çıkınca, başka yere tıklayınca ya da Esc'e basınca kapanır."),
        demo: "trayopen",
      },
    ],
  },
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
  /** Günün sürümlerinden biri büyük sürüm */
  major: boolean;
  items: (NoteItem & { version: string })[];
}

export const DAYS: DayNote[] = NOTES.reduce<DayNote[]>((days, n) => {
  const day = days.find((d) => d.date === n.date);
  const items = n.items.map((it) => ({ ...it, version: n.version }));
  if (day) {
    day.versions.push(n.version);
    day.items.push(...items);
    day.major ||= !!n.major;
  } else days.push({ date: n.date, versions: [n.version], headline: n.headline, major: !!n.major, items });
  return days;
}, []);

/** Sürümün bulunduğu gün */
export const dayOf = (version: string) => DAYS.find((d) => d.versions.includes(version)) ?? DAYS[0];

/** En yeni not henüz kendiliğinden gösterilmedi mi */
export function notesDue() {
  const s = useNook.getState();
  return isPrimary && s.toured && s.notesSeen !== latestNote().version;
}

/**
 * Yama notlarını Nook Studio'da aç; `version` verilirse o sürümün notuyla. Güncellemeden sonraki
 * ilk açılışta bir kez kendiliğinden açılır (görülen not bir daha açılmaz).
 */
export function openNotes(version?: string) {
  if (!isPrimary) return;
  const s = useNook.getState();
  if (s.tour) return;
  s.setNotesSeen(latestNote().version);
  playAntic("hop");
  openStudio(version ? `notes:${version}` : "notes");
}
