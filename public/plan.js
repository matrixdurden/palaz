// Plan verisi ve hesaplar. DOM'a ve Firebase'e dokunmaz, test/plan.test.js ile test edilir.
// Ekranda görünen adlar ve açıklamalar i18n.js'de (meal.*, food.*, pool.*, ex.*).

export const DEFAULT_TARGETS = { kcal: 2800, protein: 110 };

export const MEALS = [
  { id: "kahvalti", time: "08:00", k: 630, p: 35 },
  { id: "ara", time: "11:00", k: 280, p: 7 },
  { id: "ogle", time: "13:30", k: 650, p: 25 },
  { id: "ikindi", time: "16:30", k: 380, p: 12 },
  { id: "aksam", time: "19:30", variants: { hafif: { k: 450, p: 15 }, doyurucu: { k: 650, p: 25 } } },
  { id: "gece", time: "22:30", variants: { smoothie: { k: 550, p: 20 }, sut: { k: 200, p: 8 } } },
];

export const FOODS = {
  sut: { k: 150, p: 8 },
  ayran: { k: 75, p: 4 },
  yumurta: { k: 75, p: 6 },
  ekmek: { k: 100, p: 3 },
  yogurt: { k: 100, p: 6 },
  peynir: { k: 80, p: 5 },
  muz: { k: 100, p: 1 },
  findik: { k: 180, p: 4 },
  fistik: { k: 95, p: 4 },
  simit: { k: 300, p: 9 },
  ton: { k: 170, p: 24 },
  zeytinyagi: { k: 120, p: 0 },
  smoothie: { k: 550, p: 20 },
};

const sumAdd = (add, field) => Object.entries(add).reduce((s, [id, n]) => s + FOODS[id][field] * n, 0);

// Eksik kaloriyi kapatmak için önerilebilecek ekler.
export const POOL = [
  { id: "smoothie", add: { smoothie: 1 } },
  { id: "fistikEkmek", add: { ekmek: 2, fistik: 1 } },
  { id: "sut", add: { sut: 1 } },
  { id: "yumurta2", add: { yumurta: 2 } },
  { id: "yogurt", add: { yogurt: 1 } },
  { id: "findik", add: { findik: 1 } },
  { id: "ton", add: { ton: 1 } },
  { id: "zeytinyagi", add: { zeytinyagi: 1 } },
].map((o) => ({ ...o, k: sumAdd(o.add, "k"), p: sumAdd(o.add, "p") }));

// Evde ekipmansız antrenman. Gün A ve B dönüşümlü yapılır.
export const PROGRAM = {
  A: [
    { id: "sinav", sets: 4, range: [8, 20], unit: "reps" },
    { id: "squat", sets: 4, range: [15, 25], unit: "reps" },
    { id: "masa", sets: 4, range: [8, 15], unit: "reps" },
    { id: "pike", sets: 3, range: [6, 12], unit: "reps" },
    { id: "plank", sets: 3, range: [30, 60], unit: "sec" },
  ],
  B: [
    { id: "dar", sets: 4, range: [8, 20], unit: "reps" },
    { id: "bulgar", sets: 3, range: [8, 12], unit: "reps" },
    { id: "canta", sets: 4, range: [10, 15], unit: "reps" },
    { id: "kopru", sets: 3, range: [15, 20], unit: "reps" },
    { id: "bacak", sets: 3, range: [10, 15], unit: "reps" },
  ],
};

// --- Tarih -----------------------------------------------------------------

const pad = (n) => String(n).padStart(2, "0");
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (key, n) => {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);

// --- Gün hesapları ---------------------------------------------------------

export function blankDay() {
  return { meals: {}, aksamTip: null, geceTip: null, extras: {}, custom: [], workout: null };
}

// Akşam ve gece öğününün hangi türü sayılacak. Gece seçilmediyse akşama göre önerilir.
export function variant(meal, day) {
  if (meal.id === "aksam") return day.aksamTip || "doyurucu";
  if (meal.id === "gece") return day.geceTip || ((day.aksamTip || "doyurucu") === "hafif" ? "smoothie" : "sut");
  return null;
}

export const mealValues = (meal, day) => (meal.variants ? meal.variants[variant(meal, day)] : meal);

export function hasData(day) {
  return Object.keys(day.meals || {}).length > 0
    || Object.values(day.extras || {}).some((n) => n > 0)
    || (day.custom || []).length > 0;
}

// k/p: yenen. projK/projP: işaretlenmemiş öğünler de yenirse (sadece bugün ve sonrası).
export function dayTotals(day, open) {
  let k = 0, p = 0, restK = 0, restP = 0;
  for (const meal of MEALS) {
    const v = mealValues(meal, day);
    const state = day.meals?.[meal.id];
    if (state == null) { restK += v.k; restP += v.p; } else { k += v.k * state; p += v.p * state; }
  }
  for (const [id, n] of Object.entries(day.extras || {})) {
    if (FOODS[id]) { k += FOODS[id].k * n; p += FOODS[id].p * n; }
  }
  for (const c of day.custom || []) { k += Number(c.k) || 0; p += Number(c.p) || 0; }
  return { k, p, projK: open ? k + restK : k, projP: open ? p + restP : p, any: hasData(day) };
}

// Eksiği en iyi kapatan, birbiriyle çakışmayan en fazla 2 öneri (her biri 1–3 ek).
export function bestCombos(gapK, gapP) {
  const all = [];
  const n = POOL.length;
  const consider = (idx) => {
    const k = idx.reduce((s, i) => s + POOL[i].k, 0);
    const p = idx.reduce((s, i) => s + POOL[i].p, 0);
    if (k < gapK * 0.85) return;
    const score = Math.abs(k - gapK) / 50 + (gapP > 0 ? Math.max(0, gapP - p) / 3 : 0) + idx.length * 0.6;
    all.push({ idx, k, p, score });
  };
  for (let a = 0; a < n; a++) {
    consider([a]);
    for (let b = a + 1; b < n; b++) {
      consider([a, b]);
      for (let c = b + 1; c < n; c++) consider([a, b, c]);
    }
  }
  all.sort((x, y) => x.score - y.score);
  const picked = [];
  for (const o of all) {
    if (picked.length === 2) break;
    if (!picked.some((q) => q.idx.some((i) => o.idx.includes(i)))) picked.push(o);
  }
  return picked;
}

// Seçilen önerinin eklerini günün extras alanına ekler.
export function applyCombo(extras, combo) {
  const out = { ...extras };
  for (const i of combo.idx) {
    for (const [id, n] of Object.entries(POOL[i].add)) out[id] = (out[id] || 0) + n;
  }
  return out;
}

// --- Kilo ------------------------------------------------------------------

// entries: [{ date, kg }] tarihe göre sıralı.
// Sonuç: { kind: "none" | "start" | "stuck" | "fast" | "good" | "slow", ... }
export function weightTrend(entries) {
  if (entries.length < 2) return { kind: "none" };
  const last = entries[entries.length - 1];
  const before = (days) => [...entries].reverse().find((e) => daysBetween(e.date, last.date) >= days);
  const ref14 = before(14);
  if (ref14 && last.kg - ref14.kg < 0.2) return { kind: "stuck", change: last.kg - ref14.kg };
  const ref7 = before(6);
  if (!ref7) return { kind: "start", change: last.kg - entries[0].kg, days: daysBetween(entries[0].date, last.date) };
  const perWeek = ((last.kg - ref7.kg) / daysBetween(ref7.date, last.date)) * 7;
  if (perWeek > 0.6) return { kind: "fast", perWeek };
  if (perWeek >= 0.2) return { kind: "good", perWeek };
  return { kind: "slow", perWeek };
}

// --- Antrenman -------------------------------------------------------------

// days: { tarih: gün } — en son yapılan antrenmanın tersi önerilir.
export function nextWorkoutType(days, today) {
  const last = Object.keys(days)
    .filter((d) => d < today && days[d]?.workout?.type)
    .sort()
    .pop();
  if (!last) return "A";
  return days[last].workout.type === "A" ? "B" : "A";
}

// Bir hareketin bu tarihten önceki son kaydı: { date, sets } ya da null.
export function lastSets(days, exerciseId, beforeDate) {
  const dates = Object.keys(days).filter((d) => d < beforeDate).sort().reverse();
  for (const d of dates) {
    const sets = days[d]?.workout?.sets?.[exerciseId];
    if (sets?.some((n) => n > 0)) return { date: d, sets };
  }
  return null;
}

// Bütün setlerde aralığın üstüne ulaşıldıysa zorlaştırma zamanı.
export function readyToProgress(exercise, sets) {
  const done = (sets || []).slice(0, exercise.sets);
  return done.length === exercise.sets && done.every((n) => n >= exercise.range[1]);
}
