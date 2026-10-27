// palaz yemek tahmini: uygulama fotoğrafı ve/veya açıklamayı buraya yollar, Worker onu Cloudflare
// Workers AI'daki görsel okuyabilen bir modele sorar. Kullanıcı anahtar girmez; isteği sadece palaz'a
// Google ile girmiş biri atabilir (Firebase kimlik jetonu). Ücretsiz planın günlük sınırı
// (10.000 neuron) dolunca durur, para çıkmaz. Aynı yapı kervan'ın fatura okuyucusunda da var.
//
// İstek: POST { text, image (base64 JPEG), lang } + "Authorization: Bearer <Firebase ID token>"
// Cevap: { items: [{ name, grams, kcal, protein }], note } ya da { error: "auth" | "quota" | "bad" | "failed" }

const PROJECT = "palaz-95879";
const ORIGINS = ["https://palaz.web.app", "https://palaz-95879.web.app", "https://palaz-95879.firebaseapp.com", "http://localhost:5180"];
// İlki hata verirse (model kalkmış, geçici sorun) sıradakine geçilir. Paket fotoğraflarıyla
// denendi: ikisi de 1024 px besin tablosunu doğru okuyor, paket miktarında Qwen daha isabetli.
const MODELS = ["@cf/qwen/qwen3.8-27b", "@cf/meta/llama-4-scout-17b-16e-instruct"];
const MAX_IMAGE = 2_000_000; // base64 karakter; uygulama 1024 px JPEG yollar (~150 KB)
const JWKS = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const LANG_NAME = { tr: "Turkish", en: "English" };

// Modelden 100 g değerleri istenir, yenen miktarın hesabı burada yapılır: modeller çarpmada sık yanılıyor.
const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            grams: { type: "number" },
            kcal_per_100g: { type: "number" },
            protein_per_100g: { type: "number" },
            source: { type: "string", enum: ["label", "known", "estimate"] },
          },
          required: ["name", "grams", "kcal_per_100g", "protein_per_100g", "source"],
        },
      },
      note: { type: "string" },
    },
    required: ["items", "note"],
  },
};

// Kullanım çoğunlukla paketli ürün: paketin ön yüzü, besin tablosu ya da ikisi birden.
function prompt(text, lang) {
  return [
    "You log what someone in Turkey has just eaten, for a calorie and protein diary.",
    "Usually the photo shows a packaged food or drink: the front of the pack, its nutrition table, or both. Sometimes there is only a description, sometimes a meal.",
    "",
    "Packaged product (one item per product):",
    "- name: brand and product as printed, e.g. \"Ülker Albeni\" or \"Eti Cin\".",
    "- grams: net weight of one whole retail pack as sold (they ate the pack), unless the description says otherwise (half, 2 packs, 3 pieces).",
    "  If several packs are visible (a box of bars), it is still one pack. If the net weight is not visible, use the real usual weight",
    "  of one pack of that product; typical: chocolate or wafer bars 25-50 g, biscuit or cracker packs 40-150 g, chips 30-150 g, 1 can of drink 330 g.",
    "- If a nutrition table is readable: copy its per-100 g energy (kcal, not kJ) and protein exactly, source \"label\".",
    "- Else if you know this specific product: its typical per-100 g values, source \"known\".",
    "- Else: values of similar products, source \"estimate\".",
    "",
    "Meal or unpackaged food: one item per dish (a dish with its sauce is one item), source \"estimate\".",
    "Portions: a plate of a main dish 250-350 g; a whole Turkish bread 250 g, a slice 35 g; a bowl of yogurt or soup 200 g;",
    "a glass of a drink 200 g; a döner or dürüm 250-350 g; a simit 100 g; an egg 50 g. Account for oil or butter.",
    "",
    `Names in ${LANG_NAME[lang]} (keep brand names as they are). Prefer the description over the photo when they disagree.`,
    "If there is no food or drink, return an empty items list.",
    `note: one short sentence in ${LANG_NAME[lang]} only if something important is uncertain (for example the pack size), else an empty string.`,
    text ? `Description: ${text}` : "No description.",
  ].join("\n");
}

function messages({ text, image, lang }) {
  const content = [{ type: "text", text: prompt(text, lang) }];
  if (image) content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } });
  return [{ role: "user", content }];
}

// Model JSON'u bazen metin, bazen nesne olarak döndürür.
export function toItems(response) {
  let data = response;
  if (!data || typeof data !== "object") {
    const s = String(response ?? "");
    data = JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1));
  }
  const items = (Array.isArray(data.items) ? data.items : []).map((it) => ({
    name: it.name,
    grams: Number(it.grams),
    kcal: (Number(it.grams) * Number(it.kcal_per_100g)) / 100,
    protein: (Number(it.grams) * Number(it.protein_per_100g)) / 100,
    source: ["label", "known"].includes(it.source) ? it.source : "estimate",
  }));
  return { items, note: data.note || "" };
}

// ---- Firebase kimlik jetonu (RS256) ----

let keys = { at: 0, ttl: 0, list: [] };

async function googleKeys(fetcher) {
  if (Date.now() - keys.at < keys.ttl) return keys.list;
  const res = await fetcher(JWKS);
  if (!res.ok) throw new Error(`jwks ${res.status}`);
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  keys = { at: Date.now(), ttl: maxAge * 1000, list: (await res.json()).keys ?? [] };
  return keys.list;
}

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const json64 = (s) => JSON.parse(new TextDecoder().decode(b64url(s)));

// Geçerliyse kullanıcının uid'si, değilse null.
export async function verifyIdToken(token, { project = PROJECT, now = Date.now() / 1000, fetcher = fetch } = {}) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return null;
  let header, claims;
  try { header = json64(parts[0]); claims = json64(parts[1]); } catch { return null; }
  if (header.alg !== "RS256") return null;
  const jwk = (await googleKeys(fetcher)).find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(parts[2]), signed)) return null;
  const ok = claims.aud === project && claims.iss === `https://securetoken.google.com/${project}`
    && typeof claims.sub === "string" && claims.sub.length > 0
    && claims.exp > now && claims.iat <= now + 300;
  return ok ? claims.sub : null;
}

const isQuota = (err) => /neuron|daily|limit|429|4006/i.test(String(err?.message ?? err));

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const cors = {
      "access-control-allow-origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      vary: "origin",
    };
    const reply = (status, body) => Response.json(body, { status, headers: cors });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return reply(405, { error: "bad" });

    // ALLOW_ANON sadece "wrangler dev --var ALLOW_ANON:1" ile yerel denemede açılır.
    const idToken = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
    const uid = env.ALLOW_ANON === "1" ? "anon" : await verifyIdToken(idToken).catch(() => null);
    if (!uid) return reply(401, { error: "auth" });
    if (env.LIMITER && !(await env.LIMITER.limit({ key: uid })).success) return reply(429, { error: "quota" });

    const body = await request.json().catch(() => null);
    const text = String(body?.text ?? "").trim().slice(0, 300);
    const image = typeof body?.image === "string" && body.image.length < MAX_IMAGE ? body.image : null;
    const lang = body?.lang === "en" ? "en" : "tr";
    if (!text && !image) return reply(400, { error: "bad" });

    // Yerel denemede başka model denenebilir (ALLOW_ANON yayında kapalı).
    const models = env.ALLOW_ANON === "1" && body?.model ? [String(body.model)] : MODELS;
    let last;
    for (const model of models) {
      try {
        const out = await env.AI.run(model, {
          messages: messages({ text, image, lang }),
          response_format: RESPONSE_FORMAT,
          temperature: 0,
          max_tokens: 1500,
          // Qwen önce uzun uzun "düşünüyor" (30-110 sn); kapalıyken birkaç saniyede aynı değerleri okuyor.
          chat_template_kwargs: { enable_thinking: false },
          reasoning_effort: "low",
        });
        if (env.ALLOW_ANON === "1") console.log(model, JSON.stringify(out).slice(0, 600));
        return reply(200, toItems(out?.response ?? out?.choices?.[0]?.message?.content));
      } catch (err) {
        last = err;
        console.error(model, String(err?.message ?? err));
        if (isQuota(err)) break; // kota bütün modeller için ortak
      }
    }
    return isQuota(last) ? reply(429, { error: "quota" }) : reply(502, { error: "failed" });
  },
};
