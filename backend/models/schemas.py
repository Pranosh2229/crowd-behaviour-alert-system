from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ─── Request Schemas ───────────────────────────────────────

class WebcamRequest(BaseModel):
    frame_data: str = Field(..., description="Base64 encoded image frame")
    timestamp: str = Field(..., description="ISO format timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "frame_data": "base64_encoded_string_here",
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }

class VideoRequest(BaseModel):
    analysis_mode: str = Field(default="density", description="Analysis mode: density")

    class Config:
        json_schema_extra = {
            "example": {
                "analysis_mode": "density"
            }
        }

class CCTVRequest(BaseModel):
    camera_id: str = Field(..., description="Unique camera identifier")
    stream_url: str = Field(..., description="RTSP or HTTP stream URL")

    class Config:
        json_schema_extra = {
            "example": {
                "camera_id": "CAM_001",
                "stream_url": "rtsp://192.168.1.1:554/stream"
            }
        }

# ─── Core Detection Data ────────────────────────────────────

class CrowdStatistics(BaseModel):
    average_count: float
    peak_count: int
    min_count: int
    total_readings: int

class DetectionData(BaseModel):
    people_count: int
    crowd_density: str
    risk_level: str
    alert_triggered: bool
    density_score: Optional[float] = None
    trend: Optional[str] = None
    recommended_action: Optional[str] = None
    severity_color: Optional[str] = None
    area_coverage: Optional[str] = None
    statistics: Optional[CrowdStatistics] = None
    timestamp: Optional[str] = None

# ─── Response Schemas ───────────────────────────────────────

class DetectionResponse(BaseModel):
    status: str
    data: DetectionData

class HealthResponse(BaseModel):
    status: str
    service: str
    version: Optional[str] = None
    uptime: Optional[str] = None
    model_loaded: Optional[bool] = None
    total_detections: Optional[int] = None

class AlertHistoryItem(BaseModel):
    timestamp: str
    risk_level: str
    people_count: int
    source: str

class AlertHistoryResponse(BaseModel):
    status: str
    total_alerts: int
    alerts: List[AlertHistoryItem]

class StatisticsResponse(BaseModel):
    status: str
    statistics: CrowdStatistics
    alert_history: List[AlertHistoryItem]