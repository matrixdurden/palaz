import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Bilgisayarda yerel test ederken giriş ve veritabanına bağlanma:
// deneme modu veriyi bu tarayıcının localStorage'ında tutar.
export const DEMO = ["localhost", "127.0.0.1"].includes(location.hostname) || !firebaseConfig.apiKey;

// Uygulama nesnesi deneme modunda da kurulur; yemek tahmini (scan.js) onu kullanır.
export const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;

let auth = null;
let db = null;
if (!DEMO) {
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export { auth, db };
