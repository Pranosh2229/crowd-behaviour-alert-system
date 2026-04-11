import { useEffect, useState } from "react";

const RiskIndicator = ({ riskLevel = "safe", densityScore = 0, peopleCount = 0, trend = "stable" }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [riskLevel, densityScore]);

  const config = {
    safe: {
      label: "SAFE",
      color: "#2d6a4f",
      bg: "#f0faf5",
      border: "#a8d5b5",
      glow: "rgba(45,106,79,0.2)",
      icon: "✓",
      barColor: "#2d6a4f",
    },
    warning: {
      label: "WARNING",
      color: "#b45309",
      bg: "#fffbeb",
      border: "#fcd34d",
      glow: "rgba(180,83,9,0.2)",
      icon: "⚠",
      barColor: "#e9b44c",
    },
    danger: {
      label: "DANGER",
      color: "#c1440e",
      bg: "#fff5f5",
      border: "#fca5a5",
      glow: "rgba(193,68,14,0.25)",
      icon: "!",
      barColor: "#c1440e",
    },
  };

  const cfg = config[riskLevel] || config.safe;

  const trendConfig = {
    increasing: { icon: "↑", color: "#c1440e", label: "Increasing" },
    decreasing: { icon: "↓", color: "#2d6a4f", label: "Decreasing" },
    stable: { icon: "→", color: "#b45309", label: "Stable" },
  };
  const trendCfg = trendConfig[trend] || trendConfig.stable;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

        .risk-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e8e0d5;
          padding: 24px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          transition: all 0.3s ease;
          overflow: hidden;
          position: relative;
        }

        .risk-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: var(--bar-color);
          transition: all 0.5s ease;
        }

        .risk-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .risk-label-wrap { display: flex; flex-direction: column; }

        .risk-section-label {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: #999;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .risk-level-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 30px;
          border: 1.5px solid var(--border-color);
          background: var(--bg-color);
          transition: all 0.4s ease;
        }

        .risk-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--icon-color);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          font-family: 'Inter', sans-serif;
        }

        .risk-icon.danger {
          animation: dangerPulse 1s infinite;
        }

        @keyframes dangerPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(193,68,14,0.4); }
          50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(193,68,14,0); }
        }

        .risk-level-text {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          letter-spacing: 2px;
          color: var(--text-color);
        }

        .people-count-wrap {
          text-align: right;
        }

        .people-count-number {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 48px;
          line-height: 1;
          color: #1a1a1a;
          letter-spacing: -1px;
        }

        .people-count-label {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          color: #999;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .density-bar-wrap {
          margin-bottom: 16px;
        }

        .density-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .density-bar-label {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #666;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .density-bar-value {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .density-bar-track {
          height: 10px;
          background: #f0ede8;
          border-radius: 10px;
          overflow: hidden;
        }

        .density-bar-fill {
          height: 100%;
          border-radius: 10px;
          background: var(--bar-color);
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .density-bar-fill::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .stat-box {
          background: #fdfdf5;
          border: 1px solid #e8e0d5;
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          transition: all 0.2s;
        }

        .stat-box:hover {
          border-color: #c1440e;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(193,68,14,0.1);
        }

        .stat-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          color: #1a1a1a;
          letter-spacing: 1px;
        }

        .stat-label {
          font-family: 'Inter', sans-serif;
          font-size: 9px;
          color: #999;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .trend-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 10px 14px;
          background: #fdfdf5;
          border-radius: 10px;
          border: 1px solid #e8e0d5;
        }

        .trend-icon {
          font-size: 18px;
          font-weight: 800;
          font-family: 'Inter', sans-serif;
          transition: color 0.3s;
        }

        .trend-label {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          letter-spacing: 0.5px;
        }

        .trend-value {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 700;
          margin-left: auto;
          transition: color 0.3s;
        }
      `}</style>

      <div
        className="risk-card"
        style={{
          "--bar-color": cfg.barColor,
          "--border-color": cfg.border,
          "--bg-color": cfg.bg,
          "--icon-color": cfg.color,
          "--text-color": cfg.color,
          boxShadow: `0 4px 24px ${cfg.glow}`,
        }}
      >
        {/* Header */}
        <div className="risk-header">
          <div className="risk-label-wrap">
            <span className="risk-section-label">Risk Level</span>
            <div className="risk-level-badge">
              <div className={`risk-icon ${riskLevel === "danger" ? "danger" : ""}`}>
                {cfg.icon}
              </div>
              <span className="risk-level-text">{cfg.label}</span>
            </div>
          </div>

          <div className="people-count-wrap">
            <div className="people-count-number">{peopleCount}</div>
            <div className="people-count-label">People Detected</div>
          </div>
        </div>

        {/* Density Bar */}
        <div className="density-bar-wrap">
          <div className="density-bar-header">
            <span className="density-bar-label">Crowd Density Score</span>
            <span className="density-bar-value">{densityScore}%</span>
          </div>
          <div className="density-bar-track">
            <div
              className="density-bar-fill"
              style={{ width: animated ? `${densityScore}%` : "0%" }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-value" style={{ color: config.safe.color }}>
              {riskLevel === "safe" ? "●" : "○"}
            </div>
            <div className="stat-label">Safe</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: config.warning.color }}>
              {riskLevel === "warning" ? "●" : "○"}
            </div>
            <div className="stat-label">Warning</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: config.danger.color }}>
              {riskLevel === "danger" ? "●" : "○"}
            </div>
            <div className="stat-label">Danger</div>
          </div>
        </div>

        {/* Trend */}
        <div className="trend-row">
          <span className="trend-icon" style={{ color: trendCfg.color }}>
            {trendCfg.icon}
          </span>
          <span className="trend-label">Crowd Trend</span>
          <span className="trend-value" style={{ color: trendCfg.color }}>
            {trendCfg.label}
          </span>
        </div>
      </div>
    </>
  );
};

export default RiskIndicator;