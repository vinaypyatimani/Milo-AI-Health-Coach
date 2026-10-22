"""Generate synthetic tracker files for testing and demos (no real health data).

Creates, in sample_data/:
    sample_plan.json        a 4-week 10K plan starting Monday 2026-10-12
    week1_tue_easy_run.gpx  easy run, mostly Zone 2
    week1_fri_strength.tcx  strength session, moved from Thursday to Friday
    week1_sat_long_run.fit  long run, drifting into Zone 3
    recovery.csv            sleep / resting HR / HRV, 3 baseline weeks + week 1
    apple_health_export.zip small Apple Health export with a workout and recovery data

Profile assumption: age 30 -> max HR 190 -> Zone 2 = 114-133 bpm.

Run:  python scripts/generate_samples.py      (from the backend/ folder)
"""
from __future__ import annotations

import io
import json
import math
import random
import struct
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent.parent / "sample_data"
PLAN_START = date(2026, 10, 12)
random.seed(42)


# ---------------------------------------------------------------------------
# Plan
# ---------------------------------------------------------------------------
def session(day, type_, title, dur, dist=None, kind="none", value="", notes=""):
    return {"day": day, "type": type_, "title": title, "duration_min": dur,
            "distance_km": dist, "target_intensity": {"kind": kind, "value": value},
            "notes": notes}


def make_plan() -> dict:
    weeks = []
    for n, (easy, longr, focus) in enumerate(
            [(30, 45, "Build the habit"), (32, 50, "Add a little volume"),
             (35, 55, "Steady progression"), (28, 40, "Recovery week")], start=1):
        weeks.append({
            "week_number": n, "focus": focus,
            "sessions": [
                session("Monday", "rest", "Rest", 0),
                session("Tuesday", "run", "Easy run", easy, round(easy / 6.2, 1), "hr_zone", "Zone 2",
                        "Conversational pace"),
                session("Wednesday", "rest", "Rest", 0),
                session("Thursday", "strength", "Full-body strength", 40, None, "rpe", "RPE 6",
                        "Squats, lunges, push-ups, planks"),
                session("Friday", "rest", "Rest", 0),
                session("Saturday", "run", "Long run", longr, round(longr / 6.4, 1), "hr_zone", "Zone 2",
                        "Slow and steady"),
                session("Sunday", "mobility", "Mobility", 20, None, "none", "", "Stretching or yoga"),
            ],
        })
    return {"goal": "Run a 10K comfortably by December", "start_date": PLAN_START.isoformat(),
            "weeks": weeks}


# ---------------------------------------------------------------------------
# HR / GPS helpers
# ---------------------------------------------------------------------------
def hr_series(minutes: float, base: int, drift: int) -> list[int]:
    """HR rising from warm-up to `base`, then drifting up by `drift` bpm."""
    n = int(minutes * 60 / 5)
    out = []
    for i in range(n):
        t = i / max(n - 1, 1)
        warm = min(1.0, i / 60)  # ~5 min warm-up
        out.append(int(95 + (base - 95) * warm + drift * t + random.uniform(-3, 3)))
    return out


def track(start_utc: datetime, minutes: float, km: float, hrs: list[int]):
    """Points on a loop around Karlsruhe palace gardens, every 5 s."""
    pts = []
    radius_km = km / (2 * math.pi)
    for i, hr in enumerate(hrs):
        ang = 2 * math.pi * i / len(hrs)
        lat = 49.0135 + (radius_km / 111.0) * math.sin(ang)
        lon = 8.4044 + (radius_km / (111.0 * math.cos(math.radians(49)))) * math.cos(ang)
        pts.append((start_utc + timedelta(seconds=5 * i), lat, lon, hr))
    return pts


# ---------------------------------------------------------------------------
# GPX
# ---------------------------------------------------------------------------
def write_gpx(path: Path, start_utc: datetime, minutes: float, km: float, hrs: list[int]):
    rows = []
    for t, lat, lon, hr in track(start_utc, minutes, km, hrs):
        rows.append(
            f'<trkpt lat="{lat:.6f}" lon="{lon:.6f}"><time>{t.strftime("%Y-%m-%dT%H:%M:%SZ")}</time>'
            f'<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>{hr}</gpxtpx:hr>'
            f'</gpxtpx:TrackPointExtension></extensions></trkpt>')
    path.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx version="1.1" creator="Milo sample generator" '
        'xmlns="http://www.topografix.com/GPX/1/1" '
        'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">\n'
        '<trk><name>Easy run</name><type>running</type><trkseg>\n'
        + "\n".join(rows) + "\n</trkseg></trk></gpx>\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# TCX
# ---------------------------------------------------------------------------
def write_tcx(path: Path, start_utc: datetime, minutes: float, hrs: list[int]):
    iso = lambda t: t.strftime("%Y-%m-%dT%H:%M:%SZ")  # noqa: E731
    tps = "\n".join(
        f"<Trackpoint><Time>{iso(start_utc + timedelta(seconds=5 * i))}</Time>"
        f"<HeartRateBpm><Value>{hr}</Value></HeartRateBpm></Trackpoint>"
        for i, hr in enumerate(hrs))
    path.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">\n'
        f'<Activities><Activity Sport="Other"><Id>{iso(start_utc)}</Id>'
        f'<Lap StartTime="{iso(start_utc)}"><TotalTimeSeconds>{minutes * 60:.0f}</TotalTimeSeconds>'
        f'<DistanceMeters>0</DistanceMeters><Track>\n{tps}\n</Track></Lap></Activity></Activities>\n'
        '</TrainingCenterDatabase>\n', encoding="utf-8")


# ---------------------------------------------------------------------------
# FIT (minimal encoder: file_id, records, session)
# ---------------------------------------------------------------------------
_CRC_TABLE = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
              0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400]
_FIT_EPOCH = datetime(1989, 12, 31, tzinfo=timezone.utc)


def _crc(data: bytes, crc: int = 0) -> int:
    for byte in data:
        tmp = _CRC_TABLE[crc & 0xF]
        crc = (crc >> 4) & 0x0FFF
        crc = crc ^ tmp ^ _CRC_TABLE[byte & 0xF]
        tmp = _CRC_TABLE[crc & 0xF]
        crc = (crc >> 4) & 0x0FFF
        crc = crc ^ tmp ^ _CRC_TABLE[(byte >> 4) & 0xF]
    return crc


def _fit_ts(t: datetime) -> int:
    return int((t - _FIT_EPOCH).total_seconds())


def _definition(local: int, global_num: int, fields: list[tuple[int, int, int]]) -> bytes:
    out = struct.pack("<BBBHB", 0x40 | local, 0, 0, global_num, len(fields))
    for num, size, base in fields:
        out += struct.pack("<BBB", num, size, base)
    return out


def write_fit(path: Path, start_utc: datetime, minutes: float, km: float, hrs: list[int]):
    body = io.BytesIO()
    # file_id: type=activity(4), manufacturer=development(255), time_created
    body.write(_definition(0, 0, [(0, 1, 0x00), (1, 2, 0x84), (4, 4, 0x86)]))
    body.write(struct.pack("<BBHI", 0, 4, 255, _fit_ts(start_utc)))
    # record: timestamp, heart_rate, distance (cm)
    body.write(_definition(1, 20, [(253, 4, 0x86), (3, 1, 0x02), (5, 4, 0x86)]))
    for i, hr in enumerate(hrs):
        t = start_utc + timedelta(seconds=5 * i)
        dist_cm = int(km * 100000 * i / max(len(hrs) - 1, 1))
        body.write(struct.pack("<BIBI", 1, _fit_ts(t), hr, dist_cm))
    # session: timestamp, start_time, elapsed, timer, distance, sport, avg/max HR
    end = start_utc + timedelta(minutes=minutes)
    body.write(_definition(2, 18, [(253, 4, 0x86), (2, 4, 0x86), (7, 4, 0x86), (8, 4, 0x86),
                                   (9, 4, 0x86), (5, 1, 0x00), (16, 1, 0x02), (17, 1, 0x02)]))
    body.write(struct.pack("<BIIIIIBBB", 2, _fit_ts(end), _fit_ts(start_utc),
                           int(minutes * 60000), int(minutes * 60000), int(km * 100000),
                           1, round(sum(hrs) / len(hrs)), max(hrs)))
    data = body.getvalue()
    header = struct.pack("<BBHI4s", 14, 0x20, 2132, len(data), b".FIT")
    header += struct.pack("<H", _crc(header))
    content = header + data
    path.write_bytes(content + struct.pack("<H", _crc(content)))


# ---------------------------------------------------------------------------
# Recovery CSV and Apple Health export
# ---------------------------------------------------------------------------
def write_recovery_csv(path: Path):
    lines = ["date,sleep_hours,resting_hr,hrv_ms"]
    d = PLAN_START - timedelta(days=21)
    while d <= PLAN_START + timedelta(days=6):
        if d < PLAN_START:
            sleep, rhr, hrv = 7.3 + random.uniform(-0.5, 0.5), 54 + random.randint(-1, 1), 62 + random.randint(-4, 4)
        else:  # week 1: a stressful second half of the week
            late = (d - PLAN_START).days >= 3
            sleep = (5.6 if late else 7.0) + random.uniform(-0.3, 0.3)
            rhr = (59 if late else 55) + random.randint(-1, 1)
            hrv = (50 if late else 60) + random.randint(-3, 3)
        lines.append(f"{d.isoformat()},{sleep:.1f},{rhr},{hrv}")
        d += timedelta(days=1)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_apple_health_zip(path: Path):
    def ad(t: datetime) -> str:  # Apple's format, local time with offset
        return t.strftime("%Y-%m-%d %H:%M:%S +0200")

    start = datetime(2026, 10, 18, 9, 0)  # Sunday, week 1: a 20-min yoga session
    recs = [f'<Workout workoutActivityType="HKWorkoutActivityTypeYoga" duration="20" '
            f'durationUnit="min" startDate="{ad(start)}" endDate="{ad(start + timedelta(minutes=20))}">'
            f'<WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" '
            f'startDate="{ad(start)}" endDate="{ad(start + timedelta(minutes=20))}" '
            f'average="92" maximum="104" unit="count/min"/></Workout>']
    for i in range(0, 20 * 60, 30):
        t = start + timedelta(seconds=i)
        recs.append(f'<Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" '
                    f'startDate="{ad(t)}" endDate="{ad(t)}" value="{88 + random.randint(0, 12)}"/>')
    night = datetime(2026, 10, 17, 23, 30)
    recs.append(f'<Record type="HKCategoryTypeIdentifierSleepAnalysis" '
                f'startDate="{ad(night)}" endDate="{ad(night + timedelta(hours=6, minutes=15))}" '
                f'value="HKCategoryValueSleepAnalysisAsleepCore"/>')
    recs.append(f'<Record type="HKQuantityTypeIdentifierRestingHeartRate" unit="count/min" '
                f'startDate="{ad(datetime(2026, 10, 18, 8, 0))}" '
                f'endDate="{ad(datetime(2026, 10, 18, 8, 0))}" value="58"/>')
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<HealthData locale="en_DE">\n'
           + "\n".join(recs) + "\n</HealthData>\n")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("apple_health_export/export.xml", xml)


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / "sample_plan.json").write_text(json.dumps(make_plan(), indent=2), encoding="utf-8")

    # Week 1 (Berlin is UTC+2 in October)
    tue = datetime(2026, 10, 13, 16, 30, tzinfo=timezone.utc)   # 18:30 local
    write_gpx(OUT / "week1_tue_easy_run.gpx", tue, 31, 5.0, hr_series(31, 126, 6))

    fri = datetime(2026, 10, 16, 15, 0, tzinfo=timezone.utc)
    write_tcx(OUT / "week1_fri_strength.tcx", fri, 35, hr_series(35, 112, 4))

    sat = datetime(2026, 10, 17, 7, 0, tzinfo=timezone.utc)
    write_fit(OUT / "week1_sat_long_run.fit", sat, 47, 7.1, hr_series(47, 130, 16))

    write_recovery_csv(OUT / "recovery.csv")
    write_apple_health_zip(OUT / "apple_health_export.zip")
    print(f"Sample data written to {OUT}")


if __name__ == "__main__":
    main()
