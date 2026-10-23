/* Demo mode: real backend output (milo/analysis.py) for the running test set. */
import type { Analysis } from "./types";

const demoAnalysis: Record<string, Analysis> = {
 "28": {
  "period": {
   "from": "2026-11-22",
   "to": "2026-12-19",
   "days": 28,
   "weeks": 4.0
  },
  "data": {
   "activities": 16,
   "with_heart_rate": 16,
   "recovery_days": 28,
   "max_hr_used": 188,
   "max_hr_source": "profile",
   "days_since_last_workout": 0
  },
  "totals": {
   "sessions": 16,
   "hours": 12.5,
   "distance_km": 103.7,
   "active_days": 16,
   "sessions_per_week": 4.0,
   "minutes_per_week": 187
  },
  "by_sport": [
   {
    "type": "run",
    "sessions": 12,
    "minutes": 628,
    "distance_km": 103.7,
    "avg_hr": 133.0,
    "share_pct": 84
   },
   {
    "type": "strength",
    "sessions": 4,
    "minutes": 120,
    "distance_km": null,
    "avg_hr": 110.0,
    "share_pct": 16
   }
  ],
  "weekly": [
   {
    "week_start": "2026-11-16",
    "minutes": 0,
    "sessions": 0,
    "distance_km": 0,
    "by_type": {},
    "easy_pct": null,
    "partial": true
   },
   {
    "week_start": "2026-11-23",
    "minutes": 170,
    "sessions": 4,
    "distance_km": 22.2,
    "by_type": {
     "run": 140,
     "strength": 30
    },
    "easy_pct": 98,
    "partial": false
   },
   {
    "week_start": "2026-11-30",
    "minutes": 205,
    "sessions": 4,
    "distance_km": 29.1,
    "by_type": {
     "run": 175,
     "strength": 30
    },
    "easy_pct": 60,
    "partial": false
   },
   {
    "week_start": "2026-12-07",
    "minutes": 210,
    "sessions": 4,
    "distance_km": 29.3,
    "by_type": {
     "run": 180,
     "strength": 30
    },
    "easy_pct": 80,
    "partial": false
   },
   {
    "week_start": "2026-12-14",
    "minutes": 164,
    "sessions": 4,
    "distance_km": 23.2,
    "by_type": {
     "run": 134,
     "strength": 30
    },
    "easy_pct": 58,
    "partial": true
   }
  ],
  "load": {
   "last_7_days_min": 164,
   "prior_4_week_avg_min": 175,
   "ratio": 0.94,
   "largest_week_increase_pct": 21,
   "largest_week_increase_week": "2026-11-30"
  },
  "intensity": {
   "zone_minutes": {
    "1": 141,
    "2": 411,
    "3": 90,
    "4": 65,
    "5": 41
   },
   "zone_pct": {
    "1": 19,
    "2": 55,
    "3": 12,
    "4": 9,
    "5": 6
   },
   "easy_pct": 74,
   "moderate_pct": 12,
   "hard_pct": 15
  },
  "running": {
   "runs": 12,
   "km": 103.7,
   "km_per_week": 25.9,
   "avg_pace": "6:03 /km",
   "longest_run_km": 11.66,
   "longest_run_date": "2026-12-12",
   "fastest_pace_5k_plus": "5:19 /km",
   "fastest_run_date": "2026-12-19",
   "fastest_run_km": 10.04,
   "efficiency_change_pct": -4.3
  },
  "strength": {
   "sessions": 4,
   "per_week": 1.0
  },
  "consistency": {
   "longest_gap_days": 2,
   "weeks_with_3_plus_sessions": 3,
   "full_weeks": 3
  },
  "recovery": {
   "avg_sleep_hours": 7.1,
   "nights_under_6h": 1,
   "nights_with_sleep_data": 28,
   "resting_hr_avg": 54.5,
   "resting_hr_change_bpm": -1.4,
   "hrv_avg_ms": 62.9,
   "hrv_change_pct": -1.8
  },
  "highlights": [
   {
    "what": "longest workout",
    "date": "2026-12-12",
    "type": "run",
    "minutes": 75
   },
   {
    "what": "longest run",
    "date": "2026-12-12",
    "km": 11.66
   }
  ],
  "flags": []
 },
 "56": {
  "period": {
   "from": "2026-10-25",
   "to": "2026-12-19",
   "days": 56,
   "weeks": 8.0
  },
  "data": {
   "activities": 31,
   "with_heart_rate": 31,
   "recovery_days": 56,
   "max_hr_used": 188,
   "max_hr_source": "profile",
   "days_since_last_workout": 0
  },
  "totals": {
   "sessions": 31,
   "hours": 23.1,
   "distance_km": 192.1,
   "active_days": 31,
   "sessions_per_week": 3.9,
   "minutes_per_week": 173
  },
  "by_sport": [
   {
    "type": "run",
    "sessions": 24,
    "minutes": 1174,
    "distance_km": 192.1,
    "avg_hr": 131.0,
    "share_pct": 85
   },
   {
    "type": "strength",
    "sessions": 7,
    "minutes": 210,
    "distance_km": null,
    "avg_hr": 110.0,
    "share_pct": 15
   }
  ],
  "weekly": [
   {
    "week_start": "2026-10-19",
    "minutes": 0,
    "sessions": 0,
    "distance_km": 0,
    "by_type": {},
    "easy_pct": null,
    "partial": true
   },
   {
    "week_start": "2026-10-26",
    "minutes": 162,
    "sessions": 4,
    "distance_km": 21.3,
    "by_type": {
     "run": 132,
     "strength": 30
    },
    "easy_pct": 84,
    "partial": false
   },
   {
    "week_start": "2026-11-02",
    "minutes": 174,
    "sessions": 4,
    "distance_km": 23.3,
    "by_type": {
     "run": 144,
     "strength": 30
    },
    "easy_pct": 64,
    "partial": false
   },
   {
    "week_start": "2026-11-09",
    "minutes": 186,
    "sessions": 4,
    "distance_km": 25.3,
    "by_type": {
     "run": 156,
     "strength": 30
    },
    "easy_pct": 80,
    "partial": false
   },
   {
    "week_start": "2026-11-16",
    "minutes": 115,
    "sessions": 3,
    "distance_km": 18.5,
    "by_type": {
     "run": 115
    },
    "easy_pct": 81,
    "partial": false
   },
   {
    "week_start": "2026-11-23",
    "minutes": 170,
    "sessions": 4,
    "distance_km": 22.2,
    "by_type": {
     "run": 140,
     "strength": 30
    },
    "easy_pct": 98,
    "partial": false
   },
   {
    "week_start": "2026-11-30",
    "minutes": 205,
    "sessions": 4,
    "distance_km": 29.1,
    "by_type": {
     "run": 175,
     "strength": 30
    },
    "easy_pct": 60,
    "partial": false
   },
   {
    "week_start": "2026-12-07",
    "minutes": 210,
    "sessions": 4,
    "distance_km": 29.3,
    "by_type": {
     "run": 180,
     "strength": 30
    },
    "easy_pct": 80,
    "partial": false
   },
   {
    "week_start": "2026-12-14",
    "minutes": 164,
    "sessions": 4,
    "distance_km": 23.2,
    "by_type": {
     "run": 134,
     "strength": 30
    },
    "easy_pct": 58,
    "partial": true
   }
  ],
  "load": {
   "last_7_days_min": 164,
   "prior_4_week_avg_min": 175,
   "ratio": 0.94,
   "largest_week_increase_pct": 10,
   "largest_week_increase_week": "2026-11-30"
  },
  "intensity": {
   "zone_minutes": {
    "1": 256,
    "2": 784,
    "3": 174,
    "4": 128,
    "5": 42
   },
   "zone_pct": {
    "1": 18,
    "2": 57,
    "3": 13,
    "4": 9,
    "5": 3
   },
   "easy_pct": 75,
   "moderate_pct": 13,
   "hard_pct": 12
  },
  "running": {
   "runs": 24,
   "km": 192.1,
   "km_per_week": 24.0,
   "avg_pace": "6:07 /km",
   "longest_run_km": 11.66,
   "longest_run_date": "2026-12-12",
   "fastest_pace_5k_plus": "5:19 /km",
   "fastest_run_date": "2026-12-19",
   "fastest_run_km": 10.04,
   "efficiency_change_pct": -1.4
  },
  "strength": {
   "sessions": 7,
   "per_week": 0.9
  },
  "consistency": {
   "longest_gap_days": 2,
   "weeks_with_3_plus_sessions": 7,
   "full_weeks": 7
  },
  "recovery": {
   "avg_sleep_hours": 7.1,
   "nights_under_6h": 1,
   "nights_with_sleep_data": 56,
   "resting_hr_avg": 54.7,
   "resting_hr_change_bpm": -0.4,
   "hrv_avg_ms": 63.0,
   "hrv_change_pct": -1.8
  },
  "highlights": [
   {
    "what": "longest workout",
    "date": "2026-12-12",
    "type": "run",
    "minutes": 75
   },
   {
    "what": "longest run",
    "date": "2026-12-12",
    "km": 11.66
   }
  ],
  "flags": [
   {
    "code": "good_easy_share",
    "text": "75% of training time was easy: a good aerobic base."
   },
   {
    "code": "hard_week",
    "text": "In the week of 2026-11-30 only 60% of training was easy (usually 75%): easy sessions were probably too fast."
   }
  ]
 },
 "84": {
  "period": {
   "from": "2026-09-27",
   "to": "2026-12-19",
   "days": 84,
   "weeks": 12.0
  },
  "data": {
   "activities": 33,
   "with_heart_rate": 33,
   "recovery_days": 80,
   "max_hr_used": 188,
   "max_hr_source": "profile",
   "days_since_last_workout": 0
  },
  "totals": {
   "sessions": 33,
   "hours": 24.2,
   "distance_km": 203.1,
   "active_days": 33,
   "sessions_per_week": 2.8,
   "minutes_per_week": 121
  },
  "by_sport": [
   {
    "type": "run",
    "sessions": 26,
    "minutes": 1244,
    "distance_km": 203.1,
    "avg_hr": 131.0,
    "share_pct": 86
   },
   {
    "type": "strength",
    "sessions": 7,
    "minutes": 210,
    "distance_km": null,
    "avg_hr": 110.0,
    "share_pct": 14
   }
  ],
  "weekly": [
   {
    "week_start": "2026-09-21",
    "minutes": 0,
    "sessions": 0,
    "distance_km": 0,
    "by_type": {},
    "easy_pct": null,
    "partial": true
   },
   {
    "week_start": "2026-09-28",
    "minutes": 0,
    "sessions": 0,
    "distance_km": 0,
    "by_type": {},
    "easy_pct": null,
    "partial": false
   },
   {
    "week_start": "2026-10-05",
    "minutes": 0,
    "sessions": 0,
    "distance_km": 0,
    "by_type": {},
    "easy_pct": null,
    "partial": false
   },
   {
    "week_start": "2026-10-12",
    "minutes": 0,
    "sessions": 0,
    "distance_km": 0,
    "by_type": {},
    "easy_pct": null,
    "partial": false
   },
   {
    "week_start": "2026-10-19",
    "minutes": 70,
    "sessions": 2,
    "distance_km": 11.0,
    "by_type": {
     "run": 70
    },
    "easy_pct": 100,
    "partial": false
   },
   {
    "week_start": "2026-10-26",
    "minutes": 162,
    "sessions": 4,
    "distance_km": 21.3,
    "by_type": {
     "run": 132,
     "strength": 30
    },
    "easy_pct": 84,
    "partial": false
   },
   {
    "week_start": "2026-11-02",
    "minutes": 174,
    "sessions": 4,
    "distance_km": 23.3,
    "by_type": {
     "run": 144,
     "strength": 30
    },
    "easy_pct": 64,
    "partial": false
   },
   {
    "week_start": "2026-11-09",
    "minutes": 186,
    "sessions": 4,
    "distance_km": 25.3,
    "by_type": {
     "run": 156,
     "strength": 30
    },
    "easy_pct": 80,
    "partial": false
   },
   {
    "week_start": "2026-11-16",
    "minutes": 115,
    "sessions": 3,
    "distance_km": 18.5,
    "by_type": {
     "run": 115
    },
    "easy_pct": 81,
    "partial": false
   },
   {
    "week_start": "2026-11-23",
    "minutes": 170,
    "sessions": 4,
    "distance_km": 22.2,
    "by_type": {
     "run": 140,
     "strength": 30
    },
    "easy_pct": 98,
    "partial": false
   },
   {
    "week_start": "2026-11-30",
    "minutes": 205,
    "sessions": 4,
    "distance_km": 29.1,
    "by_type": {
     "run": 175,
     "strength": 30
    },
    "easy_pct": 60,
    "partial": false
   },
   {
    "week_start": "2026-12-07",
    "minutes": 210,
    "sessions": 4,
    "distance_km": 29.3,
    "by_type": {
     "run": 180,
     "strength": 30
    },
    "easy_pct": 80,
    "partial": false
   },
   {
    "week_start": "2026-12-14",
    "minutes": 164,
    "sessions": 4,
    "distance_km": 23.2,
    "by_type": {
     "run": 134,
     "strength": 30
    },
    "easy_pct": 58,
    "partial": true
   }
  ],
  "load": {
   "last_7_days_min": 164,
   "prior_4_week_avg_min": 175,
   "ratio": 0.94,
   "largest_week_increase_pct": 131,
   "largest_week_increase_week": "2026-10-26"
  },
  "intensity": {
   "zone_minutes": {
    "1": 262,
    "2": 848,
    "3": 174,
    "4": 128,
    "5": 42
   },
   "zone_pct": {
    "1": 18,
    "2": 58,
    "3": 12,
    "4": 9,
    "5": 3
   },
   "easy_pct": 76,
   "moderate_pct": 12,
   "hard_pct": 12
  },
  "running": {
   "runs": 26,
   "km": 203.1,
   "km_per_week": 16.9,
   "avg_pace": "6:08 /km",
   "longest_run_km": 11.66,
   "longest_run_date": "2026-12-12",
   "fastest_pace_5k_plus": "5:19 /km",
   "fastest_run_date": "2026-12-19",
   "fastest_run_km": 10.04,
   "efficiency_change_pct": -1.8
  },
  "strength": {
   "sessions": 7,
   "per_week": 0.6
  },
  "consistency": {
   "longest_gap_days": 2,
   "weeks_with_3_plus_sessions": 7,
   "full_weeks": 11
  },
  "recovery": {
   "avg_sleep_hours": 7.1,
   "nights_under_6h": 1,
   "nights_with_sleep_data": 80,
   "resting_hr_avg": 54.5,
   "resting_hr_change_bpm": 0.1,
   "hrv_avg_ms": 62.7,
   "hrv_change_pct": -0.5
  },
  "highlights": [
   {
    "what": "longest workout",
    "date": "2026-12-12",
    "type": "run",
    "minutes": 75
   },
   {
    "what": "longest run",
    "date": "2026-12-12",
    "km": 11.66
   }
  ],
  "flags": [
   {
    "code": "volume_spike",
    "text": "The week of 2026-10-26 was 131% above your biggest week in the 3 weeks before (big jumps raise injury risk)."
   },
   {
    "code": "good_easy_share",
    "text": "76% of training time was easy: a good aerobic base."
   },
   {
    "code": "hard_week",
    "text": "In the week of 2026-11-30 only 60% of training was easy (usually 76%): easy sessions were probably too fast."
   }
  ]
 },
 "0": {
  "period": {
   "from": "2026-10-22",
   "to": "2026-12-19",
   "days": 59,
   "weeks": 8.4
  },
  "data": {
   "activities": 33,
   "with_heart_rate": 33,
   "recovery_days": 59,
   "max_hr_used": 188,
   "max_hr_source": "profile",
   "days_since_last_workout": 0
  },
  "totals": {
   "sessions": 33,
   "hours": 24.2,
   "distance_km": 203.1,
   "active_days": 33,
   "sessions_per_week": 3.9,
   "minutes_per_week": 173
  },
  "by_sport": [
   {
    "type": "run",
    "sessions": 26,
    "minutes": 1244,
    "distance_km": 203.1,
    "avg_hr": 131.0,
    "share_pct": 86
   },
   {
    "type": "strength",
    "sessions": 7,
    "minutes": 210,
    "distance_km": null,
    "avg_hr": 110.0,
    "share_pct": 14
   }
  ],
  "weekly": [
   {
    "week_start": "2026-10-19",
    "minutes": 70,
    "sessions": 2,
    "distance_km": 11.0,
    "by_type": {
     "run": 70
    },
    "easy_pct": 100,
    "partial": true
   },
   {
    "week_start": "2026-10-26",
    "minutes": 162,
    "sessions": 4,
    "distance_km": 21.3,
    "by_type": {
     "run": 132,
     "strength": 30
    },
    "easy_pct": 84,
    "partial": false
   },
   {
    "week_start": "2026-11-02",
    "minutes": 174,
    "sessions": 4,
    "distance_km": 23.3,
    "by_type": {
     "run": 144,
     "strength": 30
    },
    "easy_pct": 64,
    "partial": false
   },
   {
    "week_start": "2026-11-09",
    "minutes": 186,
    "sessions": 4,
    "distance_km": 25.3,
    "by_type": {
     "run": 156,
     "strength": 30
    },
    "easy_pct": 80,
    "partial": false
   },
   {
    "week_start": "2026-11-16",
    "minutes": 115,
    "sessions": 3,
    "distance_km": 18.5,
    "by_type": {
     "run": 115
    },
    "easy_pct": 81,
    "partial": false
   },
   {
    "week_start": "2026-11-23",
    "minutes": 170,
    "sessions": 4,
    "distance_km": 22.2,
    "by_type": {
     "run": 140,
     "strength": 30
    },
    "easy_pct": 98,
    "partial": false
   },
   {
    "week_start": "2026-11-30",
    "minutes": 205,
    "sessions": 4,
    "distance_km": 29.1,
    "by_type": {
     "run": 175,
     "strength": 30
    },
    "easy_pct": 60,
    "partial": false
   },
   {
    "week_start": "2026-12-07",
    "minutes": 210,
    "sessions": 4,
    "distance_km": 29.3,
    "by_type": {
     "run": 180,
     "strength": 30
    },
    "easy_pct": 80,
    "partial": false
   },
   {
    "week_start": "2026-12-14",
    "minutes": 164,
    "sessions": 4,
    "distance_km": 23.2,
    "by_type": {
     "run": 134,
     "strength": 30
    },
    "easy_pct": 58,
    "partial": true
   }
  ],
  "load": {
   "last_7_days_min": 164,
   "prior_4_week_avg_min": 175,
   "ratio": 0.94,
   "largest_week_increase_pct": 10,
   "largest_week_increase_week": "2026-11-30"
  },
  "intensity": {
   "zone_minutes": {
    "1": 262,
    "2": 848,
    "3": 174,
    "4": 128,
    "5": 42
   },
   "zone_pct": {
    "1": 18,
    "2": 58,
    "3": 12,
    "4": 9,
    "5": 3
   },
   "easy_pct": 76,
   "moderate_pct": 12,
   "hard_pct": 12
  },
  "running": {
   "runs": 26,
   "km": 203.1,
   "km_per_week": 24.1,
   "avg_pace": "6:08 /km",
   "longest_run_km": 11.66,
   "longest_run_date": "2026-12-12",
   "fastest_pace_5k_plus": "5:19 /km",
   "fastest_run_date": "2026-12-19",
   "fastest_run_km": 10.04,
   "efficiency_change_pct": -1.8
  },
  "strength": {
   "sessions": 7,
   "per_week": 0.8
  },
  "consistency": {
   "longest_gap_days": 2,
   "weeks_with_3_plus_sessions": 7,
   "full_weeks": 7
  },
  "recovery": {
   "avg_sleep_hours": 7.1,
   "nights_under_6h": 1,
   "nights_with_sleep_data": 59,
   "resting_hr_avg": 54.7,
   "resting_hr_change_bpm": -0.4,
   "hrv_avg_ms": 63.1,
   "hrv_change_pct": -1.4
  },
  "highlights": [
   {
    "what": "longest workout",
    "date": "2026-12-12",
    "type": "run",
    "minutes": 75
   },
   {
    "what": "longest run",
    "date": "2026-12-12",
    "km": 11.66
   }
  ],
  "flags": [
   {
    "code": "good_easy_share",
    "text": "76% of training time was easy: a good aerobic base."
   },
   {
    "code": "hard_week",
    "text": "In the week of 2026-11-30 only 60% of training was easy (usually 76%): easy sessions were probably too fast."
   }
  ]
 }
};

export default demoAnalysis;
