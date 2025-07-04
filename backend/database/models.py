from sqlalchemy import Column, String, Integer, Boolean, TIMESTAMP, ForeignKey, Text, DECIMAL, BigInteger
from sqlalchemy.dialects.postgresql import UUID as pgUUID
import uuid
from .db import Base  # Relative import

class User(Base):
    __tablename__ = "users"

    user_id = Column(pgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(256))
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20))
    credits = Column(Integer)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)
    last_login = Column(TIMESTAMP)



class TranslationProject(Base):
    __tablename__ = "translation_projects"

    project_id = Column(pgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(pgUUID(as_uuid=True), ForeignKey("users.user_id"))
    project_name = Column(String(100))
    description = Column(Text)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)


class SubtitleFile(Base):
    __tablename__ = "subtitle_files"

    file_id = Column(pgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(pgUUID(as_uuid=True), ForeignKey("translation_projects.project_id"), nullable=True)
    user_id = Column(pgUUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    original_file_name= Column(String(255))
    storage_path = Column(String(512))
    file_format = Column(String(10))
    file_size_bytes = Column(BigInteger)
    is_original = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    has_profanity = Column(Boolean, default=False)
    source_language = Column(String(10))  # BCP-47 tag
    created_at = Column(TIMESTAMP)



class Translation(Base):
    __tablename__ = "translations"

    translation_id = Column(pgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(pgUUID(as_uuid=True), ForeignKey("subtitle_files.file_id"), nullable=False)  # original file
    translated_file_id = Column(pgUUID(as_uuid=True), ForeignKey("subtitle_files.file_id"), nullable=True)  # translated version
    source_language = Column(String(20))
    target_language = Column(String(20))
    translation_status = Column(String(20))  # e.g., 'pending', 'completed'
    translation_service = Column(String(50))
    requested_at = Column(TIMESTAMP)
    completed_at = Column(TIMESTAMP)
    has_profanity = Column(Boolean, default=False)
    translation_cost = Column(DECIMAL(10, 4))
    manual_edits_count = Column(Integer, default=0)
    last_edited_by_user_id = Column(pgUUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    last_edited_at = Column(TIMESTAMP)


class LiveSession(Base):
    __tablename__ = "live_sessions"

    session_id = Column(pgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(pgUUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    session_title = Column(String(100))
    source_platform = Column(String(50))  # e.g., 'Zoom', 'Teams'
    source_language = Column(String(10))
    target_language = Column(String(10))
    start_time = Column(TIMESTAMP)
    end_time = Column(TIMESTAMP)
    full_transcript_path = Column(String(512))
    translation_log_path = Column(String(512))