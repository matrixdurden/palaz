// Yemek tanıma: fotoğraftaki barkod → Open Food Facts, fotoğraf ya da yazı → Gemini (Firebase AI Logic).

import {
  getAI, getGenerativeModel, GoogleAIBackend, Schema,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-ai.js";
import { app } from "./firebase.js";
import { parseOffProduct, cleanEstimate } from "./nutrition.js";
import { store } from "./ui.js";

// Ücretsiz katmanda, görsel kabul eden kararlı model (firebase.google.com/docs/ai-logic/models).
const MODEL = "gemini-3.5-flash";
const DAILY_LIMIT = 30; // ücretsiz kotayı açık kaynak kopyalar da kullandığı için kişi başı sınır

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

let model = null;

function getModel() {
  if (!app) throw Object.assign(new Error("no firebase app"), { code: "unavailable" });
  model ??= getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: Schema.object({
        properties: {
          items: Schema.array({
            items: Schema.object({
              properties: {
                name: Schema.string(),
                grams: Schema.number(),
                kcal: Schema.number(),
                protein: Schema.number(),
              },
            }),
          }),
          note: Schema.string(),
        },
      }),
    },
  });
  return model;
}

const LANG_NAME = { tr: "Turkish", en: "English" };

function prompt(text, lang) {
  return [
    "You estimate the nutrition of food someone has just eaten, for a calorie and protein log.",
    "The user lives in Turkey: assume typical Turkish home, street and restaurant portions unless told otherwise.",
    "From the photo and/or the description, list each distinct food or drink with:",
    "name (short, in " + LANG_NAME[lang] + "), grams eaten (estimate), kcal, protein in grams.",
    "Include cooking oil or butter that is very likely in the dish. Prefer the description over the photo when they disagree.",
    "If there is no food or drink, return an empty items list.",
    "note: one short sentence in " + LANG_NAME[lang] + " naming the biggest uncertainty (for example whether it was fried), or an empty string.",
    text ? `Description: ${text}` : "No description, use the photo.",
  ].join("\n");
}

function useQuota() {
  const key = `ai.${new Date().toISOString().slice(0, 10)}`;
  const used = Number(store.get(key) || 0);
  if (used >= DAILY_LIMIT) throw Object.assign(new Error("daily limit"), { code: "quota" });
  store.set(key, String(used + 1));
}

// → { items: [{ name, grams, kcal, protein }], note }
export async function estimateFood({ text, image, lang }) {
  useQuota();
  const parts = [{ text: prompt(text, lang) }];
  if (image) parts.push({ inlineData: { mimeType: "image/jpeg", data: image.base64 } });
  try {
    const result = await getModel().generateContent(parts);
    return cleanEstimate(JSON.parse(result.response.text()));
  } catch (err) {
    console.error(err);
    const quota = /quota|429|RESOURCE_EXHAUSTED/i.test(String(err?.message));
    throw Object.assign(new Error("estimate failed"), { code: quota ? "quota" : "failed" });
  }
}
