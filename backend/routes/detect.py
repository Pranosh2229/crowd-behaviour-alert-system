
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.schemas import WebcamRequest, CCTVRequest
from services.detection import (
    process_webcam_frame,
    process_video_file,
    process_cctv_stream,
    CrowdDetectionEngine,
    reset_tracker,
    reset_smart_processor
)
from services.alert_service import dispatch_alerts
from datetime import datetime
import tempfile
import os
import shutil

router = APIRouter()

# ─── Webcam Detection ──────────────────────────────────────

@router.post("/detect/webcam")
async def detect_webcam(request: WebcamRequest):
    try:
        if not request.frame_data:
            raise HTTPException(status_code=400, detail="frame_data is required")

        if not request.timestamp:
            request.timestamp = datetime.now().isoformat()

        result = process_webcam_frame(
            frame_data=request.frame_data,
            timestamp=request.timestamp
        )

        risk_level = result.get("risk_level", "safe")
        if risk_level in ("warning", "danger"):
            behaviour_data = result.get("behaviour", {})
            primary_behaviour = behaviour_data.get("primary_behaviour", "normal") if behaviour_data else "normal"
            recommended_action = result.get("recommended_action", "")

            dispatch_alerts(
                people_count=result["people_count"],
                risk_level=risk_level,
                behaviour=primary_behaviour,
                location="Main Entrance",
                source="webcam",
                recommended_action=recommended_action,
                send_sms=True,
                send_voice=risk_level == "danger",
                send_email=True
            )

        return {
            "status": "success",
            "data": {
                "people_count": result["people_count"],
                "crowd_density": result["crowd_density"],
                "risk_level": result["risk_level"],
                "alert_triggered": result["alert_triggered"],
                "density_score": result["density_score"],
                "trend": result["trend"],
                "recommended_action": result["recommended_action"],
                "severity_color": result["severity_color"],
                "area_coverage": result["area_coverage"],
                "statistics": result["statistics"],
                "timestamp": result["timestamp"],
                "detections": result["detections"],
                "annotated_frame": result["annotated_frame"],
                "heatmap_frame": result["heatmap_frame"],
                "processing_time_ms": result["processing_time_ms"],
                "avg_processing_time_ms": result["avg_processing_time_ms"],
                "model": result.get("model"),
                "optical_flow": result.get("optical_flow"),
                "tracking": result.get("tracking"),
                "behaviour": result.get("behaviour"),
                "frame_skipped": result.get("frame_skipped", False)
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


# ─── Stop Detection ────────────────────────────────────────

@router.post("/detect/stop")
async def stop_detection():
    try:
        reset_tracker()
        reset_smart_processor()
        return {
            "status": "success",
            "message": "Detection stopped. Tracker and processor reset."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stop failed: {str(e)}")


# ─── Video Upload Detection ────────────────────────────────

@router.post("/detect/video")
async def detect_video(
    video_file: UploadFile = File(...),
    analysis_mode: str = Form(default="density")
):
    allowed_types = ["video/mp4", "video/avi", "video/mov", "video/mkv", "video/webm"]
    if video_file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {video_file.content_type}. Allowed: mp4, avi, mov, mkv, webm"
        )

    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, video_file.filename or "upload.mp4")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(video_file.file, buffer)

        result = process_video_file(
            video_path=temp_path,
            analysis_mode=analysis_mode
        )

        risk_level = result.get("risk_level", "safe")
        if risk_level in ("warning", "danger"):
            dispatch_alerts(
                people_count=result["people_count"],
                risk_level=risk_level,
                behaviour="overcrowding" if result["people_count"] > 40 else "normal",
                location="Video Upload",
                source="video",
                recommended_action=result.get("recommended_action", ""),
                send_sms=True,
                send_voice=False,
                send_email=True
            )

        return {
            "status": "success",
            "data": {
                "people_count": result["people_count"],
                "crowd_density": result["crowd_density"],
                "risk_level": result["risk_level"],
                "alert_triggered": result["alert_triggered"],
                "density_score": result["density_score"],
                "trend": result["trend"],
                "recommended_action": result["recommended_action"],
                "severity_color": result["severity_color"],
                "area_coverage": result["area_coverage"],
                "statistics": result["statistics"],
                "timestamp": result["timestamp"],
                "video_metadata": result["video_metadata"],
                "frame_by_frame": result["frame_by_frame"],
                "peak_people_count": result["peak_people_count"],
                "peak_frame": result["peak_frame"],
                "danger_frames": result["danger_frames"],
                "warning_frames": result["warning_frames"],
                "safe_frames": result["safe_frames"],
                "panic_frames": result.get("panic_frames", 0),
                "stampede_frames": result.get("stampede_frames", 0),
                "model": result.get("model")
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video processing failed: {str(e)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# ─── CCTV Stream Detection ─────────────────────────────────

@router.post("/detect/cctv")
async def detect_cctv(request: CCTVRequest):
    try:
        if not request.camera_id:
            raise HTTPException(status_code=400, detail="camera_id is required")

        if not request.stream_url:
            raise HTTPException(status_code=400, detail="stream_url is required")

        result = process_cctv_stream(
            camera_id=request.camera_id,
            stream_url=request.stream_url
        )

        risk_level = result.get("risk_level", "safe")
        if risk_level in ("warning", "danger"):
            dispatch_alerts(
                people_count=result["people_count"],
                risk_level=risk_level,
                behaviour="normal",
                location=f"Camera {request.camera_id}",
                source="cctv",
                recommended_action=result.get("recommended_action", ""),
                send_sms=True,
                send_voice=risk_level == "danger",
                send_email=True
            )

        return {
            "status": "success",
            "data": {
                "people_count": result["people_count"],
                "crowd_density": result["crowd_density"],
                "risk_level": result["risk_level"],
                "alert_triggered": result["alert_triggered"],
                "density_score": result["density_score"],
                "trend": result["trend"],
                "recommended_action": result["recommended_action"],
                "severity_color": result["severity_color"],
                "area_coverage": result["area_coverage"],
                "statistics": result["statistics"],
                "timestamp": result["timestamp"],
                "camera_id": result["camera_id"],
                "stream_url": result["stream_url"],
                "stream_status": result["stream_status"],
                "annotated_frame": result.get("annotated_frame"),
                "heatmap_frame": result.get("heatmap_frame"),
                "detections": result.get("detections", []),
                "optical_flow": result.get("optical_flow"),
                "tracking": result.get("tracking"),
                "model": result.get("model"),
                "note": result.get("note")
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CCTV processing failed: {str(e)}")


# ─── Manual Alert Test ─────────────────────────────────────

@router.post("/detect/alert/test")
async def test_alert(
    risk_level: str = Form(default="danger"),
    people_count: int = Form(default=55),
    behaviour: str = Form(default="overcrowding")
):
    try:
        result = dispatch_alerts(
            people_count=people_count,
            risk_level=risk_level,
            behaviour=behaviour,
            location="Test — Manual Trigger",
            source="manual",
            recommended_action="This is a test alert from the Crowd Alert System.",
            send_sms=True,
            send_voice=False,
            send_email=True
        )
        return {
            "status": "success",
            "message": "Test alert dispatched",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alert test failed: {str(e)}")


# ─── Quick Test Endpoint ───────────────────────────────────

@router.get("/detect/test")
async def test_detection():
    try:
        import numpy as np
        import cv2
        from services.detection import detect_people_in_frame
        from utils.crowd_logic import analyze_crowd

        test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(test_frame, "TEST FRAME",
                    (200, 240), cv2.FONT_HERSHEY_SIMPLEX,
                    1, (255, 255, 255), 2)

        people_count, _ = detect_people_in_frame(test_frame)
        analysis = analyze_crowd(people_count, source="test")

        return {
            "status": "success",
            "message": "Detection pipeline is working correctly",
            "data": {
                "people_count": analysis["people_count"],
                "crowd_density": analysis["crowd_density"],
                "risk_level": analysis["risk_level"],
                "alert_triggered": analysis["alert_triggered"],
                "model_loaded": CrowdDetectionEngine.get_instance().is_loaded(),
                "model_name": CrowdDetectionEngine.get_instance().get_model_name()
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline test failed: {str(e)}")


# ─── Model Status ──────────────────────────────────────────

@router.get("/detect/model/status")
async def model_status():
    engine = CrowdDetectionEngine.get_instance()
    return {
        "status": "success",
        "data": {
            "model_loaded": engine.is_loaded(),
            "model_name": engine.get_model_name(),
            "total_detections": engine.get_total_detections(),
            "avg_processing_time_ms": engine.get_avg_processing_time()
        }
    }   