import cv2
import numpy as np
import base64
import random
import time
from ultralytics import YOLO
from utils.crowd_logic import analyze_crowd
from datetime import datetime
from typing import Optional

# ─── Model Management ──────────────────────────────────────

MODEL_NAME = "yolov8m.pt"
CONFIDENCE_THRESHOLD = 0.35


class CrowdDetectionEngine:
    _instance = None
    _model = None
    _model_loaded = False
    _model_name: str = MODEL_NAME
    _total_detections = 0
    _processing_times: list = []

    @classmethod
    def get_instance(cls) -> "CrowdDetectionEngine":
        if cls._instance is None:
            cls._instance = CrowdDetectionEngine()
        return cls._instance

    def load_model(self) -> None:
        if not self._model_loaded:
            try:
                print(f"Loading YOLO model: {MODEL_NAME} ...")
                self._model = YOLO(MODEL_NAME)
                self._model_loaded = True
                self._model_name = MODEL_NAME
                print(f"✅ YOLO model loaded: {MODEL_NAME}")
            except Exception as e:
                print(f"⚠️  Failed to load {MODEL_NAME}, falling back to yolov8n.pt — {e}")
                try:
                    self._model = YOLO("yolov8n.pt")
                    self._model_loaded = True
                    self._model_name = "yolov8n.pt (fallback)"
                    print("✅ Fallback model yolov8n.pt loaded.")
                except Exception as e2:
                    print(f"❌ Could not load any YOLO model: {e2}")
                    raise e2

    def get_model(self) -> YOLO:
        if not self._model_loaded:
            self.load_model()
        return self._model

    def is_loaded(self) -> bool:
        return self._model_loaded

    def get_model_name(self) -> str:
        return self._model_name

    def increment_detections(self) -> None:
        self._total_detections += 1

    def get_total_detections(self) -> int:
        return self._total_detections

    def add_processing_time(self, time_ms: float) -> None:
        self._processing_times.append(time_ms)
        if len(self._processing_times) > 50:
            self._processing_times.pop(0)

    def get_avg_processing_time(self) -> float:
        if not self._processing_times:
            return 0
        return round(sum(self._processing_times) / len(self._processing_times), 2)


# ─── Smart Frame Processor ─────────────────────────────────

class SmartFrameProcessor:
    def __init__(self) -> None:
        self.frame_count: int = 0
        self.last_inference_frame: int = -1
        self.last_result: Optional[dict] = None
        self.last_gray: Optional[np.ndarray] = None
        self.consecutive_skips: int = 0
        self.force_next: bool = False
        self.BASE_SKIP: int = 2
        self.MAX_SKIP: int = 5
        self.MOTION_SKIP_THRESHOLD: float = 1.5
        self.DIFF_THRESHOLD: float = 25.0

    def should_run_inference(
        self,
        frame: np.ndarray,
        flow_magnitude: float = 0.0,
        risk_level: str = "safe"
    ) -> bool:
        self.frame_count += 1

        if self.last_result is None:
            return True

        if self.force_next:
            self.force_next = False
            return True

        if flow_magnitude > self.MOTION_SKIP_THRESHOLD:
            self.consecutive_skips = 0
            return True

        if risk_level in ("warning", "danger"):
            self.consecutive_skips = 0
            return True

        if self.consecutive_skips >= self.MAX_SKIP:
            self.consecutive_skips = 0
            return True

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (15, 15), 0)

        if self.last_gray is not None and self.last_gray.shape == gray.shape:
            diff = cv2.absdiff(self.last_gray, gray)
            mean_diff = float(np.mean(diff))
            if mean_diff > self.DIFF_THRESHOLD:
                self.last_gray = gray
                self.consecutive_skips = 0
                return True

        self.last_gray = gray

        frames_since_last = self.frame_count - self.last_inference_frame
        if frames_since_last >= self.BASE_SKIP:
            self.consecutive_skips = 0
            return True

        self.consecutive_skips += 1
        return False

    def update(self, frame_count: int, result: dict) -> None:
        self.last_inference_frame = frame_count
        self.last_result = result

    def get_cached(self) -> Optional[dict]:
        return self.last_result

    def reset(self) -> None:
        self.frame_count = 0
        self.last_inference_frame = -1
        self.last_result = None
        self.last_gray = None
        self.consecutive_skips = 0
        self.force_next = False


_smart_processor = SmartFrameProcessor()


def reset_smart_processor() -> None:
    global _smart_processor
    _smart_processor.reset()


# ─── DeepSORT Tracker ──────────────────────────────────────

_tracker = None
_tracked_ids_seen: set = set()
_entry_count: int = 0
_exit_count: int = 0
_active_ids: set = set()


def get_tracker():
    global _tracker
    if _tracker is None:
        try:
            from deep_sort_realtime.deepsort_tracker import DeepSort
            _tracker = DeepSort(max_age=30, n_init=3, max_cosine_distance=0.3)
            print("✅ DeepSORT tracker initialized.")
        except Exception as e:
            print(f"⚠️  DeepSORT not available: {e}. Tracking disabled.")
            _tracker = False
    return _tracker if _tracker is not False else None


def reset_tracker() -> None:
    global _tracker, _tracked_ids_seen, _entry_count, _exit_count, _active_ids
    _tracker = None
    _tracked_ids_seen = set()
    _entry_count = 0
    _exit_count = 0
    _active_ids = set()


def run_deepsort(frame: np.ndarray, detections: list) -> dict:
    global _tracked_ids_seen, _entry_count, _exit_count, _active_ids

    tracker = get_tracker()
    if tracker is None:
        for i, det in enumerate(detections):
            det["track_id"] = i + 1
        return {
            "tracked_detections": detections,
            "entry_count": len(detections),
            "exit_count": 0,
            "active_tracks": len(detections),
            "tracking_available": False
        }

    ds_input = []
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        w = x2 - x1
        h = y2 - y1
        ds_input.append(([x1, y1, w, h], det["confidence"], "person"))

    try:
        tracks = tracker.update_tracks(ds_input, frame=frame)
    except Exception as e:
        print(f"[DeepSORT] Tracking error: {e}")
        for i, det in enumerate(detections):
            det["track_id"] = i + 1
        return {
            "tracked_detections": detections,
            "entry_count": _entry_count,
            "exit_count": _exit_count,
            "active_tracks": len(detections),
            "tracking_available": False
        }

    current_ids: set = set()
    tracked_detections = []

    for track in tracks:
        if not track.is_confirmed():
            continue
        track_id = track.track_id
        ltrb = track.to_ltrb()
        x1, y1, x2, y2 = int(ltrb[0]), int(ltrb[1]), int(ltrb[2]), int(ltrb[3])
        current_ids.add(track_id)
        if track_id not in _tracked_ids_seen:
            _tracked_ids_seen.add(track_id)
            _entry_count += 1
        tracked_detections.append({
            "bbox": [x1, y1, x2, y2],
            "confidence": 1.0,
            "class": "person",
            "track_id": track_id
        })

    exited = _active_ids - current_ids
    _exit_count += len(exited)
    _active_ids = current_ids

    return {
        "tracked_detections": tracked_detections,
        "entry_count": _entry_count,
        "exit_count": _exit_count,
        "active_tracks": len(current_ids),
        "tracking_available": True
    }


# ─── Optical Flow State ────────────────────────────────────

_prev_gray: Optional[np.ndarray] = None


# ─── Frame Utilities ───────────────────────────────────────

def decode_base64_frame(frame_data: str) -> np.ndarray:
    try:
        if "," in frame_data:
            frame_data = frame_data.split(",")[1]
        frame_data = frame_data.strip()
        missing_padding = len(frame_data) % 4
        if missing_padding:
            frame_data += "=" * (4 - missing_padding)
        img_bytes = base64.b64decode(frame_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Failed to decode image")
        print(f"[Webcam] Frame decoded: {frame.shape}")
        return frame
    except Exception as e:
        print(f"[Webcam] Decode error: {e}")
        raise ValueError(f"Invalid frame data: {e}")


def encode_frame_to_base64(frame: np.ndarray) -> str:
    _, buffer = cv2.imencode(".jpg", frame)
    return base64.b64encode(buffer).decode("utf-8")


def preprocess_frame(frame: np.ndarray) -> np.ndarray:
    max_width = 1280
    height, width = frame.shape[:2]
    if width > max_width:
        scale = max_width / width
        frame = cv2.resize(frame, (int(width * scale), int(height * scale)))
    return frame


def is_low_light(frame: np.ndarray) -> bool:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return bool(gray.mean() < 60)


def enhance_frame(frame: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)


# ─── Optical Flow ──────────────────────────────────────────

def analyze_optical_flow(frame: np.ndarray) -> dict:
    global _prev_gray

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (21, 21), 0)

    if _prev_gray is None or _prev_gray.shape != gray.shape:
        _prev_gray = gray
        return {
            "motion_magnitude": 0.0,
            "max_motion": 0.0,
            "motion_direction": "none",
            "direction_variance": 0.0,
            "panic_detected": False,
            "stampede_detected": False,
            "flow_description": "Initializing motion analysis..."
        }

    flow = cv2.calcOpticalFlowFarneback(
        _prev_gray, gray, None,
        pyr_scale=0.5, levels=3, winsize=15,
        iterations=3, poly_n=5, poly_sigma=1.2, flags=0
    )
    _prev_gray = gray

    magnitude, angle = cv2.cartToPolar(flow[..., 0], flow[..., 1])
    avg_magnitude = float(np.mean(magnitude))
    max_magnitude = float(np.max(magnitude))

    angle_deg = np.degrees(angle)
    hist, _ = np.histogram(angle_deg, bins=8, range=(0, 360))
    dominant_bin = int(np.argmax(hist))
    direction_labels = ["East", "NE", "North", "NW", "West", "SW", "South", "SE"]
    dominant_direction = direction_labels[dominant_bin]
    direction_variance = float(np.std(angle_deg))

    PANIC_MAGNITUDE_THRESHOLD = 4.0
    STAMPEDE_MAGNITUDE_THRESHOLD = 6.0
    CHAOS_THRESHOLD = 80.0

    panic_detected = bool(avg_magnitude > PANIC_MAGNITUDE_THRESHOLD and direction_variance > CHAOS_THRESHOLD)
    stampede_detected = bool(avg_magnitude > STAMPEDE_MAGNITUDE_THRESHOLD and direction_variance < CHAOS_THRESHOLD)

    if stampede_detected:
        description = f"⚠️ STAMPEDE detected — mass movement towards {dominant_direction}"
    elif panic_detected:
        description = "🚨 PANIC detected — chaotic crowd movement"
    elif avg_magnitude > 2.0:
        description = f"Active movement — flowing {dominant_direction}"
    else:
        description = "Crowd movement normal"

    return {
        "motion_magnitude": round(avg_magnitude, 3),
        "max_motion": round(max_magnitude, 3),
        "motion_direction": dominant_direction,
        "direction_variance": round(direction_variance, 2),
        "panic_detected": panic_detected,
        "stampede_detected": stampede_detected,
        "flow_description": description
    }


# ─── Detection Drawing ─────────────────────────────────────

def draw_detections(frame: np.ndarray, detections: list, risk_level: str) -> np.ndarray:
    color_map = {
        "safe":    (34, 197, 94),
        "warning": (245, 158, 11),
        "danger":  (239, 68, 68)
    }
    color = color_map.get(risk_level, (34, 197, 94))

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        confidence = det["confidence"]
        track_id = det.get("track_id")

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        corner_len = 12
        cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, 3)
        cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, 3)
        cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, 3)
        cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, 3)
        cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, 3)
        cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, 3)
        cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, 3)
        cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, 3)

        label = f"ID:{track_id} {confidence:.0%}" if track_id is not None else f"{confidence:.0%}"
        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
        cv2.rectangle(frame,
                      (x1, y1 - label_size[1] - 8),
                      (x1 + label_size[0] + 6, y1),
                      color, -1)
        cv2.putText(frame, label, (x1 + 3, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    return frame


def draw_overlay(
    frame: np.ndarray,
    analysis: dict,
    flow_data: Optional[dict] = None,
    tracking_data: Optional[dict] = None,
    skipped: bool = False
) -> np.ndarray:
    height, width = frame.shape[:2]

    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (width, 110), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

    overlay2 = frame.copy()
    cv2.rectangle(overlay2, (0, height - 50), (width, height), (0, 0, 0), -1)
    cv2.addWeighted(overlay2, 0.55, frame, 0.45, 0, frame)

    color_map = {
        "safe":    (34, 197, 94),
        "warning": (245, 158, 11),
        "danger":  (239, 68, 68)
    }
    color = color_map.get(analysis["risk_level"], (34, 197, 94))

    cv2.putText(frame, f"PEOPLE: {analysis['people_count']}",
                (12, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
    cv2.putText(frame, f"DENSITY: {analysis['crowd_density'].upper()}",
                (12, 56), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)
    cv2.putText(frame, f"RISK: {analysis['risk_level'].upper()}",
                (12, 82), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)

    if tracking_data and tracking_data.get("tracking_available"):
        entry_text = f"IN:{tracking_data['entry_count']}  OUT:{tracking_data['exit_count']}"
        cv2.putText(frame, entry_text, (12, 106),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 255, 180), 1)

    ts = datetime.now().strftime("%H:%M:%S")
    ts_size = cv2.getTextSize(ts, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)[0]
    cv2.putText(frame, ts, (width - ts_size[0] - 12, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

    engine = CrowdDetectionEngine.get_instance()
    model_label = engine.get_model_name().upper()
    model_size = cv2.getTextSize(model_label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)[0]
    cv2.putText(frame, model_label, (width - model_size[0] - 12, 52),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 180, 180), 1)

    trend_text = f"TREND: {analysis.get('trend', 'stable').upper()}"
    trend_size = cv2.getTextSize(trend_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
    cv2.putText(frame, trend_text, (width - trend_size[0] - 12, 78),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

    if skipped:
        skip_label = "CACHED"
        skip_size = cv2.getTextSize(skip_label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)[0]
        cv2.putText(frame, skip_label, (width - skip_size[0] - 12, 104),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 255), 1)

    if flow_data:
        if flow_data.get("stampede_detected"):
            flow_color = (0, 0, 255)
            flow_text = "STAMPEDE!"
        elif flow_data.get("panic_detected"):
            flow_color = (0, 100, 255)
            flow_text = "PANIC!"
        else:
            flow_color = (180, 180, 180)
            flow_text = f"FLOW:{flow_data.get('motion_direction', '?')} ({flow_data.get('motion_magnitude', 0):.1f})"
        flow_size = cv2.getTextSize(flow_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
        cv2.putText(frame, flow_text, (width - flow_size[0] - 12, 106),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, flow_color, 1)

    score = analysis.get("density_score", 0)
    bar_width = int((width - 24) * score / 100)
    cv2.rectangle(frame, (12, height - 36), (width - 12, height - 24), (50, 50, 50), -1)
    if bar_width > 0:
        cv2.rectangle(frame, (12, height - 36), (12 + bar_width, height - 24), color, -1)
    cv2.putText(frame, f"DENSITY SCORE: {score:.0f}%",
                (12, height - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)

    if analysis["alert_triggered"]:
        alert_text = "! DANGER ALERT !"
        alert_size = cv2.getTextSize(alert_text, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2)[0]
        alert_x = (width - alert_size[0]) // 2
        cv2.putText(frame, alert_text, (alert_x, height - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 255), 2)

    return frame


def generate_heatmap(frame: np.ndarray, detections: list) -> np.ndarray:
    height, width = frame.shape[:2]
    heat = np.zeros((height, width), dtype=np.float32)

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2
        sigma = max(x2 - x1, y2 - y1) * 0.6
        y_grid, x_grid = np.ogrid[0:height, 0:width]
        gaussian = np.exp(-((x_grid - cx) ** 2 + (y_grid - cy) ** 2) / (2 * sigma ** 2))
        heat += gaussian

    if heat.max() > 0:
        heat = heat / heat.max()

    heat_uint8 = (heat * 255).astype(np.uint8)
    heat_colored = cv2.applyColorMap(heat_uint8, cv2.COLORMAP_JET)
    return cv2.addWeighted(frame, 0.5, heat_colored, 0.5, 0)


# ─── Core Detection ────────────────────────────────────────

def detect_people_in_frame(frame: np.ndarray) -> tuple[int, list]:
    engine = CrowdDetectionEngine.get_instance()
    model = engine.get_model()

    if is_low_light(frame):
        frame = enhance_frame(frame)

    results = model(frame, classes=[0], conf=CONFIDENCE_THRESHOLD, verbose=False)
    detections = []

    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            confidence = float(box.conf[0])
            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": round(confidence, 3),
                "class": "person"
            })

    return len(detections), detections


# ─── Main Analysis Functions ───────────────────────────────

def process_webcam_frame(frame_data: str, timestamp: str) -> dict:
    start_time = time.time()
    engine = CrowdDetectionEngine.get_instance()

    frame = decode_base64_frame(frame_data)
    frame = preprocess_frame(frame)

    flow_data = analyze_optical_flow(frame)

    cached = _smart_processor.get_cached()
    last_risk = cached.get("risk_level", "safe") if cached else "safe"

    run_inference = _smart_processor.should_run_inference(
        frame,
        flow_magnitude=flow_data["motion_magnitude"],
        risk_level=last_risk
    )

    if run_inference:
        people_count, detections = detect_people_in_frame(frame)
        tracking_data = run_deepsort(frame, detections)

        draw_dets = tracking_data["tracked_detections"] if tracking_data["tracking_available"] else detections
        people_count = tracking_data["active_tracks"] if tracking_data["tracking_available"] else people_count

        analysis = analyze_crowd(people_count, source="webcam")

        annotated_frame = draw_detections(frame.copy(), draw_dets, analysis["risk_level"])
        annotated_frame = draw_overlay(annotated_frame, analysis, flow_data, tracking_data, skipped=False)
        heatmap_frame = generate_heatmap(frame.copy(), draw_dets)

        result = {
            "people_count": analysis["people_count"],
            "crowd_density": analysis["crowd_density"],
            "risk_level": analysis["risk_level"],
            "alert_triggered": analysis["alert_triggered"],
            "density_score": analysis["density_score"],
            "trend": analysis["trend"],
            "recommended_action": analysis["recommended_action"],
            "severity_color": analysis["severity_color"],
            "area_coverage": analysis["area_coverage"],
            "statistics": analysis["statistics"],
            "timestamp": timestamp,
            "detections": draw_dets,
            "annotated_frame": encode_frame_to_base64(annotated_frame),
            "heatmap_frame": encode_frame_to_base64(heatmap_frame),
            "model": engine.get_model_name(),
            "optical_flow": flow_data,
            "tracking": tracking_data,
            "frame_skipped": False
        }

        _smart_processor.update(_smart_processor.frame_count, result)

    else:
        result = dict(cached)  # type: ignore[arg-type]
        result["timestamp"] = timestamp
        result["optical_flow"] = flow_data
        result["frame_skipped"] = True

        if result.get("detections"):
            annotated_frame = draw_detections(frame.copy(), result["detections"], result["risk_level"])
            annotated_frame = draw_overlay(
                annotated_frame, result, flow_data, result.get("tracking"), skipped=True
            )
            result["annotated_frame"] = encode_frame_to_base64(annotated_frame)

    processing_time = (time.time() - start_time) * 1000
    engine.add_processing_time(processing_time)
    engine.increment_detections()

    result["processing_time_ms"] = round(processing_time, 2)
    result["avg_processing_time_ms"] = engine.get_avg_processing_time()

    return result


def process_video_file(video_path: str, analysis_mode: str = "density") -> dict:
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError("Could not open video file")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    sample_interval = max(1, int(fps * 2))
    frame_results = []
    frame_index = 0
    peak_count = 0
    peak_frame: Optional[str] = None
    panic_frames = 0
    stampede_frames = 0

    print(f"[Video] Processing {total_frames} frames at {fps}fps, sampling every {sample_interval} frames")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_index % sample_interval == 0:
            frame = preprocess_frame(frame)
            flow_data = analyze_optical_flow(frame)
            people_count, detections = detect_people_in_frame(frame)
            tracking_data = run_deepsort(frame, detections)

            draw_dets = tracking_data["tracked_detections"] if tracking_data["tracking_available"] else detections
            people_count = tracking_data["active_tracks"] if tracking_data["tracking_available"] else people_count

            analysis = analyze_crowd(people_count, source="video")

            if flow_data.get("panic_detected"):
                panic_frames += 1
            if flow_data.get("stampede_detected"):
                stampede_frames += 1

            print(f"[Video] Frame {frame_index}: {people_count} people, risk={analysis['risk_level']}")

            frame_results.append({
                "frame_index": frame_index,
                "timestamp_sec": round(frame_index / fps, 2) if fps > 0 else 0,
                "people_count": people_count,
                "crowd_density": analysis["crowd_density"],
                "risk_level": analysis["risk_level"],
                "alert_triggered": analysis["alert_triggered"],
                "density_score": analysis["density_score"],
                "motion_magnitude": flow_data["motion_magnitude"],
                "panic_detected": flow_data["panic_detected"],
                "stampede_detected": flow_data["stampede_detected"]
            })

            if people_count > peak_count:
                peak_count = people_count
                annotated = draw_detections(frame.copy(), draw_dets, analysis["risk_level"])
                annotated = draw_overlay(annotated, analysis, flow_data, tracking_data)
                peak_frame = encode_frame_to_base64(annotated)

        frame_index += 1

    cap.release()

    if not frame_results:
        raise ValueError("No frames could be processed")

    all_counts = [r["people_count"] for r in frame_results]
    avg_count = round(sum(all_counts) / len(all_counts))
    final_analysis = analyze_crowd(avg_count, source="video")

    danger_frames = sum(1 for r in frame_results if r["risk_level"] == "danger")
    warning_frames = sum(1 for r in frame_results if r["risk_level"] == "warning")

    engine = CrowdDetectionEngine.get_instance()
    engine.increment_detections()

    print(f"[Video] Done. Avg:{avg_count}, Peak:{peak_count}, Panic:{panic_frames}, Stampede:{stampede_frames}")

    return {
        "people_count": avg_count,
        "crowd_density": final_analysis["crowd_density"],
        "risk_level": final_analysis["risk_level"],
        "alert_triggered": final_analysis["alert_triggered"],
        "density_score": final_analysis["density_score"],
        "trend": final_analysis["trend"],
        "recommended_action": final_analysis["recommended_action"],
        "severity_color": final_analysis["severity_color"],
        "area_coverage": final_analysis["area_coverage"],
        "statistics": final_analysis["statistics"],
        "timestamp": datetime.now().isoformat(),
        "video_metadata": {
            "total_frames": total_frames,
            "fps": round(fps, 2),
            "duration_seconds": round(duration, 2),
            "width": width,
            "height": height,
            "frames_analyzed": len(frame_results)
        },
        "frame_by_frame": frame_results,
        "peak_people_count": peak_count,
        "peak_frame": peak_frame,
        "danger_frames": danger_frames,
        "warning_frames": warning_frames,
        "safe_frames": len(frame_results) - danger_frames - warning_frames,
        "panic_frames": panic_frames,
        "stampede_frames": stampede_frames,
        "model": engine.get_model_name()
    }


def process_cctv_stream(camera_id: str, stream_url: str) -> dict:
    cap = cv2.VideoCapture(stream_url)

    if not cap.isOpened():
        print(f"[CCTV] Could not connect to: {stream_url}. Using simulation.")
        simulated_count = random.randint(0, 70)
        analysis = analyze_crowd(simulated_count, source=f"cctv_{camera_id}")
        engine = CrowdDetectionEngine.get_instance()
        engine.increment_detections()
        return {
            "people_count": analysis["people_count"],
            "crowd_density": analysis["crowd_density"],
            "risk_level": analysis["risk_level"],
            "alert_triggered": analysis["alert_triggered"],
            "density_score": analysis["density_score"],
            "trend": analysis["trend"],
            "recommended_action": analysis["recommended_action"],
            "severity_color": analysis["severity_color"],
            "area_coverage": analysis["area_coverage"],
            "statistics": analysis["statistics"],
            "timestamp": datetime.now().isoformat(),
            "camera_id": camera_id,
            "stream_url": stream_url,
            "stream_status": "simulated",
            "note": "Stream unavailable. Showing simulated data.",
            "model": engine.get_model_name(),
            "optical_flow": None,
            "tracking": None
        }

    ret, frame = cap.read()
    cap.release()

    if not ret:
        raise ValueError("Could not read frame from stream")

    frame = preprocess_frame(frame)
    flow_data = analyze_optical_flow(frame)
    people_count, detections = detect_people_in_frame(frame)
    tracking_data = run_deepsort(frame, detections)

    draw_dets = tracking_data["tracked_detections"] if tracking_data["tracking_available"] else detections
    people_count = tracking_data["active_tracks"] if tracking_data["tracking_available"] else people_count

    analysis = analyze_crowd(people_count, source=f"cctv_{camera_id}")

    annotated_frame = draw_detections(frame.copy(), draw_dets, analysis["risk_level"])
    annotated_frame = draw_overlay(annotated_frame, analysis, flow_data, tracking_data)
    heatmap_frame = generate_heatmap(frame.copy(), draw_dets)

    engine = CrowdDetectionEngine.get_instance()
    engine.increment_detections()

    return {
        "people_count": analysis["people_count"],
        "crowd_density": analysis["crowd_density"],
        "risk_level": analysis["risk_level"],
        "alert_triggered": analysis["alert_triggered"],
        "density_score": analysis["density_score"],
        "trend": analysis["trend"],
        "recommended_action": analysis["recommended_action"],
        "severity_color": analysis["severity_color"],
        "area_coverage": analysis["area_coverage"],
        "statistics": analysis["statistics"],
        "timestamp": datetime.now().isoformat(),
        "camera_id": camera_id,
        "stream_url": stream_url,
        "stream_status": "live",
        "annotated_frame": encode_frame_to_base64(annotated_frame),
        "heatmap_frame": encode_frame_to_base64(heatmap_frame),
        "detections": draw_dets,
        "model": engine.get_model_name(),
        "optical_flow": flow_data,
        "tracking": tracking_data
    }