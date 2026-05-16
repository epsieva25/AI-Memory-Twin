"""
Synthetic dataset generator — creates 5000+ student records.
Run: python datasets/generate_data.py
"""
import pandas as pd
import numpy as np
import random
import os

SUBJECTS = ["Artificial Intelligence", "Operating Systems", "Database Systems",
            "Computer Networks", "Mathematics", "Data Structures", "Software Engineering"]

DEPARTMENTS = ["Computer Science", "Information Technology", "Electronics",
               "Mechanical Engineering", "Civil Engineering"]

MOODS = ["happy", "okay", "stressed", "anxious", "burnout"]


def generate_dataset(n: int = 5000, seed: int = 42) -> pd.DataFrame:
    np.random.seed(seed)
    random.seed(seed)
    records = []

    for student_id in range(1, n + 1):
        base_ability = np.random.normal(70, 15)  # student's base ability
        sleep_habit = np.random.normal(7, 1.5)   # avg sleep hours
        stress_base = np.random.uniform(20, 80)

        for subject in random.sample(SUBJECTS, random.randint(4, 6)):
            subject_difficulty = random.uniform(0.8, 1.2)
            marks = np.clip(
                base_ability * subject_difficulty + np.random.normal(0, 10), 0, 100
            )
            attendance = np.clip(
                np.random.normal(80, 15), 0, 100
            )
            assignment_completion = np.clip(
                attendance * 0.9 + np.random.normal(0, 10), 0, 100
            )
            study_hours = max(0, np.random.normal(4, 2))
            stress_level = np.clip(
                stress_base + (100 - marks) * 0.3 + np.random.normal(0, 10), 0, 100
            )
            sleep_hours = np.clip(sleep_habit + np.random.normal(0, 0.5), 3, 12)

            # Weak subject flag: marks < 60 or attendance < 75
            is_weak = 1 if (marks < 60 or attendance < 75) else 0

            # Burnout risk: high stress + low sleep + low marks
            burnout_risk = 1 if (stress_level > 70 and sleep_hours < 6 and marks < 65) else 0

            gpa = round((marks / 100) * 4.0, 2)

            records.append({
                "student_id": student_id,
                "department": random.choice(DEPARTMENTS),
                "year": random.randint(1, 4),
                "subject": subject,
                "marks": round(marks, 2),
                "attendance": round(attendance, 2),
                "assignment_completion": round(assignment_completion, 2),
                "study_hours": round(study_hours, 2),
                "sleep_hours": round(sleep_hours, 2),
                "stress_level": round(stress_level, 2),
                "gpa": gpa,
                "mood": random.choice(MOODS),
                "is_weak_subject": is_weak,
                "burnout_risk": burnout_risk
            })

    df = pd.DataFrame(records)
    return df


if __name__ == "__main__":
    os.makedirs("datasets", exist_ok=True)
    df = generate_dataset(5000)
    output_path = os.path.join(os.path.dirname(__file__), "student_data.csv")
    df.to_csv(output_path, index=False)
    print(f"✅ Dataset generated: {len(df)} records → {output_path}")
    print(df.describe())
    print(f"\nWeak subject distribution:\n{df['is_weak_subject'].value_counts()}")
    print(f"\nBurnout risk distribution:\n{df['burnout_risk'].value_counts()}")
