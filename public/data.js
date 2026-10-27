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
const timers = new Map(); // bekleyen yazma → canlı güncelleme onu ezmesin

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
      if (timers.has("user")) return;
      const d = snap.data() || {};
      state.targets = { kcal: d.targets?.kcal || DEFAULT_TARGETS.kcal, protein: d.targets?.protein || DEFAULT_TARGETS.protein };
      state.profile = d.profile || null;
      state.meals = Array.isArray(d.meals) && d.meals.length ? d.meals : null;
      onChange();
    }, fail),
  ];
}

export function stop() {
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
    if (timers.has(`${kind}/${id}`)) continue;
    if (change.type === "removed") delete target[id];
    else target[id] = change.doc.data();
  }
  onChange();
}

// Hızlı art arda dokunuşları tek yazmada toplar.
function queue(key, write) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    if (DEMO) {
      store.set("data", JSON.stringify({ ...state, ready: undefined }));
      return;
    }
    write().catch((err) => {
      console.error(err);
      onChange("save-error");
    });
  }, 400));
}

export function saveDay(date) {
  const body = structuredClone(state.days[date]);
  queue(`days/${date}`, () => setDoc(doc(db, "users", uid, "days", date), body));
}

export function saveWeight(date) {
  const body = { ...state.weights[date] };
  queue(`weights/${date}`, () => setDoc(doc(db, "users", uid, "weights", date), body));
}

export function deleteWeight(date) {
  delete state.weights[date];
  queue(`weights/${date}`, () => deleteDoc(doc(db, "users", uid, "weights", date)));
}

// Hedefler, profil ve öğün planı aynı belgede; hep birlikte yazılır.
export function saveUser() {
  const body = {
    targets: { ...state.targets },
    profile: state.profile ? { ...state.profile } : deleteField(),
    meals: state.meals ? structuredClone(state.meals) : deleteField(),
  };
  queue("user", () => setDoc(doc(db, "users", uid), body, { merge: true }));
}
