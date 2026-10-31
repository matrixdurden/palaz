// Veri: giriş yapan kişinin günleri, kiloları, hedefleri, profili ve öğün planı.
// Firestore: users/{uid} (hedefler, profil, plan), users/{uid}/days/{tarih}, users/{uid}/weights/{tarih}.
// Deneme modunda (DEMO) aynı veri localStorage'da tutulur.

import {
  doc, collection, query, where, documentId, onSnapshot, setDoc, deleteDoc, deleteField,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db, DEMO } from "./firebase.js";
import { DEFAULT_TARGETS, addDays, dateKey } from "./plan.js";
import { store } from "./ui.js";

export const state = {
  days: {},
  weights: {},
  targets: { ...DEFAULT_TARGETS },
  profile: null, // { sex, age, height, weight, activity, goal }; yoksa kurulum ekranı açılır
  meals: null, // kullanıcının öğün planı; null ise plan.js'deki varsayılan
  ready: false, // ilk okuma bitti mi (kurulum ekranı gerekip gerekmediğine ancak o zaman bakılır)
};

const DAYS_KEPT = 120; // ekranlar en fazla bu kadar geriye bakar
let uid = null;
let onChange = () => {};
let unsubs = [];
const pending = new Map(); // bekleyen yazma: { timer, run } → canlı güncelleme onu ezmesin

export function start(userId, changed) {
  stop();
  uid = userId;
  onChange = changed;
  if (DEMO) {
    try {
      const saved = JSON.parse(store.get("data") || "null");
      if (saved) Object.assign(state, saved);
    } catch { /* bozuk kayıt: sıfırdan başla */ }
    state.ready = true;
    onChange();
    return;
  }
  const cutoff = addDays(dateKey(new Date()), -DAYS_KEPT);
  const fail = (err) => { console.error(err); onChange("error"); };
  const got = new Set();
  const loaded = (part) => {
    got.add(part);
    state.ready = got.has("user") && got.has("days");
  };
  unsubs = [
    onSnapshot(query(collection(db, "users", uid, "days"), where(documentId(), ">=", cutoff)), (snap) => {
      loaded("days");
      applyChanges(snap, state.days, "days");
    }, fail),
    onSnapshot(collection(db, "users", uid, "weights"), (snap) => {
      applyChanges(snap, state.weights, "weights");
    }, fail),
    onSnapshot(doc(db, "users", uid), (snap) => {
      loaded("user");
      if (pending.has("user")) return;
      const d = snap.data() || {};
      state.targets = { kcal: d.targets?.kcal || DEFAULT_TARGETS.kcal, protein: d.targets?.protein || DEFAULT_TARGETS.protein };
      state.profile = d.profile || null;
      state.meals = Array.isArray(d.meals) && d.meals.length ? d.meals : null;
      onChange();
    }, fail),
  ];
}

export function stop() {
  // Çıkışta flush() çağrılır; burada kalan yazma başka hesaba gitmesin diye atılır.
  for (const p of pending.values()) clearTimeout(p.timer);
  pending.clear();
  for (const unsub of unsubs) unsub();
  unsubs = [];
  state.days = {};
  state.weights = {};
  state.targets = { ...DEFAULT_TARGETS };
  state.profile = null;
  state.meals = null;
  state.ready = false;
}

function applyChanges(snap, target, kind) {
  for (const change of snap.docChanges()) {
    const id = change.doc.id;
    if (pending.has(`${kind}/${id}`)) continue;
    if (change.type === "removed") delete target[id];
    else target[id] = change.doc.data();
  }
  onChange();
}

// Hızlı art arda dokunuşları tek yazmada toplar.
function queue(key, write) {
  clearTimeout(pending.get(key)?.timer);
  const run = () => {
    pending.delete(key);
    if (DEMO) {
      store.set("data", JSON.stringify({ ...state, ready: undefined }));
      return;
    }
    write().catch((err) => {
      console.error(err);
      onChange("save-error");
    });
  };
  pending.set(key, { timer: setTimeout(run, 400), run });
}

// Bekleyenleri hemen yazar: uygulama kapanırken ya da çıkış yapmadan önce.
export function flush() {
  for (const p of [...pending.values()]) {
    clearTimeout(p.timer);
    p.run();
  }
}
addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});

// Yol yazma anında değil şimdi kurulur: arada hesap değişirse kayıt yanlış kişiye gitmesin.
const ref = (...path) => (DEMO ? null : doc(db, "users", uid, ...path));

export function saveDay(date) {
  const body = structuredClone(state.days[date]), at = ref("days", date);
  queue(`days/${date}`, () => setDoc(at, body));
}

export function saveWeight(date) {
  const body = { ...state.weights[date] }, at = ref("weights", date);
  queue(`weights/${date}`, () => setDoc(at, body));
}

export function deleteWeight(date) {
  delete state.weights[date];
  const at = ref("weights", date);
  queue(`weights/${date}`, () => deleteDoc(at));
}

// Hedefler, profil ve öğün planı aynı belgede; hep birlikte yazılır.
export function saveUser() {
  const body = {
    targets: { ...state.targets },
    profile: state.profile ? { ...state.profile } : deleteField(),
    meals: state.meals ? structuredClone(state.meals) : deleteField(),
  };
  const at = ref();
  queue("user", () => setDoc(at, body, { merge: true }));
}
