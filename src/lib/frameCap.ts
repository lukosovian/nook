/**
 * Kare sınırlayıcı. WebView2 animasyonları ekranın yenileme hızında çalıştırır — 240 Hz monitörde
 * saniyede 240 kare; maskotun küçük hareketleri için 60 yeter, fazlası boşa GPU/CPU yakar.
 * Tam ekran oyunda ada gizliyken hiç kare çizilmez (pencere ShowWindow ile gizlendiği için
 * WebView2 görünmez olduğunu bilmez, yoksa oyunun arkasında çizmeye devam eder).
 *
 * Motion requestAnimationFrame'i içe aktarılırken yakalar: bu dosya main.tsx'te İLK içe aktarılmalı.
 */

let interval = 1000 / 60;
// Kare zamanlamasındaki titremeye pay — 60 Hz ekranda hiçbir kare atlanmasın
const SLACK = 2;
// Zamanlayıcı geç kalabilir — sıradaki kareden bu kadar (ms) önce uyan
const WAKE_EARLY = 4;

// Motion opacity/filter gibi değerleri tarayıcıya (WAAPI) devreder; onlar sınırsız, ekran hızında
// çizilir. Motion bunu `Element.prototype.animate` var mı diye bakarak seçer: yöntemi alt
// sınıflara taşıyınca her şey aşağıdaki 60'lık döngüden geçer, `el.animate()` yine çalışır.
const waapi = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
if (waapi) {
  Object.defineProperty(HTMLElement.prototype, "animate", waapi);
  Object.defineProperty(SVGElement.prototype, "animate", waapi);
  delete (Element.prototype as { animate?: unknown }).animate;
}

const native = window.requestAnimationFrame.bind(window);
const nativeCancel = window.cancelAnimationFrame.bind(window);

let queue = new Map<number, FrameRequestCallback>();
let nextId = 1;
let raf = 0;
let timer = 0;
let last = 0;
let paused = false;

function ensure() {
  if (!raf && !timer && !paused && queue.size) raf = native(pump);
}

function pump(t: number) {
  raf = 0;
  if (paused) return;
  const elapsed = t - last;
  if (elapsed < interval - SLACK) {
    // Atlanacak karelerde tarayıcıyı hiç uyandırma (240 Hz'te saniyede 240 uyanış demek):
    // sıradaki kareye az kalana kadar zamanlayıcıyla bekle, sonra ekran yenilemesine hizalan
    const wait = interval - SLACK - elapsed - WAKE_EARLY;
    if (wait > 1) {
      timer = window.setTimeout(() => {
        timer = 0;
        if (!paused) raf = native(pump);
      }, wait);
    } else {
      raf = native(pump);
    }
    return;
  }
  // 60'lık ızgarada ilerle (144 Hz gibi tam bölünmeyen hızlarda da ortalama 60);
  // geride kalırsa ızgarayı öne çek ki birikmiş kareler art arda çalışmasın
  last = Math.max(last + interval, t - SLACK);
  const run = queue;
  queue = new Map();
  run.forEach((cb) => {
    try {
      cb(t);
    } catch (e) {
      // Tarayıcı da böyle yapar: biri patlarsa diğerleri yine çalışır, hata yine raporlanır
      window.setTimeout(() => {
        throw e;
      });
    }
  });
  ensure();
}

window.requestAnimationFrame = (cb) => {
  const id = nextId++;
  queue.set(id, cb);
  ensure();
  return id;
};

window.cancelAnimationFrame = (id) => {
  queue.delete(id);
};

/** Saniyedeki en fazla kare (pilde / enerji tasarrufunda 30) */
export function setFrameRate(fps: number) {
  interval = 1000 / fps;
}

/** Gizliyken kareleri tamamen durdurur; açılınca bekleyen animasyonlar kaldığı yerden sürer. */
export function pauseFrames(on: boolean) {
  if (on === paused) return;
  paused = on;
  if (on) {
    if (raf) nativeCancel(raf);
    window.clearTimeout(timer);
    raf = timer = 0;
  }
  ensure();
}
