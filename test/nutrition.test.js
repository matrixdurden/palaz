import { test } from "node:test";
import assert from "node:assert/strict";
import { isBarcode, scale, parseOffProduct, cleanEstimate, rescale } from "../public/nutrition.js";

test("barkod biçimi", () => {
  assert.equal(isBarcode("8690504011007"), true);
  assert.equal(isBarcode(" 12345678 "), true);
  assert.equal(isBarcode("1 tabak mantı"), false);
  assert.equal(isBarcode("1234"), false);
});

test("Open Food Facts: kcal, protein, porsiyon", () => {
  const json = {
    status: 1,
    product: {
      product_name: "Gofret", brands: "Ülker,Yıldız", serving_quantity: "36",
      nutriments: { "energy-kcal_100g": 520, proteins_100g: 6.4 },
    },
  };
  assert.deepEqual(parseOffProduct(json, "tr"), { name: "Gofret (Ülker)", kcal100: 520, protein100: 6.4, grams: 36 });
});

test("Open Food Facts: sadece kJ varsa çevrilir, porsiyon yoksa küçük paket", () => {
  const json = { status: 1, product: { product_name_en: "Bar", product_quantity: 50, nutriments: { "energy-kj_100g": 2092 } } };
  const p = parseOffProduct(json, "en");
  assert.equal(Math.round(p.kcal100), 500);
  assert.equal(p.protein100, 0);
  assert.equal(p.grams, 50);
});

test("Open Food Facts: varsayılan miktar paketin tamamı, çok büyük pakette porsiyon", () => {
  const product = (pack, serving) => ({
    status: 1,
    product: { product_name: "Halley", product_quantity: pack, serving_quantity: serving, nutriments: { "energy-kcal_100g": 440 } },
  });
  assert.equal(parseOffProduct(product(300, 30), "tr").grams, 300);
  assert.equal(parseOffProduct(product(1000, 30), "tr").grams, 30);
  assert.equal(parseOffProduct(product(1000, null), "tr").grams, 100);
});

test("Open Food Facts: bulunamayan ya da enerjisiz ürün", () => {
  assert.equal(parseOffProduct({ status: 0, status_verbose: "product not found" }, "tr"), null);
  assert.equal(parseOffProduct({ status: 1, product: { product_name: "Su", nutriments: {} } }, "tr"), null);
});

test("gram ölçeği", () => {
  assert.equal(scale(520, 36), 187.2);
  assert.deepEqual(rescale({ grams: 200, kcal: 400, protein: 20 }, 300), { k: 600, p: 30 });
});

test("yapay zekâ cevabı temizlenir", () => {
  const out = cleanEstimate({
    items: [
      { name: " Mantı ", grams: 250.4, kcal: 480.6, protein: 21.2, source: "made-up" },
      { name: "Albeni", grams: 40, kcal: 188, protein: 2.8, source: "known" },
      { name: "", grams: 10, kcal: 10, protein: 1 },
      { name: "Hava", grams: 0, kcal: 0, protein: 0 },
      { name: "Saçma", grams: 100, kcal: 99999, protein: 1 },
    ],
    note: "Tereyağlı mıydı?",
  });
  assert.deepEqual(out, {
    items: [
      { name: "Mantı", grams: 250, kcal: 481, protein: 21, source: "estimate" },
      { name: "Albeni", grams: 40, kcal: 188, protein: 3, source: "known" },
    ],
    note: "Tereyağlı mıydı?",
  });
  assert.deepEqual(cleanEstimate(null), { items: [], note: "" });
});
