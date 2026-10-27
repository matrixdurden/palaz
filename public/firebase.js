import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Bilgisayarda yerel test ederken ya da ayarlar girilmemişken Firebase'e hiç bağlanma:
// deneme modu veriyi bu tarayıcının localStorage'ında tutar.
export const DEMO = ["localhost", "127.0.0.1"].includes(location.hostname) || !firebaseConfig.apiKey;

let auth = null;
let db = null;
if (!DEMO) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export { auth, db };
