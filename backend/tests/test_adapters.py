from datetime import datetime

import pytest

from milo.adapters import AdapterError, parse_file


def test_gpx(sample_files):
    r = parse_file(sample_files / "week1_tue_easy_run.gpx")
    (a,) = r.activities
    assert a.type == "run"
    assert a.start_time == datetime(2026, 10, 13, 18, 30)  # converted UTC -> Berlin
    assert 30 < a.duration_min < 32
    assert a.distance_km == pytest.approx(5.0, abs=0.15)
    assert a.hr_samples and 110 < a.avg_hr < 140


def test_tcx(sample_files):
    (a,) = parse_file(sample_files / "week1_fri_strength.tcx").activities
    assert a.type == "other" and a.duration_min == 35 and a.distance_km is None
    assert len(a.hr_samples) > 100


def test_fit(sample_files):
    (a,) = parse_file(sample_files / "week1_sat_long_run.fit").activities
    assert a.type == "run" and a.duration_min == 47
    assert a.distance_km == pytest.approx(7.1)
    assert a.start_time == datetime(2026, 10, 17, 9, 0)
    assert a.max_hr >= a.avg_hr


def test_apple_health_zip(sample_files):
    r = parse_file(sample_files / "apple_health_export.zip")
    (a,) = r.activities
    assert a.type == "mobility" and a.duration_min == 20 and a.avg_hr == 92
    (d,) = r.recovery
    assert d.resting_hr == 58 and d.sleep_hours == pytest.approx(6.25)


def test_csv_recovery(sample_files):
    r = parse_file(sample_files / "recovery.csv")
    assert len(r.recovery) == 28 and not r.activities


def test_unsupported(tmp_path):
    f = tmp_path / "x.docx"
    f.write_text("nope")
    with pytest.raises(AdapterError):
        parse_file(f)


def test_broken_gpx(tmp_path):
    f = tmp_path / "bad.gpx"
    f.write_text("<gpx><trk>")
    with pytest.raises(AdapterError):
        parse_file(f)


def test_tcx_gym_session_saved_as_other_is_strength(tmp_path):
    """TCX has no strength sport, so watches write Sport="Other"; the notes tell us."""
    from milo.adapters import parse_file

    f = tmp_path / "gym.tcx"
    f.write_text(
        '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">'
        '<Activities><Activity Sport="Other"><Id>2026-10-26T17:30:00Z</Id>'
        '<Lap StartTime="2026-10-26T17:30:00Z"><TotalTimeSeconds>3000</TotalTimeSeconds></Lap>'
        "<Notes>Strength training: upper body</Notes></Activity></Activities></TrainingCenterDatabase>")
    a = parse_file(f).activities[0]
    assert a.type == "strength" and round(a.duration_min) == 50
