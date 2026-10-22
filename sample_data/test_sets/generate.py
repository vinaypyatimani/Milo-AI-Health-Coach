"""Generate fake tracker data for testing Milo: three people, 22 Oct - 20 Dec 2026.

    python sample_data/test_sets/generate.py

Writes gym/, running/ and marathon/ next to this file. Every file is
synthetic (made-up GPS loop, modelled heart rate), so it's safe to share.
The data is deterministic: running the script again gives the same files.

Each set covers this week (Thu 22 - Sun 25 Oct, for "start today") plus
eight full weeks from Monday 26 Oct (for "start next Monday"), and has
recovery data (sleep, resting HR, HRV) from 1 Oct so Milo has a baseline.
Each set has things for Milo to notice: missed, moved and extra sessions,
easy runs that were too hard, a bad week of sleep, and so on.
"""
from __future__ import annotations

import csv
import math
import random
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
TZ = ZoneInfo("Europe/Berlin")
THIS_MONDAY = date(2026, 10, 19)        # week 0 = this week (only Thu-Sun has data)
FIRST_DAY = date(2026, 10, 22)          # today
LAST_DAY = date(2026, 12, 20)
BASELINE_FROM = date(2026, 10, 1)
HOME = (49.0135, 8.4153)                # a park loop (made up)
DAY_NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def day(week: int, weekday: int) -> date:
    """week 1 = the week starting Monday 26 Oct; weekday 0 = Monday."""
    return THIS_MONDAY + timedelta(weeks=week, days=weekday)


# ---------------------------------------------------------------------------
# Workouts and heart-rate models
# ---------------------------------------------------------------------------
@dataclass
class Segment:
    minutes: float
    pace: float | None      # min/km, None = not moving (gym)
    hr: float               # target as a fraction of max HR
    kind: str = "steady"    # steady | sets


@dataclass
class Workout:
    d: date
    sport: str              # run | strength | cycling | walk
    title: str
    start: time
    segments: list[Segment]
    fmt: str = "gpx"        # gpx | tcx | csv
    drift: float = 0.0      # extra HR fraction gained by the end (fatigue, heat)
    notes: str = ""
    extra_fields: dict = field(default_factory=dict)

    @property
    def minutes(self) -> float:
        return sum(s.minutes for s in self.segments)

    @property
    def km(self) -> float:
        return sum(s.minutes / s.pace for s in self.segments if s.pace)


def run(d, title, start, minutes=None, pace=5.8, hr=0.66, km=None, drift=0.02, fmt="gpx", warm=True):
    """A steady run with a short warm-up and cool-down."""
    if km is not None:
        minutes = km * pace
    w = [Segment(5, pace + 0.6, hr - 0.06)] if warm else []
    main = minutes - (8 if warm else 0)
    cool = [Segment(3, pace + 0.8, hr - 0.05)] if warm else []
    return Workout(d, "run", title, start, w + [Segment(main, pace, hr)] + cool, fmt=fmt, drift=drift)


def intervals(d, title, start, reps, on_min, off_min, on_pace, hr_on, easy_pace=6.2, fmt="gpx"):
    segs = [Segment(12, easy_pace, 0.64)]
    for _ in range(reps):
        segs += [Segment(on_min, on_pace, hr_on), Segment(off_min, easy_pace + 0.8, 0.70)]
    segs.append(Segment(8, easy_pace + 0.4, 0.62))
    return Workout(d, "run", title, start, segs, fmt=fmt, drift=0.01)


def gym(d, title, start, minutes, hr=0.62, fmt="tcx", notes=""):
    segs = [Segment(8, None, 0.55), Segment(minutes - 13, None, hr, "sets"), Segment(5, None, 0.52)]
    # Devices save gym sessions as Sport="Other" in TCX; the notes say what it was.
    label = f"Strength training: {title.lower()}" + (f" ({notes})" if notes else "")
    return Workout(d, "strength", title, start, segs, fmt=fmt, notes=label)


def bike(d, title, start, minutes, kmh=24, hr=0.64):
    return Workout(d, "cycling", title, start, [Segment(minutes, 60 / kmh, hr)], fmt="tcx", drift=0.01)


def hr_series(w: Workout, max_hr: int, rest_hr: int, rng: random.Random, step_s: int):
    """Heart rate every step_s seconds: eases toward each segment's target,
    drifts up over long efforts, and rises and falls with gym sets."""
    total = w.minutes * 60
    out, bpm, t = [], rest_hr + 25.0, 0.0
    seg_start = 0.0
    for seg in w.segments:
        seg_len = seg.minutes * 60
        while t < seg_start + seg_len:
            target = seg.hr + w.drift * (t / total)
            if seg.kind == "sets":   # ~45 s work, ~90 s rest
                phase = (t - seg_start) % 135
                target += 0.12 if phase < 45 else -0.06
            goal = target * max_hr
            bpm += (goal - bpm) * (1 - math.exp(-step_s / 35))   # the heart lags the effort
            out.append((t, max(rest_hr + 10, round(bpm + rng.gauss(0, 1.6)))))
            t += step_s
        seg_start += seg_len
    return out


def track_points(w: Workout, step_s: int):
    """GPS positions along a 2.4 km loop at each segment's pace."""
    lat0, lon0 = HOME
    radius_m = 2400 / (2 * math.pi)
    dist, t, pts, seg_start = 0.0, 0.0, [], 0.0
    for seg in w.segments:
        speed = 1000 / (seg.pace * 60) if seg.pace else 0.0     # m/s
        while t < seg_start + seg.minutes * 60:
            a = dist / radius_m
            lat = lat0 + (radius_m * math.sin(a)) / 111_320
            lon = lon0 + (radius_m * (1 - math.cos(a))) / (111_320 * math.cos(math.radians(lat0)))
            pts.append((t, lat, lon, dist))
            dist += speed * step_s
            t += step_s
        seg_start += seg.minutes * 60
    return pts


# ---------------------------------------------------------------------------
# File writers
# ---------------------------------------------------------------------------
def start_utc(w: Workout) -> datetime:
    return datetime.combine(w.d, w.start, TZ).astimezone(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def write_gpx(w: Workout, path: Path, max_hr: int, rest_hr: int, rng: random.Random):
    step = 5 if w.minutes <= 70 else 10
    t0 = start_utc(w)
    hrs = dict(hr_series(w, max_hr, rest_hr, rng, step))
    gtype = {"run": "running", "walk": "hiking", "cycling": "cycling"}.get(w.sport, w.sport)
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<gpx version="1.1" creator="Milo test data generator" xmlns="http://www.topografix.com/GPX/1/1" '
             'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">',
             f"<trk><name>{w.title}</name><type>{gtype}</type><trkseg>"]
    for t, lat, lon, _ in track_points(w, step):
        lines.append(f'<trkpt lat="{lat:.6f}" lon="{lon:.6f}"><time>{iso(t0 + timedelta(seconds=t))}</time>'
                     f"<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>{hrs[t]}</gpxtpx:hr>"
                     "</gpxtpx:TrackPointExtension></extensions></trkpt>")
    lines.append("</trkseg></trk></gpx>")
    path.write_text("\n".join(lines), encoding="utf-8")


def write_tcx(w: Workout, path: Path, max_hr: int, rest_hr: int, rng: random.Random):
    step = 5 if w.minutes <= 70 else 10
    t0 = start_utc(w)
    sport = {"run": "Running", "cycling": "Biking"}.get(w.sport, "Other")
    hrs = hr_series(w, max_hr, rest_hr, rng, step)
    moving = w.sport in ("run", "walk")      # indoor bike and gym: no GPS
    pts = {t: (lat, lon, d) for t, lat, lon, d in track_points(w, step)}
    dist_m = w.km * 1000
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">',
           f'<Activities><Activity Sport="{sport}"><Id>{iso(t0)}</Id>',
           f'<Lap StartTime="{iso(t0)}"><TotalTimeSeconds>{w.minutes * 60:.0f}</TotalTimeSeconds>',
           f"<DistanceMeters>{dist_m:.1f}</DistanceMeters><Intensity>Active</Intensity>"
           "<TriggerMethod>Manual</TriggerMethod><Track>"]
    for t, bpm in hrs:
        pos = ""
        if moving and t in pts:
            lat, lon, d = pts[t]
            pos = (f"<Position><LatitudeDegrees>{lat:.6f}</LatitudeDegrees><LongitudeDegrees>{lon:.6f}"
                   f"</LongitudeDegrees></Position><DistanceMeters>{d:.1f}</DistanceMeters>")
        out.append(f"<Trackpoint><Time>{iso(t0 + timedelta(seconds=t))}</Time>{pos}"
                   f"<HeartRateBpm><Value>{bpm}</Value></HeartRateBpm></Trackpoint>")
    out.append("</Track></Lap>")
    if w.notes:
        out.append(f"<Notes>{w.notes}</Notes>")
    out.append("</Activity></Activities></TrainingCenterDatabase>")
    path.write_text("\n".join(out), encoding="utf-8")


def csv_row(w: Workout, max_hr: int, rest_hr: int, rng: random.Random) -> dict:
    bpms = [b for _, b in hr_series(w, max_hr, rest_hr, rng, 10)]
    return {"date": w.d.isoformat(), "time": w.start.strftime("%H:%M"), "type": w.sport,
            "duration_min": round(w.minutes), "distance_km": round(w.km, 2) if w.km else "",
            "avg_hr": round(sum(bpms) / len(bpms)), "max_hr": max(bpms), "notes": w.notes or w.title}


# ---------------------------------------------------------------------------
# Recovery: sleep, resting HR, HRV (one row per day)
# ---------------------------------------------------------------------------
def recovery_rows(rng, sleep, rhr, hrv, bad_days: dict[date, tuple[float, int, int]]):
    rows, d = [], BASELINE_FROM
    while d <= LAST_DAY:
        weekend = d.weekday() >= 5
        s = sleep + (0.5 if weekend else 0) + rng.gauss(0, 0.35)
        r = rhr + rng.gauss(0, 1.0)
        v = hrv + rng.gauss(0, 4)
        if d in bad_days:
            ds, dr, dv = bad_days[d]
            s, r, v = s + ds, r + dr, v + dv
        rows.append({"date": d.isoformat(), "sleep_hours": round(s, 1), "resting_hr": round(r), "hrv_ms": round(v)})
        d += timedelta(days=1)
    return rows


def span(first: date, days: int, delta: tuple[float, int, int]) -> dict:
    return {first + timedelta(days=i): delta for i in range(days)}


# ---------------------------------------------------------------------------
# The three people
# ---------------------------------------------------------------------------
T_AM, T_LUNCH, T_PM = time(7, 0), time(12, 15), time(18, 30)


def gym_set(rng):
    """Sam, 29: gym 4x a week (upper/lower split) plus easy indoor cycling."""
    w = []
    w += [gym(day(0, 3), "Upper body", T_PM, 45), gym(day(0, 5), "Full body", time(10, 0), 50)]
    for k in range(1, 9):
        deload = k == 8
        base = 45 if deload else min(50 + 2 * k, 62)
        hr = 0.58 if deload else 0.62
        if k == 3:                                   # sick Tue-Thu: two sessions missed
            w += [gym(day(k, 0), "Upper body", T_PM, base, hr), gym(day(k, 5), "Full body", time(10, 0), 40, 0.58,
                                                                      notes="first session after a cold, kept it light")]
            continue
        w.append(gym(day(k, 0), "Upper body", T_PM, base, hr))
        lower_day = 2 if k == 5 else 1               # week 5: lower body moved to Wednesday
        w.append(gym(day(k, lower_day), "Lower body", T_PM, base + 3, hr + 0.02))
        if k in (1, 2, 4, 6, 7):
            w.append(bike(day(k, 2 if k != 5 else 4), "Easy spin", time(7, 15), 30))
        w.append(gym(day(k, 3), "Upper body", T_PM, base, hr))
        w.append(gym(day(k, 5), "Full body", time(10, 0), base + 5, hr + 0.03))
        if k == 6:                                   # an extra hike on Sunday
            hike = Workout(day(k, 6), "walk", "Sunday hike", time(11, 0), [Segment(95, 12.5, 0.55)], drift=0.04)
            w.append(hike)
    bad = {**span(day(3, 0), 5, (-1.2, 7, -18)), **span(day(6, 3), 2, (-1.5, 3, -8))}
    rec = recovery_rows(rng, 7.3, 58, 56, bad)
    profile = dict(name="Sam", age=29, max_hr=190, rest_hr=58)
    return w, rec, profile


def running_set(rng):
    """Alex, 32: running a 10K race on Sat 19 Dec, 3 runs + 1 strength a week."""
    w = [run(day(0, 3), "Easy run", T_PM, 30, 6.2, 0.66), run(day(0, 5), "Easy run", time(9, 30), 40, 6.2, 0.66)]
    long_min = {1: 50, 2: 55, 3: 60, 4: 45, 5: 65, 6: 70, 7: 75, 8: 40}
    for k in range(1, 9):
        easy_hr = 0.74 if k == 6 else 0.66          # week 6: easy runs much too fast (Zone 3)
        easy_pace = 5.65 if k == 6 else 6.1
        w.append(run(day(k, 1), "Easy run", T_PM, 35 + min(k, 5) * 2 if k != 4 else 30, easy_pace, easy_hr))
        if k == 5:                                   # travel: Thursday missed, an easy run on Friday instead
            w.append(run(day(k, 4), "Easy run (hotel)", time(6, 45), 30, 6.0, 0.67))
        elif k == 8:
            w.append(intervals(day(k, 3), "Race sharpener", T_PM, 4, 2, 2, 5.0, 0.86))
        else:
            reps = 4 if k == 4 else min(4 + k, 8)
            w.append(intervals(day(k, 3), "Intervals", T_PM, reps, 3, 2, 4.95 - 0.02 * k, 0.88))
        if k != 4:
            w.append(gym(day(k, 2), "Strength for runners", T_LUNCH, 30, fmt="csv", notes="squats, lunges, core"))
        if k == 8:                                   # race day
            w.append(run(day(k, 5), "10K race", time(10, 0), km=10.05, pace=5.32, hr=0.89, drift=0.05, warm=False))
        else:
            drift = 0.09 if k == 2 else 0.03         # week 2: long run drifted out of Zone 2
            w.append(run(day(k, 5), "Long run", time(9, 30), long_min[k], 6.35, 0.665, drift=drift))
    bad = {**span(day(2, 4), 3, (-1.4, 4, -12)), **span(day(5, 3), 3, (-1.0, 3, -6))}
    rec = recovery_rows(rng, 7.1, 54, 64, bad)
    profile = dict(name="Alex", age=32, max_hr=188, rest_hr=54)
    return w, rec, profile


def marathon_set(rng):
    """Jordan, 38: marathon on Sun 20 Dec, 5 runs a week, half marathon tune-up on 29 Nov."""
    w = [run(day(0, 3), "Easy run", T_AM, km=10, pace=5.7, hr=0.68),
         run(day(0, 5), "Easy run", time(9, 0), km=8, pace=5.75, hr=0.67),
         run(day(0, 6), "Long run", time(8, 30), km=20, pace=5.85, hr=0.70, fmt="tcx")]
    long_km = {1: 24, 2: 27, 3: 29, 4: 20, 6: 28, 7: 22}
    for k in range(1, 9):
        taper = k >= 7
        if k == 8:
            w.append(intervals(day(k, 1), "Race-pace strides", T_AM, 4, 1, 2, 4.6, 0.84, easy_pace=5.7))
            w.append(run(day(k, 3), "Easy run", T_AM, km=8, pace=5.7, hr=0.67))
            w.append(run(day(k, 4), "Shakeout", T_AM, km=5, pace=5.8, hr=0.65, warm=False))
            w.append(run(day(k, 6), "Marathon", time(9, 0), km=42.3, pace=5.07, hr=0.83, drift=0.06, fmt="tcx",
                         warm=False))
            continue
        reps = 5 if taper else 6 + (k % 3)
        w.append(intervals(day(k, 1), "Intervals", T_AM, reps, 4 if not taper else 3, 2, 4.25, 0.91,
                           easy_pace=5.7, fmt="gpx"))
        if k != 3:                                    # week 3: tired, skipped Wednesday
            w.append(run(day(k, 2), "Easy run", T_PM, km=10 if not taper else 8, pace=5.7, hr=0.68))
        if k == 5:
            w.append(run(day(k, 3), "Easy run", T_AM, km=8, pace=5.8, hr=0.67))
            w.append(run(day(k, 6), "Half marathon (tune-up)", time(10, 0), km=21.15, pace=4.72, hr=0.88,
                         drift=0.05, fmt="tcx", warm=False))
        else:
            w.append(run(day(k, 3), "Tempo run", T_AM, km=12 if not taper else 9, pace=4.85, hr=0.86))
            w.append(run(day(k, 5), "Easy run", time(9, 0), km=8, pace=5.8, hr=0.67))
            drift = 0.10 if k == 6 else 0.05          # week 6: the 32 km long run was cut to 28 km, HR high
            w.append(run(day(k, 6), "Long run", time(8, 30), km=long_km[k], pace=5.9, hr=0.71, drift=drift, fmt="tcx"))
        if k == 7:
            w.append(bike(day(k, 4), "Cross-training spin", time(7, 0), 40, 25, 0.62))
    bad = {**span(day(3, 0), 4, (-0.9, 5, -15)), **span(day(6, 6), 2, (-0.6, 4, -10)),
           **span(day(8, 3), 3, (-0.8, 2, -4))}     # pre-race nerves
    rec = recovery_rows(rng, 7.4, 48, 72, bad)
    profile = dict(name="Jordan", age=38, max_hr=182, rest_hr=48)
    return w, rec, profile


def write_set(name: str, builder, seed: int) -> dict:
    rng = random.Random(seed)
    workouts, recovery, profile = builder(rng)
    out = HERE / name
    out.mkdir(exist_ok=True)
    for old in out.iterdir():
        if old.suffix in (".gpx", ".tcx", ".csv"):
            old.unlink()
    csv_rows = []
    for w in sorted(workouts, key=lambda x: (x.d, x.start)):
        slug = w.title.lower().replace(" ", "_").replace("(", "").replace(")", "")
        stem = f"{w.d.isoformat()}_{DAY_NAMES[w.d.weekday()]}_{slug}"
        if w.fmt == "gpx":
            write_gpx(w, out / f"{stem}.gpx", profile["max_hr"], profile["rest_hr"], rng)
        elif w.fmt == "tcx":
            write_tcx(w, out / f"{stem}.tcx", profile["max_hr"], profile["rest_hr"], rng)
        else:
            csv_rows.append(csv_row(w, profile["max_hr"], profile["rest_hr"], rng))
    if csv_rows:
        with open(out / "workouts_manual.csv", "w", newline="", encoding="utf-8") as f:
            wr = csv.DictWriter(f, fieldnames=list(csv_rows[0]))
            wr.writeheader()
            wr.writerows(csv_rows)
    with open(out / "recovery.csv", "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=["date", "sleep_hours", "resting_hr", "hrv_ms"])
        wr.writeheader()
        wr.writerows(recovery)
    return {"workouts": len(workouts), "files": len(list(out.iterdir())), **profile}


if __name__ == "__main__":
    for name, builder, seed in (("gym", gym_set, 1), ("running", running_set, 2), ("marathon", marathon_set, 3)):
        print(name, write_set(name, builder, seed))
