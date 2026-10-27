// Yemek tanıma: fotoğraftaki barkod → Open Food Facts, fotoğraf ya da yazı → Cloudflare Workers AI (worker/).

import { auth } from "./firebase.js";
import { aiUrl } from "./firebase-config.js";
import { parseOffProduct, cleanEstimate } from "./nutrition.js";
import { store } from "./ui.js";

const DAILY_LIMIT = 30; // Workers AI'ın ücretsiz günlük kotası herkes için ortak; kişi başı sınır

// --- Barkod ------------------------------------------------------------------

let detectorPromise = null;

// Chrome (Android) tarayıcının kendi barkod okuyucusunu kullanır; yoksa (iPhone, Firefox) aynı arayüzlü yedek yüklenir.
function detector() {
  detectorPromise ??= (async () => {
    const formats = ["ean_13", "ean_8", "upc_a", "upc_e"];
    if ("BarcodeDetector" in window) {
      const supported = await window.BarcodeDetector.getSupportedFormats().catch(() => []);
      if (formats.some((f) => supported.includes(f))) return new window.BarcodeDetector({ formats });
    }
    const { BarcodeDetector } = await import("https://cdn.jsdelivr.net/npm/barcode-detector@3.2.2/pure/+esm");
    return new BarcodeDetector({ formats });
  })();
  return detectorPromise;
}

export async function findBarcode(image) {
  try {
    const codes = await (await detector()).detect(image);
    return codes[0]?.rawValue || null;
  } catch {
    return null; // okunamadıysa fotoğraf yemek tahminine gider
  }
}

// Bulunamazsa null; ağ hatasında hata fırlatır.
export async function lookupBarcode(code, lang) {
  const fields = "code,product_name,product_name_tr,product_name_en,brands,nutriments,serving_quantity,product_quantity";
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`off ${res.status}`);
  return parseOffProduct(await res.json(), lang);
}

// --- Fotoğraf ----------------------------------------------------------------

// Telefon fotoğrafları birkaç MB; 1024 px JPEG tahmin için yeterli ve hızlı gider.
export async function loadImage(file) {
  const bitmap = await createImageBitmap(file);
  const s = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * s);
  canvas.height = Math.round(bitmap.height * s);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { bitmap, dataUrl, base64: dataUrl.split(",")[1] };
}

// --- Yapay zekâ tahmini --------------------------------------------------------

function useQuota() {
  const key = `ai.${new Date().toISOString().slice(0, 10)}`;
  const used = Number(store.get(key) || 0);
  if (used >= DAILY_LIMIT) throw Object.assign(new Error("daily limit"), { code: "quota" });
  store.set(key, String(used + 1));
}

const fail = (code) => Object.assign(new Error(code), { code });

// → { items: [{ name, grams, kcal, protein }], note }. Hata kodları: quota, failed.
export async function estimateFood({ text, image, lang }) {
  useQuota();
  const token = await auth?.currentUser?.getIdToken().catch(() => null);
  let res;
  try {
    res = await fetch(aiUrl, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text, image: image?.base64, lang }),
    });
  } catch {
    throw fail("failed");
  }
  const data = await res.json().catch(() => null);
  if (res.status === 429) throw fail("quota");
  if (!res.ok || !data) throw fail("failed");
  return cleanEstimate(data);
}
