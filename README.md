# palaz

A small app for gaining weight: log your meals, see how to close the gap when you fall short, track home workouts and your weight. Turkish and English, light and dark theme.

**https://palaz.web.app**

*palazlanmak* (Turkish): to fill out, grow strong.

- **Your plan:** on first sign-in you enter sex, age, height, weight, activity, goal (gain, gain slowly, maintain) and, if you like, a target weight. You see your BMI as you type, and palaz works out your daily calories (Mifflin-St Jeor) and protein and scales a starter meal plan to it. Meal times, names, contents and values are editable in Settings. Past days keep the plan they were logged with. A short "How it works" card on the first screen explains the daily routine.
- **Today:** your planned meals, each marked *Skipped / Half / Full*. If the day is heading short of your goal, palaz suggests 1–3 additions that close the gap ("2 eggs + 1 glass of milk") and adds them with one tap.
- **What did you eat?** Snap a photo or type a line ("a plate of manti, half a bread"). A barcode in the photo is looked up in [Open Food Facts](https://world.openfoodfacts.org); anything else goes to a small Cloudflare Worker that asks Qwen 3.8 on Workers AI (free daily quota, Llama 4 Scout as fallback) for an estimate you can adjust before adding. Only signed-in users can use it. Photos are sent for the estimate and not stored. It works best with packaged food: a clear photo of the nutrition table gives exact values.
- **Workout:** a no-equipment A/B routine. Log reps per set; last session's numbers show as hints, and palaz tells you when a move is ready to get harder.
- **Progress:** last 7 days at a glance, streak, average calories, weight chart, and with a target weight how much is left and roughly how many weeks it takes at your pace. If your weight hasn't moved in two weeks, it offers +200 kcal.

The default plan is 2800 kcal and 110 g protein a day (changeable in Settings). It's a plain web app (PWA): install it from the browser menu to use it like a phone app. Works offline.

## Development

No build step. The site in `public/` is served as is.

```bash
npm run dev    # http://localhost:5180, demo mode: data stays in the browser
npm test       # tests for plan.js and nutrition.js
```

On `localhost` the app doesn't sign in or touch the database. For food estimates, run the Worker locally too (it skips the sign-in check only with this flag):

```bash
cd worker && npm install && npx wrangler dev --remote --var ALLOW_ANON:1   # http://localhost:8787
```

```
public/
  index.html       screens
  style.css        look (light/dark)
  app.js           sign-in, tabs, rendering, events
  plan.js          meals, foods, workout program and all calculations
  scan.js          photo/barcode → Open Food Facts or the AI Worker
  nutrition.js     parsing product data and AI estimates
  i18n.js          Turkish and English text
  data.js          Firestore reads/writes (localStorage in demo mode)
  ui.js            small helpers, theme
  install.js       "Install app"
  sw.js            service worker for offline start
worker/            Cloudflare Worker: checks the Firebase sign-in, asks Workers AI
firestore.rules    each user can only read and write their own data
test/              plan.js and nutrition.js tests
```

Data, per signed-in user:

- `users/{uid}`: `targets: { kcal, protein }`, `profile: { sex, age, height, weight, activity, goal, target? }`, `meals` (`[{ id, time, k, p, name?, desc?, variants? }]`, missing = default plan)
- `users/{uid}/days/{YYYY-MM-DD}`: `meals` (meal → 0 / 0.5 / 1), `aksamTip`, `geceTip`, `extras` (food → count), `custom` (`[{ name, k, p }]`), `workout` (`{ type: "A" | "B", sets: { exercise: [reps] } }`), `plan` (the meal plan in effect that day)
- `users/{uid}/weights/{YYYY-MM-DD}`: `kg`

## Deploying your own copy

1. Create a Firebase project. Turn on **Authentication → Google** and create a **Firestore** database.
2. Add a web app and paste its config into `public/firebase-config.js`.
3. Put your project ID in `.firebaserc` and your hosting site in `firebase.json`.
4. `npx firebase-tools login`, then `npm run deploy`.
5. For food estimates: set `PROJECT` and `ORIGINS` in `worker/src/index.js`, then `cd worker && npx wrangler login && npx wrangler deploy` (free Cloudflare account). Put the `*.workers.dev` address in `aiUrl` in `public/firebase-config.js`.

## Türkçe

Kilo almak için küçük bir uygulama. İlk girişte cinsiyet, yaş, boy, kilo, hareket, hedef ve istersen hedef kilonu girersin; günlük kalori ve protein hedefin hesaplanır, öğün planı ona göre kurulur. Öğün saatlerini, adlarını ve içeriklerini Ayarlar'dan değiştirebilirsin. Öğünlerini işaretle, gün eksik kalacaksa nasıl kapatacağını gör, evde antrenmanını ve kilonu takip et. Plan dışı bir şey yediysen fotoğrafını çek ya da yaz: barkod varsa Open Food Facts'ten, yoksa yapay zekâdan (Cloudflare Workers AI) kalori ve protein tahmini gelir. Türkçe ve İngilizce, açık ve koyu tema. Tarayıcı menüsünden **Uygulamayı yükle** ile telefona eklenir.

## License

[MIT](LICENSE)
