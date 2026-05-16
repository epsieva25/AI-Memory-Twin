"""
ML model training script for weak subject prediction and burnout risk.
Run: python ml/train_models.py
"""
import os
import sys
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets", "student_data.csv")
MODEL_DIR = os.path.dirname(__file__)

FEATURES = ["marks", "attendance", "assignment_completion", "study_hours", "sleep_hours", "stress_level"]


def load_or_generate_data():
    if not os.path.exists(DATA_PATH):
        print("Dataset not found. Generating...")
        from datasets.generate_data import generate_dataset
        df = generate_dataset(5000)
        df.to_csv(DATA_PATH, index=False)
        print(f"Dataset generated: {len(df)} records")
    return pd.read_csv(DATA_PATH)


def train_weak_subject_model(df: pd.DataFrame):
    print("\n📚 Training Weak Subject Prediction Model...")
    X = df[FEATURES]
    y = df["is_weak_subject"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1))
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"   Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=["Strong", "Weak"]))

    model_path = os.path.join(MODEL_DIR, "weak_subject_model.pkl")
    joblib.dump(pipeline, model_path)
    print(f"   ✅ Saved to {model_path}")
    return pipeline


def train_burnout_model(df: pd.DataFrame):
    print("\n🔥 Training Burnout Risk Prediction Model...")
    X = df[FEATURES]
    y = df["burnout_risk"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", GradientBoostingClassifier(n_estimators=100, random_state=42))
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"   Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=["No Burnout", "Burnout Risk"]))

    model_path = os.path.join(MODEL_DIR, "burnout_model.pkl")
    joblib.dump(pipeline, model_path)
    print(f"   ✅ Saved to {model_path}")
    return pipeline


if __name__ == "__main__":
    df = load_or_generate_data()
    print(f"Loaded dataset: {len(df)} records")
    train_weak_subject_model(df)
    train_burnout_model(df)
    print("\n🎉 All models trained successfully!")
