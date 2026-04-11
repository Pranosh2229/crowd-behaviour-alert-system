import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { checkHealth } from "../api/crowdApi";

const Navbar = () => {
  const [isOnline, setIsOnline]     = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [menuOpen, setMenuOpen]     = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkStatus = async () => {
      try { await checkHealth(); setIsOnline(true); }
      catch { setIsOnline(false); }
    };
    checkStatus();
    const statusInterval = setInterval(checkStatus, 30000);
    const timeInterval   = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearInterval(statusInterval); clearInterval(timeInterval); };
  }, []);

  const navItems = [
    { path: "/",          label: "Dashboard",  icon: "⊞" },
    { path: "/webcam",    label: "Webcam",     icon: "◉" },
    { path: "/video",     label: "Video",      icon: "▶" },
    { path: "/cctv",      label: "CCTV",       icon: "⊕" },
    { path: "/analytics", label: "Analytics",  icon: "📊" },
    { path: "/incidents", label: "Incidents",  icon: "🚨" },
    { path: "/settings",  label: "Settings",   icon: "⚙" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');

        .navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 68px;
          background: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 1000;
          box-shadow: 0 2px 0px #c1440e;
        }

        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          text-decoration: none;
        }

        .logo-icon {
          width: 42px; height: 42px;
          background: #c1440e;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .logo-icon::after {
          content: '';
          position: absolute;
          top: -50%; left: -50%;
          width: 200%; height: 200%;
          background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
          animation: sheen 3s infinite;
        }

        @keyframes sheen {
          0%   { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%)  rotate(45deg); }
        }

        .logo-letters {
          color: #fff;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px;
          letter-spacing: 1px;
          z-index: 1;
        }

        .logo-text-wrap { display: flex; flex-direction: column; }

        .logo-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          color: #fdfdf5;
          letter-spacing: 2px;
          line-height: 1;
        }

        .logo-sub {
          font-size: 9px;
          color: #e9b44c;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .nav-items {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #aaa;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          position: relative;
        }

        .nav-btn::before {
          content: '';
          position: absolute;
          bottom: 0; left: 50%; right: 50%;
          height: 2px;
          background: #c1440e;
          transition: all 0.3s ease;
        }

        .nav-btn:hover { color: #fdfdf5; background: rgba(255,255,255,0.06); }
        .nav-btn:hover::before { left: 10%; right: 10%; }

        .nav-btn.active { color: #fdfdf5; background: #c1440e; }
        .nav-btn.active::before { display: none; }

        .right-side { display: flex; align-items: center; gap: 16px; }

        .time-box { text-align: right; }

        .time-text {
          font-size: 15px;
          font-weight: 700;
          color: #fdfdf5;
          font-variant-numeric: tabular-nums;
          letter-spacing: 1px;
        }

        .date-text {
          font-size: 10px;
          color: #e9b44c;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          background: rgba(255,255,255,0.06);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
        }

        .status-dot.online  { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.8); animation: blink 2s infinite; }
        .status-dot.offline { background: #c1440e; box-shadow: 0 0 8px rgba(193,68,14,0.8); }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        .status-text { font-size: 12px; font-weight: 600; color: #fdfdf5; }

        .menu-btn {
          display: none;
          background: none;
          border: none;
          color: #fdfdf5;
          font-size: 22px;
          cursor: pointer;
        }

        .mobile-menu {
          position: absolute;
          top: 68px; left: 0; right: 0;
          background: #1a1a1a;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .mobile-nav-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #aaa;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          text-decoration: none;
          transition: all 0.2s;
        }

        .mobile-nav-btn:hover  { color: #fdfdf5; background: rgba(255,255,255,0.06); }
        .mobile-nav-btn.active { background: #c1440e; color: #fff; }

        @media (max-width: 900px) {
          .nav-items { display: none; }
          .menu-btn  { display: block; }
          .time-box  { display: none; }
        }
      `}</style>

      <nav className="navbar">
        {/* Logo */}
        <Link to="/" className="logo-wrap">
          <div className="logo-icon">
            <span className="logo-letters">CB</span>
          </div>
          <div className="logo-text-wrap">
            <div className="logo-title">CrowdAlert</div>
            <div className="logo-sub">Behaviour Monitor</div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="nav-items">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-btn ${location.pathname === item.path ? "active" : ""}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="right-side">
          <div className="time-box">
            <div className="time-text">{currentTime.toLocaleTimeString()}</div>
            <div className="date-text">
              {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
          <div className="status-badge">
            <div className={`status-dot ${isOnline ? "online" : "offline"}`} />
            <span className="status-text">{isOnline ? "System Online" : "Offline"}</span>
          </div>
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="mobile-menu">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-btn ${location.pathname === item.path ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;