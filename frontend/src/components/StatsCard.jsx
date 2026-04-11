import { useEffect, useState } from "react";

const StatsCard = ({ title, value, subtitle, icon, color = "#c1440e", trend, trendValue }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (typeof value === "number") {
      setAnimated(true);
      const start = 0;
      const end = value;
      const duration = 1000;
      const steps = 60;
      const increment = (end - start) / steps;
      let current = start;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.round(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

        .stats-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e8e0d5;
          padding: 22px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          cursor: default;
        }

        .stats-card::after {
          content: '';
          position: absolute;
          bottom: 0; right: 0;
          width: 80px; height: 80px;
          border-radius: 50%;
          background: var(--card-color);
          opacity: 0.06;
          transform: translate(20px, 20px);
          transition: all 0.4s ease;
        }

        .stats-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.1);
          border-color: var(--card-color);
        }

        .stats-card:hover::after {
          width: 120px;
          height: 120px;
          opacity: 0.1;
        }

        .stats-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .stats-icon-wrap {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: var(--card-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 4px 12px var(--card-glow);
          transition: all 0.3s ease;
        }

        .stats-card:hover .stats-icon-wrap {
          transform: scale(1.1) rotate(-5deg);
        }

        .stats-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
        }

        .stats-trend.up {
          background: #f0faf5;
          color: #2d6a4f;
        }

        .stats-trend.down {
          background: #fff5f5;
          color: #c1440e;
        }

        .stats-trend.neutral {
          background: #fffbeb;
          color: #b45309;
        }

        .stats-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 42px;
          color: #1a1a1a;
          line-height: 1;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
          transition: all 0.3s;
        }

        .stats-card:hover .stats-value {
          color: var(--card-color);
        }

        .stats-title {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 2px;
        }

        .stats-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #999;
          font-weight: 500;
        }

        .stats-divider {
          height: 1px;
          background: #f0ede8;
          margin: 14px 0;
        }

        .stats-footer {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stats-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--card-color);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        .stats-footer-text {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #aaa;
          font-weight: 500;
        }
      `}</style>

      <div
        className="stats-card"
        style={{
          "--card-color": color,
          "--card-glow": `${color}33`,
        }}
      >
        {/* Top Row */}
        <div className="stats-card-top">
          <div className="stats-icon-wrap">{icon}</div>
          {trend && (
            <div className={`stats-trend ${trend}`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
              {trendValue && ` ${trendValue}`}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="stats-value">{displayValue}</div>

        {/* Title & Subtitle */}
        <div className="stats-title">{title}</div>
        {subtitle && <div className="stats-subtitle">{subtitle}</div>}

        {/* Divider */}
        <div className="stats-divider" />

        {/* Footer */}
        <div className="stats-footer">
          <div className="stats-dot" />
          <span className="stats-footer-text">Live updating</span>
        </div>
      </div>
    </>
  );
};

export default StatsCard;