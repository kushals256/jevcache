#!/usr/bin/env python3
"""Synthesize launch score from timing.json — one timing source for picture + audio."""
from __future__ import annotations

import json
import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIMING = json.loads((ROOT / "timing.json").read_text())
OUT = ROOT / "assets" / "audio" / "score.wav"
SR = int(TIMING["sampleRate"])
DUR = float(TIMING["duration"])
N = int(SR * DUR)


def env(t: float, a: float, h: float, r: float) -> float:
    if t < 0:
        return 0.0
    if t < a:
        return t / a
    if t < a + h:
        return 1.0
    if t < a + h + r:
        return 1.0 - (t - a - h) / r
    return 0.0


def tone(freq: float, t: float) -> float:
    return math.sin(2 * math.pi * freq * t)


def kick(t: float) -> float:
    e = env(t, 0.002, 0.02, 0.18)
    return e * (0.9 * tone(78 * math.exp(-t * 8), t) + 0.35 * tone(48, t))


def snare(t: float) -> float:
    e = env(t, 0.001, 0.01, 0.12)
    # deterministic noise from hash of sample index via sin
    n = math.sin(t * 17341.7) * math.sin(t * 9127.3)
    return e * (0.55 * n + 0.25 * tone(180, t))


def hat(t: float) -> float:
    e = env(t, 0.001, 0.005, 0.04)
    n = math.sin(t * 33412.1) * math.sin(t * 22117.9)
    return e * 0.22 * n


def bass(freq: float, t: float, gate: float) -> float:
    e = env(t, 0.01, gate, 0.08)
    return e * 0.28 * (tone(freq, t) + 0.3 * tone(freq * 2, t))


def stab(freq: float, t: float) -> float:
    e = env(t, 0.005, 0.04, 0.18)
    return e * 0.22 * (tone(freq, t) + 0.5 * tone(freq * 1.5, t) + 0.25 * tone(freq * 2, t))


def riser(t: float, length: float) -> float:
    if t < 0 or t > length:
        return 0.0
    p = t / length
    f = 120 + 900 * p * p
    return (0.08 + 0.12 * p) * tone(f, t) * (0.4 + 0.6 * p)


def impact(t: float) -> float:
    e = env(t, 0.002, 0.03, 0.35)
    return e * (0.7 * tone(55 * math.exp(-t * 6), t) + 0.4 * snare(t) + 0.2 * tone(220, t))


buf = [0.0] * N
cues = TIMING["cues"]
beats = TIMING["beats"]

# Pulse bed on beats
for i, b in enumerate(beats):
    for j in range(int(0.25 * SR)):
        t = j / SR
        idx = int((b + t) * SR)
        if 0 <= idx < N:
            buf[idx] += kick(t) * (0.85 if i % 4 == 0 else 0.55)
            if i % 2 == 1:
                buf[idx] += hat(t)
            if i % 4 == 2:
                buf[idx] += snare(t) * 0.7

# Bass root pattern (A minor-ish)
roots = [110, 110, 82.5, 98, 110, 73.5, 82.5, 98]
for k, b in enumerate(beats):
    freq = roots[k % len(roots)]
    for j in range(int(0.35 * SR)):
        t = j / SR
        idx = int((b + t) * SR)
        if 0 <= idx < N:
            buf[idx] += bass(freq, t, 0.22)

# Stabs on key story cues
for key, freq in [
    ("slipsLand", 220),
    ("chargeStamp", 165),
    ("intentStamp", 330),
    ("voidHit", 440),
    ("hitReveal", 554),
    ("jaccardWrong", 185),
    ("morrowWins", 370),
    ("baseUrlCut", 247),
    ("refuseStamp", 196),
    ("installIn", 294),
    ("endIn", 440),
]:
    start = float(cues[key])
    for j in range(int(0.5 * SR)):
        t = j / SR
        idx = int((start + t) * SR)
        if 0 <= idx < N:
            buf[idx] += stab(freq, t)
            if key in ("intentStamp", "voidHit", "hitReveal", "morrowWins"):
                buf[idx] += impact(t) * 0.55

# Risers into intent stamp and install
for start_key, length in [("paraphraseStart", 2.3), ("morrowWins", 1.4), ("installIn", 1.6)]:
    start = float(cues[start_key]) - length
    for j in range(int(length * SR)):
        t = j / SR
        idx = int((start + t) * SR)
        if 0 <= idx < N:
            buf[idx] += riser(t, length)

# Soft pad under end lockup
end = float(cues["endIn"])
for j in range(int((DUR - end) * SR)):
    t = j / SR
    idx = int((end + t) * SR)
    if 0 <= idx < N:
        pad = env(t, 0.4, 2.5, 1.2) * 0.08 * (tone(220, t) + 0.5 * tone(330, t) + 0.35 * tone(440, t))
        buf[idx] += pad

# Peak normalize toward ~−12 LUFS-ish by peak first, then soft ceiling
peak = max(abs(x) for x in buf) or 1.0
gain = 0.72 / peak
for i, x in enumerate(buf):
    y = x * gain
    # soft clip
    buf[i] = math.tanh(y * 1.15) * 0.92

OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "w") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    frames = b"".join(struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in buf)
    w.writeframes(frames)

print(f"wrote {OUT}  duration={DUR}s  peak_gain={gain:.3f}")
