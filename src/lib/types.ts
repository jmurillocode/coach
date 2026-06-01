// Shared types for Coach

export type DailyMetrics = {
  metric_date: string;
  recovery_score: number | null;
  hrv_rmssd_ms: number | null;
  resting_hr: number | null;
  sleep_performance: number | null;
  sleep_duration_min: number | null;
  sleep_need_min: number | null;
  sleep_efficiency: number | null;
  respiratory_rate: number | null;
  day_strain: number | null;
  skin_temp_c: number | null;
  spo2: number | null;
  source: string;
  raw: Record<string, unknown>;
};

export type Workout = {
  id: string;
  external_id: string | null;
  source: string;
  sport: string | null;
  start_time: string;
  duration_s: number | null;
  distance_m: number | null;
  avg_pace_s_per_km: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_m: number | null;
  calories: number | null;
  perceived_effort: number | null;
  splits: unknown[];
  raw: Record<string, unknown>;
};

export type MealItem = {
  name: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Meal = {
  id: string;
  eaten_at: string;
  meal_type: string | null;
  photo_path: string | null;
  photo_url: string | null;
  ai_items: MealItem[];
  calories_est: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  portion_assessment: string | null;
  ai_notes: string | null;
  user_note: string | null;
};

export type JournalEntry = {
  id: string;
  entry_at: string;
  mood: number | null;
  energy: number | null;
  soreness: number | null;
  stress: number | null;
  body_weight_kg: number | null;
  note: string | null;
  tags: string[];
};

export type PlanSession = {
  id: string;
  day_date: string;
  session_type: string;
  title: string | null;
  details: Record<string, unknown>;
  planned_distance_km: number | null;
  planned_duration_min: number | null;
  target_pace: string | null;
  status: string;
  actual_workout_id: string | null;
  coach_note: string | null;
};

export type CoachingBrief = {
  id: string;
  brief_date: string;
  kind: string;
  title: string | null;
  body: string;
  model: string | null;
  created_at: string;
};

export type Profile = {
  id: number;
  name: string | null;
  dob: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  max_hr: number | null;
  resting_hr: number | null;
  goal: string | null;
  race_date: string | null;
  context: Record<string, unknown>;
};
