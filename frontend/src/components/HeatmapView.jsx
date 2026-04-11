import { useState } from "react";

const HeatmapView = ({ annotatedFrame, heatmapFrame, isLoading, peopleCount, riskLevel }) => {
  const [activeView, setActiveView] = useState("annotated");

  const riskColors = {
    safe: "#2d6a4f",
    warning: "#b45309",
    danger: "#c1440e",
  };

  const riskColor = riskColors[riskLevel] || riskColors.safe;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

        .heatmap-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e8e0d5;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }

        .heatmap-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f0ede8;
          background: #fdfdf5;
        }

        .heatmap-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          color: #1a1a1a;
          letter-spacing: 1.5px;
        }

        .heatmap-toggle {
          display: flex;
          gap: 4px;
          background: #f0ede8;
          border-radius: 10px;
          padding: 4px;
        }

        .toggle-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #999;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toggle-btn.active {
          background: #ffffff;
          color: #1a1a1a;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .heatmap-frame-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          background: #1a1a1a;
          overflow: hidden;
        }

        .heatmap-frame {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.3s ease;
        }

        .heatmap-overlay-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .overlay-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: livePulse 1.5s infinite;
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        .overlay-text {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .heatmap-count-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 14px;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .count-number {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          color: #fff;
          line-height: 1;
          letter-spacing: -0.5px;
        }

        .count-label {
          font-family: 'Inter', sans-serif;
          font-size: 9px;
          color: rgba(255,255,255,0.6);
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .heatmap-risk-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          padding: 6px 14px;
          border-radius: 20px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 16px;
          letter-spacing: 2px;
          color: #fff;
          border: 1.5px solid rgba(255,255,255,0.3);
        }

        .no-frame-wrap {
          width: 100%;
          aspect-ratio: 16/9;
          background: #1a1a1a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .no-frame-icon {
          font-size: 48px;
          opacity: 0.3;
        }

        .no-frame-text {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          font-weight: 500;
          letter-spacing: 1px;
        }

        .loading-wrap {
          width: 100%;
          aspect-ratio: 16/9;
          background: #1a1a1a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #c1440e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
          letter-spacing: 1px;
        }

        .scanline {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
          pointer-events: none;
        }

        .heatmap-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: #fdfdf5;
          border-top: 1px solid #f0ede8;
        }

        .footer-info {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #999;
          font-weight: 500;
        }

        .footer-legend {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          color: #666;
          font-weight: 600;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
      `}</style>

      <div className="heatmap-card">
        {/* Header */}
        <div className="heatmap-header">
          <span className="heatmap-title">Detection Feed</span>
          <div className="heatmap-toggle">
            <button
              className={`toggle-btn ${activeView === "annotated" ? "active" : ""}`}
              onClick={() => setActiveView("annotated")}
            >
              Annotated
            </button>
            <button
              className={`toggle-btn ${activeView === "heatmap" ? "active" : ""}`}
              onClick={() => setActiveView("heatmap")}
            >
              Heatmap
            </button>
          </div>
        </div>

        {/* Frame Display */}
        {isLoading ? (
          <div className="loading-wrap">
            <div className="loading-spinner" />
            <span className="loading-text">Processing Frame...</span>
          </div>
        ) : (annotatedFrame || heatmapFrame) ? (
          <div className="heatmap-frame-wrap">
            <img
              className="heatmap-frame"
              src={`data:image/jpeg;base64,${
                activeView === "annotated" ? annotatedFrame : heatmapFrame
              }`}
              alt="Detection Feed"
            />

            {/* Scanline effect */}
            <div className="scanline" />

            {/* Live Badge */}
            <div className="heatmap-overlay-badge">
              <div
                className="overlay-dot"
                style={{ background: riskColor }}
              />
              <span className="overlay-text">Live Detection</span>
            </div>

            {/* People Count */}
            <div className="heatmap-count-badge">
              <span className="count-number">{peopleCount}</span>
              <span className="count-label">People</span>
            </div>

            {/* Risk Badge */}
            <div
              className="heatmap-risk-badge"
              style={{ background: `${riskColor}cc` }}
            >
              {riskLevel?.toUpperCase() || "SAFE"}
            </div>
          </div>
        ) : (
          <div className="no-frame-wrap">
            <div className="no-frame-icon">◉</div>
            <span className="no-frame-text">
              No feed available — Start detection to see frames
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="heatmap-footer">
          <span className="footer-info">
            {activeView === "annotated"
              ? "Bounding boxes drawn around detected persons"
              : "Gaussian density heatmap overlay"}
          </span>
          <div className="footer-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: "#2d6a4f" }} />
              Safe
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: "#e9b44c" }} />
              Warning
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: "#c1440e" }} />
              Danger
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeatmapView;