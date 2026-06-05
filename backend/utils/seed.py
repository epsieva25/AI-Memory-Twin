"""
Database seeder — intentionally does NOT create demo profiles.

The single active student profile is created only through onboarding (POST /api/profile/create).
"""
import logging

logger = logging.getLogger(__name__)


def seed_database():
    """No-op: profile-driven installs must use onboarding, not demo data."""
    logger.info("Skipping auto-seed — student profile is created via onboarding only.")
    return None


if __name__ == "__main__":
    seed_database()
