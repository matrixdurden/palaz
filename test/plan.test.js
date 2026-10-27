import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MEALS, POOL, blankDay, dayTotals, bestCombos, applyCombo, variant, weightTrend,
  addDays, nextWorkoutType, lastSets, readyToProgress, PROGRAM,
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
