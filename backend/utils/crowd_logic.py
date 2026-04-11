import time
from datetime import datetime
from collections import deque
from typing import Optional

# ─── In-memory history ─────────────────────────────────────
_count_history = deque(maxlen=30)
_alert_history = deque(maxlen=100)

# ══════════════════════════════════════════════════════════
# THRESHOLDS  (raised from original)
# ══════════════════════════════════════════════════════════
#
#  People count alone is NOT enough to trigger danger.
#  Behaviour context is required.
#
#  Count-only bands (fallback when no motion data):
#    LOW    →  0–49    → safe
#    MEDIUM →  50–149  → warning
#    HIGH   →  150+    → danger
#
#  Behaviour OVERRIDES count:
#    normal / walking  → never escalates above safe unless count is very high
#    gathering         → warning at 30+
#    loitering         → warning at 20+
#    surge             → warning always, danger if count > 80
#    panic             → danger always
#    stampede          → danger always
#    fighting          → danger always
# ══════════════════════════════════════════════════════════

COUNT_LOW    = 50
COUNT_MEDIUM = 150


def calculate_crowd_density(people_count: int) -> str:
    if people_count < COUNT_LOW:
        return "low"
    elif people_count <= COUNT_MEDIUM:
        return "medium"
    else:
        return "high"


def calculate_risk_level(crowd_density: str) -> str:
    return {
        "low":    "safe",
        "medium": "warning",
        "high":   "danger",
    }.get(crowd_density, "safe")


def is_alert_triggered(risk_level: str) -> bool:
    return risk_level == "danger"


def calculate_density_score(people_count: int) -> float:
    """0–100 score scaled to COUNT_MEDIUM as 100%"""
    if people_count == 0:
        return 0.0
    return round(min((people_count / COUNT_MEDIUM) * 100, 100), 2)


def get_trend(people_count: int) -> str:
    _count_history.append(people_count)
    if len(_count_history) < 3:
        return "stable"
    recent = list(_count_history)
    avg_recent = sum(recent[-3:]) / 3
    avg_older  = sum(recent[:-3]) / max(len(recent) - 3, 1)
    diff = avg_recent - avg_older
    if diff > 3:
        return "increasing"
    elif diff < -3:
        return "decreasing"
    return "stable"


# ══════════════════════════════════════════════════════════
# BEHAVIOUR ANALYSIS ENGINE
# ══════════════════════════════════════════════════════════

def classify_behaviour(
    people_count: int,
    motion_magnitude: Optional[float] = None,   # avg optical flow magnitude 0–100
    motion_variance:  Optional[float] = None,   # variance in flow vectors 0–100
    flow_direction:   Optional[str]   = None,   # dominant direction or "chaotic"
    density_score:    Optional[float] = None,
) -> dict:
    """
    Classifies crowd behaviour from motion data.

    Returns:
        {
            "behaviour":    "normal" | "walking" | "gathering" | "loitering"
                            | "surge" | "panic" | "stampede" | "fighting",
            "risk_level":   "safe" | "warning" | "danger",
            "confidence":   0.0–1.0,
            "description":  human-readable string,
        }

    Logic matrix:
    ┌──────────────┬─────────────┬────────────┬──────────────────────────────────┐
    │ Behaviour    │ Motion Mag  │ Variance   │ Notes                            │
    ├──────────────┼─────────────┼────────────┼──────────────────────────────────┤
    │ normal       │ 0–10        │ any        │ people standing/sitting          │
    │ walking      │ 10–35       │ low (<20)  │ orderly movement                 │
    │ gathering    │ 5–20        │ low        │ people clustering, low motion    │
    │ loitering    │ 2–12        │ very low   │ slow random drift                │
    │ surge        │ 35–60       │ medium     │ directed fast movement           │
    │ panic        │ 40–80       │ high (>45) │ fast chaotic movement            │
    │ stampede     │ 60+         │ medium-hi  │ very fast directed movement      │
    │ fighting     │ 30–70       │ very high  │ localised high-variance motion   │
    └──────────────┴─────────────┴────────────┴──────────────────────────────────┘
    """

    # ── Defaults when no motion data is available ─────────
    if motion_magnitude is None:
        # Fall back to count-only classification
        if people_count < COUNT_LOW:
            return _behaviour_result("normal",   "safe",    0.6, "Normal crowd levels, no motion data available.")
        elif people_count <= COUNT_MEDIUM:
            return _behaviour_result("gathering","warning", 0.5, "Elevated crowd count. Deploy monitoring.")
        else:
            return _behaviour_result("gathering","danger",  0.5, "High crowd count. Immediate monitoring required.")

    mag = motion_magnitude
    var = motion_variance if motion_variance is not None else 10.0
    chaotic = (flow_direction == "chaotic")

    # ── STAMPEDE ──────────────────────────────────────────
    if mag >= 60 and not chaotic and people_count >= 15:
        return _behaviour_result(
            "stampede", "danger", 0.92,
            "STAMPEDE DETECTED: Very high-speed directed crowd movement. Evacuate immediately."
        )

    # ── PANIC ─────────────────────────────────────────────
    if mag >= 40 and var >= 45 and chaotic:
        return _behaviour_result(
            "panic", "danger", 0.90,
            "PANIC DETECTED: Fast chaotic movement detected. Deploy emergency response."
        )

    # ── FIGHTING (localised high variance, medium magnitude)
    if 25 <= mag <= 70 and var >= 55 and people_count <= 30:
        return _behaviour_result(
            "fighting", "danger", 0.82,
            "ALTERCATION DETECTED: High-variance localised motion. Security intervention required."
        )

    # ── SURGE ─────────────────────────────────────────────
    if mag >= 35 and var < 45 and not chaotic:
        risk = "danger" if people_count > 80 else "warning"
        return _behaviour_result(
            "surge", risk, 0.78,
            "CROWD SURGE: Fast directed movement. Monitor for escalation."
        )

    # ── PANIC (lower magnitude variant — early panic) ─────
    if mag >= 30 and var >= 50:
        return _behaviour_result(
            "panic", "warning", 0.70,
            "EARLY PANIC SIGNS: Erratic movement patterns detected. Increase monitoring."
        )

    # ── LOITERING ─────────────────────────────────────────
    if mag <= 12 and var <= 10 and people_count >= 5:
        risk = "warning" if people_count >= 20 else "safe"
        return _behaviour_result(
            "loitering", risk, 0.72,
            "LOITERING: Group stationary for extended period." if risk == "warning"
            else "Small group stationary. Normal behaviour."
        )

    # ── GATHERING (low motion, higher count) ──────────────
    if mag <= 20 and people_count >= 30:
        return _behaviour_result(
            "gathering", "warning", 0.68,
            "GATHERING: Large stationary group. Monitor crowd build-up."
        )

    # ── WALKING (orderly movement) ────────────────────────
    if 10 <= mag <= 35 and var <= 25:
        # Walking people — only warn if count is very high
        risk = "warning" if people_count >= COUNT_MEDIUM else "safe"
        return _behaviour_result(
            "walking", risk, 0.85,
            "Orderly pedestrian movement detected. Normal behaviour."
            if risk == "safe"
            else "High volume of pedestrian movement. Monitor flow."
        )

    # ── NORMAL (default fallback) ─────────────────────────
    risk = "safe"
    if people_count >= COUNT_MEDIUM:
        risk = "danger"
    elif people_count >= COUNT_LOW:
        risk = "warning"

    return _behaviour_result(
        "normal", risk, 0.60,
        "Normal crowd activity." if risk == "safe"
        else "Elevated crowd count. Continue monitoring."
    )


def _behaviour_result(behaviour: str, risk_level: str, confidence: float, description: str) -> dict:
    return {
        "behaviour":   behaviour,
        "risk_level":  risk_level,
        "confidence":  confidence,
        "description": description,
    }


# ══════════════════════════════════════════════════════════
# RECOMMENDED ACTIONS
# ══════════════════════════════════════════════════════════

def get_recommended_action(risk_level: str, trend: str, behaviour: str = "normal") -> str:
    # Behaviour-specific actions take priority
    behaviour_actions = {
        "stampede": "CRITICAL: Activate emergency protocol. Clear all exits. Deploy all available personnel immediately.",
        "panic":    "URGENT: Deploy security to calm crowd. Open all emergency exits. Announce calm evacuation.",
        "fighting": "URGENT: Security intervention required. Isolate area. Contact law enforcement if needed.",
        "surge":    "Deploy crowd control barriers. Direct flow. Station personnel at bottlenecks.",
        "gathering":"Monitor gathering closely. Prepare crowd dispersal if numbers increase.",
        "loitering":"Security patrol recommended for loitering group.",
    }
    if behaviour in behaviour_actions:
        return behaviour_actions[behaviour]

    # Count + trend fallback
    actions = {
        ("safe",    "increasing"): "Monitor closely. Crowd is growing.",
        ("safe",    "stable"):     "Situation normal. Continue monitoring.",
        ("safe",    "decreasing"): "Crowd dispersing. No action needed.",
        ("warning", "increasing"): "Deploy additional personnel immediately.",
        ("warning", "stable"):     "Maintain crowd control measures.",
        ("warning", "decreasing"): "Crowd reducing. Stay alert.",
        ("danger",  "increasing"): "CRITICAL: Initiate crowd dispersal protocol NOW.",
        ("danger",  "stable"):     "DANGER: Enforce immediate crowd control.",
        ("danger",  "decreasing"): "Dispersal in progress. Maintain safety perimeter.",
    }
    return actions.get((risk_level, trend), "Monitor the situation.")


def get_severity_color(risk_level: str) -> str:
    return {
        "safe":    "#22c55e",
        "warning": "#f59e0b",
        "danger":  "#ef4444",
    }.get(risk_level, "#22c55e")


def estimate_area_coverage(people_count: int, frame_area: Optional[float] = None) -> str:
    if frame_area and frame_area > 0:
        avg_person_area = 0.5
        covered = min((people_count * avg_person_area / frame_area) * 100, 100)
        return f"{round(covered, 1)}%"
    if people_count < COUNT_LOW:
        return "< 25%"
    elif people_count <= COUNT_MEDIUM:
        return "25% - 60%"
    return "> 60%"


def log_alert(risk_level: str, people_count: int, source: str = "unknown"):
    if risk_level in ("danger", "warning"):
        _alert_history.append({
            "timestamp":    datetime.now().isoformat(),
            "risk_level":   risk_level,
            "people_count": people_count,
            "source":       source,
        })


def get_alert_history() -> list:
    return list(_alert_history)


def get_statistics() -> dict:
    if not _count_history:
        return {"average_count": 0, "peak_count": 0, "min_count": 0, "total_readings": 0}
    history = list(_count_history)
    return {
        "average_count": round(sum(history) / len(history), 1),
        "peak_count":    max(history),
        "min_count":     min(history),
        "total_readings": len(history),
    }


# ══════════════════════════════════════════════════════════
# MASTER ANALYSIS FUNCTION
# ══════════════════════════════════════════════════════════

def analyze_crowd(
    people_count:     int,
    source:           str           = "unknown",
    motion_magnitude: Optional[float] = None,
    motion_variance:  Optional[float] = None,
    flow_direction:   Optional[str]   = None,
) -> dict:
    """
    Master crowd analysis pipeline.
    Uses behaviour classification when motion data is provided,
    falls back to count-only logic otherwise.
    """

    # 1. Classify behaviour (intelligent path)
    behaviour_data = classify_behaviour(
        people_count     = people_count,
        motion_magnitude = motion_magnitude,
        motion_variance  = motion_variance,
        flow_direction   = flow_direction,
    )

    behaviour  = behaviour_data["behaviour"]
    risk_level = behaviour_data["risk_level"]

    # 2. Derived fields
    crowd_density     = calculate_crowd_density(people_count)
    alert_triggered   = is_alert_triggered(risk_level)
    trend             = get_trend(people_count)
    density_score     = calculate_density_score(people_count)
    recommended_action= get_recommended_action(risk_level, trend, behaviour)
    severity_color    = get_severity_color(risk_level)
    area_coverage     = estimate_area_coverage(people_count)
    statistics        = get_statistics()

    log_alert(risk_level, people_count, source)

    return {
        "people_count":      people_count,
        "crowd_density":     crowd_density,
        "risk_level":        risk_level,
        "alert_triggered":   alert_triggered,
        "density_score":     density_score,
        "trend":             trend,
        "recommended_action":recommended_action,
        "severity_color":    severity_color,
        "area_coverage":     area_coverage,
        "statistics":        statistics,
        "behaviour":         behaviour,
        "behaviour_confidence": behaviour_data["confidence"],
        "behaviour_description": behaviour_data["description"],
        "flow_direction":    flow_direction or "stable",
        "timestamp":         datetime.now().isoformat(),
    }