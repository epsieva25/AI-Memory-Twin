"""
Database seeder — populates PostgreSQL + syncs Neo4j with a complete demo student.
Run: python utils/seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from database.connection import SessionLocal, create_tables
from models.student import Student
from models.academic_record import AcademicRecord
from models.stress_log import StressLog
from models.study_plan import StudyPlan
from models.notification import Notification
from models.chatbot_history import ChatbotHistory

import random

DEMO_EMAIL = "demo@memorytwin.ai"

SUBJECTS = [
    ("Artificial Intelligence", 65, 78),
    ("Operating Systems", 82, 92),
    ("Database Systems", 71, 85),
    ("Computer Networks", 58, 72),
    ("Mathematics", 90, 95),
    ("Data Structures", 76, 88),
    ("Software Engineering", 83, 91),
]

NOTIFICATIONS = [
    ("⚠️ Attendance Warning", "Your attendance in Computer Networks dropped below 75%.", "warning"),
    ("📅 Exam Reminder", "Database Systems quiz is scheduled for this Friday at 10:00 AM.", "alert"),
    ("🧠 AI Insight", "Your Memory Twin has generated a new personalized study plan for your finals.", "ai"),
    ("🎯 Goal Achieved!", "You completed your weekly study goal of 30 hours. Great work!", "success"),
    ("📝 Assignment Due", "Software Engineering project submission deadline is tomorrow at 11:59 PM.", "alert"),
    ("💡 Study Tip", "You study best between 9 AM and 12 PM. Schedule hard topics then.", "ai"),
]

CHAT_HISTORY = [
    ("Explain neural networks in simple terms", "A neural network is like a simplified model of the human brain. It consists of layers of 'neurons' (mathematical functions) that process information. Data flows forward through the network: **Input Layer → Hidden Layers → Output Layer**. Each connection has a 'weight' that is adjusted during training to minimize errors. Think of it as teaching a child by showing examples — the network learns patterns by adjusting its weights based on mistakes. **Key types:** CNNs (images), RNNs (sequences), Transformers (text)."),
    ("What is the difference between supervised and unsupervised learning?", "Great question!\n\n**Supervised Learning** trains models on *labeled* data (input → known output). Examples: classification, regression.\n\n**Unsupervised Learning** finds patterns in *unlabeled* data. The model discovers structure on its own. Examples: clustering (K-Means), dimensionality reduction (PCA).\n\n**Analogy:** Supervised = learning with an answer key. Unsupervised = exploring a new city without a map."),
    ("Generate 3 quiz questions on OS scheduling", "Here are 3 quiz questions on OS Scheduling:\n\n**Q1:** Which scheduling algorithm can lead to starvation?\n- A) Round Robin\n- B) FCFS\n- C) Priority Scheduling ✅\n- D) SJF\n\n**Q2:** What does 'Preemptive Scheduling' mean?\n- A) Process runs until completion\n- B) CPU can be taken from a running process ✅\n- C) Processes run in order of arrival\n- D) None of the above\n\n**Q3:** The average waiting time is minimized by which algorithm?\n- A) FCFS\n- B) Round Robin\n- C) SJF ✅\n- D) Priority"),
]


def seed_database():
    create_tables()
    db = SessionLocal()

    try:
        existing = db.query(Student).filter(Student.email == DEMO_EMAIL).first()
        if existing:
            print(f"✅ Demo student already exists (id={existing.id}). Skipping seed.")
            db.close()
            return existing.id

        print("🌱 Seeding demo student...")

        student = Student(
            name="Mary Jasper",
            email=DEMO_EMAIL,
            department="CSE",
            year=4,
            is_active=True,
        )
        db.add(student)
        db.flush()
        print(f"   ✅ Student created: {student.name} (id={student.id})")

        for sem in range(1, 4):
            for subject, base_marks, base_att in SUBJECTS:
                marks = min(100, max(0, base_marks + random.gauss(0, 8)))
                att = min(100, max(0, base_att + random.gauss(0, 5)))
                record = AcademicRecord(
                    student_id=student.id,
                    subject=subject,
                    marks=round(marks, 1),
                    attendance=round(att, 1),
                    assignment_completion=round(min(100, att * 0.95 + random.gauss(0, 5)), 1),
                    semester=sem,
                )
                db.add(record)
        print(f"   ✅ Academic records created ({len(SUBJECTS) * 3} records)")

        moods = ["happy", "okay", "stressed", "okay", "anxious", "okay", "happy"]
        for i in range(30):
            mood = moods[i % len(moods)]
            stress = 35 + random.gauss(0, 20)
            if mood in ("stressed", "anxious"):
                stress += 20
            elif mood == "happy":
                stress -= 10
            log = StressLog(
                student_id=student.id,
                stress_level=round(min(100, max(0, stress)), 1),
                mood=mood,
                sleep_hours=round(min(10, max(4, random.gauss(7.2, 1))), 1),
                energy_level=round(min(100, max(10, random.gauss(65, 20))), 1),
                timestamp=datetime.utcnow() - timedelta(days=30 - i),
            )
            db.add(log)
        print("   ✅ Stress logs created (30 days)")

        tasks = [
            ("Review OS Chapter 4: Memory Management", "Operating Systems", 2.0, "High", False),
            ("Complete AI Assignment on Neural Networks", "Artificial Intelligence", 3.0, "High", False),
            ("Database Systems — SQL Practice Exercises", "Database Systems", 1.5, "Medium", False),
            ("Computer Networks — TCP/IP revision", "Computer Networks", 2.5, "High", False),
            ("Mathematics — Integration practice", "Mathematics", 1.0, "Low", True),
            ("Software Engineering — UML diagrams review", "Software Engineering", 1.5, "Medium", True),
        ]
        for task_name, subject, duration, priority, completed in tasks:
            plan = StudyPlan(
                student_id=student.id,
                task=task_name,
                subject=subject,
                duration=duration,
                priority=priority,
                deadline=datetime.utcnow() + timedelta(days=random.randint(1, 7)),
                is_completed=completed,
                ai_generated=False,
            )
            db.add(plan)
        print(f"   ✅ Study plans created ({len(tasks)} tasks)")

        for i, (title, message, ntype) in enumerate(NOTIFICATIONS):
            notif = Notification(
                student_id=student.id,
                title=title,
                message=message,
                type=ntype,
                is_read=(i > 2),
                created_at=datetime.utcnow() - timedelta(hours=i * 6),
            )
            db.add(notif)
        print(f"   ✅ Notifications created ({len(NOTIFICATIONS)} entries)")

        for question, response in CHAT_HISTORY:
            chat = ChatbotHistory(
                student_id=student.id,
                question=question,
                response=response,
                session_id="demo-session-001",
                timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
            )
            db.add(chat)
        print(f"   ✅ Chat history created ({len(CHAT_HISTORY)} entries)")

        db.commit()

        try:
            from graphdb.neo4j_service import (
                create_student_node, create_subject_relationship, create_stress_performance_link
            )
            create_student_node(student.id, student.name, student.department, student.year)
            for subject, base_marks, base_att in SUBJECTS:
                create_subject_relationship(student.id, subject, base_marks, base_att)
            create_stress_performance_link(student.id, 52.0, 3.2)
            print("   ✅ Neo4j graph seeded")
        except Exception as e:
            print(f"   ⚠️  Neo4j seed skipped: {e} (Neo4j may not be running yet)")

        print(f"\n🎉 Database seeded successfully!")

        return student.id

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()