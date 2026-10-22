# Test data: three people, 22 Oct – 20 Dec 2026

Fake tracker files for testing Milo end to end. Everything is made up
(GPS loop, modelled heart rate). Recreate it with `python sample_data/test_sets/generate.py`.

Each folder covers **this week from Thu 22 Oct** (so "Start today" has data)
plus **8 full weeks from Mon 26 Oct** ("Start next Monday"), and contains
`recovery.csv` with sleep, resting HR and HRV from 1 Oct (Milo's baseline).

## How to test

1. **Profile page:** enter the age and max HR from the table below, or Milo can't
   calculate heart-rate zones.
2. **Plan page:** Build a plan with Milo and give the answers below, so the plan
   days match the data. When Milo asks, pick *Start today* or *Start next Monday*.
3. **Data page:** click the upload box, open the folder, press **Ctrl+A** and
   upload everything at once.
4. Check **Progress**, the **Week** pages and the **check-in** chat. Weeks in
   the future count because they have data in them.

| Folder | Person | Age | Max HR | Files |
|---|---|---|---|---|
| `gym/` | Sam, gym 4x a week | 29 | 190 | TCX (gym + indoor bike), 1 GPX hike |
| `running/` | Alex, 10K race on Sat 19 Dec | 32 | 188 | GPX runs, CSV strength sessions |
| `marathon/` | Jordan, marathon on Sun 20 Dec | 38 | 182 | GPX runs, TCX long runs and races |

## What to tell Milo

**Gym (Sam).** "I want to get stronger and build some muscle. I go to the gym
4 days a week: upper body Monday, lower body Tuesday, upper body Thursday and
full body Saturday, about an hour each. Sometimes an easy spin on the bike on
Wednesday. No injuries. Garmin watch."

**Running (Alex).** "I want to run a 10K race on Saturday 19 December. I run
about twice a week now, 30–40 minutes. I can do an easy run Tuesday, a short
strength session Wednesday lunchtime, intervals Thursday and a long run
Saturday. No injuries. Garmin watch." Ask for 8 weeks.

**Marathon (Jordan).** "I'm running a marathon on Sunday 20 December. I run
about 60 km a week. Intervals Tuesday, easy Wednesday, tempo Thursday, easy
Saturday, long run Sunday. Half marathon tune-up on 29 November. No injuries."
Ask for 8 weeks.

## What Milo should find (week 1 = week starting 26 Oct)

**Gym**
- Week 3: Tuesday and Thursday missed (a cold); resting HR about 7 bpm up, HRV down, short sleep. The Saturday session was kept light.
- Week 5: lower body moved from Tuesday to Wednesday.
- Week 6: an extra 95-minute hike on Sunday; two short nights mid-week.
- Weeks 1, 2, 4, 6, 7: extra easy bike rides on Wednesday.
- Week 8: lighter (deload) sessions.

**Running**
- Week 2: long run drifted out of Zone 2 (heart rate climbed); three short nights before it.
- Week 4: lighter week, no strength session.
- Week 5: Thursday intervals missed (travel), an easy run on Friday instead; Milo should see it as moved.
- Week 6: easy runs much too fast, mostly Zone 3 instead of Zone 2.
- Week 8: race on Sat 19 Dec, 10 km in about 53:30.

**Marathon**
- Week 3: Wednesday easy run skipped; resting HR up, HRV down (tiredness).
- Week 4: cutback week (20 km long run).
- Week 5: half marathon on Sun 29 Nov, 21.1 km in about 1:40, instead of the long run.
- Week 6: long run cut to 28 km with high heart rate; poor recovery after.
- Week 7: an extra cross-training bike ride; taper starts.
- Week 8: marathon on Sun 20 Dec, 42.3 km in about 3:35; a few restless nights before it.
