# Play Store preview video

> summary: Source for the 30 s vertical (1080×1920) Sun Chaser preview video for the Google Play store listing. Real app footage is captured frame by frame, composed in an HTML page, rendered to MP4, and mixed with Mixkit audio. This file covers the pipeline, the commands, and what is not in git.

## What is here

| File | Role |
|---|---|
| `shots.mjs` | Shot list: city, local time, weather, easter egg, frame count for each piece of app footage. |
| `cap.mjs` | Captures one shot from the dev server, frame by frame, on Playwright's fake clock. CSS animations are paused and stepped, so the motion is smooth at any speed. Output: `frames/<shot>/NNNNN.jpg`. |
| `measure.mjs` | Prints the screen positions of the UI rows and chips that `ad.html` zooms into or rings. |
| `ad.html` | The composition. `renderAt(t)` draws second `t` (text, phone frame, cuts on a 165 BPM grid, drop at 6.6 s). Open it in a browser to preview the loop. |
| `render.mjs` | Steps `ad.html` through 900 frames and encodes `ad-silent.mp4`. |
| `mix.py` | Downloads the Mixkit audio, mixes music and 26 sound cues, normalises to −14 LUFS, writes `sun-chaser-ad.mp4`. |
| `AUDIO-LICENSES.md` | Licence record for every sound. |
| `cover.jpg` | A still from the hook (1080×1920). |

## Make the video

```sh
npm run dev                                   # in the repo root, port 8080
cd store/preview-video
for s in hook phonein timelapse terrain rain storm snow fog golden calm aurora fireworks eclipse sunglasses disco ufo; do node cap.mjs $s; done
node render.mjs video                         # → ad-silent.mp4 (about 2 min)
python3 mix.py                                # → sun-chaser-ad.mp4
```

The scripts need `playwright-core` (a dev dependency) with its Chromium installed, ffmpeg, and Python 3.

## Not in git

- `frames/`, `ad-silent.mp4` and `sun-chaser-ad.mp4` are generated.
- `audio/` holds the Mixkit files. The Mixkit Free License allows their use in the ad but not redistribution of the files themselves. `mix.py` downloads them.

## Gotchas

- `shots.mjs` uses real weather and forecast, so it needs a date within the forecast window. To re-shoot, change the date in `at()`. Then run `measure.mjs` and update `LOUPE` and `CHIP` in `ad.html` if the panel layout moved.
- Eggs that start at page load and run out (UFO) need `pauseNow`. The disco egg is started with the Konami code in `setup`.
- To change the music, measure its tempo and drop. Then set `P` and `DROP` in `ad.html` and in `mix.py`, and set `MUSIC_START` to drop time minus `DROP`.
