import { useRef, useState, useEffect } from "react";
import { useVideoDetection } from "../hooks/useDetection";
import RiskIndicator from "../components/RiskIndicator";
import AlertBanner from "../components/AlertBanner";
import StatsCard from "../components/StatsCard";

const VideoUpload = () => {
  const {
    isProcessing,
    result,
    error,
    progress,
    selectedFile,
    handleFileSelect,
    startProcessing,
    reset,
  } = useVideoDetection();

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver]   = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) handleFileSelect(file);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
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

  // Get peak frame behaviour from result
  const peakBehaviour = result?.behaviour || "normal";
  const bCfg          = behaviourConfig[peakBehaviour] || behaviourConfig.normal;
  const flowDir       = result?.optical_flow?.motion_direction || "none";
  const flowArrow     = directionArrows[flowDir] || "•";
  const flowMag       = result?.optical_flow?.motion_magnitude || 0;
  const isPanic       = result?.optical_flow?.panic_detected || result?.panic_frames > 0;
  const isStampede    = result?.optical_flow?.stampede_detected || result?.stampede_frames > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

        .video-page {
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

        .page-subtitle {
          font-size: 13px;
          color: #999;
          font-weight: 500;
        }

        .upload-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s ease 0.1s;
        }
        .upload-grid.in { opacity: 1; transform: translateY(0); }

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

        .card-body { padding: 20px; }

        .drop-zone {
          border: 2px dashed #e8e0d5;
          border-radius: 14px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #fdfdf5;
          position: relative;
          overflow: hidden;
        }
        .drop-zone:hover, .drop-zone.dragover {
          border-color: #c1440e;
          background: #fff5f5;
          transform: scale(1.01);
        }

        .drop-icon { font-size: 48px; margin-bottom: 12px; display: block; transition: transform 0.3s; }
        .drop-zone:hover .drop-icon { transform: translateY(-4px); }

        .drop-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          color: #1a1a1a;
          letter-spacing: 1.5px;
          margin-bottom: 6px;
        }

        .drop-subtitle { font-size: 12px; color: #999; font-weight: 500; margin-bottom: 16px; }

        .drop-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #1a1a1a;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .drop-btn:hover { background: #c1440e; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(193,68,14,0.3); }

        .drop-formats { margin-top: 12px; font-size: 10px; color: #bbb; font-weight: 500; letter-spacing: 0.5px; }

        .file-info {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          background: #fdfdf5;
          border-radius: 12px;
          border: 1px solid #e8e0d5;
          margin-bottom: 16px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .file-icon {
          width: 44px; height: 44px;
          background: #1a1a1a;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .file-details { flex: 1; min-width: 0; }

        .file-name {
          font-size: 13px;
          font-weight: 700;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
        }

        .file-meta { font-size: 11px; color: #999; font-weight: 500; }

        .file-remove {
          width: 28px; height: 28px;
          border-radius: 6px;
          border: 1px solid #e8e0d5;
          background: transparent;
          color: #999;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .file-remove:hover { background: #c1440e; color: #fff; border-color: #c1440e; }

        .progress-wrap { margin-bottom: 16px; animation: slideIn 0.3s ease; }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .progress-label { font-size: 12px; font-weight: 700; color: #1a1a1a; letter-spacing: 0.5px; }
        .progress-value { font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: #c1440e; }

        .progress-track { height: 8px; background: #f0ede8; border-radius: 8px; overflow: hidden; }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #c1440e, #e9b44c);
          border-radius: 8px;
          transition: width 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }

        .progress-status { margin-top: 8px; font-size: 11px; color: #999; font-weight: 500; text-align: center; }

        .action-row { display: flex; gap: 10px; }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 10px;
          border: none;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.5px;
        }

        .action-btn.primary { background: #1a1a1a; color: #fff; }
        .action-btn.primary:hover:not(:disabled) { background: #c1440e; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(193,68,14,0.3); }
        .action-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .action-btn.secondary { background: #fdfdf5; color: #666; border: 1.5px solid #e8e0d5; }
        .action-btn.secondary:hover { border-color: #c1440e; color: #c1440e; }

        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

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
          margin-bottom: 16px;
          animation: slideIn 0.3s ease;
        }

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

        .results-wrap { padding: 20px; }

        .video-meta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }

        .meta-box {
          padding: 12px;
          background: #fdfdf5;
          border-radius: 10px;
          border: 1px solid #e8e0d5;
          text-align: center;
          transition: all 0.2s;
        }
        .meta-box:hover { border-color: #c1440e; transform: translateY(-2px); }

        .meta-value { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #1a1a1a; letter-spacing: 0.5px; }
        .meta-label { font-size: 9px; color: #999; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }

        /* ── Behaviour + Flow section ── */
        .analysis-panels {
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
        }

        .behaviour-badge-icon { font-size: 20px; }

        .behaviour-badge-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          letter-spacing: 1.5px;
        }

        .behaviour-badge-conf {
          font-size: 11px;
          font-weight: 600;
          color: #999;
          margin-left: auto;
        }

        .behaviour-badge-desc {
          font-size: 11px;
          color: #666;
          line-height: 1.5;
        }

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

        /* ── Alert chips ── */
        .alert-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
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

        @keyframes chipPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }

        /* Timeline */
        .timeline-wrap {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .timeline-wrap::-webkit-scrollbar { width: 4px; }
        .timeline-wrap::-webkit-scrollbar-thumb { background: #c1440e; border-radius: 4px; }

        .timeline-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: #fdfdf5;
          border-radius: 8px;
          border: 1px solid #e8e0d5;
          font-size: 12px;
          transition: all 0.2s;
        }
        .timeline-item:hover { border-color: #c1440e; transform: translateX(4px); }

        .timeline-time { font-family: 'Bebas Neue', sans-serif; font-size: 16px; color: #1a1a1a; min-width: 40px; }

        .timeline-bar { flex: 1; height: 6px; background: #f0ede8; border-radius: 6px; overflow: hidden; }

        .timeline-bar-fill { height: 100%; border-radius: 6px; transition: width 0.5s ease; }

        .timeline-count { font-weight: 700; color: #1a1a1a; min-width: 30px; text-align: right; }

        .timeline-risk {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .risk-safe    { background: #f0faf5; color: #2d6a4f; }
        .risk-warning { background: #fffbeb; color: #b45309; }
        .risk-danger  { background: #fff5f5; color: #c1440e; }

        .frame-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 12px;
        }

        .summary-box { padding: 14px; border-radius: 10px; text-align: center; border: 1px solid; }
        .summary-box.safe    { background: #f0faf5; border-color: #a8d5b5; }
        .summary-box.warning { background: #fffbeb; border-color: #fcd34d; }
        .summary-box.danger  { background: #fff5f5; border-color: #fca5a5; }

        .summary-value { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #1a1a1a; }
        .summary-label { font-size: 10px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

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
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s ease 0.3s;
        }
        .bottom-row.in { opacity: 1; transform: translateY(0); }

        @media (max-width: 1024px) {
          .upload-grid     { grid-template-columns: 1fr; }
          .stats-row       { grid-template-columns: repeat(2, 1fr); }
          .video-meta-grid { grid-template-columns: repeat(2, 1fr); }
          .analysis-panels { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .video-page { padding: 80px 16px 32px; }
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

      <div className="video-page">

        <div className={`page-header ${animateIn ? "in" : ""}`}>
          <div className="page-title">Video <span>Upload</span> Analysis</div>
          <div className="page-subtitle">Upload a video file for frame-by-frame crowd detection</div>
        </div>

        <div className={`upload-grid ${animateIn ? "in" : ""}`}>

          {/* Upload Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Upload Video</span>
            </div>
            <div className="card-body">

              {!selectedFile && (
                <div
                  className={`drop-zone ${dragOver ? "dragover" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <span className="drop-icon">▶</span>
                  <div className="drop-title">Drop Video Here</div>
                  <div className="drop-subtitle">or click to browse your files</div>
                  <button className="drop-btn">↑ Choose File</button>
                  <div className="drop-formats">MP4 · AVI · MOV · MKV · WEBM</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                </div>
              )}

              {selectedFile && (
                <div className="file-info">
                  <div className="file-icon">▶</div>
                  <div className="file-details">
                    <div className="file-name">{selectedFile.name}</div>
                    <div className="file-meta">
                      {formatFileSize(selectedFile.size)} · {selectedFile.type.split("/")[1]?.toUpperCase()}
                    </div>
                  </div>
                  <button className="file-remove" onClick={reset}>✕</button>
                </div>
              )}

              {isProcessing && (
                <div className="progress-wrap">
                  <div className="progress-header">
                    <span className="progress-label">{progress < 100 ? "Uploading..." : "Analyzing Frames..."}</span>
                    <span className="progress-value">{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="progress-status">
                    {progress < 100 ? "Uploading video to server..." : "Running YOLO detection on frames..."}
                  </div>
                </div>
              )}

              {error && <div className="error-box">⚠ {error}</div>}

              <div className="action-row">
                <button
                  className="action-btn primary"
                  onClick={startProcessing}
                  disabled={!selectedFile || isProcessing}
                >
                  {isProcessing ? <><div className="spinner" /> Processing...</> : "▶ Analyze Video"}
                </button>
                {(selectedFile || result) && (
                  <button className="action-btn secondary" onClick={reset} disabled={isProcessing}>
                    ↺ Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Analysis Results</span>
              {result && (
                <div className="tabs">
                  <button className={`tab-btn ${activeTab === "overview"  ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
                  <button className={`tab-btn ${activeTab === "behaviour" ? "active" : ""}`} onClick={() => setActiveTab("behaviour")}>Behaviour</button>
                  <button className={`tab-btn ${activeTab === "timeline"  ? "active" : ""}`} onClick={() => setActiveTab("timeline")}>Timeline</button>
                  <button className={`tab-btn ${activeTab === "frames"    ? "active" : ""}`} onClick={() => setActiveTab("frames")}>Frames</button>
                </div>
              )}
            </div>

            {!result ? (
              <div className="card-body">
                <RiskIndicator riskLevel="safe" densityScore={0} peopleCount={0} trend="stable" />
              </div>
            ) : (
              <div className="results-wrap">

                {/* ── Overview Tab ── */}
                {activeTab === "overview" && (
                  <>
                    <RiskIndicator
                      riskLevel={result.risk_level}
                      densityScore={result.density_score}
                      peopleCount={result.people_count}
                      trend={result.trend}
                    />
                    <div className="video-meta-grid" style={{ marginTop: 16 }}>
                      <div className="meta-box">
                        <div className="meta-value">{formatDuration(result.video_metadata?.duration_seconds)}</div>
                        <div className="meta-label">Duration</div>
                      </div>
                      <div className="meta-box">
                        <div className="meta-value">{result.video_metadata?.fps}</div>
                        <div className="meta-label">FPS</div>
                      </div>
                      <div className="meta-box">
                        <div className="meta-value">{result.video_metadata?.frames_analyzed}</div>
                        <div className="meta-label">Frames</div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Behaviour Tab ── */}
                {activeTab === "behaviour" && (
                  <>
                    {/* Alert chips for panic/stampede */}
                    {(isPanic || isStampede) && (
                      <div className="alert-chips">
                        {isPanic && (
                          <div className="alert-chip" style={{ background: "#fff5f5", borderColor: "#ef4444", color: "#ef4444" }}>
                            🚨 PANIC DETECTED — {result.panic_frames} frames
                          </div>
                        )}
                        {isStampede && (
                          <div className="alert-chip" style={{ background: "#fffbeb", borderColor: "#f59e0b", color: "#b45309" }}>
                            ⚠️ STAMPEDE DETECTED — {result.stampede_frames} frames
                          </div>
                        )}
                      </div>
                    )}

                    <div className="analysis-panels">
                      {/* Behaviour panel */}
                      <div className="analysis-panel">
                        <div className="panel-label">Detected Behaviour</div>
                        <div
                          className="behaviour-badge-large"
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
                            <div className="flow-item-label">Panic Frames</div>
                            <div className="flow-item-value" style={{ color: result.panic_frames > 0 ? "#ef4444" : "#22c55e" }}>
                              {result.panic_frames || 0}
                            </div>
                          </div>
                          <div className="flow-item">
                            <div className="flow-item-label">Stampede</div>
                            <div className="flow-item-value" style={{ color: result.stampede_frames > 0 ? "#f59e0b" : "#22c55e" }}>
                              {result.stampede_frames || 0}
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
                )}

                {/* ── Timeline Tab ── */}
                {activeTab === "timeline" && (
                  <div className="timeline-wrap">
                    {result.frame_by_frame?.map((frame, i) => (
                      <div key={i} className="timeline-item">
                        <span className="timeline-time">{frame.timestamp_sec}s</span>
                        <div className="timeline-bar">
                          <div
                            className="timeline-bar-fill"
                            style={{
                              width: `${frame.density_score}%`,
                              background:
                                frame.risk_level === "danger"  ? "#c1440e"
                                : frame.risk_level === "warning" ? "#e9b44c"
                                : "#2d6a4f",
                            }}
                          />
                        </div>
                        <span className="timeline-count">{frame.people_count}</span>
                        <span className={`timeline-risk risk-${frame.risk_level}`}>
                          {frame.risk_level}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Frames Tab ── */}
                {activeTab === "frames" && (
                  <>
                    <div className="frame-summary">
                      <div className="summary-box safe">
                        <div className="summary-value">{result.safe_frames}</div>
                        <div className="summary-label">Safe Frames</div>
                      </div>
                      <div className="summary-box warning">
                        <div className="summary-value">{result.warning_frames}</div>
                        <div className="summary-label">Warning</div>
                      </div>
                      <div className="summary-box danger">
                        <div className="summary-value">{result.danger_frames}</div>
                        <div className="summary-label">Danger</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, fontSize: 12, color: "#999", textAlign: "center" }}>
                      Peak count: {result.peak_people_count} people
                    </div>
                  </>
                )}

              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className={`stats-row ${animateIn ? "in" : ""}`}>
          <StatsCard title="Avg People Count" value={result?.people_count || 0}       subtitle="Average across frames" icon="👥" color="#c1440e" />
          <StatsCard title="Peak Count"        value={result?.peak_people_count || 0}  subtitle="Highest in any frame"  icon="📈" color="#1a1a1a" />
          <StatsCard title="Danger Frames"     value={result?.danger_frames || 0}      subtitle="High risk frames"       icon="🚨" color="#b45309" />
          <StatsCard title="Safe Frames"       value={result?.safe_frames || 0}        subtitle="Low risk frames"        icon="✓"  color="#2d6a4f" />
        </div>

        {/* Peak Frame */}
        <div className={`bottom-row ${animateIn ? "in" : ""}`}>
          {result?.peak_frame && (
            <div style={{ background: "#1a1a1a", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
              <div style={{
                padding: "12px 16px 8px",
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: 14,
                letterSpacing: 2,
                color: "#fff"
              }}>
                Peak <span style={{ color: "#c1440e" }}>Frame</span>
                <span style={{ float: "right", fontSize: 12, color: "#999", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                  {result.peak_people_count} people detected
                </span>
              </div>
              <img
                src={`data:image/jpeg;base64,${result.peak_frame}`}
                alt="Peak Frame"
                style={{ width: "100%", display: "block" }}
              />
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default VideoUpload;