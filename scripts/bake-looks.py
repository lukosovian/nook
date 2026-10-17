# Koleksiyon ve Cadılar Nook'larının hazır resimlerini üretir (public/looks + src/lib/bakedLooks.ts).
# Gölgelendirici, başlık hizaları ya da koleksiyon değişince yeniden çalıştır; çalışmazsa uygulama
# eskisi gibi çalışma anında çizer (TAG tutmaz), yani unutmak yalnızca yavaşlatır.
#   1) npx vite --port 1420   2) python scripts/bake-looks.py
import base64, hashlib, html, json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
URL = "http://localhost:1420/?preview=wardrobe&set=bake"

prof = tempfile.mkdtemp(prefix="nookbake")
try:
    dom = subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--use-angle=swiftshader", f"--user-data-dir={prof}", "--virtual-time-budget=60000", "--dump-dom", URL],
        capture_output=True, text=True, encoding="utf-8", timeout=1800,
    ).stdout
finally:
    shutil.rmtree(prof, ignore_errors=True)

m = re.search(r'<pre id="bake">(.*?)</pre>', dom, re.S)
if not m:
    sys.exit("Sayfa okunamadı: vite 1420'de açık mı?")
items = json.loads(html.unescape(m.group(1)))
if not items:
    sys.exit("Hiç resim çizilmedi")

out = os.path.join(ROOT, "public", "looks")
shutil.rmtree(out, ignore_errors=True)
os.makedirs(out)
table = {}
tag = items[0]["tag"]
for it in items:
    name = hashlib.sha1(it["key"].encode()).hexdigest()[:12] + ".webp"
    data = base64.b64decode(it["url"].split(",", 1)[1])
    with open(os.path.join(out, name), "wb") as f:
        f.write(data)
    table[it["key"]] = name

body = "".join(f"  {json.dumps(k)}: {json.dumps(v)},\n" for k, v in sorted(table.items()))
with open(os.path.join(ROOT, "src", "lib", "bakedLooks.ts"), "w", encoding="utf-8", newline="\n") as f:
    f.write(
        "/**\n"
        " * Paketle gelen hazır Nook resimleri (Koleksiyon, Cadılar): ilk açılışta da derleme beklemeden görünsünler.\n"
        " * scripts/bake-looks.py üretir; gölgelendirici değişince TAG tutmaz ve çizim eskisi gibi çalışma anında yapılır.\n"
        " */\n"
        f"export const BAKED_TAG: string = {json.dumps(tag)};\n"
        f"export const BAKED: Record<string, string> = {{\n{body}}};\n"
    )
size = sum(os.path.getsize(os.path.join(out, n)) for n in os.listdir(out))
print(f"{len(table)} resim, {size // 1024} KB, tag {tag}")
