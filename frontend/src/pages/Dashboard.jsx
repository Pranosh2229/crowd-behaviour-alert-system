import { useEffect, useState } from "react";
import { useLiveData } from "../context/LiveDataContext.jsx";
import StatsCard from "../components/StatsCard";
import AlertBanner from "../components/AlertBanner";

const Dashboard = () => {
  const { liveData, systemStats, alertHistory, activeSource } = useLiveData();
  const [animateIn, setAnimateIn]     = useState(false);
  const [maxCapacity, setMaxCapacity] = useState(() => {
    return parseInt(localStorage.getItem("maxCapacity") || "100");
  });
  const [showModal, setShowModal]     = useState(false);
  const [inputVal, setInputVal]       = useState(maxCapacity);

  useEffect(() => {
    const t = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  const { modelStatus, isOnline } = systemStats;

  const handleSaveCapacity = () => {
    const val = parseInt(inputVal);
    if (!isNaN(val) && val > 0) {
      setMaxCapacity(val);
      localStorage.setItem("maxCapacity", val);
    }
    setShowModal(false);
  };

  const pct   = Math.min((liveData.people_count / maxCapacity) * 100, 100);
  const capColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

        .dashboard {
          min-height: 100vh;
          background: #fdfdf5;
          padding: 88px 32px 40px;
          font-family: 'Inter', sans-serif;
        }

        .dash-header {
          margin-bottom: 32px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s ease;
        }
        .dash-header.in { opacity: 1; transform: translateY(0); }

        .dash-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 48px;
          color: #1a1a1a;
          letter-spacing: 3px;
          line-height: 1;
          margin-bottom: 6px;
        }
        .dash-title span { color: #c1440e; }

        .dash-subtitle {
          font-size: 14px;
          color: #999;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .dash-status-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .status-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid;
          letter-spacing: 0.5px;
        }
        .status-chip.online  { background: #f0faf5; border-color: #a8d5b5; color: #2d6a4f; }
        .status-chip.offline { background: #fff0f0; border-color: #f5a8a8; color: #a83232; }
        .status-chip.model   { background: #fff8f0; border-color: #f5d0a8; color: #8a4f10; }
        .status-chip.active  { background: #fff0f5; border-color: #f5a8c8; color: #8a1040; }

        .chip-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        .dash-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .live-banner {
          background: #1a1a1a;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .live-banner-left { display: flex; align-items: center; gap: 16px; }
        .live-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 1s infinite;
        }
        .live-label {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          color: #fff;
          letter-spacing: 2px;
        }
        .live-source {
          font-size: 12px;
          color: #999;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .live-count {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 48px;
          color: #c1440e;
          line-height: 1;
        }
        .live-count-label {
          font-size: 11px;
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 2px;
        }
        .live-risk {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .live-risk.safe    { background: #052e16; color: #22c55e; }
        .live-risk.warning { background: #451a03; color: #f59e0b; }
        .live-risk.danger  { background: #450a0a; color: #ef4444; }

        .dash-middle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .dash-card {
          background: #fff;
          border: 1px solid #e8e8e0;
          border-radius: 16px;
          padding: 20px;
        }

        .dash-card-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 2px;
          color: #1a1a1a;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .dash-card-title span { color: #c1440e; }

        .edit-btn {
          font-size: 11px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          color: #c1440e;
          background: #fff0ec;
          border: 1px solid #f5c4b8;
          border-radius: 6px;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.5px;
        }
        .edit-btn:hover { background: #c1440e; color: #fff; }

        .entry-exit-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .entry-box, .exit-box {
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .entry-box { background: #f0faf5; border: 1px solid #a8d5b5; }
        .exit-box  { background: #fff0f0; border: 1px solid #f5a8a8; }
        .entry-exit-count {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 36px;
          line-height: 1;
        }
        .entry-box .entry-exit-count { color: #2d6a4f; }
        .exit-box  .entry-exit-count { color: #a83232; }
        .entry-exit-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 4px;
          color: #666;
        }

        .capacity-bar-wrap {
          background: #f5f5f0;
          border-radius: 8px;
          height: 16px;
          overflow: hidden;
          margin: 12px 0;
          cursor: pointer;
        }
        .capacity-bar-fill {
          height: 100%;
          border-radius: 8px;
          transition: width 0.5s ease, background 0.3s ease;
        }
        .capacity-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #999;
          font-weight: 500;
        }
        .capacity-hint {
          font-size: 11px;
          color: #bbb;
          margin-top: 8px;
          text-align: center;
          font-style: italic;
        }

        .alert-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 240px;
          overflow-y: auto;
        }
        .alert-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid;
          font-size: 12px;
        }
        .alert-item.danger  { background: #fff5f5; border-color: #fca5a5; }
        .alert-item.warning { background: #fffbeb; border-color: #fcd34d; }
        .alert-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .alert-item.danger  .alert-dot { background: #ef4444; }
        .alert-item.warning .alert-dot { background: #f59e0b; }
        .alert-item-text { flex: 1; color: #1a1a1a; font-weight: 500; }
        .alert-item-time { color: #999; font-size: 11px; }

        .density-score-wrap { text-align: center; padding: 16px 0; }
        .density-score-number {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 72px;
          line-height: 1;
        }
        .density-score-label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .trend-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 8px;
        }
        .trend-badge.increasing { background: #fff0f0; color: #c1440e; }
        .trend-badge.decreasing { background: #f0faf5; color: #2d6a4f; }
        .trend-badge.stable     { background: #f5f5f0; color: #666; }

        .recommendation-box {
          background: #fdfdf5;
          border: 1px solid #e8e8e0;
          border-left: 4px solid #c1440e;
          border-radius: 8px;
          padding: 14px 16px;
          font-size: 13px;
          color: #1a1a1a;
          font-weight: 500;
          line-height: 1.5;
          margin-top: 12px;
        }

        .no-data {
          text-align: center;
          padding: 32px;
          color: #999;
          font-size: 13px;
          font-weight: 500;
        }
        .no-data-icon { font-size: 32px; margin-bottom: 8px; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
        }
        .modal-box {
          background: #fff;
          border-radius: 20px;
          padding: 32px;
          width: 360px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.2);
          animation: modalIn 0.25s ease;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .modal-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 2px;
          color: #1a1a1a;
          margin-bottom: 6px;
        }
        .modal-title span { color: #c1440e; }
        .modal-subtitle {
          font-size: 13px;
          color: #999;
          margin-bottom: 24px;
          font-weight: 500;
        }
        .modal-input-wrap { margin-bottom: 20px; }
        .modal-input-label {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .modal-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e8e8e0;
          border-radius: 10px;
          font-size: 24px;
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 2px;
          color: #1a1a1a;
          text-align: center;
          outline: none;
          transition: border 0.2s;
          box-sizing: border-box;
        }
        .modal-input:focus { border-color: #c1440e; }
        .modal-presets {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .modal-preset {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid #e8e8e0;
          background: #f5f5f0;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-preset:hover { background: #c1440e; color: #fff; border-color: #c1440e; }
        .modal-btns { display: flex; gap: 10px; }
        .modal-save {
          flex: 1;
          padding: 12px;
          background: #c1440e;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-save:hover { background: #a33a0c; }
        .modal-cancel {
          flex: 1;
          padding: 12px;
          background: #f5f5f0;
          color: #666;
          border: none;
          border-radius: 10px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-cancel:hover { background: #e8e8e0; }

        @media (max-width: 1024px) {
          .dash-grid   { grid-template-columns: repeat(2, 1fr); }
          .dash-middle { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .dashboard  { padding: 80px 16px 32px; }
          .dash-grid  { grid-template-columns: 1fr 1fr; }
          .dash-title { font-size: 36px; }
          .live-count { font-size: 36px; }
          .modal-box  { width: 90%; padding: 24px; }
        }
      `}</style>

      {/* ── Alert Banner ── */}
      <AlertBanner
        riskLevel={liveData.risk_level}
        peopleCount={liveData.people_count}
        recommendedAction={liveData.recommended_action}
      />

      {/* ── Capacity Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Set <span>Capacity</span></div>
            <div className="modal-subtitle">Define the maximum number of people allowed in this location</div>
            <div className="modal-input-wrap">
              <div className="modal-input-label">Maximum People</div>
              <input
                className="modal-input"
                type="number"
                min="1"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-presets">
              {[10, 20, 30, 50, 100, 200, 500, 1000].map(p => (
                <button key={p} className="modal-preset" onClick={() => setInputVal(p)}>
                  {p}
                </button>
              ))}
            </div>
            <div className="modal-btns">
              <button className="modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="modal-save"   onClick={handleSaveCapacity}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard">

        {/* Header */}
        <div className={`dash-header ${animateIn ? "in" : ""}`}>
          <div className="dash-title">Crowd <span>Alert</span> Dashboard</div>
          <div className="dash-subtitle">Real-time crowd monitoring and behaviour analysis system</div>
          <div className="dash-status-row">
            <div className={`status-chip ${isOnline ? "online" : "offline"}`}>
              <div className="chip-dot" />
              {isOnline ? "Backend Connected" : "Backend Offline"}
            </div>
            {modelStatus && (
              <div className="status-chip model">
                <div className="chip-dot" />
                {modelStatus.data?.model_loaded ? "YOLOv8 Ready" : "Model Loading..."}
              </div>
            )}
            {activeSource && (
              <div className="status-chip active">
                <div className="chip-dot" />
                {activeSource.toUpperCase()} Active
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="dash-grid">
          <StatsCard title="People Detected"  value={liveData.people_count}                                    icon="👥" color="#c1440e" />
          <StatsCard title="Density Score"    value={liveData.density_score ?? 0}                              icon="📊" color="#f59e0b" />
          <StatsCard title="Total Alerts"     value={alertHistory.length}                                      icon="🚨" color="#ef4444" />
          <StatsCard title="Avg Count"        value={systemStats.statistics?.statistics?.average_count ?? 0}   icon="📈" color="#22c55e" />
        </div>

        {/* Live Detection Banner */}
        {liveData.source ? (
          <div className="live-banner">
            <div className="live-banner-left">
              <div className="live-dot" />
              <div>
                <div className="live-label">Live Detection</div>
                <div className="live-source">Source: {liveData.source}</div>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="live-count">{liveData.people_count}</div>
              <div className="live-count-label">People Detected</div>
            </div>
            <div className={`live-risk ${liveData.risk_level}`}>
              {liveData.risk_level === "danger" ? "⚠️" : liveData.risk_level === "warning" ? "⚡" : "✅"}
              {liveData.risk_level.toUpperCase()}
            </div>
            <div style={{ color: "#666", fontSize: "12px" }}>
              {liveData.crowd_density?.toUpperCase()} DENSITY
              <br />
              <span style={{ color: "#999" }}>
                {liveData.timestamp ? new Date(liveData.timestamp).toLocaleTimeString() : "--"}
              </span>
            </div>
          </div>
        ) : (
          <div className="live-banner">
            <div className="live-banner-left">
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#444" }} />
              <div>
                <div className="live-label">No Active Detection</div>
                <div className="live-source">Start Webcam, Video or CCTV mode</div>
              </div>
            </div>
          </div>
        )}

        {/* Middle Row */}
        <div className="dash-middle">

          {/* Entry Exit */}
          <div className="dash-card">
            <div className="dash-card-title">
              <span style={{ color: "#1a1a1a" }}>Entry <span>/</span> Exit Counter</span>
            </div>
            <div className="entry-exit-row">
              <div className="entry-box">
                <div className="entry-exit-count">{liveData.entry_count ?? 0}</div>
                <div className="entry-exit-label">↑ Entries</div>
              </div>
              <div className="exit-box">
                <div className="entry-exit-count">{liveData.exit_count ?? 0}</div>
                <div className="entry-exit-label">↓ Exits</div>
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div className="dash-card">
            <div className="dash-card-title">
              <span>Crowd <span>Capacity</span></span>
              <button className="edit-btn" onClick={() => { setInputVal(maxCapacity); setShowModal(true); }}>
                ✏️ Set Max
              </button>
            </div>
            <div className="capacity-bar-wrap" onClick={() => { setInputVal(maxCapacity); setShowModal(true); }}>
              <div className="capacity-bar-fill" style={{ width: `${pct}%`, background: capColor }} />
            </div>
            <div className="capacity-labels">
              <span>{liveData.people_count} people</span>
              <span style={{ color: capColor, fontWeight: 700 }}>{Math.round(pct)}% full</span>
              <span>Max: {maxCapacity}</span>
            </div>
            <div className="capacity-hint">Click bar or "Set Max" to change capacity</div>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="dash-middle">

          {/* Alert History */}
          <div className="dash-card">
            <div className="dash-card-title">
              <span>Alert <span>History</span></span>
            </div>
            {alertHistory.length === 0 ? (
              <div className="no-data">
                <div className="no-data-icon">🟢</div>
                No alerts triggered yet
              </div>
            ) : (
              <div className="alert-list">
                {alertHistory.slice(0, 10).map((a, i) => (
                  <div key={i} className={`alert-item ${a.risk_level}`}>
                    <div className="alert-dot" />
                    <div className="alert-item-text">
                      {a.risk_level.toUpperCase()} — {a.people_count} people · {a.source}
                    </div>
                    <div className="alert-item-time">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Density + Recommendation */}
          <div className="dash-card">
            <div className="dash-card-title">
              <span>Density <span>Score</span></span>
            </div>
            <div className="density-score-wrap">
              <div className="density-score-number" style={{ color: liveData.severity_color || "#1a1a1a" }}>
                {liveData.density_score ?? 0}
              </div>
              <div className="density-score-label">out of 100</div>
              <div className={`trend-badge ${liveData.trend || "stable"}`}>
                {liveData.trend === "increasing" ? "↑" : liveData.trend === "decreasing" ? "↓" : "→"}
                {(liveData.trend || "stable").toUpperCase()}
              </div>
            </div>
            <div className="recommendation-box">
              💡 {liveData.recommended_action || "Start detection to get recommendations"}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Dashboard;