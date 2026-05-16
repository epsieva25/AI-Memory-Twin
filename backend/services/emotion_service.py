"""
Stress and emotion analysis service using VADER sentiment + heuristics.
"""
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import Dict, Any, List

analyzer = SentimentIntensityAnalyzer()


def analyze_text_sentiment(text: str) -> Dict[str, Any]:
    """Analyze sentiment of a text using VADER."""
    scores = analyzer.polarity_scores(text)
    compound = scores["compound"]

    if compound >= 0.05:
        sentiment = "positive"
        emotion = "happy"
    elif compound <= -0.5:
        sentiment = "negative"
        emotion = "stressed"
    elif compound <= -0.2:
        sentiment = "negative"
        emotion = "anxious"
    else:
        sentiment = "neutral"
        emotion = "okay"

    return {
        "sentiment": sentiment,
        "emotion": emotion,
        "compound_score": compound,
        "scores": scores
    }


def analyze_stress_pattern(logs: List[Dict]) -> Dict[str, Any]:
    """Analyze stress patterns from recent logs."""
    if not logs:
        return {"status": "no_data", "recommendations": []}

    avg_stress = sum(l.get("stress_level", 0) for l in logs) / len(logs)
    avg_sleep = sum(l.get("sleep_hours", 0) for l in logs) / len(logs)
    avg_energy = sum(l.get("energy_level", 50) for l in logs) / len(logs)

    # Trend detection
    if len(logs) >= 3:
        recent = [l.get("stress_level", 0) for l in logs[-3:]]
        trend = "increasing" if recent[-1] > recent[0] else "decreasing" if recent[-1] < recent[0] else "stable"
    else:
        trend = "stable"

    # Risk assessment
    burnout_score = (avg_stress / 100 * 0.5) + ((8 - avg_sleep) / 8 * 0.3) + ((50 - avg_energy) / 50 * 0.2)
    burnout_score = max(0, min(1, burnout_score))

    risk_level = "High" if burnout_score > 0.7 else "Medium" if burnout_score > 0.4 else "Low"

    recommendations = _get_wellness_recommendations(avg_stress, avg_sleep, trend)

    return {
        "avg_stress": round(avg_stress, 1),
        "avg_sleep": round(avg_sleep, 1),
        "avg_energy": round(avg_energy, 1),
        "stress_trend": trend,
        "burnout_score": round(burnout_score * 100, 1),
        "risk_level": risk_level,
        "recommendations": recommendations
    }


def _get_wellness_recommendations(stress: float, sleep: float, trend: str) -> List[str]:
    recs = []
    if stress > 70:
        recs.append("Your stress is critically high. Take a 2-day recovery break.")
        recs.append("Try the 4-7-8 breathing technique: inhale 4s, hold 7s, exhale 8s.")
    elif stress > 50:
        recs.append("Moderate stress detected. Incorporate 20-minute walks daily.")
    else:
        recs.append("Stress levels are healthy. Keep up your balanced routine!")

    if sleep < 6:
        recs.append("Critical sleep deficiency! Aim for at least 7-8 hours nightly.")
    elif sleep < 7:
        recs.append("Slightly low on sleep. Try sleeping 30 minutes earlier each night.")

    if trend == "increasing":
        recs.append("Stress is trending upward this week — review your workload and delegate tasks.")

    recs.append("Stay hydrated: drink 2-3 liters of water daily for optimal cognitive performance.")
    return recs
