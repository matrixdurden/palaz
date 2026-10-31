import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MEALS, POOL, blankDay, dayTotals, bestCombos, applyCombo, variant, weightTrend,
  addDays, nextWorkoutType, lastSets, readyToProgress, PROGRAM,
  calcTargets, validProfile, scaleMeals, planTotals, sortMeals, bmi, bmiClass, weeksTo,
} from "../public/plan.js";

test("boş gün: plan tamamen yenirse hedefe yakın", () => {
  const t = dayTotals(blankDay(), true);
  assert.equal(t.k, 0);
  assert.ok(t.projK >= 2700 && t.projK <= 2900, `projK ${t.projK}`);
  assert.equal(t.any, false);
});

test("geçmiş gün: işaretlenmeyen öğün sayılmaz", () => {
  const day = { ...blankDay(), meals: { kahvalti: 1, ogle: 0.5 } };
  const t = dayTotals(day, false);
  assert.equal(t.k, 630 + 325);
  assert.equal(t.projK, t.k);
});

test("ekstra ve elle eklenenler toplanır", () => {
  const day = { ...blankDay(), extras: { sut: 2 }, custom: [{ name: "döner", k: 600, p: 30 }] };
  const t = dayTotals(day, false);
  assert.equal(t.k, 300 + 600);
  assert.equal(t.p, 16 + 30);
  assert.equal(t.any, true);
});

test("akşam hafifse gece smoothie önerilir", () => {
  const gece = MEALS.find((m) => m.id === "gece");
  assert.equal(variant(gece, { ...blankDay(), aksamTip: "hafif" }), "smoothie");
  assert.equal(variant(gece, blankDay()), "sut");
  assert.equal(variant(gece, { ...blankDay(), aksamTip: "hafif", geceTip: "sut" }), "sut");
});

test("öneriler eksiği kapatır ve birbiriyle çakışmaz", () => {
  for (const gap of [150, 400, 700, 1200]) {
    const combos = bestCombos(gap, 20);
    assert.ok(combos.length >= 1, `gap ${gap}`);
    for (const c of combos) assert.ok(c.k >= gap * 0.85);
    if (combos.length === 2) assert.ok(!combos[0].idx.some((i) => combos[1].idx.includes(i)));
  }
});

test("öneri günün eklerine işlenir", () => {
  const combo = { idx: [POOL.findIndex((o) => o.id === "fistikEkmek")] };
  assert.deepEqual(applyCombo({ ekmek: 1 }, combo), { ekmek: 3, fistik: 1 });
});

test("kilo eğilimi", () => {
  assert.equal(weightTrend([{ date: "2026-10-27", kg: 59.5 }]).kind, "none");
  assert.equal(weightTrend([{ date: "2026-10-27", kg: 59.5 }, { date: "2026-10-30", kg: 59.8 }]).kind, "start");
  assert.equal(weightTrend([{ date: "2026-10-27", kg: 59.5 }, { date: "2026-11-03", kg: 59.9 }]).kind, "good");
  assert.equal(weightTrend([{ date: "2026-10-27", kg: 59.5 }, { date: "2026-11-03", kg: 60.5 }]).kind, "fast");
  assert.equal(weightTrend([
    { date: "2026-10-27", kg: 59.5 }, { date: "2026-11-03", kg: 59.6 }, { date: "2026-11-10", kg: 59.6 },
  ]).kind, "stuck");
});

test("tarih ay sonunu geçer", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("antrenman A/B dönüşümlü", () => {
  assert.equal(nextWorkoutType({}, "2026-10-27"), "A");
  const days = { "2026-10-26": { workout: { type: "A", sets: { sinav: [12, 10, 9, 8] } } } };
  assert.equal(nextWorkoutType(days, "2026-10-27"), "B");
  assert.deepEqual(lastSets(days, "sinav", "2026-10-28").sets, [12, 10, 9, 8]);
  assert.equal(lastSets(days, "sinav", "2026-10-26"), null);
});

test("zorlaştırma: tüm setler aralığın üstünde", () => {
  const sinav = PROGRAM.A[0];
  assert.equal(readyToProgress(sinav, [20, 20, 20, 20]), true);
  assert.equal(readyToProgress(sinav, [20, 20, 19, 20]), false);
  assert.equal(readyToProgress(sinav, [20, 20, 20]), false);
});

const me = { sex: "m", age: 17, height: 170, weight: 60, activity: "mid", goal: "gain" };

test("hedef hesabı: Mifflin-St Jeor × hareket + hedef, 50'ye yuvarlı", () => {
  // bazal 1582,5 × 1,55 + 400 = 2853 → 2850; protein 60 × 1,8 = 108 → 110
  assert.deepEqual(calcTargets(me), { kcal: 2850, protein: 110 });
  assert.deepEqual(calcTargets({ ...me, sex: "f", goal: "keep", activity: "low" }), { kcal: 1950, protein: 95 });
});

test("profil sınırları", () => {
  assert.equal(validProfile(me), true);
  assert.equal(validProfile({ ...me, age: 12 }), false);
  assert.equal(validProfile({ ...me, sex: null }), false);
  assert.equal(validProfile({ ...me, height: Number.NaN }), false);
  assert.equal(validProfile(null), false);
  assert.equal(validProfile({ ...me, target: 70 }), true);
  assert.equal(validProfile({ ...me, target: 20 }), false);
});

test("her hareketin video sayfası var", () => {
  for (const ex of [...PROGRAM.A, ...PROGRAM.B]) assert.match(ex.video ?? "", /^[a-z0-9-]+$/, ex.id);
});

test("VKİ ve hedef kiloya kalan süre", () => {
  assert.equal(bmiClass(bmi({ height: 180, weight: 55 })), "under");
  assert.equal(bmiClass(bmi({ height: 180, weight: 70 })), "normal");
  assert.equal(bmiClass(bmi({ height: 170, weight: 80 })), "over");
  assert.equal(weeksTo(60, 65, 0.4), 13);
  assert.equal(weeksTo(66, 65, 0.4), 0);
  assert.equal(weeksTo(60, 65, 0), 0);
});

test("plan hedefe ölçeklenir; çok değişirse hazır içerik metni boşalır", () => {
  const near = scaleMeals(MEALS, { kcal: 2850, protein: 110 });
  assert.ok(Math.abs(planTotals(near).k - 2850) <= 30, `k ${planTotals(near).k}`);
  assert.equal(near[0].desc, undefined);

  const small = scaleMeals(MEALS, { kcal: 2000, protein: 95 });
  assert.ok(Math.abs(planTotals(small).k - 2000) <= 30, `k ${planTotals(small).k}`);
  assert.ok(Math.abs(planTotals(small).p - 95) <= 3, `p ${planTotals(small).p}`);
  assert.equal(small[0].desc, "");
  assert.ok(small.find((m) => m.id === "gece").variants.smoothie.k < 550);

  const own = scaleMeals([{ id: "x", time: "09:00", name: "Kahvaltı", desc: "yulaf", k: 1000, p: 50 }], { kcal: 2000, protein: 100 });
  assert.deepEqual(own[0], { id: "x", time: "09:00", name: "Kahvaltı", desc: "yulaf", k: 2000, p: 100 });
});

test("gün kendi öğün planıyla hesaplanır", () => {
  const meals = [{ id: "a", time: "08:00", k: 500, p: 20 }, { id: "b", time: "13:00", k: 700, p: 30 }];
  const t = dayTotals({ ...blankDay(), meals: { a: 1, kahvalti: 1 } }, true, meals);
  assert.equal(t.k, 500); // planda olmayan öğünün işareti sayılmaz
  assert.equal(t.projK, 1200);
  assert.deepEqual(sortMeals([meals[1], meals[0]]).map((m) => m.id), ["a", "b"]);
});
