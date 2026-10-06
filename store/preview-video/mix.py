# Builds the soundtrack from Mixkit assets only (Mixkit Free License: commercial use incl. online ads,
# no attribution). Music: "Follow My Voice" by Michael Ramir C. (Mixkit #1138), 165 BPM, drop at 13.09 s,
# started at 6.49 s so the drop lands on the video's 6.6 s cut. The audio files are not in git (the Mixkit
# licence forbids redistributing them as-is): fetch() downloads them from the Mixkit CDN into audio/.
# Loudness-normalised to -14 LUFS, muxed onto ad-silent.mp4 → sun-chaser-ad.mp4.
import os, subprocess, urllib.request

P, DROP = 60 / 165, 6.6
B = lambda n: DROP + n * P
PHONE, TERRAIN, WEATHER, GOLDEN, BRK, MONT, END = B(-11), B(14), B(23), B(31), B(39), B(43), B(55)
MUSIC, MUSIC_START = 'audio/1138.mp3', 6.49
SLAM, DROPHIT, LOGO = '2299', '788', '2900'          # Short bass hit, Big cinematic impact, Movie logo intro impact
WHOOSH, FAST, SWIPE = '1489', '1490', '2627'         # Air woosh, Fast whoosh transition, Fast swipe zoom
TAP, POP, RISE, NOTE, SPARK = '2577', '2364', '2350', '951', '3062'  # click, pop, sparkle whoosh, notification, wand sparkle

CUES = [  # (time s, sfx id, volume, max length s)
    (B(-18), SLAM, .7, 1), (B(-16), SLAM, .7, 1), (B(-14), SLAM, .85, 1),
    (PHONE - .15, WHOOSH, .6, 2),
    (PHONE + 28 / 30, TAP, .9, 1),          # panel opens on captured frame 28
    (PHONE + 1.75, POP, .6, 1),             # loupe
    (B(-3), RISE, .45, 1.1),                # "Now watch this."
    (DROP, DROPHIT, .9, 1.6),
    (TERRAIN - .14, SWIPE, .7, 1),
    (B(17), NOTE, .5, 1.5),                 # "It knows."
    *[(WEATHER + 2 * i * P, FAST, .45, 1) for i in range(4)],
    (GOLDEN - .14, SWIPE, .7, 1),
    (GOLDEN + .95, POP, .6, 1),
    (BRK - .32, WHOOSH, .5, 2),
    *[(MONT + 2 * i * P, FAST, .5, 1) for i in range(6)],
    (MONT + 2 * P, SPARK, .35, 1.5),        # fireworks
    (END, LOGO, 1.0, 2.6),
    (END + .42, SPARK, .4, 1.5),
]

def fetch(path, url):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        open(path, 'wb').write(urllib.request.urlopen(req, timeout=60).read())

fetch(MUSIC, 'https://assets.mixkit.co/music/1138/1138.mp3')
for sid in {c[1] for c in CUES}:
    fetch(f'audio/sfx/{sid}.mp3', f'https://assets.mixkit.co/active_storage/sfx/{sid}/{sid}-preview.mp3')

inputs = ['-i', 'ad-silent.mp4', '-ss', str(MUSIC_START), '-t', '30', '-i', MUSIC]
# The track has no break: duck it by ~9 dB for the "…or just watch" breath (BRK → MONT).
duck = f"volume='if(between(t,{BRK:.3f},{MONT:.3f}),0.35,1)':eval=frame"
chains = [f'[1:a]afade=t=in:d=0.08,{duck},afade=t=out:st=28.4:d=1.6,volume=0.6[bgm]']
for i, (t, sid, vol, length) in enumerate(CUES):
    inputs += ['-i', f'audio/sfx/{sid}.mp3']
    ms = round(t * 1000)
    chains.append(f'[{i + 2}:a]aresample=48000,atrim=0:{length},afade=t=out:st={max(0, length - .3):.2f}:d=0.3,'
                  f'volume={vol},adelay={ms}|{ms}[s{i}]')
mix_in = '[bgm]' + ''.join(f'[s{i}]' for i in range(len(CUES)))
chains.append(f'{mix_in}amix=inputs={len(CUES) + 1}:normalize=0:duration=first,'
              'loudnorm=I=-14:TP=-1.0:LRA=11,alimiter=limit=0.8:level=false,aresample=48000[a]')
cmd = ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(chains),
       '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', '30',
       '-movflags', '+faststart', 'sun-chaser-ad.mp4']
subprocess.run(cmd, check=True)
print('wrote sun-chaser-ad.mp4 with', len(CUES), 'sfx cues')
