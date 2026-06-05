"""
Rule-based recommendations from the active student's live profile data.
"""
from typing import Any, Dict, List, Optional


def generate_recommendations(
    *,
    gpa: float,
    target_cgpa: float,
    avg_attendance: float,
    avg_stress: float,
    productivity: float,
    weak_subjects: List[str],
    pending_tasks: int,
    daily_study_hours: float = 2.0,
) -> List[str]:
    tips: List[str] = []

    if weak_subjects:
        tips.append(f"Prioritize {weak_subjects[0]} — focus on fundamentals and past papers.")
        if len(weak_subjects) > 1:
            tips.append(f"Schedule short daily reviews for {weak_subjects[1]}.")
    else:
        tips.append("Add academic records so we can identify subjects that need attention.")

    if avg_stress > 70:
        tips.append("Stress is high — take a 15-minute break and aim for 7+ hours of sleep tonight.")
    elif avg_stress > 45:
        tips.append("Balance study blocks with short walks to keep stress manageable.")

    if avg_attendance < 75:
        tips.append("Attendance is below target — catch up on missed lectures this week.")

    if gpa < target_cgpa and target_cgpa > 0:
        gap = round(target_cgpa - gpa, 2)
        tips.append(f"You're {gap} GPA points from your target — increase weekly study time by ~{max(1, int(daily_study_hours))}h on weak subjects.")

    if productivity < 50 and pending_tasks > 0:
        tips.append(f"You have {pending_tasks} open tasks — complete one high-priority item today.")

    if not tips:
        tips.append("Great momentum — maintain your current study rhythm and log wellness check-ins.")

    return tips[:5]
