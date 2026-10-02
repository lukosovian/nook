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

const native = window.requestAnimationFrame.bind(window);
const nativeCancel = window.cancelAnimationFrame.bind(window);

let queue = new Map<number, FrameRequestCallback>();
let nextId = 1;
let scheduled = 0;
let last = 0;
let paused = false;

function ensure() {
  if (!scheduled && !paused && queue.size) scheduled = native(pump);
}

function pump(t: number) {
  scheduled = 0;
  if (paused) return;
  const elapsed = t - last;
  if (elapsed < interval - SLACK) {
    scheduled = native(pump);
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
  if (on && scheduled) {
    nativeCancel(scheduled);
    scheduled = 0;
  }
  ensure();
}
