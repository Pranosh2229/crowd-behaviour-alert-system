from fastapi import APIRouter
from models.schemas import HealthResponse, AlertHistoryResponse, StatisticsResponse
from utils.crowd_logic import get_alert_history, get_statistics
from datetime import datetime
import time

router = APIRouter()

# Track system start time
START_TIME = time.time()
total_detections = 0

def get_uptime() -> str:
    elapsed = int(time.time() - START_TIME)
    hours = elapsed // 3600
    minutes = (elapsed % 3600) // 60
    seconds = elapsed % 60
    return f"{hours}h {minutes}m {seconds}s"

@router.get("/system/health", response_model=HealthResponse)
def health_check():
    return {
        "status": "running",
        "service": "crowd-behaviour-alert-system",
        "version": "1.0.0",
        "uptime": get_uptime(),
        "model_loaded": True,
        "total_detections": total_detections
    }

@router.get("/system/alerts", response_model=AlertHistoryResponse)
def get_alerts():
    history = get_alert_history()
    return {
        "status": "success",
        "total_alerts": len(history),
        "alerts": history
    }

@router.get("/system/statistics", response_model=StatisticsResponse)
def get_stats():
    stats = get_statistics()
    history = get_alert_history()
    return {
        "status": "success",
        "statistics": stats,
        "alert_history": history
    }

@router.get("/system/info")
def system_info():
    return {
        "status": "success",
        "data": {
            "system_name": "Crowd Behaviour Alert System",
            "version": "1.0.0",
            "detection_modes": ["webcam", "video", "cctv"],
            "supported_densities": ["low", "medium", "high"],
            "supported_risk_levels": ["safe", "warning", "danger"],
            "uptime": get_uptime(),
            "started_at": datetime.fromtimestamp(START_TIME).isoformat()
        }
    }