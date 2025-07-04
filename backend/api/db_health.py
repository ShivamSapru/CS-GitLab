# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from sqlalchemy import text  
# from backend.database.db import SessionLocal

# router = APIRouter()

# # Dependency to get DB session
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# @router.get("/db-test")
# def test_db_connection(db: Session = Depends(get_db)):
#     try:
#         db.execute(text("SELECT 1"))  
#         return {"message": "Database connection successful"}
#     except Exception as e:
#         return {"error": str(e)}
