import { useState, useEffect } from "react";
import { useCCTVDetection } from "../hooks/useDetection";
import RiskIndicator from "../components/RiskIndicator";
import AlertBanner from "../components/AlertBanner";
import HeatmapView from "../components/HeatmapView";
import StatsCard from "../components/StatsCard";

const CCTVMonitor = () => {
  const {
    isMonitoring,
    result,
    error,
    cameraId,
    streamUrl,
    setCameraId,
    setStreamUrl,
    startMonitoring,
    stopMonitoring,
  } = useCCTVDetection();

  const [animateIn, setAnimateIn] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const [cameraList, setCameraList] = useState([
    { id: "CAM_001", name: "Main Entrance",  url: "", status: "offline" },
    { id: "CAM_002", name: "Exit Gate",      url: "", status: "offline" },
    { id: "CAM_003", name: "Central Hall",   url: "", status: "offline" },
  ]);

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (result && cameraId) {
      setCameraList(prev =>
        prev.map(cam =>
          cam.id === cameraId
            ? { ...cam, status: isMonitoring ? "online" : "offline" }
            : cam
        )
      );
    }
  }, [result, cameraId, isMonitoring]);

  const handleCameraSelect = (cam) => {
    setCameraId(cam.id);
    setStreamUrl(cam.url);
  };

  // ── Behaviour config ──
  const behaviourConfig = {
    walking:   { label: "WALKING",   color: "#22c55e", bg: "#f0fdf4", border: "#a8d5b5", icon: "🚶" },
    normal:    { label: "NORMAL",    color: "#22c55e", bg: "#f0fdf4", border: "#a8d5b5", icon: "✓"  },
    gathering: { label: "GATHERING", color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d", icon: "👥" },
    loitering: { label: "LOITERING", color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d", icon: "⏱" },
    surge:     { label: "SURGE",     color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d", icon: "⚡" },
    panic:     { label: "PANIC",     color: "#ef4444", bg: "#fff5f5", border: "#fca5a5", icon: "🚨" },
    stampede:  { label: "STAMPEDE",  color: "#ef4444", bg: "#fff5f5", border: "#fca5a5", icon: "⚠️" },
    fighting:  { label: "FIGHTING",  color: "#ef4444", bg: "#fff5f5", border: "#fca5a5", icon: "🆘" },
  };

  const directionArrows = {
    North: "↑", South: "↓", East: "→", West: "←",
    NE: "↗", NW: "↖", SE: "↘", SW: "↙",
    none: "•", stable: "•",
  };

  const behaviour    = result?.behaviour || "normal";
  const bCfg         = behaviourConfig[behaviour] || behaviourConfig.normal;
  const flowDir      = result?.optical_flow?.motion_direction || "none";
  const flowArrow    = directionArrows[flowDir] || "•";
  const flowMag      = result?.optical_flow?.motion_magnitude || 0;
  const isPanic      = result?.optical_flow?.panic_detected;
  const isStampede   = result?.optical_flow?.stampede_detected;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

        .cctv-page {
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
          margin-bottom: 6px;
        }
        .page-title span { color: #c1440e; }

        .page-subtitle { font-size: 13px; color: #999; font-weight: 500; }

        .cctv-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s ease 0.1s;
        }
        .cctv-grid.in { opacity: 1; transform: translateY(0); }

        .card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e8e0d5;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f0ede8;
          background: #fdfdf5;
        }

        .card-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          color: #1a1a1a;
          letter-spacing: 1.5px;
        }

        .camera-list { padding: 12px; display: flex; flex-direction: column; gap: 8px; }

        .camera-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 10px;
          border: 1.5px solid #e8e0d5;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fdfdf5;
        }
        .camera-item:hover        { border-color: #c1440e; background: #fff5f5; transform: translateX(3px); }
        .camera-item.selected     { border-color: #c1440e; background: #fff5f5; }

        .camera-icon {
          width: 36px; height: 36px;
          border-radius: 8px;
          background: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .camera-item.selected .camera-icon { background: #c1440e; }

        .camera-info { flex: 1; min-width: 0; }
        .camera-name { font-size: 12px; font-weight: 700; color: #1a1a1a; margin-bottom: 2px; }
        .camera-id   { font-size: 10px; color: #999; font-weight: 500; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }

        .camera-status { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .camera-status.online  { background: #2d6a4f; box-shadow: 0 0 6px rgba(45,106,79,0.6); animation: statusPulse 2s infinite; }
        .camera-status.offline { background: #e8e0d5; }

        @keyframes statusPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        .add-camera-btn {
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          border: 1.5px dashed #e8e0d5;
          background: transparent;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #999;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 4px;
        }
        .add-camera-btn:hover { border-color: #c1440e; color: #c1440e; background: #fff5f5; }

        .tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: #f0ede8;
          border-radius: 10px;
        }

        .tab-btn {
          flex: 1;
          padding: 7px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #999;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active { background: #fff; color: #1a1a1a; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

        .tab-content { padding: 20px; }

        .stream-config { display: flex; flex-direction: column; gap: 14px; }

        .input-group { display: flex; flex-direction: column; gap: 6px; }

        .input-label {
          font-size: 11px;
          font-weight: 700;
          color: #666;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .input-field {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid #e8e0d5;
          background: #fdfdf5;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: #1a1a1a;
          font-weight: 500;
          outline: none;
          transition: all 0.2s;
        }
        .input-field:focus { border-color: #c1440e; background: #fff; box-shadow: 0 0 0 3px rgba(193,68,14,0.08); }
        .input-field::placeholder { color: #bbb; }

        .preset-label { font-size: 11px; font-weight: 700; color: #666; letter-spacing: 1px; text-transform: uppercase; }

        .preset-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }

        .preset-chip {
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid #e8e0d5;
          background: #fdfdf5;
          font-size: 11px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }
        .preset-chip:hover { border-color: #c1440e; color: #c1440e; background: #fff5f5; }

        .control-row { display: flex; gap: 10px; }

        .control-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px;
          border-radius: 10px;
          border: none;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.5px;
        }
        .control-btn.start { background: #1a1a1a; color: #fff; }
        .control-btn.start:hover { background: #c1440e; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(193,68,14,0.3); }
        .control-btn.stop  { background: #fff5f5; color: #c1440e; border: 1.5px solid #fca5a5; }
        .control-btn.stop:hover { background: #c1440e; color: #fff; }

        .error-box {
          padding: 12px 16px;
          background: #fff5f5;
          border: 1px solid #fca5a5;
          border-radius: 10px;
          font-size: 12px;
          color: #c1440e;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .live-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .info-box {
          padding: 14px;
          background: #fdfdf5;
          border-radius: 10px;
          border: 1px solid #e8e0d5;
          transition: all 0.2s;
        }
        .info-box:hover { border-color: #c1440e; transform: translateY(-2px); }

        .info-box-label {
          font-size: 10px;
          color: #999;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .info-box-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          color: #1a1a1a;
          letter-spacing: 0.5px;
        }
        .info-box-value.online  { color: #2d6a4f; }
        .info-box-value.danger  { color: #c1440e; }
        .info-box-value.warning { color: #b45309; }
        .info-box-value.safe    { color: #2d6a4f; }

        .stream-note {
          padding: 10px 14px;
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 10px;
          font-size: 11px;
          color: #b45309;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
        }

        /* ── Behaviour + Flow panels ── */
        .behaviour-flow-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .analysis-panel {
          background: #fdfdf5;
          border: 1px solid #e8e0d5;
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

        .behaviour-badge-large {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid;
          margin-bottom: 8px;
          transition: all 0.3s;
        }

        .behaviour-badge-large.danger { animation: dangerPulse 1s infinite; }

        @keyframes dangerPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.02); }
        }

        .behaviour-badge-icon { font-size: 20px; }
        .behaviour-badge-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          letter-spacing: 1.5px;
        }
        .behaviour-badge-conf { font-size: 11px; font-weight: 600; color: #999; margin-left: auto; }
        .behaviour-badge-desc { font-size: 11px; color: #666; line-height: 1.5; }

        .flow-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .flow-item {
          padding: 8px 10px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e8e0d5;
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
          font-size: 15px;
          color: #1a1a1a;
        }

        /* Alert chips */
        .alert-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .alert-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          letter-spacing: 1.5px;
          border: 1.5px solid;
          animation: chipPulse 1.5s infinite;
        }

        @keyframes chipPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s ease 0.2s;
        }
        .stats-row.in { opacity: 1; transform: translateY(0); }

        .bottom-row {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 24px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s ease 0.3s;
        }
        .bottom-row.in { opacity: 1; transform: translateY(0); }

        .monitoring-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }
        .monitoring-badge.active   { background: #fff5f5; color: #c1440e; border: 1px solid #fca5a5; }
        .monitoring-badge.inactive { background: #fdfdf5; color: #999;    border: 1px solid #e8e0d5; }

        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: dotPulse 1s infinite;
        }
        @keyframes dotPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        @media (max-width: 1024px) {
          .cctv-grid          { grid-template-columns: 1fr; }
          .stats-row          { grid-template-columns: repeat(2, 1fr); }
          .bottom-row         { grid-template-columns: 1fr; }
          .behaviour-flow-grid{ grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .cctv-page  { padding: 80px 16px 32px; }
          .page-title { font-size: 32px; }
          .stats-row  { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <AlertBanner
        alertTriggered={result?.alert_triggered}
        riskLevel={result?.risk_level}
        recommendedAction={result?.recommended_action}
        peopleCount={result?.people_count}
      />

      <div className="cctv-page">

        <div className={`page-header ${animateIn ? "in" : ""}`}>
          <div className="page-title">CCTV <span>Monitor</span></div>
          <div className="page-subtitle">Connect to live RTSP or HTTP streams for continuous monitoring</div>
        </div>

        <div className={`cctv-grid ${animateIn ? "in" : ""}`}>

          {/* Camera List */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Cameras</span>
              <span style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>
                {cameraList.filter(c => c.status === "online").length}/{cameraList.length} Online
              </span>
            </div>
            <div className="camera-list">
              {cameraList.map(cam => (
                <div
                  key={cam.id}
                  className={`camera-item ${cameraId === cam.id ? "selected" : ""}`}
                  onClick={() => handleCameraSelect(cam)}
                >
                  <div className="camera-icon">⊕</div>
                  <div className="camera-info">
                    <div className="camera-name">{cam.name}</div>
                    <div className="camera-id">{cam.id}</div>
                  </div>
                  <div className={`camera-status ${cam.status}`} />
                </div>
              ))}
              <button className="add-camera-btn">+ Add Camera</button>
            </div>
          </div>

          {/* Right Panel */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">{cameraId || "Select Camera"}</span>
              <div className={`monitoring-badge ${isMonitoring ? "active" : "inactive"}`}>
                {isMonitoring && <div className="badge-dot" />}
                {isMonitoring ? "Monitoring" : "Idle"}
              </div>
            </div>

            <div className="tab-content">
              <div className="tabs" style={{ marginBottom: 20 }}>
                <button className={`tab-btn ${activeTab === "live"      ? "active" : ""}`} onClick={() => setActiveTab("live")}>Live View</button>
                <button className={`tab-btn ${activeTab === "behaviour" ? "active" : ""}`} onClick={() => setActiveTab("behaviour")}>Behaviour</button>
                <button className={`tab-btn ${activeTab === "config"    ? "active" : ""}`} onClick={() => setActiveTab("config")}>Configure</button>
                <button className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>Analytics</button>
              </div>

              {/* ── Live Tab ── */}
              {activeTab === "live" && (
                <>
                  {result ? (
                    <>
                      <div className="live-info-grid">
                        <div className="info-box">
                          <div className="info-box-label">Camera</div>
                          <div className="info-box-value">{result.camera_id}</div>
                        </div>
                        <div className="info-box">
                          <div className="info-box-label">Stream</div>
                          <div className={`info-box-value ${result.stream_status}`}>
                            {result.stream_status?.toUpperCase()}
                          </div>
                        </div>
                        <div className="info-box">
                          <div className="info-box-label">People</div>
                          <div className="info-box-value">{result.people_count}</div>
                        </div>
                        <div className="info-box">
                          <div className="info-box-label">Risk</div>
                          <div className={`info-box-value ${result.risk_level}`}>
                            {result.risk_level?.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {result.note && <div className="stream-note">ℹ {result.note}</div>}

                      {!isMonitoring && (
                        <div className="control-row" style={{ marginTop: 14 }}>
                          <button className="control-btn start" onClick={startMonitoring}>
                            ⊕ Start Monitoring
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: 32, color: "#999" }}>
                      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⊕</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        Go to Configure tab to connect a stream
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Behaviour Tab ── */}
              {activeTab === "behaviour" && (
                <>
                  {result ? (
                    <>
                      {/* Alert chips */}
                      {(isPanic || isStampede) && (
                        <div className="alert-chips">
                          {isPanic && (
                            <div className="alert-chip" style={{ background: "#fff5f5", borderColor: "#ef4444", color: "#ef4444" }}>
                              🚨 PANIC DETECTED
                            </div>
                          )}
                          {isStampede && (
                            <div className="alert-chip" style={{ background: "#fffbeb", borderColor: "#f59e0b", color: "#b45309" }}>
                              ⚠️ STAMPEDE DETECTED
                            </div>
                          )}
                        </div>
                      )}

                      <div className="behaviour-flow-grid">
                        {/* Behaviour panel */}
                        <div className="analysis-panel">
                          <div className="panel-label">Detected Behaviour</div>
                          <div
                            className={`behaviour-badge-large ${result.risk_level === "danger" ? "danger" : ""}`}
                            style={{ background: bCfg.bg, borderColor: bCfg.border }}
                          >
                            <span className="behaviour-badge-icon">{bCfg.icon}</span>
                            <span className="behaviour-badge-name" style={{ color: bCfg.color }}>
                              {bCfg.label}
                            </span>
                            {result.behaviour_confidence && (
                              <span className="behaviour-badge-conf">
                                {Math.round(result.behaviour_confidence * 100)}%
                              </span>
                            )}
                          </div>
                          {result.behaviour_description && (
                            <div className="behaviour-badge-desc">{result.behaviour_description}</div>
                          )}
                        </div>

                        {/* Flow direction panel */}
                        <div className="analysis-panel">
                          <div className="panel-label">Crowd Movement</div>
                          <div className="flow-grid">
                            <div className="flow-item">
                              <div className="flow-item-label">Direction</div>
                              <div className="flow-item-value">{flowArrow} {flowDir}</div>
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
                      </div>

                      {/* Recommended action */}
                      {result.recommended_action && (
                        <div style={{
                          padding: "12px 16px",
                          background: "#fdfdf5",
                          border: "1px solid #e8e0d5",
                          borderLeft: "4px solid #c1440e",
                          borderRadius: 8,
                          fontSize: 13,
                          color: "#1a1a1a",
                          fontWeight: 500,
                          lineHeight: 1.5
                        }}>
                          💡 {result.recommended_action}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: 32, color: "#999" }}>
                      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>👁</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        Start monitoring to see behaviour analysis
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Config Tab ── */}
              {activeTab === "config" && (
                <div className="stream-config">
                  <div className="input-group">
                    <label className="input-label">Camera ID</label>
                    <input
                      className="input-field"
                      value={cameraId}
                      onChange={e => setCameraId(e.target.value)}
                      placeholder="e.g. CAM_001"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Stream URL</label>
                    <input
                      className="input-field"
                      value={streamUrl}
                      onChange={e => setStreamUrl(e.target.value)}
                      placeholder="rtsp://192.168.1.1:554/stream"
                    />
                  </div>
                  <div>
                    <div className="preset-label">Quick Presets</div>
                    <div className="preset-list">
                      {[
                        "rtsp://localhost:8554/stream",
                        "http://localhost:8080/video",
                        "rtsp://192.168.1.100:554/live",
                      ].map(url => (
                        <div key={url} className="preset-chip" onClick={() => setStreamUrl(url)}>
                          {url.substring(0, 25)}...
                        </div>
                      ))}
                    </div>
                  </div>
                  {error && <div className="error-box">⚠ {error}</div>}
                  <div className="control-row">
                    {!isMonitoring ? (
                      <button className="control-btn start" onClick={startMonitoring}>
                        ⊕ Start Monitoring
                      </button>
                    ) : (
                      <button className="control-btn stop" onClick={stopMonitoring}>
                        ◼ Stop Monitoring
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Analytics Tab ── */}
              {activeTab === "analytics" && (
                <RiskIndicator
                  riskLevel={result?.risk_level || "safe"}
                  densityScore={result?.density_score || 0}
                  peopleCount={result?.people_count || 0}
                  trend={result?.trend || "stable"}
                />
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className={`stats-row ${animateIn ? "in" : ""}`}>
          <StatsCard
            title="People Detected"
            value={result?.people_count || 0}
            subtitle="Current frame"
            icon="👥"
            color="#c1440e"
          />
          <StatsCard
            title="Density Score"
            value={result?.density_score || 0}
            subtitle="0–100 scale"
            icon="📊"
            color="#1a1a1a"
          />
          <StatsCard
            title="Area Coverage"
            value={0}
            subtitle={result?.area_coverage || "N/A"}
            icon="🗺️"
            color="#2d6a4f"
          />
          <StatsCard
            title="Alerts Triggered"
            value={result?.alert_triggered ? 1 : 0}
            subtitle="This session"
            icon="🚨"
            color="#b45309"
          />
        </div>

        {/* Bottom Row */}
        <div className={`bottom-row ${animateIn ? "in" : ""}`}>
          <HeatmapView
            annotatedFrame={result?.annotated_frame}
            heatmapFrame={result?.heatmap_frame}
            isLoading={false}
            peopleCount={result?.people_count || 0}
            riskLevel={result?.risk_level || "safe"}
          />
          <RiskIndicator
            riskLevel={result?.risk_level || "safe"}
            densityScore={result?.density_score || 0}
            peopleCount={result?.people_count || 0}
            trend={result?.trend || "stable"}
          />
        </div>

      </div>
    </>
  );
};

export default CCTVMonitor;