import { useState, useEffect } from "react";

const AlertBanner = ({ alertTriggered, riskLevel, recommendedAction, peopleCount }) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (alertTriggered) {
      setDismissed(false);
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [alertTriggered, peopleCount]);

  if (!alertTriggered || dismissed) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

        .alert-overlay {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          width: 90%;
          max-width: 700px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          translate: 0 -20px;
        }

        .alert-overlay.visible {
          opacity: 1;
          translate: 0 0;
        }

        .alert-banner {
          background: #fff5f5;
          border: 1.5px solid #fca5a5;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 8px 32px rgba(193,68,14,0.2);
          position: relative;
          overflow: hidden;
        }

        .alert-banner::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 4px; height: 100%;
          background: #c1440e;
        }

        .alert-banner::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(193,68,14,0.03) 0%,
            transparent 50%,
            rgba(193,68,14,0.03) 100%
          );
          animation: alertSweep 3s infinite;
        }

        @keyframes alertSweep {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }

        .alert-icon-wrap {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #c1440e;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: alertPulse 1s infinite;
          z-index: 1;
        }

        @keyframes alertPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(193,68,14,0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(193,68,14,0);
          }
        }

        .alert-icon {
          font-size: 22px;
          color: #fff;
          font-weight: 800;
          font-family: 'Inter', sans-serif;
        }

        .alert-content {
          flex: 1;
          z-index: 1;
        }

        .alert-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .alert-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          color: #c1440e;
          letter-spacing: 2px;
        }

        .alert-badge {
          padding: 2px 10px;
          background: #c1440e;
          border-radius: 20px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 1px;
          text-transform: uppercase;
          animation: badgeBlink 1s infinite;
        }

        @keyframes badgeBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .alert-message {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: #7f1d1d;
          font-weight: 500;
          line-height: 1.5;
        }

        .alert-action {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #c1440e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .alert-action-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c1440e;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.4); }
        }

        .alert-stats {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          z-index: 1;
          padding: 0 8px;
          border-left: 1px solid #fca5a5;
        }

        .alert-count {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 36px;
          color: #c1440e;
          line-height: 1;
          letter-spacing: -0.5px;
        }

        .alert-count-label {
          font-family: 'Inter', sans-serif;
          font-size: 9px;
          color: #999;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          text-align: center;
        }

        .alert-dismiss {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #fca5a5;
          background: transparent;
          color: #c1440e;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 1;
        }

        .alert-dismiss:hover {
          background: #c1440e;
          color: #fff;
          border-color: #c1440e;
        }

        /* Warning Banner */
        .alert-banner.warning {
          background: #fffbeb;
          border-color: #fcd34d;
          box-shadow: 0 8px 32px rgba(180,83,9,0.15);
        }

        .alert-banner.warning::before {
          background: #e9b44c;
        }

        .alert-banner.warning .alert-icon-wrap {
          background: #e9b44c;
          animation: none;
        }

        .alert-banner.warning .alert-title { color: #b45309; }
        .alert-banner.warning .alert-badge { background: #e9b44c; color: #1a1a1a; }
        .alert-banner.warning .alert-message { color: #78350f; }
        .alert-banner.warning .alert-action { color: #b45309; }
        .alert-banner.warning .alert-action-dot { background: #b45309; }
        .alert-banner.warning .alert-count { color: #b45309; }
        .alert-banner.warning .alert-stats { border-color: #fcd34d; }
        .alert-banner.warning .alert-dismiss { border-color: #fcd34d; color: #b45309; }
        .alert-banner.warning .alert-dismiss:hover { background: #e9b44c; color: #1a1a1a; }
      `}</style>

      <div className={`alert-overlay ${visible ? "visible" : ""}`}>
        <div className={`alert-banner ${riskLevel === "warning" ? "warning" : ""}`}>

          {/* Icon */}
          <div className="alert-icon-wrap">
            <span className="alert-icon">
              {riskLevel === "danger" ? "!" : "⚠"}
            </span>
          </div>

          {/* Content */}
          <div className="alert-content">
            <div className="alert-title-row">
              <span className="alert-title">
                {riskLevel === "danger" ? "Danger Alert" : "Warning Alert"}
              </span>
              <span className="alert-badge">
                {riskLevel === "danger" ? "Critical" : "Warning"}
              </span>
            </div>

            <div className="alert-message">
              {riskLevel === "danger"
                ? `High crowd density detected. Immediate action required.`
                : `Crowd density is reaching warning levels. Monitor closely.`}
            </div>

            {recommendedAction && (
              <div className="alert-action">
                <div className="alert-action-dot" />
                {recommendedAction}
              </div>
            )}
          </div>

          {/* People Count */}
          <div className="alert-stats">
            <div className="alert-count">{peopleCount}</div>
            <div className="alert-count-label">People<br />Detected</div>
          </div>

          {/* Dismiss */}
          <button
            className="alert-dismiss"
            onClick={() => setDismissed(true)}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
};

export default AlertBanner;