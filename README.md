# palaz

A small app for gaining weight: log your meals, see how to close the gap when you fall short, track home workouts and your weight. Turkish and English, light and dark theme.

**https://palaz.web.app**

*palazlanmak* (Turkish): to fill out, grow strong.

- **Today:** six planned meals, each marked *Skipped / Half / Full*. If the day is heading short of your goal, palaz suggests 1–3 additions that close the gap ("2 eggs + 1 glass of milk") and adds them with one tap.
- **Workout:** a no-equipment A/B routine. Log reps per set; last session's numbers show as hints, and palaz tells you when a move is ready to get harder.
- **Progress:** last 7 days at a glance, streak, average calories, weight chart. If your weight hasn't moved in two weeks, it offers +200 kcal.

The default plan is 2800 kcal and 110 g protein a day (changeable in Settings). It's a plain web app (PWA): install it from the browser menu to use it like a phone app. Works offline.

## Development

No build step. The site in `public/` is served as is.

```bash
npm run dev    # http://localhost:5180, demo mode: data stays in the browser
npm test       # tests for public/plan.js
```

On `localhost` the app never talks to Firebase.

```
public/
  index.html       screens
  style.css        look (light/dark)
  app.js           sign-in, tabs, rendering, events
  plan.js          meals, foods, workout program and all calculations
  i18n.js          Turkish and English text
  data.js          Firestore reads/writes (localStorage in demo mode)
  ui.js            small helpers, theme
  install.js       "Install app"
  sw.js            service worker for offline start
firestore.rules    each user can only read and write their own data
test/              plan.js tests
```

Data, per signed-in user:

- `users/{uid}`: `targets: { kcal, protein }`
- `users/{uid}/days/{YYYY-MM-DD}`: `meals` (meal → 0 / 0.5 / 1), `aksamTip`, `geceTip`, `extras` (food → count), `custom` (`[{ name, k, p }]`), `workout` (`{ type: "A" | "B", sets: { exercise: [reps] } }`)
- `users/{uid}/weights/{YYYY-MM-DD}`: `kg`

## Deploying your own copy

1. Create a Firebase project. Turn on **Authentication → Google** and create a **Firestore** database.
2. Add a web app and paste its config into `public/firebase-config.js`.
3. Put your project ID in `.firebaserc` and your hosting site in `firebase.json`.
4. `npx firebase-tools login`, then `npm run deploy`.

## Türkçe

Kilo almak için küçük bir uygulama: öğünlerini işaretle, gün eksik kalacaksa nasıl kapatacağını gör, evde antrenmanını ve kilonu takip et. Türkçe ve İngilizce, açık ve koyu tema. Tarayıcı menüsünden **Uygulamayı yükle** ile telefona eklenir.

## License

[MIT](LICENSE)
