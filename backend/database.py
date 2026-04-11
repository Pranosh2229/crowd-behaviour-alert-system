"""
database.py — SQLite Database Setup
====================================
Tables:
  - users           : JWT auth, roles (admin/operator/viewer)
  - cameras         : registered cameras + health status
  - zones           : monitoring zones per camera
  - alerts          : all danger/warning alert history
  - incidents       : serious incidents with snapshots
  - behaviour_events: panic/stampede/fighting/loitering detections
  - analytics       : periodic crowd count snapshots for charting
  - notifications   : in-app notification log
  - schedules       : shift/event scheduling with custom thresholds

Run this file directly to initialize:
  python database.py
"""

from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# ─── Config ────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "crowd_system.db")
DB_URL   = f"sqlite:///{DB_PATH}"

engine       = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base         = declarative_base()


# ─── Dependency for FastAPI routes ─────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ══════════════════════════════════════════════════════════
# TABLES
# ══════════════════════════════════════════════════════════

class User(Base):
    """Operators who can log in to the system"""
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    username     = Column(String(50), unique=True, nullable=False, index=True)
    email        = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role         = Column(String(20), default="operator")   # admin | operator | viewer
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    last_login   = Column(DateTime, nullable=True)

    notifications = relationship("Notification", back_populates="user")


class Camera(Base):
    """Registered CCTV / webcam sources"""
    __tablename__ = "cameras"

    id           = Column(Integer, primary_key=True, index=True)
    camera_id    = Column(String(50), unique=True, nullable=False, index=True)
    name         = Column(String(100), nullable=False)
    location     = Column(String(200), nullable=True)
    site         = Column(String(100), default="main")       # multi-site support
    stream_url   = Column(String(500), nullable=True)
    is_active    = Column(Boolean, default=True)
    is_online    = Column(Boolean, default=False)
    last_seen    = Column(DateTime, nullable=True)
    health_score = Column(Float, default=100.0)              # 0-100
    created_at   = Column(DateTime, default=datetime.utcnow)

    zones     = relationship("Zone",  back_populates="camera")
    alerts    = relationship("Alert", back_populates="camera")
    incidents = relationship("Incident", back_populates="camera")


class Zone(Base):
    """Monitoring zones within a camera view"""
    __tablename__ = "zones"

    id           = Column(Integer, primary_key=True, index=True)
    camera_id    = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    zone_name    = Column(String(100), nullable=False)
    zone_key     = Column(String(50),  nullable=False)        # e.g. "top_left"
    x1           = Column(Float, default=0.0)                 # normalized 0-1
    y1           = Column(Float, default=0.0)
    x2           = Column(Float, default=1.0)
    y2           = Column(Float, default=1.0)
    max_capacity = Column(Integer, default=50)
    warning_pct  = Column(Float, default=0.70)
    danger_pct   = Column(Float, default=0.90)
    is_active    = Column(Boolean, default=True)

    camera       = relationship("Camera", back_populates="zones")


class Alert(Base):
    """All warning/danger alerts triggered"""
    __tablename__ = "alerts"

    id              = Column(Integer, primary_key=True, index=True)
    camera_id       = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    source          = Column(String(100), nullable=False)     # webcam | video | cctv_CAM_001
    risk_level      = Column(String(20),  nullable=False)     # warning | danger
    people_count    = Column(Integer,     nullable=False)
    crowd_density   = Column(String(20),  nullable=True)
    density_score   = Column(Float,       nullable=True)
    trend           = Column(String(20),  nullable=True)
    behaviour       = Column(String(50),  nullable=True)      # panic | stampede | fighting
    zone            = Column(String(50),  nullable=True)
    recommended_action = Column(Text,     nullable=True)
    sms_sent        = Column(Boolean, default=False)
    email_sent      = Column(Boolean, default=False)
    voice_sent      = Column(Boolean, default=False)
    acknowledged    = Column(Boolean, default=False)
    acknowledged_by = Column(String(50),  nullable=True)
    timestamp       = Column(DateTime, default=datetime.utcnow, index=True)

    camera          = relationship("Camera", back_populates="alerts")


class Incident(Base):
    """Serious incidents with optional snapshot"""
    __tablename__ = "incidents"

    id              = Column(Integer, primary_key=True, index=True)
    camera_id       = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    incident_type   = Column(String(50),  nullable=False)     # panic | stampede | fighting | abandoned_object
    severity        = Column(String(20),  nullable=False)     # low | medium | high | critical
    description     = Column(Text,        nullable=True)
    people_count    = Column(Integer,     nullable=True)
    location        = Column(String(200), nullable=True)
    snapshot_b64    = Column(Text,        nullable=True)      # base64 frame
    heatmap_b64     = Column(Text,        nullable=True)
    resolved        = Column(Boolean, default=False)
    resolved_by     = Column(String(50),  nullable=True)
    resolved_at     = Column(DateTime,    nullable=True)
    extra_data      = Column(JSON,        nullable=True)      # flexible extra fields
    timestamp       = Column(DateTime, default=datetime.utcnow, index=True)

    camera          = relationship("Camera", back_populates="incidents")


class BehaviourEvent(Base):
    """Detected behaviour events (panic, fighting, loitering, etc.)"""
    __tablename__ = "behaviour_events"

    id              = Column(Integer, primary_key=True, index=True)
    source          = Column(String(100), nullable=False)
    behaviour_type  = Column(String(50),  nullable=False)     # normal | panic | stampede | fighting | loitering | suspicious
    confidence      = Column(Float,       nullable=True)
    people_involved = Column(Integer,     nullable=True)
    zone            = Column(String(50),  nullable=True)
    flow_direction  = Column(String(50),  nullable=True)      # north | south | east | west | chaotic
    motion_intensity = Column(Float,      nullable=True)      # 0-100
    extra_data      = Column(JSON,        nullable=True)
    timestamp       = Column(DateTime, default=datetime.utcnow, index=True)


class AnalyticsSnapshot(Base):
    """Periodic crowd count snapshots for chart rendering"""
    __tablename__ = "analytics"

    id              = Column(Integer, primary_key=True, index=True)
    source          = Column(String(100), nullable=False)
    people_count    = Column(Integer,     nullable=False)
    crowd_density   = Column(String(20),  nullable=True)
    risk_level      = Column(String(20),  nullable=True)
    density_score   = Column(Float,       nullable=True)
    entry_count     = Column(Integer,     default=0)
    exit_count      = Column(Integer,     default=0)
    behaviour       = Column(String(50),  nullable=True)
    flow_direction  = Column(String(50),  nullable=True)
    zone_data       = Column(JSON,        nullable=True)      # per-zone counts
    timestamp       = Column(DateTime, default=datetime.utcnow, index=True)


class Notification(Base):
    """In-app notification log per user"""
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    title       = Column(String(200), nullable=False)
    message     = Column(Text,        nullable=False)
    type        = Column(String(30),  default="info")         # info | warning | danger | success
    is_read     = Column(Boolean, default=False)
    source      = Column(String(100), nullable=True)
    timestamp   = Column(DateTime, default=datetime.utcnow, index=True)

    user        = relationship("User", back_populates="notifications")


class Schedule(Base):
    """Shift/event scheduling with custom capacity thresholds"""
    __tablename__ = "schedules"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False)
    site            = Column(String(100), default="main")
    start_time      = Column(String(5),   nullable=False)     # "HH:MM"
    end_time        = Column(String(5),   nullable=False)
    days            = Column(JSON,        nullable=False)     # ["monday", "friday"]
    max_capacity    = Column(Integer,     default=100)
    warning_pct     = Column(Float,       default=0.70)
    danger_pct      = Column(Float,       default=0.90)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)


class AlertConfig(Base):
    """Alert channel configuration (Twilio, SMTP, Voice)"""
    __tablename__ = "alert_config"

    id              = Column(Integer, primary_key=True, index=True)
    channel         = Column(String(30),  nullable=False)     # sms | email | voice
    is_enabled      = Column(Boolean, default=False)
    config_data     = Column(JSON,        nullable=True)      # credentials stored as JSON
    trigger_on      = Column(JSON,        default=["danger"]) # ["warning", "danger"]
    updated_at      = Column(DateTime, default=datetime.utcnow)


# ══════════════════════════════════════════════════════════
# INIT
# ══════════════════════════════════════════════════════════

def init_db():
    """Create all tables and seed default data"""
    Base.metadata.create_all(bind=engine)
    print(f"✅ Database initialized at: {DB_PATH}")

    db = SessionLocal()
    try:
        # ── Seed default admin user ──────────────────────
        existing = db.query(User).filter(User.username == "admin").first()
        if not existing:
            from passlib.context import CryptContext
            pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
            admin = User(
                username        = "admin",
                email           = "admin@crowdsystem.local",
                hashed_password = pwd_ctx.hash("admin123"),
                role            = "admin",
                is_active       = True,
            )
            db.add(admin)
            print("✅ Default admin created — username: admin | password: admin123")

        # ── Seed default alert config ────────────────────
        for channel in ["sms", "email", "voice"]:
            exists = db.query(AlertConfig).filter(AlertConfig.channel == channel).first()
            if not exists:
                db.add(AlertConfig(channel=channel, is_enabled=False, config_data={}, trigger_on=["danger"]))

        # ── Seed default camera ──────────────────────────
        cam_exists = db.query(Camera).filter(Camera.camera_id == "CAM_001").first()
        if not cam_exists:
            db.add(Camera(
                camera_id  = "CAM_001",
                name       = "Main Entrance",
                location   = "Entrance Gate",
                site       = "main",
                is_active  = True,
                is_online  = False,
            ))
            print("✅ Default camera CAM_001 seeded")

        db.commit()
        print("✅ Default seed data inserted")

    except Exception as e:
        db.rollback()
        print(f"⚠️  Seed error (safe to ignore if already seeded): {e}")
    finally:
        db.close()


# ══════════════════════════════════════════════════════════
# RUN DIRECTLY TO INITIALIZE
# ══════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Initializing Crowd Behaviour Alert System Database...")
    init_db()
    print("\nTables created:")
    for table in Base.metadata.tables:
        print(f"  ✓ {table}")