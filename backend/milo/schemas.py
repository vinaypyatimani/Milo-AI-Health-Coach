"""Data models shared across Milo.

Every tracker adapter converts its source format into `Activity` and
`RecoveryDay` objects, so the metrics engine never needs to know where the
data came from.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

SessionType = Literal[
    "run", "strength", "cycling", "swim", "walk", "mobility", "rest", "other"
]


# --------------------------------------------------------------------------
# Training plan (produced by the LLM in Coaching Mode, validated here)
# --------------------------------------------------------------------------
class TargetIntensity(BaseModel):
    kind: Literal["hr_zone", "pace", "rpe", "none"] = "none"
    value: str = ""


class Exercise(BaseModel):
    """One step of a session: a move with sets/reps, or a run segment."""
    name: str
    detail: str = ""          # "3 x 10", "10 min easy", "30 s each side"
    video_query: str = ""     # what to search for a how-to video ("" = use the name)


class PlannedSession(BaseModel):
    day: str
    type: SessionType
    title: str = ""
    duration_min: float = 0
    distance_km: Optional[float] = None
    target_intensity: TargetIntensity = Field(default_factory=TargetIntensity)
    notes: str = ""
    exercises: list[Exercise] = Field(default_factory=list)

    @field_validator("day")
    @classmethod
    def _valid_day(cls, v: str) -> str:
        v = v.strip().capitalize()
        if v not in DAYS:
            raise ValueError(f"day must be one of {DAYS}, got {v!r}")
        return v

    @field_validator("type", mode="before")
    @classmethod
    def _lower_type(cls, v):
        return v.strip().lower() if isinstance(v, str) else v


class PlanWeek(BaseModel):
    week_number: int
    focus: str = ""
    sessions: list[PlannedSession]


class Meal(BaseModel):
    meal: str                      # e.g. "Breakfast", "Before training"
    timing: str = ""               # e.g. "2-3 h before training"
    suggestion: str = ""           # food-first, portion-based, no calorie targets


class NutritionPlan(BaseModel):
    """Optional nutrition guidance, added only when the user asks for it."""
    summary: str = ""
    principles: list[str] = Field(default_factory=list)
    training_day: list[Meal] = Field(default_factory=list)
    rest_day: list[Meal] = Field(default_factory=list)
    hydration: str = ""
    notes: str = ""


class TrainingPlan(BaseModel):
    goal: str
    start_date: date
    weeks: list[PlanWeek]
    nutrition: Optional[NutritionPlan] = None
    # "Start today" in the middle of a week: weeks still run Monday-Sunday, and
    # week 1's days before first_day don't count (not planned, not missed).
    first_day: Optional[date] = None

    @field_validator("start_date")
    @classmethod
    def _monday(cls, v: date) -> date:
        # Plans always start on a Monday so "week N, day X" maps to one date.
        return v - timedelta(days=v.weekday())

    @model_validator(mode="after")
    def _first_day_in_week_one(self) -> "TrainingPlan":
        fd = self.first_day
        if fd is not None and not (self.start_date < fd <= self.start_date + timedelta(days=6)):
            self.first_day = None  # a Monday start (or a nonsense date) needs no first_day
        return self

    @property
    def begins(self) -> date:
        """The first day that counts: first_day, or the Monday the plan starts."""
        return self.first_day or self.start_date

    def is_active(self, week_number: int, day: str) -> bool:
        return self.session_date(week_number, day) >= self.begins

    def week(self, week_number: int) -> Optional[PlanWeek]:
        return next((w for w in self.weeks if w.week_number == week_number), None)

    def week_start(self, week_number: int) -> date:
        return self.start_date + timedelta(weeks=week_number - 1)

    def session_date(self, week_number: int, day: str) -> date:
        return self.week_start(week_number) + timedelta(days=DAYS.index(day))

    def week_for_date(self, d: date) -> int:
        return (d - self.start_date).days // 7 + 1


# --------------------------------------------------------------------------
# Tracker data (produced by adapters)
# --------------------------------------------------------------------------
class HRSample(BaseModel):
    time: datetime
    bpm: int


class Activity(BaseModel):
    source: str                      # e.g. "gpx", "tcx", "fit", "apple_health", "manual"
    type: SessionType
    start_time: datetime
    duration_min: float
    distance_km: Optional[float] = None
    avg_hr: Optional[float] = None
    max_hr: Optional[float] = None
    hr_samples: list[HRSample] = Field(default_factory=list)
    notes: str = ""

    @property
    def day(self) -> date:
        return self.start_time.date()

    @property
    def pace_min_per_km(self) -> Optional[float]:
        if self.distance_km and self.distance_km > 0:
            return self.duration_min / self.distance_km
        return None


class RecoveryDay(BaseModel):
    day: date
    sleep_hours: Optional[float] = None
    resting_hr: Optional[float] = None
    hrv_ms: Optional[float] = None
    source: str = ""


class UserProfile(BaseModel):
    name: str
    age: Optional[int] = None
    max_hr: Optional[int] = None     # if unknown, estimated as 220 - age
    tracker: str = ""
    notes: str = ""

    def effective_max_hr(self) -> Optional[int]:
        if self.max_hr:
            return self.max_hr
        if self.age:
            return 220 - self.age
        return None
