from backend.database.db import SessionLocal
from backend.database.models import User

def reset_user_credits():
    db = SessionLocal()
    try:
        db.query(User).update({"credits": 5})
        db.commit()
        print("✅ Credits reset to 5 for all users")
    except Exception as e:
        print(f'❌ Failed to reset credits: {e}')
    finally:
        db.close()