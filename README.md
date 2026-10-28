# Daily Protocol

A personal daily-schedule app that installs to the iPhone home screen. It has four tabs:

- **Today**: a 24-hour dial with the current block's checklist
- **Train**: the day's Planet Fitness split, a looping demo for every exercise, set logging and a 90-second rest timer
- **Fuel**: water, pump hack, creatine and the three meals, each with a photo and a done toggle
- **Progress**: a Sunday photo check-in, with a week-1 vs latest compare slider and a film-strip reel

It's a static site with no build step. `sw.js` caches the app and all media, so it opens offline. Logs and progress photos stay on the phone (localStorage and IndexedDB).

Demo videos and photos were generated with Higgsfield and saved in `media/`, named by their Higgsfield job IDs.

When you change any file, bump `VERSION` in `sw.js` so installed copies download the update.

Install: open https://malachixmoore0-coder.github.io/daily-protocol/ in Safari, tap Share, then **Add to Home Screen**.

## Workouts

Train → **Start** opens workout mode. Log each set's weight, reps and effort (Easy, Good or Hard), and a rest timer starts after each set. Finished workouts are saved per exercise in `localStorage` (`dp-lifts`).

The coach uses rules-based double progression on each exercise's rep range:

- **Every working set at the top of the range:** add one step (5 lb, or 10 lb for squat/leg press). Add two steps if every set was easy and went well past the range.
- **Top of the range but hard:** keep the same weight.
- **Inside the range:** keep the same weight and beat the total reps.
- **Short of the range on two or more sets:** keep the same weight. After three stalled sessions, drop 10%.

## Reminders (push notifications)

`push/` is a Cloudflare Worker that sends Web Push notifications for the daily reminders and the rest timer, even when the phone is locked. One Durable Object stores the subscription, the reminder list the app sends it, and any pending rest alert. It then sets an alarm for whichever is due next. It creates its own VAPID keys on first use, so the only secrets are the Cloudflare deploy credentials.

To deploy, add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets, then run the **Deploy push server** workflow. Put the Worker's URL in `PUSH_URL` in `index.html`.

On iPhone, notifications only work when the app is opened from the Home Screen (iOS 16.4 or later). Turn them on from the bell in the top bar.
