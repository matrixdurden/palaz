// Barkod ve yapay zekâ sonuçlarını uygulamanın kullandığı şekle çevirir.
// DOM'a ve ağa dokunmaz, test/nutrition.test.js ile test edilir.

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? x : null;
};

export const isBarcode = (s) => /^\d{8,14}$/.test(String(s).trim());

// Gram başına değerden yenen miktara.
export const scale = (per100, grams) => (per100 * grams) / 100;

// Open Food Facts API v2 cevabı → { name, kcal100, protein100, grams } ya da null.
// grams: önerilen porsiyon (porsiyon bilgisi, küçük paketse paketin tamamı, yoksa 100 g).
export function parseOffProduct(json, lang) {
  if (!json || json.status !== 1 || !json.product) return null;
  const p = json.product;
  const n = p.nutriments || {};
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal == null) {
    const kj = num(n["energy-kj_100g"]) ?? num(n.energy_100g);
    if (kj != null) kcal = kj / 4.184;
  }
  if (kcal == null) return null;
  const brand = String(p.brands || "").split(",")[0].trim();
  let name = String(p[`product_name_${lang}`] || p.product_name || p.product_name_tr || p.product_name_en || "").trim();
  if (!name) name = brand || String(p.code || json.code || "");
  else if (brand && !name.toLocaleLowerCase().includes(brand.toLocaleLowerCase())) name = `${name} (${brand})`;
  const serving = num(p.serving_quantity);
  const pack = num(p.product_quantity);
  return {
    name,
    kcal100: kcal,
    protein100: num(n.proteins_100g) ?? 0,
    grams: Math.round(serving || (pack && pack <= 250 ? pack : 100)),
  };
}

// Yapay zekâ cevabını temizler: saçma ya da eksik satırları atar, sayıları yuvarlar.
export function cleanEstimate(raw) {
  const items = (Array.isArray(raw?.items) ? raw.items : [])
    .map((it) => ({
      name: String(it?.name || "").trim().slice(0, 60),
      grams: num(it?.grams),
      kcal: num(it?.kcal),
      protein: num(it?.protein),
    }))
    .filter((it) => it.name && it.grams > 0 && it.kcal != null && it.kcal <= 5000)
    .map((it) => ({
      name: it.name,
      grams: Math.round(it.grams),
      kcal: Math.round(it.kcal),
      protein: Math.round(Math.min(it.protein ?? 0, 300)),
    }))
    .slice(0, 8);
  return { items, note: String(raw?.note || "").trim().slice(0, 200) };
}

// Gram değişince tahmini kalori ve protein aynı oranda değişir.
export function rescale(item, grams) {
  const ratio = item.grams > 0 ? grams / item.grams : 0;
  return { k: Math.round(item.kcal * ratio), p: Math.round(item.protein * ratio) };
}
