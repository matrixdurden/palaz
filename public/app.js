// Giriş, sekmeler ve bütün ekranlar. Hesaplar plan.js'de, veri data.js'de, metinler i18n.js'de.

import {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { auth, DEMO } from "./firebase.js";
import * as data from "./data.js";
import {
  MEALS, FOODS, POOL, PROGRAM, PROFILE_LIMITS, blankDay, variant, mealValues, dayTotals, hasData, bestCombos, applyCombo,
  calcTargets, validProfile, scaleMeals, planTotals, sortMeals, bmi, bmiClass, weeksTo, GOAL_PACE, WEIGHT_LIMITS,
  weightTrend, nextWorkoutType, lastSets, readyToProgress, dateKey, parseKey, addDays,
} from "./plan.js";
import { isBarcode, scale, rescale } from "./nutrition.js";
import { t, has, lang, setLang, applyStatic, locale, fmt, kg } from "./i18n.js";
import { $, esc, toast, vibrate, store, theme, setTheme } from "./ui.js";
import "./install.js";

const { state } = data;
const today = () => dateKey(new Date());
let sel = today();
let tab = store.get("tab") || "today";
let user = null;
let fixOptions = [];

applyStatic();
markLang();

// --- Ekranlar ---------------------------------------------------------------

let screen = null; // "login" | "setup" | "app"; null: veri gelince karar verilecek (açılış ekranı görünür)

function show(name) {
  screen = name;
  $("#login").hidden = name !== "login";
  $("#setup").hidden = name !== "setup";
  $("#app").hidden = name !== "app";
  $("#loading").classList.toggle("fade", name !== null);
}

function setTab(name) {
  tab = name;
  store.set("tab", name);
  for (const id of ["today", "workout", "progress"]) $(`#tab-${id}`).hidden = id !== name;
  for (const b of document.querySelectorAll(".tabs button")) {
    if (b.dataset.tab === name) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
  render();
  scrollTo(0, 0);
}

function changed(event) {
  if (event === "error") toast(t("readFailed"));
  else if (event === "save-error") toast(t("saveFailed"));
  // İlk okuma bitince: profili olmayan ve hiç kaydı olmayan kişi kurulumdan başlar.
  // Profili olmayan eski kullanıcı doğrudan uygulamaya girer; hedefini Ayarlar'dan hesaplayabilir.
  if (screen === null && event === "error") {
    show("app"); // okunamadıysa açılış ekranında takılı kalmasın
    setTab(tab);
    return;
  }
  if (screen === null && state.ready) {
    if (!state.profile && !Object.values(state.days).some(hasData)) openSetup(false);
    else {
      show("app");
      setTab(tab);
    }
    return;
  }
  render();
}

// --- Gün düzenleme -----------------------------------------------------------

const day = (d) => state.days[d] || blankDay();

// Bugün ve sonrası güncel planla, geçmiş günler o gün geçerli olan planla hesaplanır
// (plan sonradan değişse de eski günlerin toplamı değişmesin).
const currentMeals = () => state.meals || MEALS;
const mealsOf = (d) => (d < today() && day(d).plan) || currentMeals();
const mealName = (m) => m.name || (has(`meal.${m.id}`) ? t(`meal.${m.id}`) : t("newMeal"));
const defaultDesc = (m, vr) => (m.id === "gece" ? t(`variant.${vr}.desc`) : has(`meal.${m.id}.desc`) ? t(`meal.${m.id}.desc`) : "");
const mealDesc = (m, vr) => m.desc ?? defaultDesc(m, vr);

function editDay(d, fn) {
  const copy = { ...blankDay(), ...structuredClone(day(d)) };
  if (d >= today() || !copy.plan) copy.plan = structuredClone(currentMeals());
  fn(copy);
  state.days[d] = copy;
  data.saveDay(d);
  render();
}

// --- Çizim -------------------------------------------------------------------

function render() {
  if ($("#app").hidden) return;
  renderHeader();
  if (tab === "today") renderToday();
  if (tab === "workout") renderWorkout();
  if (tab === "progress") renderProgress();
}

const longDate = (d) => parseKey(d).toLocaleDateString(locale(), { day: "numeric", month: "long", weekday: "long" });
const shortDate = (d) => parseKey(d).toLocaleDateString(locale(), { day: "numeric", month: "short" });
const share = (v, max) => Math.min(100, (v / max) * 100).toFixed(1);
const percent = (x) => new Intl.NumberFormat(locale(), { style: "percent", maximumFractionDigits: 0 }).format(Math.min(x, 9.99));

function renderHeader() {
  const now = today();
  const title = sel === now ? t("today") : sel === addDays(now, -1) ? t("yesterday")
    : sel === addDays(now, 1) ? t("tomorrow") : shortDate(sel);
  $("#day-label").innerHTML = `<strong>${esc(title)}</strong><small>${esc(longDate(sel))}</small>`;
  $("#next").disabled = sel >= addDays(now, 7);
}

function renderToday() {
  const d = sel, dy = day(d), T = state.targets, meals = mealsOf(d);
  const tot = dayTotals(dy, d >= today(), meals);
  $("#guide").hidden = store.get("guideDone") === "1";

  // Dış halka kalori, iç halka protein.
  const ring = (cls, r, v, max) => `
    <circle class="track ${cls}" cx="60" cy="60" r="${r}"/>
    ${v > 0 ? `<circle class="arc ${cls}" cx="60" cy="60" r="${r}" pathLength="100" stroke-dasharray="${share(v, max)} 100"/>` : ""}`;
  const stat = (cls, name, v, max, unit) => `<div class="stat ${cls}">
    <span class="label"><i></i>${name}</span>
    <b class="num">${fmt(v)}<small> / ${fmt(max)}${unit}</small></b>
    <span class="muted small">${v >= max ? t("goalReached") : t("toGo", { n: `${fmt(max - v)}${unit}` })}</span>
  </div>`;
  $("#summary").innerHTML = `
    <div class="summary">
      <div class="ring-box">
        <svg class="rings" viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <linearGradient id="grad-k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="stop-k1"/><stop offset="1" class="stop-k2"/></linearGradient>
            <linearGradient id="grad-p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="stop-p1"/><stop offset="1" class="stop-p2"/></linearGradient>
          </defs>
          ${ring("k", 52, tot.k, T.kcal)}
          ${ring("p", 38, tot.p, T.protein)}
        </svg>
        <div class="ring-center"><b class="num">${percent(tot.k / T.kcal)}</b><span>${t("ofGoal")}</span></div>
      </div>
      <div class="legend">
        ${stat("k", t("kcal"), tot.k, T.kcal, "")}
        ${stat("p", t("protein"), tot.p, T.protein, " g")}
      </div>
    </div>
    ${tot.projK > tot.k ? `<p class="muted small rest">${t("withRest", { k: fmt(tot.projK), p: fmt(tot.projP) })}</p>` : ""}`;

  renderFix(d, dy, tot, meals);

  $("#meals").innerHTML = meals.map((m) => {
    const st = dy.meals[m.id];
    const v = mealValues(m, dy);
    const vr = variant(m, dy);
    const name = mealName(m);
    const cls = st === 1 ? "full" : st === 0 ? "skip" : st === 0.5 ? "half" : "";
    const desc = mealDesc(m, vr);
    const variants = m.variants
      ? `<div class="seg soft" role="group" aria-label="${esc(name)}">${Object.keys(m.variants).map((key) =>
        `<button type="button" data-var="${m.id}:${key}" aria-pressed="${vr === key}">${t(`variant.${key}`)}</button>`).join("")}</div>`
      : "";
    const hint = m.id === "gece" && m.variants && !dy.geceTip && st == null
      ? `<p class="hint-line">${t((dy.aksamTip || "doyurucu") === "hafif" ? "hintSmoothie" : "hintMilk")}</p>`
      : "";
    return `<div class="meal ${cls}">
      <span class="time num">${m.time}</span>
      <div class="meal-body">
        <div class="meal-top"><strong>${esc(name)}</strong><span class="num muted small">${v.k} kcal · ${v.p} g</span></div>
        ${desc ? `<p class="muted small">${esc(desc)}</p>` : ""}
        ${variants}${hint}
        <div class="seg" role="group" aria-label="${esc(name)}">
          <button type="button" data-meal="${m.id}:0" aria-pressed="${st === 0}">${t("skipped")}</button>
          <button type="button" data-meal="${m.id}:0.5" aria-pressed="${st === 0.5}">${t("half")}</button>
          <button type="button" data-meal="${m.id}:1" aria-pressed="${st === 1}">${t("full")}</button>
        </div>
      </div>
    </div>`;
  }).join("");

  let extraK = 0;
  $("#extras").innerHTML = Object.entries(FOODS).map(([id, f]) => {
    const n = dy.extras?.[id] || 0;
    const label = t(`food.${id}`);
    extraK += f.k * n;
    return `<div class="chip ${n ? "on" : ""}">
      <span class="chip-name">${esc(label)}<small class="num">${f.k} kcal · ${f.p} g</small></span>
      <span class="chip-ctl">${n ? `<button type="button" data-ex="${id}:-1" aria-label="${esc(t("decrease", { x: label }))}">−</button><b class="num">${n}</b>` : ""}<button type="button" data-ex="${id}:1" aria-label="${esc(t("increase", { x: label }))}">+</button></span>
    </div>`;
  }).join("");
  extraK += (dy.custom || []).reduce((s, c) => s + (Number(c.k) || 0), 0);
  $("#extras-total").textContent = extraK ? `+${fmt(extraK)} kcal` : "";

  $("#custom-list").innerHTML = (dy.custom || []).map((c, i) => `<li>
    <span>${esc(c.name)}</span>
    <span class="num muted">${fmt(c.k)} kcal · ${fmt(c.p || 0)} g<button type="button" class="icon sm" data-delc="${i}" aria-label="${esc(`${t("delete")}: ${c.name}`)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>
  </li>`).join("");
}

function renderFix(d, dy, tot, meals) {
  const el = $("#fix"), T = state.targets;
  const past = d < today();
  const gapK = T.kcal - tot.projK, gapP = T.protein - tot.projP;
  const allSet = meals.every((m) => dy.meals[m.id] != null);
  el.classList.remove("ok");
  fixOptions = [];

  if (!tot.any) { el.hidden = true; return; }
  el.hidden = false;

  if (gapK <= 150 && gapP <= 10) {
    el.classList.add("ok");
    el.innerHTML = allSet || past
      ? `<h2>${t("goalDone")}</h2><p class="muted">${t("goalDoneText", { k: fmt(tot.k), p: fmt(tot.p) })}</p>`
      : `<h2>${t("onTrack")}</h2><p class="muted">${t("onTrackText")}</p>`;
    return;
  }
  if (past) {
    el.innerHTML = `<h2>${t("pastShort", { k: fmt(gapK) })}</h2><p class="muted">${t("pastShortText")}</p>`;
    return;
  }

  // Gece öğünü planda duruyorsa sütü smoothie yapmak en kolay telafi.
  const gece = meals.find((m) => m.id === "gece" && m.variants?.smoothie && m.variants?.sut);
  const canSwitch = Boolean(gece) && dy.meals.gece == null && variant(gece, dy) === "sut";
  // En fazla iki seçenek göster: ekran sade kalsın.
  fixOptions = bestCombos(Math.max(gapK, 0), gapP).slice(0, canSwitch ? 1 : 2);
  const why = tot.projK > tot.k ? t("gapWhyRest", { k: fmt(tot.projK) }) : t("gapWhyNow", { k: fmt(tot.k) });
  const title = gapP > 0 ? t("gapKP", { k: fmt(Math.max(gapK, 0)), p: fmt(gapP) }) : t("gapK", { k: fmt(Math.max(gapK, 0)) });
  const smoothie = gece?.variants.smoothie, milk = gece?.variants.sut;
  el.innerHTML = `
    <h2>${title}</h2>
    <p class="muted">${why} ${t("gapPick")}</p>
    ${canSwitch ? `<div class="opt"><div><strong>${t("switchSmoothie")}</strong><span class="num small">+${smoothie.k - milk.k} kcal · +${smoothie.p - milk.p} g</span></div><button type="button" class="ink small" data-switch>${t("switchBtn")}</button></div>` : ""}
    ${fixOptions.map((o, i) => `<div class="opt">
      <div><ul>${o.idx.map((j) => `<li>${t(`pool.${POOL[j].id}`)}</li>`).join("")}</ul><span class="num small">+${fmt(o.k)} kcal · +${fmt(o.p)} g</span></div>
      <button type="button" class="ink small" data-opt="${i}">${t("ateIt")}</button>
    </div>`).join("")}`;
}

// --- Ne yedin? (fotoğraf, barkod, yazı) ---------------------------------------

// null | { busy } | { error } | { product, grams } | { items: [{ name, grams, kcal, protein, g }], note }
// Hepsinde isteğe bağlı image: fotoğrafın küçük hali.
let scan = null;
let scanRun = 0; // eski bir isteğin sonucu yenisinin üstüne yazmasın
const loadScan = () => import("./scan.js"); // yapay zekâ kütüphanesi sadece kullanılınca yüklenir

function setScan(next) {
  scan = next;
  renderScan();
}

const scanActions = () => `<div class="row end">
  <button type="button" class="ghost small" data-scan="cancel">${t("cancel")}</button>
  <button type="button" class="ink small" data-scan="add">${t("addToday")}</button>
</div>`;

// ½ / 1 / 2 paket (ya da porsiyon): ilk okunan miktarın katları.
const portions = (key, unit) => `<div class="portions" role="group">${[0.5, 1, 2].map((f) =>
  `<button type="button" data-portion="${key}:${f}" aria-pressed="${f === 1}">${f === 0.5 ? "½" : f} ${unit}</button>`).join("")}</div>`;

const badge = (source) => `<span class="badge ${source}">${t(`src.${source}`)}</span>`;

const gramsInput = (key, value, name) => `<label class="grams">
  <input class="num" type="number" inputmode="numeric" min="0" max="2000" data-grams="${key}" value="${value}" aria-label="${esc(t("gramsLabel", { x: name }))}"><span>${t("grams")}</span>
</label>`;

function renderScan() {
  const el = $("#scan-result");
  $("#scan-ask").disabled = Boolean(scan?.busy);
  $("#scan-camera").disabled = Boolean(scan?.busy);
  if (!scan) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  const thumb = scan.image ? `<img class="thumb" src="${scan.image}" alt="">` : "";
  if (scan.busy) {
    el.innerHTML = `<div class="scan-status">${thumb}<span class="spinner" aria-hidden="true"></span><span>${esc(scan.busy)}</span></div>`;
  } else if (scan.error) {
    el.innerHTML = `<div class="scan-status">${thumb}<span>${esc(scan.error)}</span></div>
      <div class="row end"><button type="button" class="ghost small" data-scan="cancel">${t("close")}</button></div>`;
  } else if (scan.product) {
    const pr = scan.product;
    el.innerHTML = `<div class="scan-status">${thumb}<div><strong>${esc(pr.name)}</strong> ${badge("barcode")}
      <p class="muted small">${t("scanPer100", { k: fmt(pr.kcal100), p: fmt(pr.protein100) })}</p></div></div>
      <div class="scan-item">${gramsInput("product", scan.grams, pr.name)}<span class="num" data-out="0"></span></div>
      ${portions("product", t("pack"))}
      <p class="muted small">${t("scanSource")}</p>
      ${scanActions()}`;
  } else {
    const estimated = scan.items.some((it) => it.source === "estimate");
    el.innerHTML = `${thumb ? `<div class="scan-status">${thumb}</div>` : ""}
      ${scan.items.map((it, i) => `<div class="scan-item">
        <span class="scan-name">${esc(it.name)} ${badge(it.source)}</span>
        ${gramsInput(i, it.g, it.name)}
        <span class="num" data-out="${i}"></span>
        <button type="button" class="icon sm" data-scan="del" data-i="${i}" aria-label="${esc(`${t("delete")}: ${it.name}`)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        ${portions(i, t(it.source === "estimate" ? "portion" : "pack"))}
      </div>`).join("")}
      ${scan.note ? `<p class="hint-line">${esc(scan.note)}</p>` : ""}
      ${estimated ? `<p class="muted small">${t("scanEstimate")}</p>` : ""}
      ${scanActions()}`;
  }
  updateScanTotals();
}

// Ekranda seçili gramlara göre eklenecek kalemler.
function scanValues() {
  if (scan?.product) {
    const pr = scan.product;
    return [{ name: pr.name, k: Math.round(scale(pr.kcal100, scan.grams)), p: Math.round(scale(pr.protein100, scan.grams)), src: "barcode" }];
  }
  return (scan?.items || []).map((it) => ({ name: it.name, ...rescale(it, it.g), src: "ai" }));
}

function updateScanTotals() {
  const values = scanValues();
  for (const out of document.querySelectorAll("#scan-result [data-out]")) {
    const v = values[Number(out.dataset.out)];
    out.textContent = v ? `${fmt(v.k)} kcal · ${fmt(v.p)} g` : "";
  }
}

async function runProduct(code, image) {
  const run = ++scanRun;
  setScan({ busy: t("scanBarcode", { c: code }), image: image?.dataUrl });
  try {
    const { lookupBarcode } = await loadScan();
    const product = await lookupBarcode(code, lang);
    if (run !== scanRun) return;
    if (product) setScan({ product, grams: product.grams, image: image?.dataUrl });
    else if (image) runEstimate({ text: $("#scan-text").value.trim(), image, busy: t("scanNotInDb") });
    else setScan({ error: t("scanNotFound") });
  } catch {
    if (run === scanRun) setScan({ error: t("offFailed"), image: image?.dataUrl });
  }
}

async function runEstimate({ text, image, busy = t("scanLooking") }) {
  const run = ++scanRun;
  setScan({ busy, image: image?.dataUrl });
  try {
    const { estimateFood } = await loadScan();
    const res = await estimateFood({ text, image, lang });
    if (run !== scanRun) return;
    if (!res.items.length) setScan({ error: t("scanNothing"), image: image?.dataUrl });
    else setScan({ items: res.items.map((it) => ({ ...it, g: it.grams })), note: res.note, image: image?.dataUrl });
  } catch (err) {
    if (run === scanRun) setScan({ error: t(err.code === "quota" ? "aiQuota" : "aiFailed"), image: image?.dataUrl });
  }
}

$("#scan-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("#scan-text").value.trim();
  if (!text || scan?.busy) return;
  $("#scan-text").blur();
  if (isBarcode(text)) runProduct(text);
  else runEstimate({ text });
});

$("#scan-camera").addEventListener("click", () => $("#scan-photo").click());

// Fotoğrafta barkod varsa ürün veritabanına, yoksa yapay zekâya (yazılan açıklamayla birlikte) gider.
$("#scan-photo").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  const run = ++scanRun;
  setScan({ busy: t("scanLooking") });
  try {
    const { loadImage, findBarcode } = await loadScan();
    const image = await loadImage(file);
    const code = await findBarcode(image.bitmap);
    if (run !== scanRun) return;
    if (code && isBarcode(code)) runProduct(code, image);
    else runEstimate({ text: $("#scan-text").value.trim(), image });
  } catch {
    if (run === scanRun) setScan({ error: t("aiFailed") });
  }
});

function setScanGrams(key, g) {
  if (key === "product") scan.grams = g;
  else scan.items[Number(key)].g = g;
  const base = key === "product" ? scan.product.grams : scan.items[Number(key)].grams;
  for (const b of document.querySelectorAll(`#scan-result [data-portion^="${key}:"]`)) {
    b.setAttribute("aria-pressed", String(Math.round(base * Number(b.dataset.portion.split(":")[1])) === g));
  }
  updateScanTotals();
}

$("#scan-result").addEventListener("input", (e) => {
  const input = e.target.closest("input[data-grams]");
  if (!input || !scan) return;
  setScanGrams(input.dataset.grams, Math.max(0, Math.min(2000, parseInt(input.value, 10) || 0)));
});

$("#scan-result").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-portion]");
  if (!b || !scan) return;
  const [key, f] = b.dataset.portion.split(":");
  const base = key === "product" ? scan.product.grams : scan.items[Number(key)].grams;
  const g = Math.round(base * Number(f));
  $(`#scan-result input[data-grams="${key}"]`).value = g;
  setScanGrams(key, g);
});

function addScan() {
  const values = scanValues().filter((v) => v.k > 0);
  if (!values.length) return;
  editDay(sel, (dy) => { dy.custom = [...(dy.custom || []), ...values]; });
  toast(t("scanAdded", { n: values.length }));
  $("#scan-text").value = "";
  scanRun++;
  setScan(null);
}

// --- Antrenman ---------------------------------------------------------------

const hasSets = (w) => Object.values(w?.sets || {}).some((s) => s.some((n) => n > 0));
const workoutType = (d) => day(d).workout?.type || nextWorkoutType(state.days, d);

function renderWorkout() {
  // Bir set kutusuna yazılırken ekranı yeniden çizme; odak kaybolmasın.
  if (document.activeElement?.closest?.("#exercises")) return;
  const d = sel, type = workoutType(d), w = day(d).workout;
  for (const b of $("#workout-type").children) b.setAttribute("aria-pressed", String(b.dataset.type === type));

  const count = Array.from({ length: 7 }, (_, i) => addDays(today(), -i)).filter((x) => hasSets(day(x).workout)).length;
  $("#workout-week").textContent = t("workoutsLast7", { n: count });
  $("#workout-hint").textContent = hasSets(w) ? t("workoutSaved") : t("workoutNext", { x: type });

  $("#exercises").innerHTML = PROGRAM[type].map((ex) => {
    const sets = w?.sets?.[ex.id] || [];
    const prev = lastSets(state.days, ex.id, d);
    const note = has(`ex.${ex.id}.note`) ? `<p class="muted small">${t(`ex.${ex.id}.note`)}</p>` : "";
    return `<section class="card exercise">
      <div class="card-head"><h3>${t(`ex.${ex.id}`)}</h3><span class="num muted small">${ex.sets} × ${ex.range[0]}–${ex.range[1]} ${t(ex.unit)}</span></div>
      ${note}
      <a class="video-link" href="https://musclewiki.com/exercise/${ex.video}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/></svg>${t("watchVideo")}</a>
      <div class="sets">${Array.from({ length: ex.sets }, (_, i) => `
        <label><span class="label">${t("set", { n: i + 1 })}</span>
        <input class="num" type="number" inputmode="numeric" min="0" max="300" data-set="${ex.id}:${i}" value="${sets[i] ?? ""}" placeholder="${prev?.sets?.[i] ?? ""}"></label>`).join("")}
      </div>
      <p class="muted small">${prev
        ? esc(t("lastTime", { d: shortDate(prev.date), s: prev.sets.filter((n) => n > 0).join(" · ") }))
        : t("firstTime")}</p>
      <p class="hint-line" ${readyToProgress(ex, sets) ? "" : "hidden"}>${t("harder", { x: t(`ex.${ex.id}.harder`) })}</p>
    </section>`;
  }).join("");
}

$("#workout-type").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-type]");
  if (!b) return;
  // A ve B'nin hareketleri farklı; girilen setler türü değiştirince kaybolmaz.
  editDay(sel, (dy) => { dy.workout = { type: b.dataset.type, sets: dy.workout?.sets || {} }; });
});

$("#exercises").addEventListener("input", (e) => {
  const input = e.target.closest("input[data-set]");
  if (!input) return;
  const [exId, i] = input.dataset.set.split(":");
  const n = parseInt(input.value, 10);
  const d = sel, type = workoutType(d);
  const dy = { ...blankDay(), ...structuredClone(day(d)) };
  if (dy.workout?.type !== type) dy.workout = { type, sets: dy.workout?.sets || {} };
  const sets = dy.workout.sets[exId] || [];
  sets[+i] = Number.isNaN(n) ? null : Math.max(0, Math.min(300, n));
  dy.workout.sets[exId] = Array.from({ length: Math.max(sets.length, +i + 1) }, (_, k) => sets[k] ?? null);
  state.days[d] = dy;
  data.saveDay(d);
  // Sadece bu hareketin "zorlaştır" satırını güncelle.
  const ex = PROGRAM[type].find((x) => x.id === exId);
  input.closest(".exercise").querySelector(".hint-line").hidden = !readyToProgress(ex, dy.workout.sets[exId]);
});

$("#exercises").addEventListener("focusout", () => {
  // Kutudan çıkınca (başka kutuya geçmiyorsa) özeti tazele.
  setTimeout(() => { if (!document.activeElement?.closest?.("#exercises")) renderWorkout(); }, 0);
});

// --- İlerleme ----------------------------------------------------------------

function renderProgress() {
  const T = state.targets, now = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(now, i - 6));
  const eaten = (d) => dayTotals(day(d), false, mealsOf(d));

  $("#week").innerHTML = days.map((d) => {
    const tot = eaten(d);
    const ratio = tot.k / T.kcal;
    let cls = "";
    // Bugün henüz bitmedi: hedefe ulaşmadıysa kırmızı yerine nötr kalır.
    if (tot.any && (d < now || ratio >= 0.9)) cls = ratio >= 0.9 ? "good" : ratio >= 0.7 ? "warn" : "bad";
    const wd = parseKey(d).toLocaleDateString(locale(), { weekday: "short" });
    return `<button type="button" class="wd ${d === sel ? "sel" : ""}" data-go="${d}" aria-label="${esc(longDate(d))}">
      <span class="dot ${cls} ${d === now ? "today" : ""} num">${tot.any ? Math.round(ratio * 100) : "–"}</span>
      <span>${esc(wd)}</span>
    </button>`;
  }).join("");

  const past = days.slice(0, 6).filter((d) => eaten(d).any);
  const hit = past.filter((d) => eaten(d).k >= T.kcal * 0.9).length;
  const avg = past.length ? past.reduce((s, d) => s + eaten(d).k, 0) / past.length : 0;
  let streak = eaten(now).k >= T.kcal * 0.9 ? 1 : 0;
  for (let d = addDays(now, -1), i = 0; i < 365; d = addDays(d, -1), i++) {
    const tot = eaten(d);
    if (tot.any && tot.k >= T.kcal * 0.9) streak++;
    else break;
  }
  const workouts = days.filter((d) => hasSets(day(d).workout)).length;
  $("#week-stats").innerHTML = `
    <div><span class="label">${t("streak")}</span><b class="num">${t("streakVal", { n: streak })}</b><span class="muted small">${t("streakSub")}</span></div>
    <div><span class="label">${t("average")}</span><b class="num">${past.length ? fmt(avg) : "–"}</b><span class="muted small">${t("averageSub", { h: hit, n: past.length })}</span></div>
    <div><span class="label">${t("workouts")}</span><b class="num">${workouts}/7</b><span class="muted small">${t("workoutsSub")}</span></div>`;

  renderWeight();
}

function renderWeight() {
  const entries = Object.entries(state.weights)
    .map(([date, w]) => ({ date, kg: Number(w.kg) }))
    .filter((e) => e.kg > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  $("#weight-date").textContent = longDate(sel);
  $("#weight-save").textContent = state.weights[sel] ? t("update") : t("save");
  if (document.activeElement !== $("#weight-input")) {
    $("#weight-input").value = state.weights[sel] ? kg(state.weights[sel].kg) : "";
  }

  $("#weight-list").innerHTML = entries.slice(-8).reverse().map((e) => `<li>
    <span>${esc(shortDate(e.date))}</span>
    <span class="num">${kg(e.kg)} kg<button type="button" class="icon sm" data-delw="${e.date}" aria-label="${esc(`${t("delete")}: ${shortDate(e.date)}`)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span>
  </li>`).join("");

  const tr = weightTrend(entries);
  const sign = (n) => (n >= 0 ? "+" : "−") + kg(Math.abs(n));
  const notes = {
    none: `<p class="muted small">${t("trendNone")}</p>`,
    start: `<div class="note">${t("trendStart", { c: sign(tr.change), d: tr.days })}</div>`,
    good: `<div class="note">${t("trendGood", { c: sign(tr.perWeek) })}</div>`,
    slow: `<div class="note warn">${t("trendSlow", { c: sign(tr.perWeek) })}</div>`,
    fast: `<div class="note warn"><span>${t("trendFast", { c: sign(tr.perWeek) })}</span><button type="button" class="ghost" data-bump="-200">−200 kcal</button></div>`,
    stuck: `<div class="note warn"><span>${t("trendStuck")}</span><button type="button" class="ink" data-bump="200">+200 kcal</button></div>`,
  };
  $("#weight-note").innerHTML = notes[tr.kind];
  $("#weight-chart").innerHTML = entries.length >= 2 ? weightChart(entries) : "";
  renderWeightGoal(entries, tr);
}

// Hedef kilo girildiyse: kalan kilo, ilerleme çubuğu ve bu hızla kaç hafta.
function renderWeightGoal(entries, tr) {
  const pr = state.profile, el = $("#weight-goal");
  if (!pr?.target || pr.goal === "keep") {
    el.innerHTML = "";
    return;
  }
  // Başlangıç: kurulumda girilen kilo ya da ilk tartı (aynı gün güncellenen tartı başlangıcı kaydırmasın).
  const start = entries.length ? Math.min(entries[0].kg, pr.weight) : pr.weight;
  const now = entries.length ? entries[entries.length - 1].kg : pr.weight;
  const left = Math.round((pr.target - now) * 10) / 10;
  if (left <= 0) {
    el.innerHTML = `<div class="note">${t("targetDone", { t: kgn(pr.target) })}</div>`;
    return;
  }
  const pace = ["good", "fast"].includes(tr.kind) ? tr.perWeek : GOAL_PACE[pr.goal];
  const span = pr.target - start;
  const done = span > 0 ? Math.max(0, Math.min(100, ((now - start) / span) * 100)) : 0;
  el.innerHTML = `<div class="goal-line">
      <strong>${t("targetLeft", { t: kgn(pr.target), r: kgn(left) })}</strong>
      <span class="muted small">${t("targetEta", { n: weeksTo(now, pr.target, pace) })}</span>
    </div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(done)}"><i style="width:${done.toFixed(1)}%"></i></div>`;
}

function weightChart(entries) {
  const W = 340, H = 160, L = 30, R = 10, Tp = 10, B = 24;
  const t0 = parseKey(entries[0].date).getTime();
  const t1 = parseKey(entries[entries.length - 1].date).getTime();
  const lo = Math.floor(Math.min(...entries.map((e) => e.kg)) - 0.5);
  const hi = Math.ceil(Math.max(...entries.map((e) => e.kg)) + 0.5);
  const x = (time) => L + (t1 === t0 ? 0 : (time - t0) / (t1 - t0)) * (W - L - R);
  const y = (v) => Tp + (1 - (v - lo) / (hi - lo)) * (H - Tp - B);
  const step = hi - lo <= 4 ? 1 : 2;
  const ticks = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  const pts = entries.map((e) => [x(parseKey(e.date).getTime()), y(e.kg)]);
  const line = pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const base = (H - B).toFixed(1);
  const [lx, ly] = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t("weightChart"))}">
    ${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
    <polygon points="${pts[0][0].toFixed(1)},${base} ${line} ${lx.toFixed(1)},${base}" class="area"/>
    <polyline points="${line}" class="line"/>
    ${pts.map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3" class="pt"/>`).join("")}
    <circle cx="${lx}" cy="${ly}" r="6" class="end"/>
    <text x="${L}" y="${H - 6}">${esc(shortDate(entries[0].date))}</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(shortDate(entries[entries.length - 1].date))}</text>
  </svg>`;
}

// --- Olaylar -----------------------------------------------------------------

document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = sel;
  if (b.dataset.meal) {
    const [id, v] = b.dataset.meal.split(":");
    vibrate();
    editDay(d, (dy) => {
      const n = Number(v);
      if (dy.meals[id] === n) delete dy.meals[id];
      else dy.meals[id] = n;
    });
  } else if (b.dataset.var) {
    const [id, key] = b.dataset.var.split(":");
    editDay(d, (dy) => { if (id === "aksam") dy.aksamTip = key; else dy.geceTip = key; });
  } else if (b.dataset.ex) {
    const [id, n] = b.dataset.ex.split(":");
    vibrate();
    editDay(d, (dy) => {
      const v = Math.max(0, (dy.extras[id] || 0) + Number(n));
      if (v) dy.extras[id] = v;
      else delete dy.extras[id];
    });
  } else if (b.dataset.delc != null) {
    editDay(d, (dy) => { dy.custom.splice(Number(b.dataset.delc), 1); });
  } else if (b.dataset.opt != null) {
    const combo = fixOptions[Number(b.dataset.opt)];
    if (!combo) return;
    editDay(d, (dy) => { dy.extras = applyCombo(dy.extras, combo); });
    toast(t("added"));
  } else if (b.hasAttribute("data-switch")) {
    editDay(d, (dy) => { dy.geceTip = "smoothie"; });
  } else if (b.dataset.go) {
    sel = b.dataset.go;
    render();
  } else if (b.dataset.delw) {
    data.deleteWeight(b.dataset.delw);
    render();
    toast(t("weightDeleted"));
  } else if (b.dataset.bump) {
    setTargets(state.targets.kcal + Number(b.dataset.bump), state.targets.protein);
    toast(t("goalChanged", { k: fmt(state.targets.kcal) }));
  } else if (b.dataset.scan === "add") {
    addScan();
  } else if (b.dataset.scan === "cancel") {
    scanRun++;
    setScan(null);
  } else if (b.dataset.scan === "del") {
    scan.items.splice(Number(b.dataset.i), 1);
    setScan(scan.items.length ? scan : null);
  } else if (b.dataset.tab) {
    setTab(b.dataset.tab);
  } else if (b.dataset.lang) {
    setLang(b.dataset.lang);
    markLang();
    renderSettings();
    render();
    renderScan();
  } else if (b.dataset.themeMode) {
    setTheme(b.dataset.themeMode);
    renderSettings();
  }
});

$("#prev").addEventListener("click", () => { sel = addDays(sel, -1); render(); });
$("#next").addEventListener("click", () => { sel = addDays(sel, 1); render(); });
$("#day-label").addEventListener("click", () => { sel = today(); render(); });

$("#custom-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#c-name").value.trim();
  const k = parseInt($("#c-k").value, 10);
  const p = parseInt($("#c-p").value, 10) || 0;
  if (!name || Number.isNaN(k)) return;
  editDay(sel, (dy) => { dy.custom = [...(dy.custom || []), { name, k, p }]; });
  e.target.reset();
});

$("#weight-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const value = Math.round(parseFloat($("#weight-input").value.replace(",", ".")) * 10) / 10;
  const [lo, hi] = WEIGHT_LIMITS;
  if (!(value >= lo && value <= hi)) {
    toast(t("weightRange", { a: lo, b: hi }));
    return;
  }
  state.weights[sel] = { kg: value };
  data.saveWeight(sel);
  $("#weight-input").blur();
  render();
  toast(t("weightSaved"));
});

// --- Plan değişikliği ----------------------------------------------------------

// Yeni öğün planına geçer. Kaydı olup planı saklanmamış geçmiş günler eski planı saklar,
// bugün ve sonrası yeni plana geçer.
function replan(next) {
  const old = currentMeals(), now = today();
  for (const [d, dy] of Object.entries(state.days)) {
    if (d < now) {
      if (dy.plan || !hasData(dy)) continue;
      dy.plan = structuredClone(old);
    } else if (dy.plan) {
      dy.plan = structuredClone(next);
    } else continue;
    data.saveDay(d);
  }
  state.meals = next;
}

// --- Kurulum -------------------------------------------------------------------

let setup = null; // { sex, activity, goal, edit }

function openSetup(edit) {
  const pr = state.profile || {};
  setup = { sex: pr.sex || null, activity: pr.activity || "mid", goal: pr.goal || "gain", edit };
  $("#setup-age").value = pr.age ?? "";
  $("#setup-height").value = pr.height ?? "";
  $("#setup-weight").value = pr.weight != null ? pr.weight.toLocaleString(locale()) : "";
  $("#setup-target").value = pr.target != null ? pr.target.toLocaleString(locale()) : "";
  $("#setup-rescale").checked = true;
  $("#setup-rescale-row").hidden = !edit;
  $("#setup-cancel").hidden = !edit;
  $("#setup-submit").textContent = t(edit ? "save" : "setupStart");
  show("setup");
  scrollTo(0, 0);
  renderSetup();
}

function readProfile() {
  const num = (id) => parseFloat($(id).value.replace(",", "."));
  const pr = {
    sex: setup.sex,
    age: Math.round(num("#setup-age")),
    height: Math.round(num("#setup-height")),
    weight: Math.round(num("#setup-weight") * 10) / 10,
    activity: setup.activity,
    goal: setup.goal,
  };
  // Hedef kilo isteğe bağlı; boşsa alan hiç yazılmaz (Firestore undefined kabul etmiyor).
  const target = Math.round(num("#setup-target") * 10) / 10;
  if (setup.goal !== "keep" && target > 0) pr.target = target;
  return pr;
}

const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const kgn = (n) => n.toLocaleString(locale(), { maximumFractionDigits: 1 }); // 66 kg, 65,5 kg

function renderSetup() {
  for (const [id, key] of [["#setup-sex", "sex"], ["#setup-activity", "activity"], ["#setup-goal", "goal"]]) {
    for (const b of $(id).children) b.setAttribute("aria-pressed", String(b.dataset.v === setup[key]));
  }
  $("#setup-activity-hint").textContent = t(`act.${setup.activity}.hint`);
  $("#setup-goal-hint").textContent = t(`goal.${setup.goal}.hint`);
  $("#setup-target-row").hidden = setup.goal === "keep";
  const pr = readProfile();

  // Boy ve kilo girilince VKİ; yetişkin ölçeği olduğu için 18 yaş altında gösterilmez.
  const bmiEl = $("#setup-bmi");
  bmiEl.hidden = !(inRange(pr.height, PROFILE_LIMITS.height) && inRange(pr.weight, PROFILE_LIMITS.weight) && !(pr.age < 18));
  if (!bmiEl.hidden) {
    const b = Math.round(bmi(pr) * 10) / 10, c = bmiClass(b); // ekrandaki sayıyla aynı sınıf
    bmiEl.textContent = t("bmiLine", { b: kg(b), c: t(`bmi.${c}`) })
      + (["over", "obese"].includes(c) && setup.goal !== "keep" ? ` ${t("bmiGainWarn")}` : "");
  }

  const targetLow = pr.target != null && pr.weight > 0 && pr.target <= pr.weight;
  const ok = validProfile(pr) && !targetLow;
  $("#setup-submit").disabled = !ok;
  if (ok) {
    const T = calcTargets(pr), pace = GOAL_PACE[pr.goal];
    const eta = pace && pr.target ? ` ${t("setupEta", { t: kgn(pr.target), n: weeksTo(pr.weight, pr.target, pace) })}` : "";
    $("#setup-result").innerHTML = `<span class="label">${t("setupResult")}</span>
      <div class="setup-nums"><b class="num k">${fmt(T.kcal)}<small> kcal</small></b><b class="num p">${fmt(T.protein)}<small> ${t("proteinUnit")}</small></b></div>
      ${pace ? `<p class="muted small">${t("setupPace", { w: kg(pace) })}${eta}</p>` : ""}`;
    return;
  }
  const filled = ["#setup-age", "#setup-height", "#setup-weight"].every((id) => $(id).value.trim());
  const range = (key) => PROFILE_LIMITS[key].join("–");
  $("#setup-result").innerHTML = `<p class="muted small">${targetLow ? t("targetLow")
    : filled && setup.sex ? t("setupInvalid", { a: range("age"), h: range("height"), w: range("weight") })
      : t("setupNeed")}</p>`;
}

$("#setup").addEventListener("click", (e) => {
  const b = e.target.closest(".seg button[data-v]");
  if (!b) return;
  setup[{ "setup-sex": "sex", "setup-activity": "activity", "setup-goal": "goal" }[b.parentElement.id]] = b.dataset.v;
  renderSetup();
});
$("#setup-form").addEventListener("input", () => renderSetup());

$("#setup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const pr = readProfile();
  if (!validProfile(pr)) return;
  const targets = calcTargets(pr);
  const { edit } = setup;
  state.profile = pr;
  state.targets = targets;
  if (!edit) replan(scaleMeals(MEALS, targets));
  else if ($("#setup-rescale").checked) replan(scaleMeals(currentMeals(), targets));
  // İlk kurulumda girilen kilo, tartı listesinin ilk kaydı olur.
  const now = today();
  if (!edit && !state.weights[now] && inRange(pr.weight, WEIGHT_LIMITS)) {
    state.weights[now] = { kg: pr.weight };
    data.saveWeight(now);
  }
  data.saveUser();
  setup = null;
  show("app");
  setTab(edit ? tab : "today");
  toast(t("setupDone", { k: fmt(targets.kcal), p: fmt(targets.protein) }));
});

$("#setup-cancel").addEventListener("click", () => {
  setup = null;
  show("app");
  setTab(tab);
});

// --- Öğün planı düzenleme ------------------------------------------------------

const MAX_MEALS = 10;
let draft = []; // düzenlenen plan; ekrandaki ad ve içerik metinleriyle

const toDraft = (m) => ({
  ...structuredClone(m),
  name: mealName(m),
  desc: m.variants ? m.desc ?? "" : mealDesc(m), // değişkenli öğünde boş = türe göre hazır metin
});

// Varsayılandan farkı olmayan ad ve içerik saklanmaz; dil değişince i18n metni gelsin.
function fromDraft(m) {
  const out = { id: m.id, time: /^\d{2}:\d{2}$/.test(m.time) ? m.time : "12:00" };
  if (m.variants) out.variants = m.variants;
  else Object.assign(out, { k: m.k, p: m.p });
  const name = m.name.trim(), desc = m.desc.trim();
  const defName = has(`meal.${m.id}`) ? t(`meal.${m.id}`) : "";
  if (name && name !== defName) out.name = name;
  else if (!defName) out.name = t("newMeal");
  if (m.variants ? desc : desc !== defaultDesc(m)) out.desc = desc;
  return out;
}

const valuesRow = (key, v, label) => `<div class="vals">
  ${label ? `<span class="muted small">${esc(label)}</span>` : ""}
  <label><input class="num" inputmode="numeric" maxlength="4" data-mv="${key}:k" value="${v.k}" aria-label="kcal"><span>kcal</span></label>
  <label><input class="num" inputmode="numeric" maxlength="3" data-mv="${key}:p" value="${v.p}" aria-label="${t("protein")}"><span>g</span></label>
</div>`;

function renderMealRows() {
  $("#meal-rows").innerHTML = draft.map((m, i) => `<div class="meal-row">
    <div class="meal-row-top">
      <input type="time" class="num" data-mf="${i}:time" value="${m.time}" aria-label="${t("mealTime")}">
      <input data-mf="${i}:name" value="${esc(m.name)}" maxlength="30" placeholder="${t("mealName")}" aria-label="${t("mealName")}">
      <button type="button" class="icon sm" data-mdel="${i}" ${draft.length < 2 ? "disabled" : ""} aria-label="${esc(`${t("delete")}: ${m.name}`)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <input data-mf="${i}:desc" value="${esc(m.desc)}" maxlength="100" placeholder="${esc(m.variants ? defaultDesc(m, variant(m, blankDay())) : t("mealDesc"))}" aria-label="${t("mealDesc")}">
    ${m.variants
      ? Object.entries(m.variants).map(([key, v]) => valuesRow(`${i}:${key}`, v, t(`variant.${key}`))).join("")
      : valuesRow(`${i}`, m, "")}
  </div>`).join("");
  $("#meal-add").disabled = draft.length >= MAX_MEALS;
  renderMealTotal();
}

function renderMealTotal() {
  const tot = planTotals(draft), T = state.targets;
  $("#meal-total").textContent = t("planTotal", { k: fmt(tot.k), p: fmt(tot.p), tk: fmt(T.kcal), tp: fmt(T.protein) });
}

function openMeals() {
  draft = currentMeals().map(toDraft);
  renderMealRows();
  $("#meal-editor").showModal();
  $("#meal-rows").scrollTop = 0;
}

$("#meal-rows").addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.mf) {
    const [i, field] = el.dataset.mf.split(":");
    draft[Number(i)][field] = el.value;
  } else if (el.dataset.mv) {
    const parts = el.dataset.mv.split(":");
    const field = parts.pop();
    const meal = draft[Number(parts[0])];
    const target = parts[1] ? meal.variants[parts[1]] : meal;
    target[field] = Math.max(0, Math.min(field === "k" ? 3000 : 300, parseInt(el.value, 10) || 0));
    renderMealTotal();
  }
});

$("#meal-rows").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-mdel]");
  if (!b || draft.length < 2) return;
  draft.splice(Number(b.dataset.mdel), 1);
  renderMealRows();
});

$("#meal-add").addEventListener("click", () => {
  if (draft.length >= MAX_MEALS) return toast(t("mealsMax"));
  draft.push({ id: `m${Date.now().toString(36)}`, time: "12:00", name: "", desc: "", k: 300, p: 15 });
  renderMealRows();
  const rows = $("#meal-rows").children;
  rows[rows.length - 1].querySelector('[data-mf$=":name"]').focus();
});

$("#meal-reset").addEventListener("click", () => {
  draft = scaleMeals(MEALS, state.targets).map(toDraft);
  renderMealRows();
  toast(t("mealsResetDone"));
});

$("#meal-cancel").addEventListener("click", () => $("#meal-editor").close());

$("#meal-form").addEventListener("submit", (e) => {
  e.preventDefault();
  replan(sortMeals(draft.map(fromDraft)));
  data.saveUser();
  $("#meal-editor").close();
  render();
  toast(t("mealsSaved"));
});

// --- Ayarlar -----------------------------------------------------------------

function setTargets(kcal, protein) {
  state.targets = {
    kcal: Math.max(1500, Math.min(5000, kcal)),
    protein: Math.max(40, Math.min(250, protein)),
  };
  data.saveUser();
  renderSettings();
  render();
}

function markLang() {
  for (const b of document.querySelectorAll("[data-lang]")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
}

function renderSettings() {
  $("#k-target").textContent = `${fmt(state.targets.kcal)} kcal`;
  $("#p-target").textContent = `${fmt(state.targets.protein)} ${t("proteinUnit")}`;
  for (const b of $("#theme-seg").children) b.setAttribute("aria-pressed", String(b.dataset.themeMode === theme()));
}

$("#settings-open").addEventListener("click", () => {
  $("#account-email").textContent = DEMO ? t("demo") : user?.email || "";
  $("#sign-out").hidden = DEMO;
  renderSettings();
  $("#settings").showModal();
});
$("#k-minus").addEventListener("click", () => setTargets(state.targets.kcal - 100, state.targets.protein));
$("#k-plus").addEventListener("click", () => setTargets(state.targets.kcal + 100, state.targets.protein));
$("#p-minus").addEventListener("click", () => setTargets(state.targets.kcal, state.targets.protein - 5));
$("#p-plus").addEventListener("click", () => setTargets(state.targets.kcal, state.targets.protein + 5));
$("#open-setup").addEventListener("click", () => {
  $("#settings").close();
  openSetup(true);
});
$("#open-meals").addEventListener("click", () => {
  $("#settings").close();
  openMeals();
});
$("#sign-out").addEventListener("click", () => {
  $("#settings").close();
  data.flush(); // son dokunuşlar çıkıştan önce yazılsın
  signOut(auth);
});

$("#guide-ok").addEventListener("click", () => {
  store.set("guideDone", "1");
  $("#guide").hidden = true;
});

// Sistem teması değişirse (tema "Sistem"deyken) adres çubuğu rengi de değişsin.
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => setTheme(theme()));

// Gün değişince (uygulama gece açık kaldıysa) "Bugün" kaysın.
let lastToday = today();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const now = today();
  if (now !== lastToday) {
    if (sel === lastToday) sel = now;
    lastToday = now;
    render();
  }
});

// --- Giriş (en sonda: yukarıdaki her şey tanımlı olsun) ----------------------

if (DEMO) {
  $("#demo-banner").hidden = false;
  user = { uid: "demo" };
  data.start("demo", changed); // veri hazır olunca changed() kurulumu ya da uygulamayı açar
} else {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  $("#google").addEventListener("click", async (e) => {
    const button = e.currentTarget;
    button.disabled = true;
    $("#login-error").textContent = "";
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      // Açılır pencere engellenirse yönlendirmeli girişe geç.
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(err.code)) {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(err.code)) {
        console.error(err);
        $("#login-error").textContent = t("loginFailed");
      }
    } finally {
      button.disabled = false;
    }
  });

  getRedirectResult(auth).catch((err) => {
    console.error(err);
    $("#login-error").textContent = t("loginFailed");
  });

  onAuthStateChanged(auth, (u) => {
    if (!u || u.isAnonymous) {
      data.stop();
      user = null;
      show("login");
      return;
    }
    if (user?.uid === u.uid) return;
    user = u;
    show(null); // kayıtlar gelene kadar açılış ekranı; giriş ekranında beklemesin
    data.start(u.uid, changed); // ilk okuma bitince changed() kurulumu ya da uygulamayı açar
  });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
}
