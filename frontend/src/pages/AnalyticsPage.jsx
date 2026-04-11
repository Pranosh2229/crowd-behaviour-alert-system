import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useLiveData } from "../context/LiveDataContext";

// ─── Helpers ───────────────────────────────────────────────

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const formatTimeShort = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const riskColor = (risk) => ({
  safe:    "#22c55e",
  warning: "#f59e0b",
  danger:  "#ef4444"
}[risk] || "#22c55e");

// ─── Custom Tooltip ────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e5e0",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 12,
      fontFamily: "Inter, sans-serif",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
    }}>
      <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#1a1a1a" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0", color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ─────────────────────────────────────────────

const StatCard = ({ title, value, sub, color = "#1a1a1a", accent = "#c1440e" }) => (
  <div style={{
    background: "#fff",
    border: "1px solid #e5e5e0",
    borderRadius: 12,
    padding: "20px 24px",
    borderTop: `3px solid ${accent}`
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
      {title}
    </div>
    <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "Bebas Neue, sans-serif", lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>{sub}</div>}
  </div>
);

// ─── Main Component ────────────────────────────────────────

export default function AnalyticsPage() {
  const { liveData } = useLiveData();

  const [timeline, setTimeline]       = useState([]);
  const [entryExit, setEntryExit]     = useState([]);
  const [behaviourLog, setBehaviourLog] = useState([]);
  const [peakHour, setPeakHour]       = useState(null);
  const [totalDetections, setTotalDetections] = useState(0);
  const [maxPeople, setMaxPeople]     = useState(0);
  const [avgPeople, setAvgPeople]     = useState(0);
  const [activeTab, setActiveTab]     = useState("timeline");

  // ── Update analytics from live data ──
  useEffect(() => {
    if (!liveData || !liveData.people_count) return;

    const now = new Date().toISOString();
    const point = {
      time:         formatTimeShort(now),
      timestamp:    now,
      people:       liveData.people_count,
      density_score: liveData.density_score || 0,
      risk:         liveData.risk_level || "safe",
    };

    setTimeline(prev => {
      const updated = [...prev, point].slice(-60); // keep last 60 points
      return updated;
    });

    setEntryExit(prev => {
      const tracking = liveData.tracking || {};
      const point2 = {
        time:    formatTimeShort(now),
        entries: tracking.entry_count || 0,
        exits:   tracking.exit_count  || 0,
      };
      return [...prev, point2].slice(-60);
    });

    setTotalDetections(prev => prev + 1);

    setMaxPeople(prev => Math.max(prev, liveData.people_count));

    setAvgPeople(prev => {
      if (prev === 0) return liveData.people_count;
      return Math.round((prev + liveData.people_count) / 2);
    });

    // Behaviour log
    const behaviour = liveData.behaviour;
    if (behaviour && behaviour.primary_behaviour !== "normal") {
      setBehaviourLog(prev => [{
        time:      formatTime(now),
        type:      behaviour.primary_behaviour,
        severity:  behaviour.severity,
        people:    liveData.people_count,
        risk:      liveData.risk_level
      }, ...prev].slice(0, 50));
    }

    // Peak hour tracking
    const hour = new Date().getHours();
    setPeakHour(prev => {
      if (!prev || liveData.people_count > prev.count) {
        return { hour: `${hour}:00`, count: liveData.people_count };
      }
      return prev;
    });

  }, [liveData]);

  const clearData = useCallback(() => {
    setTimeline([]);
    setEntryExit([]);
    setBehaviourLog([]);
    setPeakHour(null);
    setTotalDetections(0);
    setMaxPeople(0);
    setAvgPeople(0);
  }, []);

  // ── Behaviour distribution for bar chart ──
  const behaviourCounts = behaviourLog.reduce((acc, b) => {
    acc[b.type] = (acc[b.type] || 0) + 1;
    return acc;
  }, {});
  const behaviourChartData = Object.entries(behaviourCounts).map(([type, count]) => ({
    type: type.replace(/_/g, " "),
    count
  }));

  const tabs = ["timeline", "entry/exit", "behaviour", "raw"];

  return (
    <div style={{ padding: "88px 24px 40px", background: "#fdfdf5", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, color: "#1a1a1a", margin: 0, lineHeight: 1 }}>
          Analytics <span style={{ color: "#c1440e" }}>Dashboard</span>
        </h1>
        <p style={{ color: "#999", fontSize: 14, marginTop: 6 }}>
          Real-time crowd analytics — data updates live during detection
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard
          title="Total Detections"
          value={totalDetections}
          sub="Frames processed"
          accent="#c1440e"
        />
        <StatCard
          title="Peak Count"
          value={maxPeople}
          sub="Highest in session"
          accent="#ef4444"
          color="#ef4444"
        />
        <StatCard
          title="Avg People"
          value={avgPeople}
          sub="Session average"
          accent="#f59e0b"
          color="#f59e0b"
        />
        <StatCard
          title="Peak Hour"
          value={peakHour ? peakHour.hour : "--:--"}
          sub={peakHour ? `${peakHour.count} people` : "No data yet"}
          accent="#22c55e"
          color="#22c55e"
        />
      </div>

      {/* Live Status Bar */}
      {liveData && liveData.people_count > 0 && (
        <div style={{
          background: "#fff",
          border: "1px solid #e5e5e0",
          borderRadius: 12,
          padding: "14px 20px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>LIVE</span>
          </div>
          {[
            ["People", liveData.people_count],
            ["Risk", (liveData.risk_level || "safe").toUpperCase()],
            ["Density", `${liveData.density_score || 0}%`],
            ["Trend", (liveData.trend || "stable").toUpperCase()],
            ["Flow", liveData.optical_flow?.motion_direction || "N/A"],
            ["Behaviour", (liveData.behaviour?.primary_behaviour || "normal").replace(/_/g, " ")],
          ].map(([label, val]) => (
            <div key={label} style={{ fontSize: 13 }}>
              <span style={{ color: "#999" }}>{label}: </span>
              <span style={{ fontWeight: 700, color: label === "Risk" ? riskColor(liveData.risk_level) : "#1a1a1a" }}>
                {val}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#fff", padding: 6, borderRadius: 10, border: "1px solid #e5e5e0", width: "fit-content" }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px",
              borderRadius: 7,
              border: "none",
              background: activeTab === tab ? "#1a1a1a" : "transparent",
              color: activeTab === tab ? "#fff" : "#666",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.2s"
            }}
          >
            {tab}
          </button>
        ))}
        <button
          onClick={clearData}
          style={{
            marginLeft: 8,
            padding: "8px 18px",
            borderRadius: 7,
            border: "1px solid #e5e5e0",
            background: "transparent",
            color: "#c1440e",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Clear
        </button>
      </div>

      {/* ── Timeline Tab ── */}
      {activeTab === "timeline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* People Count Timeline */}
          <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
              People Count Over Time
            </h3>
            {timeline.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14 }}>
                Start detection to see live data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="peopleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c1440e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#c1440e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#999" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#999" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="people" stroke="#c1440e" strokeWidth={2}
                    fill="url(#peopleGrad)" name="People" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Density Score Timeline */}
          <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
              Density Score Over Time
            </h3>
            {timeline.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14 }}>
                Start detection to see live data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#999" }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#999" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="density_score" stroke="#f59e0b" strokeWidth={2}
                    name="Density %" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── Entry/Exit Tab ── */}
      {activeTab === "entry/exit" && (
        <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
            Entry / Exit Counter
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: 12, color: "#999" }}>
            Powered by DeepSORT persistent tracking — requires tracking to be active
          </p>

          {/* Current entry/exit stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            {[
              ["Total Entries", liveData?.tracking?.entry_count || 0, "#22c55e"],
              ["Total Exits",   liveData?.tracking?.exit_count  || 0, "#ef4444"],
              ["Currently Inside", Math.max(0, (liveData?.tracking?.entry_count || 0) - (liveData?.tracking?.exit_count || 0)), "#c1440e"],
            ].map(([label, val, color]) => (
              <div key={label} style={{
                background: "#fdfdf5",
                border: "1px solid #e5e5e0",
                borderRadius: 10,
                padding: "16px 20px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "Bebas Neue, sans-serif" }}>{val}</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {entryExit.length === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14 }}>
              Start detection to see entry/exit data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={entryExit}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#999" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#999" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="entries" fill="#22c55e" name="Entries" radius={[4, 4, 0, 0]} />
                <Bar dataKey="exits"   fill="#ef4444" name="Exits"   radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Behaviour Tab ── */}
      {activeTab === "behaviour" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Behaviour distribution chart */}
          <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
              Behaviour Distribution
            </h3>
            {behaviourChartData.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 14 }}>
                No behaviour events detected yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={behaviourChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0e8" />
                  <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#999" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#999" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#c1440e" name="Events" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Behaviour event log */}
          <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
              Behaviour Event Log
            </h3>
            {behaviourLog.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#999", fontSize: 14 }}>
                No behaviour events detected yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
                {behaviourLog.map((b, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: "#fdfdf5",
                    borderRadius: 8,
                    border: "1px solid #e5e5e0",
                    fontSize: 13
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: { critical: "#ef4444", high: "#f59e0b", medium: "#f59e0b", low: "#22c55e", normal: "#22c55e" }[b.severity] || "#999"
                    }} />
                    <span style={{ color: "#999", fontSize: 11, minWidth: 70 }}>{b.time}</span>
                    <span style={{ fontWeight: 700, color: "#1a1a1a", textTransform: "capitalize", minWidth: 120 }}>
                      {b.type.replace(/_/g, " ")}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                      background: { critical: "#fef2f2", high: "#fffbeb", medium: "#fffbeb", low: "#f0fdf4", normal: "#f0fdf4" }[b.severity] || "#f5f5f5",
                      color: { critical: "#ef4444", high: "#f59e0b", medium: "#f59e0b", low: "#22c55e", normal: "#22c55e" }[b.severity] || "#999"
                    }}>
                      {b.severity.toUpperCase()}
                    </span>
                    <span style={{ color: "#666", marginLeft: "auto" }}>{b.people} people</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Raw Data Tab ── */}
      {activeTab === "raw" && (
        <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
            Raw Live Data
          </h3>
          <pre style={{
            background: "#1a1a1a",
            color: "#22c55e",
            padding: 20,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "monospace",
            overflowX: "auto",
            maxHeight: 500,
            overflowY: "auto",
            lineHeight: 1.6
          }}>
            {JSON.stringify(liveData, null, 2)}
          </pre>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 1024px) {
          .analytics-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .analytics-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}