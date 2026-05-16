"""
predictor.py — ML Prediction Service
=====================================
Loads trained scikit-learn models and provides real-time predictions for:
  1. Weak Subject Detection — Random Forest classifier
  2. Burnout Risk Assessment — Gradient Boosting classifier

Model Training Pipeline:
  run: python ml/train_models.py
  → Generates 5000+ synthetic student records
  → Trains models on 80/20 train/test split
  → Saves pipelines (StandardScaler + classifier) as .pkl files

Prediction Features (in order):
  [marks, attendance, assignment_completion, study_hours, sleep_hours, stress_level]

Fallback Design:
  If model .pkl files are missing (pre-training), heuristic rules are used:
  - is_weak = marks < 60 OR attendance < 75
  - burnout = stress > 70 AND sleep < 6 AND marks < 65
  This ensures the API works during demo even before ML training completes.

File locations:
  ml/weak_subject_model.pkl — Random Forest pipeline
  ml/burnout_model.pkl      — Gradient Boosting pipeline
"""

import os
import logging
import numpy as np
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# ── Model paths ────────────────────────────────────────────────────────────────
MODEL_DIR               = os.path.dirname(__file__)
WEAK_SUBJECT_MODEL_PATH = os.path.join(MODEL_DIR, "weak_subject_model.pkl")
BURNOUT_MODEL_PATH      = os.path.join(MODEL_DIR, "burnout_model.pkl")

# ── Feature ordering — must match training order ───────────────────────────────
FEATURES = ["marks", "attendance", "assignment_completion", "study_hours", "sleep_hours", "stress_level"]

# ── Lazy-loaded model singletons — initialized on first call ───────────────────
_weak_subject_model = None
_burnout_model      = None


def _load_models():
    """
    Lazily load both ML model pipelines from disk.
    Uses module-level singletons to avoid re-loading on every request.
    Logs a warning if models are missing (pre-training state).
    """
    global _weak_subject_model, _burnout_model

    if _weak_subject_model is None:
        try:
            import joblib
            if os.path.exists(WEAK_SUBJECT_MODEL_PATH):
                _weak_subject_model = joblib.load(WEAK_SUBJECT_MODEL_PATH)
                logger.info("✅ Weak subject model loaded")
            else:
                logger.warning("⚠️  weak_subject_model.pkl not found — using heuristic fallback")
        except Exception as e:
            logger.error(f"Failed to load weak subject model: {e}")

    if _burnout_model is None:
        try:
            import joblib
            if os.path.exists(BURNOUT_MODEL_PATH):
                _burnout_model = joblib.load(BURNOUT_MODEL_PATH)
                logger.info("✅ Burnout model loaded")
            else:
                logger.warning("⚠️  burnout_model.pkl not found — using heuristic fallback")
        except Exception as e:
            logger.error(f"Failed to load burnout model: {e}")


def predict_weak_subjects(records: List[Dict]) -> Dict[str, Any]:
    """
    Predict which subjects are at risk for a student.

    Args:
        records: List of subject dicts, each containing:
                 {subject, marks, attendance, assignment_completion,
                  study_hours, sleep_hours, stress_level}

    Returns:
        {
          "weak_subjects": ["Subject A", ...],
          "predictions": [
            {"subject": str, "is_weak": bool, "risk_probability": float,
             "marks": float, "attendance": float, "recommendation": str}
          ],
          "total_weak": int,
          "alert_level": "low" | "medium" | "high"
        }
    """
    _load_models()

    if not records:
        return {"weak_subjects": [], "predictions": [], "total_weak": 0, "alert_level": "low"}

    results = []
    for record in records:
        # Build feature vector in correct order
        features = [
            record.get("marks", 70),
            record.get("attendance", 80),
            record.get("assignment_completion", 75),
            record.get("study_hours", 4),
            record.get("sleep_hours", 7),
            record.get("stress_level", 40)
        ]
        X = np.array([features])

        if _weak_subject_model:
            # ML model prediction (pipeline handles scaling internally)
            prediction   = int(_weak_subject_model.predict(X)[0])
            probability  = float(_weak_subject_model.predict_proba(X)[0][1])
        else:
            # Heuristic fallback — rules-based when model is not trained
            prediction   = 1 if (record.get("marks", 70) < 60 or record.get("attendance", 80) < 75) else 0
            probability  = (100 - record.get("marks", 70)) / 100

        results.append({
            "subject": record.get("subject", "Unknown"),
            "is_weak": bool(prediction),
            "risk_probability": round(probability * 100, 1),
            "marks": record.get("marks"),
            "attendance": record.get("attendance"),
            "recommendation": _get_subject_recommendation(record, probability)
        })

    weak = [r for r in results if r["is_weak"]]
    n = len(weak)
    return {
        "weak_subjects": [r["subject"] for r in weak],
        "predictions": results,
        "total_weak": n,
        "alert_level": "high" if n > 2 else "medium" if n > 0 else "low"
    }


def predict_burnout(data: Dict) -> Dict[str, Any]:
    """
    Predict burnout risk level for a student.

    Args:
        data: Dict with keys: marks, attendance, assignment_completion,
              study_hours, sleep_hours, stress_level

    Returns:
        {
          "burnout_risk": bool,
          "probability": float (0-100),
          "risk_level": "Low" | "Medium" | "High",
          "recommendations": list[str]
        }
    """
    _load_models()

    features = [
        data.get("marks", 70),
        data.get("attendance", 80),
        data.get("assignment_completion", 75),
        data.get("study_hours", 4),
        data.get("sleep_hours", 7),
        data.get("stress_level", 40)
    ]
    X = np.array([features])

    if _burnout_model:
        prediction  = int(_burnout_model.predict(X)[0])
        probability = float(_burnout_model.predict_proba(X)[0][1])
    else:
        # Heuristic: weighted combination of stress, sleep deficit, and marks
        stress  = data.get("stress_level", 40)
        sleep   = data.get("sleep_hours", 7)
        marks   = data.get("marks", 70)
        probability = min(1.0, (
            (stress / 100) * 0.50 +
            max(0, (8 - sleep) / 8) * 0.30 +
            max(0, (1 - marks / 100)) * 0.20
        ))
        prediction = 1 if probability > 0.5 else 0

    risk_level = "High" if probability > 0.7 else "Medium" if probability > 0.4 else "Low"

    return {
        "burnout_risk": bool(prediction),
        "probability": round(probability * 100, 1),
        "risk_level": risk_level,
        "recommendations": _get_burnout_recommendations(risk_level)
    }


def _get_subject_recommendation(record: Dict, prob: float) -> str:
    """Generate a human-readable recommendation for a subject based on its metrics."""
    marks      = record.get("marks", 70)
    attendance = record.get("attendance", 80)

    if marks < 60:
        return f"Critical: marks at {marks:.0f}%. Focus on core concepts and past papers immediately."
    if attendance < 75:
        return f"Attendance at {attendance:.0f}% — catch up on missed lectures and notes."
    if prob > 0.4:
        return "Moderate risk. Review recent assignments and seek tutoring support."
    return "On track. Keep up consistent effort!"


def _get_burnout_recommendations(level: str) -> List[str]:
    """Return level-specific wellness recommendations."""
    if level == "High":
        return [
            "🚨 Take a 2-3 day rest immediately — your body needs it.",
            "Limit study to 3 hours/day maximum during recovery.",
            "Prioritize 8+ hours of sleep — non-negotiable.",
            "Talk to a mentor, counselor, or trusted peer.",
            "Try box breathing: 4 seconds in, hold 4, out 4, hold 4."
        ]
    if level == "Medium":
        return [
            "Balance study blocks with 15-minute rest breaks (Pomodoro).",
            "Aim for 7-8 hours of quality sleep nightly.",
            "Add 20 minutes of light exercise or walking daily.",
            "Use the study planner to avoid last-minute cramming."
        ]
    return [
        "You're managing stress well — keep it up!",
        "Maintain consistent sleep/wake times for cognitive peak.",
        "Schedule one 'free' day per week for mental reset."
    ]
