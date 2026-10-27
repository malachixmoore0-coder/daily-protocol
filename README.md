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
