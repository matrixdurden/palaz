// Türkçe ve İngilizce metinler. HTML'deki data-i18n* öznitelikleri applyStatic() ile doldurulur.

import { store } from "./ui.js";

const TR = {
  // Genel
  today: "Bugün", yesterday: "Dün", tomorrow: "Yarın",
  prevDay: "Önceki gün", nextDay: "Sonraki gün", backToToday: "Bugüne dön",
  tabToday: "Bugün", tabWorkout: "Antrenman", tabProgress: "İlerleme", sections: "Bölümler",
  close: "Kapat", ok: "Tamam", add: "Ekle", delete: "Sil", added: "Eklendi",
  demo: "Deneme modu: kayıtlar sadece bu tarayıcıda.",
  readFailed: "Kayıtlar okunamadı. Sayfayı yenile.",
  saveFailed: "Kaydedilemedi. İnternet gelince tekrar dene.",

  // Giriş
  tagline: "Kilo almak için öğün, antrenman ve tartı takibi.",
  continueGoogle: "Google ile devam et",
  loginHint: "Kayıtların hesabında durur; telefonda ve bilgisayarda aynısını görürsün.",
  loginFailed: "Giriş yapılamadı. İnternetini kontrol edip tekrar dene.",
  installApp: "Telefona yükle", installHint: "Ana ekrandan uygulama gibi açılır.", install: "Yükle",
  iosTitle: "iPhone'a yükle",
  iosStep1: "Safari'de alttaki Paylaş düğmesine dokun.",
  iosStep2: "Ana Ekrana Ekle'yi seç.",
  iosStep3: "Sağ üstte Ekle'ye dokun.",

  // Bugün
  kcal: "Kalori", protein: "Protein",
  withRest: "Kalan öğünlerle: {k} kcal · {p} g",
  toGo: "{n} kaldı", goalReached: "Hedef tamam", ofGoal: "kalori",
  meals: "Öğünler", skipped: "Yemedim", half: "Yarım", full: "Tam",
  hintSmoothie: "Akşam hafifti, smoothie yap.", hintMilk: "Akşam doyurucuysa süt yeter.",
  extras: "Ekstra yediklerim", customName: "Listede yoksa (ör. döner)", kcalShort: "kcal", protShort: "prot",
  decrease: "{x}: azalt", increase: "{x}: ekle",
  goalDone: "Hedef tamam", goalDoneText: "{k} kcal ve {p} g protein.",
  onTrack: "Yoldasın", onTrackText: "Kalan öğünleri yersen hedefe ulaşıyorsun.",
  pastShort: "Bu gün ~{k} kcal eksik kaldı",
  pastShortText: "Tek gün sorun değil; önemli olan haftalık ortalama ve tartı.",
  gapK: "~{k} kcal eksik kalacak", gapKP: "~{k} kcal ve ~{p} g protein eksik kalacak",
  gapWhyRest: "Kalan öğünlerle gün ~{k} kcal ile biter.", gapWhyNow: "Şu an {k} kcal'desin.",
  gapPick: "Kapatmak için birini seç:",
  switchSmoothie: "Gece sütünü smoothie yap", switchBtn: "Smoothie yap", ateIt: "Yedim",

  // Ne yedin? (fotoğraf, barkod, yazı)
  scanTitle: "Ne yedin?", scanPlaceholder: "ör. Albeni, yarısını yedim", scanPhoto: "Fotoğraf çek ya da seç",
  scanAsk: "Hesapla",
  scanHint: "Paketin fotoğrafını çek: barkod, besin tablosu ya da ön yüz. Yarısını yediysen yaz.",
  scanLooking: "Okunuyor…", scanBarcode: "Barkod {c} bulundu, ürün aranıyor…",
  pack: "paket", portion: "porsiyon",
  "src.barcode": "barkod", "src.label": "etiketten", "src.known": "bilinen ürün", "src.estimate": "tahmin",
  scanNotInDb: "Ürün veritabanında yok, fotoğraftan tahmin ediliyor…", scanNotFound: "Bu barkodlu ürün bulunamadı.",
  scanPer100: "100 g'da {k} kcal · {p} g protein", grams: "g", gramsLabel: "{x}: gram",
  scanEstimate: "Tahmini değerler; gerekirse gramı düzelt.", scanSource: "Kaynak: Open Food Facts",
  addToday: "Ekle", cancel: "Vazgeç", scanAdded: "{n} kalem eklendi",
  scanNothing: "Yiyecek bulunamadı. Biraz daha ayrıntı yaz.",
  aiFailed: "Tahmin alınamadı. Biraz sonra tekrar dene.", aiQuota: "Bugünlük tahmin hakkı doldu.",
  offFailed: "Ürün bilgisine ulaşılamadı. İnternetini kontrol et.",

  // Antrenman
  workout: "Antrenman", workoutsLast7: "Son 7 gün: {n}", dayA: "A günü", dayB: "B günü", workoutDay: "Antrenman günü",
  workoutSaved: "Kaydedildi.", workoutNext: "Sıradaki: {x} günü. Her setten sonra tekrar sayısını yaz.",
  set: "Set {n}", lastTime: "Geçen sefer ({d}): {s}", firstTime: "İlk kez. Kaç tane çıkarsa yaz.",
  harder: "Zorlaştırma zamanı: {x}", reps: "tekrar", sec: "sn",
  rules: "Kurallar",
  rule1: "Haftada 3–4 gün, aralarda 1 gün dinlen. A ve B dönüşümlü.",
  rule2: "Her seti tükenmeye 1–2 tekrar kala bitir. Setler arası 1,5–2 dk.",
  rule3: "Her seferinde geçen seferki tekrarı geçmeye çalış.",
  rule4: "Bütün setlerde üst sınıra ulaşınca hareketi zorlaştır.",

  // İlerleme
  last7: "Son 7 gün", streak: "Seri", streakVal: "{n} gün", streakSub: "üst üste hedefte",
  average: "Ortalama", averageSub: "kcal · {h}/{n} gün hedefte", workouts: "Antrenman", workoutsSub: "hedef 3–4",
  weight: "Kilo", save: "Kaydet", update: "Güncelle",
  weighHint: "Haftada 1, sabah aç karnına tartıl.",
  weightSaved: "Kilo kaydedildi", weightDeleted: "Kilo kaydı silindi", weightRange: "Kiloyu 30 ile 150 arasında gir",
  weightChart: "Kilo grafiği",
  trendNone: "İkinci tartıdan sonra hızını burada göreceksin.",
  trendStart: "Başlangıçtan beri {c} kg ({d} gün).",
  trendGood: "Haftada ~{c} kg. Doğru hızdasın.",
  trendSlow: "Son haftada {c} kg. Bir hafta daha bekle; değişmezse hedefi artır.",
  trendFast: "Haftada ~{c} kg, biraz hızlı. Fazlası yağa gider.",
  trendStuck: "2 haftadır kilo yerinde. Günlük hedefi artır.",
  goalChanged: "Günlük hedef {k} kcal oldu",

  // Ayarlar
  settings: "Ayarlar", dailyGoal: "Günlük hedef",
  goalRule: "2 hafta kilo değişmezse +200 kcal, haftada 0,5 kg'dan hızlı alıyorsan −200 kcal.",
  kcalDown: "Kaloriyi azalt", kcalUp: "Kaloriyi artır", protDown: "Proteini azalt", protUp: "Proteini artır",
  proteinUnit: "g protein", language: "Dil", theme: "Tema",
  themeAuto: "Sistem", themeLight: "Açık", themeDark: "Koyu", signOut: "Çıkış yap",

  // Öğünler
  "meal.kahvalti": "Kahvaltı", "meal.kahvalti.desc": "3 yumurta + 60 g peynir + 2 dilim ekmek + domates/salatalık",
  "meal.ara": "Ara öğün", "meal.ara.desc": "1 muz + 1 avuç fındık",
  "meal.ogle": "Öğle", "meal.ogle.desc": "Öğle yemeği + fazladan 1–2 dilim ekmek + ayran/yoğurt",
  "meal.ikindi": "İkindi", "meal.ikindi.desc": "Simit + ayran ya da fıstık ezmeli ekmek + süt",
  "meal.aksam": "Akşam", "meal.aksam.desc": "Ev yemeği + 1 kase yoğurt + 2 dilim ekmek",
  "meal.gece": "Gece",
  "variant.hafif": "Hafif", "variant.doyurucu": "Doyurucu",
  "variant.smoothie": "Smoothie", "variant.smoothie.desc": "Süt + muz + 3 yk yulaf + 1 yk fıstık ezmesi",
  "variant.sut": "Süt", "variant.sut.desc": "1 bardak süt + 1 tatlı kaşığı bal",

  // Yiyecekler
  "food.sut": "1 bardak süt", "food.ayran": "1 kutu ayran", "food.yumurta": "1 yumurta",
  "food.ekmek": "1 dilim ekmek", "food.yogurt": "1 kase yoğurt", "food.peynir": "1 parça peynir (30 g)",
  "food.muz": "1 muz", "food.findik": "1 avuç fındık", "food.fistik": "1 yk fıstık ezmesi",
  "food.simit": "1 simit", "food.ton": "1 kutu ton balığı", "food.zeytinyagi": "1 yk zeytinyağı",
  "food.smoothie": "Smoothie",
  "pool.smoothie": "Smoothie (süt + muz + yulaf + fıstık ezmesi)", "pool.fistikEkmek": "2 dilim fıstık ezmeli ekmek",
  "pool.sut": "1 bardak süt", "pool.yumurta2": "2 yumurta", "pool.yogurt": "1 kase yoğurt",
  "pool.findik": "1 avuç fındık", "pool.ton": "1 kutu ton balığı", "pool.zeytinyagi": "Yemeğe 1 yk zeytinyağı",

  // Hareketler
  "ex.sinav": "Şınav", "ex.sinav.note": "Tükenmeye 1–2 tekrar kala bitir", "ex.sinav.harder": "ayaklar yüksekte şınav",
  "ex.squat": "Squat", "ex.squat.harder": "split squat",
  "ex.masa": "Masa altı çekiş", "ex.masa.harder": "ayakları uzat, daha yatay çek",
  "ex.pike": "Pike şınav", "ex.pike.harder": "ayaklar sandalyede pike şınav",
  "ex.plank": "Plank", "ex.plank.harder": "kollar ileride plank",
  "ex.dar": "Dar şınav / dips", "ex.dar.note": "Tükenmeye 1–2 tekrar kala bitir", "ex.dar.harder": "3 saniyede yavaş iniş",
  "ex.bulgar": "Bulgarian split squat", "ex.bulgar.note": "Her bacak, arka ayak koltukta", "ex.bulgar.harder": "sırt çantasıyla",
  "ex.canta": "Sırt çantasıyla çekiş", "ex.canta.note": "Çantayı kitapla doldur", "ex.canta.harder": "çantaya daha çok kitap koy",
  "ex.kopru": "Kalça köprüsü", "ex.kopru.harder": "tek bacak köprü",
  "ex.bacak": "Yatarak bacak kaldırma", "ex.bacak.harder": "yavaş indir, yere değdirme",
};

const EN = {
  today: "Today", yesterday: "Yesterday", tomorrow: "Tomorrow",
  prevDay: "Previous day", nextDay: "Next day", backToToday: "Back to today",
  tabToday: "Today", tabWorkout: "Workout", tabProgress: "Progress", sections: "Sections",
  close: "Close", ok: "OK", add: "Add", delete: "Delete", added: "Added",
  demo: "Demo mode: data stays in this browser.",
  readFailed: "Couldn't load your data. Refresh the page.",
  saveFailed: "Couldn't save. Try again when you're back online.",

  tagline: "Track meals, workouts and weight to gain weight.",
  continueGoogle: "Continue with Google",
  loginHint: "Your log is saved to your account, the same on phone and computer.",
  loginFailed: "Couldn't sign in. Check your connection and try again.",
  installApp: "Install app", installHint: "Opens from your home screen like an app.", install: "Install",
  iosTitle: "Install on iPhone",
  iosStep1: "In Safari, tap the Share button at the bottom.",
  iosStep2: "Choose Add to Home Screen.",
  iosStep3: "Tap Add in the top right.",

  kcal: "Calories", protein: "Protein",
  withRest: "With remaining meals: {k} kcal · {p} g",
  toGo: "{n} to go", goalReached: "Goal reached", ofGoal: "calories",
  meals: "Meals", skipped: "Skipped", half: "Half", full: "Full",
  hintSmoothie: "Light dinner, so make the smoothie.", hintMilk: "After a filling dinner, milk is enough.",
  extras: "Extra food", customName: "Not listed? (e.g. burger)", kcalShort: "kcal", protShort: "prot",
  decrease: "{x}: remove one", increase: "{x}: add one",
  goalDone: "Goal reached", goalDoneText: "{k} kcal and {p} g protein.",
  onTrack: "On track", onTrackText: "Eat the remaining meals and you'll hit your goal.",
  pastShort: "This day was ~{k} kcal short",
  pastShortText: "One day doesn't matter; the weekly average and the scale do.",
  gapK: "~{k} kcal short", gapKP: "~{k} kcal and ~{p} g protein short",
  gapWhyRest: "With the remaining meals you'll end at ~{k} kcal.", gapWhyNow: "You're at {k} kcal.",
  gapPick: "Pick one to close the gap:",
  switchSmoothie: "Turn the night milk into a smoothie", switchBtn: "Make it a smoothie", ateIt: "Ate it",

  scanTitle: "What did you eat?", scanPlaceholder: "e.g. KitKat, ate half", scanPhoto: "Take or choose a photo",
  scanAsk: "Estimate",
  scanHint: "Photograph the pack: barcode, nutrition table or front. Type it if you ate only part.",
  scanLooking: "Reading…", scanBarcode: "Found barcode {c}, looking up the product…",
  pack: "pack", portion: "serving",
  "src.barcode": "barcode", "src.label": "from label", "src.known": "known product", "src.estimate": "estimate",
  scanNotInDb: "Product not in the database, estimating from the photo…", scanNotFound: "No product found for this barcode.",
  scanPer100: "Per 100 g: {k} kcal · {p} g protein", grams: "g", gramsLabel: "{x}: grams",
  scanEstimate: "Estimates. Adjust the grams if needed.", scanSource: "Source: Open Food Facts",
  addToday: "Add", cancel: "Cancel", scanAdded: "Added {n} items",
  scanNothing: "No food found. Add a bit more detail.",
  aiFailed: "Couldn't get an estimate. Try again shortly.", aiQuota: "Today's estimate limit is used up.",
  offFailed: "Couldn't reach the product database. Check your connection.",

  workout: "Workout", workoutsLast7: "Last 7 days: {n}", dayA: "Day A", dayB: "Day B", workoutDay: "Workout day",
  workoutSaved: "Saved.", workoutNext: "Next up: day {x}. Log your reps after each set.",
  set: "Set {n}", lastTime: "Last time ({d}): {s}", firstTime: "First time. Log whatever you get.",
  harder: "Time to make it harder: {x}", reps: "reps", sec: "sec",
  rules: "Rules",
  rule1: "3–4 days a week with a rest day between. Alternate A and B.",
  rule2: "Stop each set 1–2 reps before failure. Rest 1.5–2 min between sets.",
  rule3: "Try to beat last time's reps every session.",
  rule4: "When every set hits the top of the range, make the move harder.",

  last7: "Last 7 days", streak: "Streak", streakVal: "{n} days", streakSub: "in a row on target",
  average: "Average", averageSub: "kcal · {h}/{n} days on target", workouts: "Workouts", workoutsSub: "goal 3–4",
  weight: "Weight", save: "Save", update: "Update",
  weighHint: "Weigh once a week, in the morning before eating.",
  weightSaved: "Weight saved", weightDeleted: "Weight entry deleted", weightRange: "Enter a weight between 30 and 150",
  weightChart: "Weight chart",
  trendNone: "After your second weigh-in you'll see your pace here.",
  trendStart: "{c} kg since you started ({d} days).",
  trendGood: "~{c} kg per week. Right on pace.",
  trendSlow: "{c} kg last week. Give it one more week; if nothing changes, raise the goal.",
  trendFast: "~{c} kg per week, a bit fast. The extra turns into fat.",
  trendStuck: "No change for 2 weeks. Raise your daily goal.",
  goalChanged: "Daily goal is now {k} kcal",

  settings: "Settings", dailyGoal: "Daily goal",
  goalRule: "No change in 2 weeks: +200 kcal. Gaining over 0.5 kg a week: −200 kcal.",
  kcalDown: "Lower calories", kcalUp: "Raise calories", protDown: "Lower protein", protUp: "Raise protein",
  proteinUnit: "g protein", language: "Language", theme: "Theme",
  themeAuto: "System", themeLight: "Light", themeDark: "Dark", signOut: "Sign out",

  "meal.kahvalti": "Breakfast", "meal.kahvalti.desc": "3 eggs + 60 g cheese + 2 slices of bread + tomato/cucumber",
  "meal.ara": "Snack", "meal.ara.desc": "1 banana + 1 handful of hazelnuts",
  "meal.ogle": "Lunch", "meal.ogle.desc": "Lunch + 1–2 extra slices of bread + ayran or yogurt",
  "meal.ikindi": "Afternoon", "meal.ikindi.desc": "Simit + ayran, or peanut butter bread + milk",
  "meal.aksam": "Dinner", "meal.aksam.desc": "Home-cooked dinner + 1 bowl of yogurt + 2 slices of bread",
  "meal.gece": "Night",
  "variant.hafif": "Light", "variant.doyurucu": "Filling",
  "variant.smoothie": "Smoothie", "variant.smoothie.desc": "Milk + banana + 3 tbsp oats + 1 tbsp peanut butter",
  "variant.sut": "Milk", "variant.sut.desc": "1 glass of milk + 1 tsp honey",

  "food.sut": "1 glass of milk", "food.ayran": "1 ayran", "food.yumurta": "1 egg",
  "food.ekmek": "1 slice of bread", "food.yogurt": "1 bowl of yogurt", "food.peynir": "1 piece of cheese (30 g)",
  "food.muz": "1 banana", "food.findik": "1 handful of nuts", "food.fistik": "1 tbsp peanut butter",
  "food.simit": "1 simit", "food.ton": "1 can of tuna", "food.zeytinyagi": "1 tbsp olive oil",
  "food.smoothie": "Smoothie",
  "pool.smoothie": "Smoothie (milk + banana + oats + peanut butter)", "pool.fistikEkmek": "2 slices of peanut butter bread",
  "pool.sut": "1 glass of milk", "pool.yumurta2": "2 eggs", "pool.yogurt": "1 bowl of yogurt",
  "pool.findik": "1 handful of nuts", "pool.ton": "1 can of tuna", "pool.zeytinyagi": "1 tbsp olive oil in a meal",

  "ex.sinav": "Push-up", "ex.sinav.note": "Stop 1–2 reps before failure", "ex.sinav.harder": "feet-elevated push-ups",
  "ex.squat": "Squat", "ex.squat.harder": "split squats",
  "ex.masa": "Table row", "ex.masa.harder": "straighten your legs, pull more horizontal",
  "ex.pike": "Pike push-up", "ex.pike.harder": "feet on a chair",
  "ex.plank": "Plank", "ex.plank.harder": "arms further forward",
  "ex.dar": "Close push-up / dips", "ex.dar.note": "Stop 1–2 reps before failure", "ex.dar.harder": "3-second lowering",
  "ex.bulgar": "Bulgarian split squat", "ex.bulgar.note": "Each leg, back foot on the couch", "ex.bulgar.harder": "hold a backpack",
  "ex.canta": "Backpack row", "ex.canta.note": "Fill the backpack with books", "ex.canta.harder": "add more books",
  "ex.kopru": "Glute bridge", "ex.kopru.harder": "single-leg bridge",
  "ex.bacak": "Lying leg raise", "ex.bacak.harder": "lower slowly, don't touch the floor",
};

const DICT = { tr: TR, en: EN };

export let lang = ["tr", "en"].includes(store.get("lang"))
  ? store.get("lang")
  : (navigator.language || "").toLowerCase().startsWith("tr") ? "tr" : "en";

export const locale = () => (lang === "tr" ? "tr-TR" : "en-US");
export const fmt = (n) => Math.round(n).toLocaleString(locale());
export const kg = (n) => n.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// t("gapKP", { k: 400, p: 12 }) → "~400 kcal ve ~12 g protein eksik kalacak"
export function t(key, vars) {
  const text = DICT[lang][key] ?? TR[key] ?? "";
  return vars ? text.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? "") : text;
}

export const has = (key) => key in DICT[lang];

export function applyStatic() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll("[data-i18n-label]")) el.setAttribute("aria-label", t(el.dataset.i18nLabel));
}

export function setLang(next) {
  lang = next;
  store.set("lang", next);
  applyStatic();
}
