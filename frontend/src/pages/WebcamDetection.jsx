import { useEffect, useState, useRef } from "react";
import { useLiveData } from "../context/LiveDataContext.jsx";
import AlertBanner from "../components/AlertBanner";
import StatsCard from "../components/StatsCard";

const WebcamDetection = () => {
  const {
    videoRef,
    canvasRef,
    isDetecting,
    webcamError,
    fps,
    startWebcam,
    stopWebcam,
    liveData,
  } = useLiveData();

  const visibleVideoRef = useRef(null);
  const [animateIn, setAnimateIn]     = useState(false);
  const [behaviourLog, setBehaviourLog] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Mirror the persistent hidden stream into the visible video element
  useEffect(() => {
    if (!visibleVideoRef.current) return;
    if (isDetecting && videoRef.current?.srcObject) {
      visibleVideoRef.current.srcObject = videoRef.current.srcObject;
      visibleVideoRef.current.play().catch(() => {});
    } else {
      visibleVideoRef.current.srcObject = null;
    }
  }, [isDetecting, videoRef]);

  // Build behaviour log from live data
  useEffect(() => {
    if (!liveData?.behaviour || !isDetecting) return;
    const b = liveData.behaviour;
    if (b === "normal" || b === "walking") return; // only log notable events
    setBehaviourLog(prev => {
      const last = prev[0];
      if (last && last.behaviour === b && (Date.now() - last.ts) < 5000) return prev;
      return [{
        id:        Date.now(),
        ts:        Date.now(),
        time:      new Date().toLocaleTimeString(),
        behaviour: b,
        risk:      liveData.risk_level,
        people:    liveData.people_count,
      }, ...prev].slice(0, 20);
    });
  }, [liveData?.behaviour, isDetecting]);

  // Behaviour config
  const behaviourConfig = {
    walking:   { label: "WALKING",   color: "#22c55e", bg: "rgba(34,197,94,0.15)",   icon: "🚶" },
    normal:    { label: "NORMAL",    color: "#22c55e", bg: "rgba(34,197,94,0.15)",   icon: "✓"  },
    gathering: { label: "GATHERING", color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  icon: "👥" },
    loitering: { label: "LOITERING", color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  icon: "⏱" },
    surge:     { label: "SURGE",     color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  icon: "⚡" },
    panic:     { label: "PANIC",     color: "#ef4444", bg: "rgba(239,68,68,0.15)",   icon: "🚨" },
    stampede:  { label: "STAMPEDE",  color: "#ef4444", bg: "rgba(239,68,68,0.15)",   icon: "⚠️" },
    fighting:  { label: "FIGHTING",  color: "#ef4444", bg: "rgba(239,68,68,0.15)",   icon: "🆘" },
  };

  const currentBehaviour = behaviourConfig[liveData.behaviour] || behaviourConfig.normal;

  // Flow direction arrow
  const directionArrows = {
    North: "↑", South: "↓", East: "→", West: "←",
    NE: "↗",   NW: "↖",   SE: "↘",  SW: "↙",
    none: "•", stable: "•",
  };
  const flowDir   = liveData.optical_flow?.motion_direction || "none";
  const flowMag   = liveData.optical_flow?.motion_magnitude || 0;
  const flowArrow = directionArrows[flowDir] || "•";
  const isPanic      = liveData.optical_flow?.panic_detected;
  const isStampede   = liveData.optical_flow?.stampede_detected;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

        .webcam-page {
          min-height: 100vh;
          background: #fdfdf5;
          padding: 88px 32px 40px;
          font-family: 'Inter', sans-serif;
        }

        .page-header {
          margin-bottom: 28px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s ease;
        }
        .page-header.in { opacity: 1; transform: translateY(0); }

        .page-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 42px;
          color: #1a1a1a;
          letter-spacing: 3px;
          line-height: 1;
          margin-bottom: 4px;
        }
        .page-title span { color: #c1440e; }

        .page-subtitle {
          font-size: 13px;
          color: #999;
          font-weight: 500;
        }

        .webcam-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
          margin-bottom: 24px;
        }

        .video-card {
          background: #1a1a1a;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          aspect-ratio: 16/9;
        }

        .video-card video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .video-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #444;
        }

        .video-placeholder-icon { font-size: 48px; }

        .video-placeholder-text {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          letter-spacing: 2px;
          color: #555;
        }

        .video-overlay {
          position: absolute;
          top: 12px; left: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .video-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          backdrop-filter: blur(8px);
        }

        .video-badge.live    { background: rgba(239,68,68,0.9); color: #fff; }
        .video-badge.fps     { background: rgba(0,0,0,0.7);     color: #22c55e; }
        .video-badge.density { background: rgba(0,0,0,0.7);     color: #f59e0b; }

        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #fff;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }

        /* ── Behaviour Badge (bottom-left of video) ── */
        .behaviour-overlay {
          position: absolute;
          bottom: 44px;
          left: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .behaviour-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px;
          letter-spacing: 2px;
          backdrop-filter: blur(10px);
          border: 1.5px solid;
          transition: all 0.3s ease;
        }

        .behaviour-badge.danger {
          animation: dangerPulse 1s infinite;
        }

        @keyframes dangerPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.03); }
        }

        /* ── Flow Direction (bottom-right of video) ── */
        .flow-overlay {
          position: absolute;
          bottom: 44px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(0,0,0,0.7);
          border-radius: 20px;
          backdrop-filter: blur(8px);
        }

        .flow-arrow {
          font-size: 20px;
          color: #fff;
          transition: all 0.3s;
        }

        .flow-arrow.panic    { color: #ef4444; animation: dangerPulse 0.5s infinite; }
        .flow-arrow.stampede { color: #f59e0b; animation: dangerPulse 0.7s infinite; }

        .flow-label {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: rgba(255,255,255,0.7);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .flow-mag {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          color: #f59e0b;
        }

        /* ── Density bar at very bottom of video ── */
        .video-density-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 6px;
          background: rgba(0,0,0,0.4);
        }

        .video-density-fill {
          height: 100%;
          transition: width 0.5s ease, background 0.3s ease;
        }

        /* ── Control Card ── */
        .control-card {
          background: #fff;
          border: 1px solid #e8e8e0;
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
          max-height: calc(100vh - 180px);
        }

        .control-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 2px;
          color: #1a1a1a;
        }
        .control-title span { color: #c1440e; }

        .start-btn {
          width: 100%;
          padding: 16px;
          background: #c1440e;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 2px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .start-btn:hover    { background: #a33a0c; transform: translateY(-1px); }
        .start-btn.stopping { background: #1a1a1a; }
        .start-btn.stopping:hover { background: #333; }

        .stat-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: #f9f9f5;
          border-radius: 10px;
          border: 1px solid #e8e8e0;
        }

        .stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          letter-spacing: 1px;
        }

        .risk-safe    { color: #22c55e; }
        .risk-warning { color: #f59e0b; }
        .risk-danger  { color: #ef4444; }

        .error-box {
          background: #fff5f5;
          border: 1px solid #fca5a5;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 12px;
          color: #c1440e;
          font-weight: 500;
        }

        .action-box {
          background: #fdfdf5;
          border: 1px solid #e8e8e0;
          border-left: 4px solid #c1440e;
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 12px;
          color: #1a1a1a;
          font-weight: 500;
          line-height: 1.5;
        }

        /* ── Behaviour Panel ── */
        .behaviour-panel {
          background: #fdfdf5;
          border: 1px solid #e8e8e0;
          border-radius: 12px;
          padding: 14px;
        }

        .panel-label {
          font-size: 10px;
          font-weight: 700;
          color: #999;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .behaviour-current {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid;
          margin-bottom: 10px;
          transition: all 0.3s;
        }

        .behaviour-icon { font-size: 20px; }

        .behaviour-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          letter-spacing: 1.5px;
        }

        .behaviour-conf {
          font-size: 11px;
          font-weight: 600;
          color: #999;
          margin-left: auto;
        }

        .behaviour-desc-text {
          font-size: 11px;
          color: #666;
          line-height: 1.5;
          font-weight: 500;
        }

        /* ── Flow Panel ── */
        .flow-panel {
          background: #fdfdf5;
          border: 1px solid #e8e8e0;
          border-radius: 12px;
          padding: 14px;
        }

        .flow-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 8px;
        }

        .flow-item {
          padding: 8px 12px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e8e8e0;
        }

        .flow-item-label {
          font-size: 9px;
          font-weight: 700;
          color: #bbb;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 3px;
        }

        .flow-item-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 16px;
          color: #1a1a1a;
          letter-spacing: 0.5px;
        }

        /* ── Behaviour Log ── */
        .log-panel {
          background: #fdfdf5;
          border: 1px solid #e8e8e0;
          border-radius: 12px;
          padding: 14px;
        }

        .log-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 160px;
          overflow-y: auto;
          margin-top: 8px;
        }

        .log-list::-webkit-scrollbar { width: 3px; }
        .log-list::-webkit-scrollbar-thumb { background: #c1440e; border-radius: 3px; }

        .log-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e8e8e0;
          font-size: 11px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .log-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .log-time  { color: #bbb; font-weight: 600; min-width: 55px; }
        .log-type  { font-weight: 700; color: #1a1a1a; text-transform: capitalize; flex: 1; }
        .log-count { color: #999; font-size: 10px; }

        .log-empty {
          font-size: 12px;
          color: #bbb;
          text-align: center;
          padding: 16px 0;
          font-weight: 500;
        }

        /* ── Stats Row ── */
        .webcam-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        /* ── Annotated Frame ── */
        .annotated-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 4px;
        }

        .frame-card {
          background: #1a1a1a;
          border-radius: 16px;
          overflow: hidden;
        }

        .frame-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          letter-spacing: 2px;
          color: #fff;
          padding: 12px 16px 8px;
        }
        .frame-title span { color: #c1440e; }

        .frame-img {
          width: 100%;
          display: block;
        }

        @media (max-width: 1024px) {
          .webcam-grid       { grid-template-columns: 1fr; }
          .webcam-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .annotated-row     { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .webcam-page       { padding: 80px 16px 32px; }
          .webcam-stats-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <AlertBanner
        riskLevel={liveData.risk_level}
        peopleCount={liveData.people_count}
        recommendedAction={liveData.recommended_action}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="webcam-page">

        <div className={`page-header ${animateIn ? "in" : ""}`}>
          <div className="page-title">Webcam <span>Detection</span></div>
          <div className="page-subtitle">
            Live crowd monitoring · YOLOv8m · DeepSORT · Optical Flow
          </div>
        </div>

        <div className="webcam-grid">

          {/* ── Video Feed ── */}
          <div className="video-card">
            {isDetecting ? (
              <>
                <video ref={visibleVideoRef} autoPlay playsInline muted />

                {/* Top-left badges */}
                <div className="video-overlay">
                  <div className="video-badge live">
                    <div className="badge-dot" /> LIVE
                  </div>
                  <div className="video-badge fps">{fps} FPS</div>
                  <div className="video-badge density">
                    {liveData.crowd_density?.toUpperCase()}
                  </div>
                </div>

                {/* Bottom-left — behaviour badge */}
                <div className="behaviour-overlay">
                  <div
                    className={`behaviour-badge ${liveData.risk_level === "danger" ? "danger" : ""}`}
                    style={{
                      background: currentBehaviour.bg,
                      borderColor: currentBehaviour.color,
                      color: currentBehaviour.color,
                    }}
                  >
                    <span>{currentBehaviour.icon}</span>
                    {currentBehaviour.label}
                  </div>

                  {/* PANIC / STAMPEDE extra badge */}
                  {isPanic && (
                    <div className="behaviour-badge danger" style={{ background: "rgba(239,68,68,0.2)", borderColor: "#ef4444", color: "#ef4444" }}>
                      🚨 PANIC
                    </div>
                  )}
                  {isStampede && (
                    <div className="behaviour-badge danger" style={{ background: "rgba(245,158,11,0.2)", borderColor: "#f59e0b", color: "#f59e0b" }}>
                      ⚠️ STAMPEDE
                    </div>
                  )}
                </div>

                {/* Bottom-right — flow direction */}
                <div className="flow-overlay">
                  <span className={`flow-arrow ${isPanic ? "panic" : isStampede ? "stampede" : ""}`}>
                    {flowArrow}
                  </span>
                  <div>
                    <div className="flow-label">{isPanic ? "PANIC" : isStampede ? "STAMPEDE" : flowDir}</div>
                    <div className="flow-mag">{flowMag.toFixed(1)}</div>
                  </div>
                </div>

                {/* Density bar at bottom */}
                <div className="video-density-bar">
                  <div
                    className="video-density-fill"
                    style={{
                      width: `${liveData.density_score || 0}%`,
                      background:
                        liveData.risk_level === "danger"  ? "#ef4444"
                        : liveData.risk_level === "warning" ? "#f59e0b"
                        : "#22c55e",
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="video-placeholder">
                <div className="video-placeholder-icon">📷</div>
                <div className="video-placeholder-text">Camera Inactive</div>
              </div>
            )}
          </div>

          {/* ── Control Panel ── */}
          <div className="control-card">
            <div className="control-title">Detection <span>Control</span></div>

            <button
              className={`start-btn ${isDetecting ? "stopping" : ""}`}
              onClick={isDetecting ? stopWebcam : startWebcam}
            >
              {isDetecting ? "⏹ Stop Detection" : "▶ Start Detection"}
            </button>

            {webcamError && (
              <div className="error-box">⚠️ {webcamError}</div>
            )}

            {/* Live Stats */}
            <div className="stat-row">
              <div className="stat-item">
                <span className="stat-label">People</span>
                <span className="stat-value" style={{ color: "#c1440e" }}>
                  {liveData.people_count}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Risk Level</span>
                <span className={`stat-value risk-${liveData.risk_level}`}>
                  {liveData.risk_level?.toUpperCase()}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Density</span>
                <span className="stat-value" style={{ color: "#f59e0b" }}>
                  {liveData.crowd_density?.toUpperCase()}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Trend</span>
                <span className="stat-value" style={{ color: "#1a1a1a" }}>
                  {liveData.trend === "increasing" ? "↑" : liveData.trend === "decreasing" ? "↓" : "→"}
                  {liveData.trend?.toUpperCase()}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Area Coverage</span>
                <span className="stat-value" style={{ color: "#1a1a1a" }}>
                  {liveData.area_coverage || "--"}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Processing</span>
                <span className="stat-value" style={{ color: "#22c55e" }}>
                  {liveData.processing_time_ms ? `${liveData.processing_time_ms}ms` : "--"}
                </span>
              </div>
            </div>

            {/* Behaviour Panel */}
            {isDetecting && (
              <div className="behaviour-panel">
                <div className="panel-label">Detected Behaviour</div>
                <div
                  className="behaviour-current"
                  style={{
                    background: currentBehaviour.bg,
                    borderColor: currentBehaviour.color,
                  }}
                >
                  <span className="behaviour-icon">{currentBehaviour.icon}</span>
                  <span className="behaviour-name" style={{ color: currentBehaviour.color }}>
                    {currentBehaviour.label}
                  </span>
                  {liveData.behaviour_confidence && (
                    <span className="behaviour-conf">
                      {Math.round(liveData.behaviour_confidence * 100)}%
                    </span>
                  )}
                </div>
                {liveData.behaviour_description && (
                  <div className="behaviour-desc-text">
                    {liveData.behaviour_description}
                  </div>
                )}
              </div>
            )}

            {/* Flow Direction Panel */}
            {isDetecting && liveData.optical_flow && (
              <div className="flow-panel">
                <div className="panel-label">Crowd Movement</div>
                <div className="flow-grid">
                  <div className="flow-item">
                    <div className="flow-item-label">Direction</div>
                    <div className="flow-item-value">
                      {flowArrow} {flowDir}
                    </div>
                  </div>
                  <div className="flow-item">
                    <div className="flow-item-label">Magnitude</div>
                    <div className="flow-item-value" style={{ color: flowMag > 4 ? "#ef4444" : flowMag > 2 ? "#f59e0b" : "#22c55e" }}>
                      {flowMag.toFixed(2)}
                    </div>
                  </div>
                  <div className="flow-item">
                    <div className="flow-item-label">Panic</div>
                    <div className="flow-item-value" style={{ color: isPanic ? "#ef4444" : "#22c55e" }}>
                      {isPanic ? "YES" : "NO"}
                    </div>
                  </div>
                  <div className="flow-item">
                    <div className="flow-item-label">Stampede</div>
                    <div className="flow-item-value" style={{ color: isStampede ? "#f59e0b" : "#22c55e" }}>
                      {isStampede ? "YES" : "NO"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Behaviour Event Log */}
            {isDetecting && (
              <div className="log-panel">
                <div className="panel-label">Event Log</div>
                <div className="log-list">
                  {behaviourLog.length === 0 ? (
                    <div className="log-empty">No notable events yet</div>
                  ) : (
                    behaviourLog.map(item => (
                      <div key={item.id} className="log-item">
                        <div
                          className="log-dot"
                          style={{
                            background:
                              item.risk === "danger"  ? "#ef4444"
                              : item.risk === "warning" ? "#f59e0b"
                              : "#22c55e"
                          }}
                        />
                        <span className="log-time">{item.time}</span>
                        <span className="log-type">{item.behaviour.replace(/_/g, " ")}</span>
                        <span className="log-count">{item.people}p</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {liveData.recommended_action && (
              <div className="action-box">
                💡 {liveData.recommended_action}
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="webcam-stats-grid" style={{ marginBottom: 24 }}>
          <StatsCard title="People Detected" value={liveData.people_count}            icon="👥" color="#c1440e" />
          <StatsCard title="Density Score"   value={liveData.density_score ?? 0}      icon="📊" color="#f59e0b" />
          <StatsCard title="Area Coverage"   value={liveData.area_coverage || "--"}    icon="🗺️" color="#22c55e" />
          <StatsCard title="Processing ms"   value={liveData.processing_time_ms ?? 0}  icon="⚡" color="#1a1a1a" />
        </div>

        {/* Annotated Frame + Heatmap */}
        {liveData.annotated_frame && (
          <div className="annotated-row">
            <div className="frame-card">
              <div className="frame-title">Annotated <span>Frame</span></div>
              <img
                className="frame-img"
                src={`data:image/jpeg;base64,${liveData.annotated_frame}`}
                alt="Annotated"
              />
            </div>
            {liveData.heatmap_frame && (
              <div className="frame-card">
                <div className="frame-title">Crowd <span>Heatmap</span></div>
                <img
                  className="frame-img"
                  src={`data:image/jpeg;base64,${liveData.heatmap_frame}`}
                  alt="Heatmap"
                />
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
};

export default WebcamDetection;