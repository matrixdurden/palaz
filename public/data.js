// Veri: giriş yapan kişinin günleri, kiloları ve hedefleri.
// Firestore: users/{uid} (hedefler), users/{uid}/days/{tarih}, users/{uid}/weights/{tarih}.
// Deneme modunda (DEMO) aynı veri localStorage'da tutulur.

import {
  doc, collection, query, where, documentId, onSnapshot, setDoc, deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db, DEMO } from "./firebase.js";
import { DEFAULT_TARGETS, addDays, dateKey } from "./plan.js";
import { store } from "./ui.js";

export const state = {
  days: {},
  weights: {},
  targets: { ...DEFAULT_TARGETS },
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
    onChange();
    return;
  }
  const cutoff = addDays(dateKey(new Date()), -DAYS_KEPT);
  const fail = (err) => { console.error(err); onChange("error"); };
  unsubs = [
    onSnapshot(query(collection(db, "users", uid, "days"), where(documentId(), ">=", cutoff)), (snap) => {
      applyChanges(snap, state.days, "days");
    }, fail),
    onSnapshot(collection(db, "users", uid, "weights"), (snap) => {
      applyChanges(snap, state.weights, "weights");
    }, fail),
    onSnapshot(doc(db, "users", uid), (snap) => {
      if (timers.has("targets")) return;
      const t = snap.data()?.targets;
      state.targets = { kcal: t?.kcal || DEFAULT_TARGETS.kcal, protein: t?.protein || DEFAULT_TARGETS.protein };
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
      store.set("data", JSON.stringify(state));
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

export function saveTargets() {
  const targets = { ...state.targets };
  queue("targets", () => setDoc(doc(db, "users", uid), { targets }, { merge: true }));
}
