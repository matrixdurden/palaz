// Firebase web uygulaması ayarları (firebase apps:sdkconfig ile alındı).
// Bu değerler gizli değildir; erişimi firestore.rules korur.
// localhost'ta ya da apiKey boşken uygulama deneme modunda çalışır.
export const firebaseConfig = {
  apiKey: "AIzaSyD_5VJap5MxJZ8iAyrQWcKJYbuJDVIb5z0",
  authDomain: "palaz-95879.firebaseapp.com",
  projectId: "palaz-95879",
  storageBucket: "palaz-95879.firebasestorage.app",
  messagingSenderId: "288172863591",
  appId: "1:288172863591:web:36423b655ea365b063e4c2",
};

// Yemek tahmini yapan Cloudflare Worker (worker/). Gizli değildir; sadece girişli kullanıcıya cevap verir.
// localhost'ta "cd worker && npx wrangler dev --remote --var ALLOW_ANON:1" ile açılan yerel kopya kullanılır.
export const aiUrl = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:8787"
  : "https://palaz-ai.muhammethilalx.workers.dev";
