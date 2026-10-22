/* Sample data for demo mode: real backend output for the sample week. */
const demoData = {
  "profile": {
    "name": "Alex",
    "age": 30,
    "max_hr": null,
    "tracker": "Garmin Forerunner",
    "notes": ""
  },
  "plan": {
    "goal": "Run a 10K comfortably by December",
    "start_date": "2026-10-12",
    "weeks": [
      {
        "week_number": 1,
        "focus": "Build the habit",
        "sessions": [
          {
            "day": "Monday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Tuesday",
            "type": "run",
            "title": "Easy run",
            "duration_min": 30.0,
            "distance_km": 4.8,
            "target_intensity": {
              "kind": "hr_zone",
              "value": "Zone 2"
            },
            "notes": "Conversational pace",
            "exercises": [
              {
                "name": "Brisk walk warm-up",
                "detail": "5 min",
                "video_query": "dynamic warm up before running"
              },
              {
                "name": "Easy run",
                "detail": "20 min, Zone 2",
                "video_query": "how to run in zone 2"
              },
              {
                "name": "Walk cool-down",
                "detail": "5 min",
                "video_query": ""
              }
            ]
          },
          {
            "day": "Wednesday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Thursday",
            "type": "strength",
            "title": "Full-body strength",
            "duration_min": 40.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "rpe",
              "value": "RPE 6"
            },
            "notes": "Squats, lunges, push-ups, planks",
            "exercises": [
              {
                "name": "Bodyweight squat",
                "detail": "3 x 12",
                "video_query": "bodyweight squat proper form"
              },
              {
                "name": "Reverse lunge",
                "detail": "3 x 8 each leg",
                "video_query": "reverse lunge proper form"
              },
              {
                "name": "Push-up",
                "detail": "3 x 8 (knees OK)",
                "video_query": "push up proper form beginner"
              },
              {
                "name": "Plank",
                "detail": "3 x 30 s",
                "video_query": "plank proper form"
              },
              {
                "name": "Glute bridge",
                "detail": "3 x 12",
                "video_query": "glute bridge proper form"
              }
            ]
          },
          {
            "day": "Friday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Saturday",
            "type": "run",
            "title": "Long run",
            "duration_min": 45.0,
            "distance_km": 7.0,
            "target_intensity": {
              "kind": "hr_zone",
              "value": "Zone 2"
            },
            "notes": "Slow and steady",
            "exercises": [
              {
                "name": "Brisk walk warm-up",
                "detail": "5 min",
                "video_query": "dynamic warm up before running"
              },
              {
                "name": "Long easy run",
                "detail": "35 min, Zone 2",
                "video_query": "long run tips for beginners"
              },
              {
                "name": "Walk cool-down",
                "detail": "5 min",
                "video_query": ""
              }
            ]
          },
          {
            "day": "Sunday",
            "type": "mobility",
            "title": "Mobility",
            "duration_min": 20.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "Stretching or yoga",
            "exercises": [
              {
                "name": "Hip flexor stretch",
                "detail": "2 x 30 s each side",
                "video_query": "hip flexor stretch for runners"
              },
              {
                "name": "Hamstring stretch",
                "detail": "2 x 30 s each side",
                "video_query": "hamstring stretch for runners"
              },
              {
                "name": "Cat-cow",
                "detail": "10 slow reps",
                "video_query": "cat cow stretch how to"
              },
              {
                "name": "Calf stretch",
                "detail": "2 x 30 s each side",
                "video_query": "calf stretch for runners"
              }
            ]
          }
        ]
      },
      {
        "week_number": 2,
        "focus": "Add a little volume",
        "sessions": [
          {
            "day": "Monday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Tuesday",
            "type": "run",
            "title": "Easy run",
            "duration_min": 32.0,
            "distance_km": 5.2,
            "target_intensity": {
              "kind": "hr_zone",
              "value": "Zone 2"
            },
            "notes": "Conversational pace",
            "exercises": [
              {
                "name": "Brisk walk warm-up",
                "detail": "5 min",
                "video_query": "dynamic warm up before running"
              },
              {
                "name": "Easy run",
                "detail": "22 min, Zone 2",
                "video_query": "how to run in zone 2"
              },
              {
                "name": "Walk cool-down",
                "detail": "5 min",
                "video_query": ""
              }
            ]
          },
          {
            "day": "Wednesday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Thursday",
            "type": "strength",
            "title": "Full-body strength",
            "duration_min": 40.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "rpe",
              "value": "RPE 6"
            },
            "notes": "Squats, lunges, push-ups, planks",
            "exercises": [
              {
                "name": "Bodyweight squat",
                "detail": "3 x 12",
                "video_query": "bodyweight squat proper form"
              },
              {
                "name": "Reverse lunge",
                "detail": "3 x 8 each leg",
                "video_query": "reverse lunge proper form"
              },
              {
                "name": "Push-up",
                "detail": "3 x 8 (knees OK)",
                "video_query": "push up proper form beginner"
              },
              {
                "name": "Plank",
                "detail": "3 x 30 s",
                "video_query": "plank proper form"
              },
              {
                "name": "Glute bridge",
                "detail": "3 x 12",
                "video_query": "glute bridge proper form"
              }
            ]
          },
          {
            "day": "Friday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Saturday",
            "type": "run",
            "title": "Long run",
            "duration_min": 50.0,
            "distance_km": 7.8,
            "target_intensity": {
              "kind": "hr_zone",
              "value": "Zone 2"
            },
            "notes": "Slow and steady",
            "exercises": [
              {
                "name": "Brisk walk warm-up",
                "detail": "5 min",
                "video_query": "dynamic warm up before running"
              },
              {
                "name": "Long easy run",
                "detail": "40 min, Zone 2",
                "video_query": "long run tips for beginners"
              },
              {
                "name": "Walk cool-down",
                "detail": "5 min",
                "video_query": ""
              }
            ]
          },
          {
            "day": "Sunday",
            "type": "mobility",
            "title": "Mobility",
            "duration_min": 20.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "Stretching or yoga",
            "exercises": [
              {
                "name": "Hip flexor stretch",
                "detail": "2 x 30 s each side",
                "video_query": "hip flexor stretch for runners"
              },
              {
                "name": "Hamstring stretch",
                "detail": "2 x 30 s each side",
                "video_query": "hamstring stretch for runners"
              },
              {
                "name": "Cat-cow",
                "detail": "10 slow reps",
                "video_query": "cat cow stretch how to"
              },
              {
                "name": "Calf stretch",
                "detail": "2 x 30 s each side",
                "video_query": "calf stretch for runners"
              }
            ]
          }
        ]
      },
      {
        "week_number": 3,
        "focus": "Steady progression",
        "sessions": [
          {
            "day": "Monday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Tuesday",
            "type": "run",
            "title": "Easy run",
            "duration_min": 35.0,
            "distance_km": 5.6,
            "target_intensity": {
              "kind": "hr_zone",
              "value": "Zone 2"
            },
            "notes": "Conversational pace",
            "exercises": [
              {
                "name": "Brisk walk warm-up",
                "detail": "5 min",
                "video_query": "dynamic warm up before running"
              },
              {
                "name": "Easy run",
                "detail": "25 min, Zone 2",
                "video_query": "how to run in zone 2"
              },
              {
                "name": "Walk cool-down",
                "detail": "5 min",
                "video_query": ""
              }
            ]
          },
          {
            "day": "Wednesday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Thursday",
            "type": "strength",
            "title": "Full-body strength",
            "duration_min": 40.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "rpe",
              "value": "RPE 6"
            },
            "notes": "Squats, lunges, push-ups, planks",
            "exercises": [
              {
                "name": "Bodyweight squat",
                "detail": "3 x 12",
                "video_query": "bodyweight squat proper form"
              },
              {
                "name": "Reverse lunge",
                "detail": "3 x 8 each leg",
                "video_query": "reverse lunge proper form"
              },
              {
                "name": "Push-up",
                "detail": "3 x 8 (knees OK)",
                "video_query": "push up proper form beginner"
              },
              {
                "name": "Plank",
                "detail": "3 x 30 s",
                "video_query": "plank proper form"
              },
              {
                "name": "Glute bridge",
                "detail": "3 x 12",
                "video_query": "glute bridge proper form"
              }
            ]
          },
          {
            "day": "Friday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Saturday",
            "type": "run",
            "title": "Long run",
            "duration_min": 55.0,
            "distance_km": 8.6,
            "target_intensity": {
              "kind": "hr_zone",
              "value": "Zone 2"
            },
            "notes": "Slow and steady",
            "exercises": [
              {
                "name": "Brisk walk warm-up",
                "detail": "5 min",
                "video_query": "dynamic warm up before running"
              },
              {
                "name": "Long easy run",
                "detail": "45 min, Zone 2",
                "video_query": "long run tips for beginners"
              },
              {
                "name": "Walk cool-down",
                "detail": "5 min",
                "video_query": ""
              }
            ]
          },
          {
            "day": "Sunday",
            "type": "mobility",
            "title": "Mobility",
            "duration_min": 20.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "Stretching or yoga",
            "exercises": [
              {
                "name": "Hip flexor stretch",
                "detail": "2 x 30 s each side",
                "video_query": "hip flexor stretch for runners"
              },
              {
                "name": "Hamstring stretch",
                "detail": "2 x 30 s each side",
                "video_query": "hamstring stretch for runners"
              },
              {
                "name": "Cat-cow",
                "detail": "10 slow reps",
                "video_query": "cat cow stretch how to"
              },
              {
                "name": "Calf stretch",
                "detail": "2 x 30 s each side",
                "video_query": "calf stretch for runners"
              }
            ]
          }
        ]
      },
      {
        "week_number": 4,
        "focus": "Recovery week",
        "sessions": [
          {
            "day": "Monday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Tuesday",
            "type": "run",
            "title": "Easy run",
            "duration_min": 28.0,
            "distance_km": 4.5,
            "target_intensity": {
              "kind": "hr_zone",
              "value": "Zone 2"
            },
            "notes": "Conversational pace",
            "exercises": [
              {
                "name": "Brisk walk warm-up",
                "detail": "5 min",
                "video_query": "dynamic warm up before running"
              },
              {
                "name": "Easy run",
                "detail": "18 min, Zone 2",
                "video_query": "how to run in zone 2"
              },
              {
                "name": "Walk cool-down",
                "detail": "5 min",
                "video_query": ""
              }
            ]
          },
          {
            "day": "Wednesday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Thursday",
            "type": "strength",
            "title": "Full-body strength",
            "duration_min": 40.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "rpe",
              "value": "RPE 6"
            },
            "notes": "Squats, lunges, push-ups, planks",
            "exercises": [
              {
                "name": "Bodyweight squat",
                "detail": "3 x 12",
                "video_query": "bodyweight squat proper form"
              },
              {
                "name": "Reverse lunge",
                "detail": "3 x 8 each leg",
                "video_query": "reverse lunge proper form"
              },
              {
                "name": "Push-up",
                "detail": "3 x 8 (knees OK)",
                "video_query": "push up proper form beginner"
              },
              {
                "name": "Plank",
                "detail": "3 x 30 s",
                "video_query": "plank proper form"
              },
              {
                "name": "Glute bridge",
                "detail": "3 x 12",
                "video_query": "glute bridge proper form"
              }
            ]
          },
          {
            "day": "Friday",
            "type": "rest",
            "title": "Rest",
            "duration_min": 0.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "",
            "exercises": []
          },
          {
            "day": "Saturday",
            "type": "run",
            "title": "Long run",
            "duration_min": 40.0,
            "distance_km": 6.2,
            "target_intensity": {
              "kind": "hr_zone",
              "value": "Zone 2"
            },
            "notes": "Slow and steady",
            "exercises": [
              {
                "name": "Brisk walk warm-up",
                "detail": "5 min",
                "video_query": "dynamic warm up before running"
              },
              {
                "name": "Long easy run",
                "detail": "30 min, Zone 2",
                "video_query": "long run tips for beginners"
              },
              {
                "name": "Walk cool-down",
                "detail": "5 min",
                "video_query": ""
              }
            ]
          },
          {
            "day": "Sunday",
            "type": "mobility",
            "title": "Mobility",
            "duration_min": 20.0,
            "distance_km": null,
            "target_intensity": {
              "kind": "none",
              "value": ""
            },
            "notes": "Stretching or yoga",
            "exercises": [
              {
                "name": "Hip flexor stretch",
                "detail": "2 x 30 s each side",
                "video_query": "hip flexor stretch for runners"
              },
              {
                "name": "Hamstring stretch",
                "detail": "2 x 30 s each side",
                "video_query": "hamstring stretch for runners"
              },
              {
                "name": "Cat-cow",
                "detail": "10 slow reps",
                "video_query": "cat cow stretch how to"
              },
              {
                "name": "Calf stretch",
                "detail": "2 x 30 s each side",
                "video_query": "calf stretch for runners"
              }
            ]
          }
        ]
      }
    ]
  },
  "metrics": {
    "1": {
      "week_number": 1,
      "week_start": "2026-10-12",
      "week_end": "2026-10-18",
      "week_focus": "Build the habit",
      "summary": {
        "planned_sessions": 4,
        "completed_on_planned_day": 3,
        "completed_on_other_day": 1,
        "missed": 0,
        "extra_unplanned_activities": 0,
        "completion_rate_pct": 100,
        "planned_duration_min": 135.0,
        "actual_duration_min": 132.9,
        "duration_vs_plan_pct": 98,
        "planned_distance_km": 11.8,
        "actual_distance_km": 12.1,
        "time_in_target_hr_zone_min": 36.2,
        "pct_time_in_target_hr_zone": 47
      },
      "sessions": [
        {
          "planned_day": "Tuesday",
          "planned_date": "2026-10-13",
          "type": "run",
          "title": "Easy run",
          "status": "completed",
          "planned_duration_min": 30.0,
          "actual_duration_min": 30.9,
          "planned_distance_km": 4.8,
          "actual_distance_km": 5.0,
          "actual_date": "2026-10-13",
          "avg_hr": 126.0,
          "pace": "6:11 min/km",
          "intensity": {
            "target": "hr_zone: Zone 2",
            "time_in_target_min": 27.4,
            "pct_time_in_target": 89,
            "avg_hr_in_target": null,
            "pace_in_target": null,
            "hr_data_min": 30.9,
            "note": null
          }
        },
        {
          "planned_day": "Thursday",
          "planned_date": "2026-10-15",
          "type": "strength",
          "title": "Full-body strength",
          "status": "moved",
          "planned_duration_min": 40.0,
          "actual_duration_min": 35.0,
          "planned_distance_km": null,
          "actual_distance_km": null,
          "actual_date": "2026-10-16",
          "avg_hr": 112.0,
          "pace": null,
          "intensity": {
            "target": "rpe: RPE 6",
            "time_in_target_min": null,
            "pct_time_in_target": null,
            "avg_hr_in_target": null,
            "pace_in_target": null,
            "hr_data_min": null,
            "note": null
          }
        },
        {
          "planned_day": "Saturday",
          "planned_date": "2026-10-17",
          "type": "run",
          "title": "Long run",
          "status": "completed",
          "planned_duration_min": 45.0,
          "actual_duration_min": 47.0,
          "planned_distance_km": 7.0,
          "actual_distance_km": 7.1,
          "actual_date": "2026-10-17",
          "avg_hr": 136.0,
          "pace": "6:37 min/km",
          "intensity": {
            "target": "hr_zone: Zone 2",
            "time_in_target_min": 8.8,
            "pct_time_in_target": 19,
            "avg_hr_in_target": null,
            "pace_in_target": null,
            "hr_data_min": 46.9,
            "note": null
          }
        },
        {
          "planned_day": "Sunday",
          "planned_date": "2026-10-18",
          "type": "mobility",
          "title": "Mobility",
          "status": "completed",
          "planned_duration_min": 20.0,
          "actual_duration_min": 20.0,
          "planned_distance_km": null,
          "actual_distance_km": null,
          "actual_date": "2026-10-18",
          "avg_hr": 92.0,
          "pace": null,
          "intensity": {
            "target": null,
            "time_in_target_min": null,
            "pct_time_in_target": null,
            "avg_hr_in_target": null,
            "pace_in_target": null,
            "hr_data_min": null,
            "note": null
          }
        }
      ],
      "extra_activities": [],
      "recovery": {
        "days_with_data": 7,
        "avg_sleep_hours": 6.2,
        "nights_under_6h_sleep": 4,
        "avg_resting_hr": 57.3,
        "baseline_resting_hr": 54.0,
        "resting_hr_change_vs_baseline": 3.3,
        "avg_hrv_ms": 54.3,
        "baseline_hrv_ms": 62.0,
        "hrv_change_vs_baseline_pct": -12.4,
        "baseline_period": "previous 21 days"
      },
      "data_warnings": [],
      "has_tracker_data": true
    },
    "2": {
      "week_number": 2,
      "week_start": "2026-10-19",
      "week_end": "2026-10-25",
      "week_focus": "Add a little volume",
      "summary": {
        "planned_sessions": 4,
        "completed_on_planned_day": 0,
        "completed_on_other_day": 0,
        "missed": 4,
        "extra_unplanned_activities": 0,
        "completion_rate_pct": 0,
        "planned_duration_min": 142.0,
        "actual_duration_min": 0,
        "duration_vs_plan_pct": 0,
        "planned_distance_km": 13.0,
        "actual_distance_km": null,
        "time_in_target_hr_zone_min": null,
        "pct_time_in_target_hr_zone": null
      },
      "sessions": [
        {
          "planned_day": "Tuesday",
          "planned_date": "2026-10-20",
          "type": "run",
          "title": "Easy run",
          "status": "missed",
          "planned_duration_min": 32.0,
          "actual_duration_min": null,
          "planned_distance_km": 5.2,
          "actual_distance_km": null,
          "actual_date": null,
          "avg_hr": null,
          "pace": null,
          "intensity": null
        },
        {
          "planned_day": "Thursday",
          "planned_date": "2026-10-22",
          "type": "strength",
          "title": "Full-body strength",
          "status": "missed",
          "planned_duration_min": 40.0,
          "actual_duration_min": null,
          "planned_distance_km": null,
          "actual_distance_km": null,
          "actual_date": null,
          "avg_hr": null,
          "pace": null,
          "intensity": null
        },
        {
          "planned_day": "Saturday",
          "planned_date": "2026-10-24",
          "type": "run",
          "title": "Long run",
          "status": "missed",
          "planned_duration_min": 50.0,
          "actual_duration_min": null,
          "planned_distance_km": 7.8,
          "actual_distance_km": null,
          "actual_date": null,
          "avg_hr": null,
          "pace": null,
          "intensity": null
        },
        {
          "planned_day": "Sunday",
          "planned_date": "2026-10-25",
          "type": "mobility",
          "title": "Mobility",
          "status": "missed",
          "planned_duration_min": 20.0,
          "actual_duration_min": null,
          "planned_distance_km": null,
          "actual_distance_km": null,
          "actual_date": null,
          "avg_hr": null,
          "pace": null,
          "intensity": null
        }
      ],
      "extra_activities": [],
      "recovery": {
        "days_with_data": 0,
        "avg_sleep_hours": null,
        "nights_under_6h_sleep": null,
        "avg_resting_hr": null,
        "baseline_resting_hr": 55.0,
        "resting_hr_change_vs_baseline": null,
        "avg_hrv_ms": null,
        "baseline_hrv_ms": 59.9,
        "hrv_change_vs_baseline_pct": null,
        "baseline_period": "previous 21 days"
      },
      "data_warnings": [],
      "has_tracker_data": false
    }
  },
  "activities": [
    {
      "id": 4,
      "source": "gpx",
      "type": "run",
      "start_time": "2026-10-13T18:30:00",
      "duration_min": 30.916666666666668,
      "distance_km": 5.000184345926669,
      "avg_hr": 126.00268817204301,
      "max_hr": 134.0,
      "notes": "",
      "hr_samples": 372
    },
    {
      "id": 2,
      "source": "tcx",
      "type": "other",
      "start_time": "2026-10-16T17:00:00",
      "duration_min": 35.0,
      "distance_km": null,
      "avg_hr": 112.26904761904763,
      "max_hr": 118.0,
      "notes": "",
      "hr_samples": 420
    },
    {
      "id": 3,
      "source": "fit",
      "type": "run",
      "start_time": "2026-10-17T09:00:00",
      "duration_min": 47.0,
      "distance_km": 7.1,
      "avg_hr": 136.0,
      "max_hr": 148.0,
      "notes": "",
      "hr_samples": 564
    },
    {
      "id": 1,
      "source": "apple_health",
      "type": "mobility",
      "start_time": "2026-10-18T09:00:00",
      "duration_min": 20.0,
      "distance_km": null,
      "avg_hr": 92.0,
      "max_hr": 104.0,
      "notes": "",
      "hr_samples": 40
    }
  ],
  "progress": [
    {
      "week_number": 1,
      "status": "done",
      "planned_duration_min": 135.0,
      "actual_duration_min": 132.9,
      "completion_rate_pct": 100,
      "pct_time_in_target_hr_zone": 47,
      "avg_resting_hr": 57.3,
      "avg_sleep_hours": 6.2
    },
    {
      "week_number": 2,
      "status": "current",
      "planned_duration_min": 142.0,
      "actual_duration_min": 0,
      "completion_rate_pct": 0,
      "pct_time_in_target_hr_zone": null,
      "avg_resting_hr": null,
      "avg_sleep_hours": null
    },
    {
      "week_number": 3,
      "status": "upcoming",
      "planned_duration_min": 150.0,
      "actual_duration_min": null,
      "completion_rate_pct": null,
      "pct_time_in_target_hr_zone": null,
      "avg_resting_hr": null,
      "avg_sleep_hours": null
    },
    {
      "week_number": 4,
      "status": "upcoming",
      "planned_duration_min": 128.0,
      "actual_duration_min": null,
      "completion_rate_pct": null,
      "pct_time_in_target_hr_zone": null,
      "avg_resting_hr": null,
      "avg_sleep_hours": null
    }
  ]
};

export default demoData;
