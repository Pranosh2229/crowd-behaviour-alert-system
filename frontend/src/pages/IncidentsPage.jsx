import { useState, useEffect } from "react";
import { useLiveData } from "../context/LiveDataContext";

// ─── Helpers ───────────────────────────────────────────────

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
};

const severityColor = (s) => ({
  critical: "#ef4444",
  high:     "#f59e0b",
  medium:   "#f59e0b",
  low:      "#22c55e",
  normal:   "#22c55e",
  danger:   "#ef4444",
  warning:  "#f59e0b",
  safe:     "#22c55e",
}[s] || "#999");

const severityBg = (s) => ({
  critical: "#fef2f2",
  high:     "#fffbeb",
  medium:   "#fffbeb",
  low:      "#f0fdf4",
  normal:   "#f0fdf4",
  danger:   "#fef2f2",
  warning:  "#fffbeb",
  safe:     "#f0fdf4",
}[s] || "#f5f5f5");

// ─── Badge ─────────────────────────────────────────────────

const Badge = ({ label, color, bg }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, padding: "3px 8px",
    borderRadius: 4, background: bg, color,
    textTransform: "uppercase", letterSpacing: 0.5,
    fontFamily: "Inter, sans-serif"
  }}>
    {label}
  </span>
);

// ─── Incident Row ──────────────────────────────────────────

const IncidentRow = ({ incident, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e5e0",
      borderLeft: `3px solid ${severityColor(incident.severity || incident.risk_level)}`,
      borderRadius: 8,
      overflow: "hidden",
      transition: "all 0.2s"
    }}>
      {/* Main row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "14px 18px", cursor: "pointer",
          background: expanded ? "#fdfdf5" : "#fff"
        }}
      >
        {/* Index */}
        <span style={{ fontSize: 11, color: "#ccc", fontWeight: 700, minWidth: 24 }}>
          #{index + 1}
        </span>

        {/* Severity badge */}
        <Badge
          label={incident.severity || incident.risk_level || "unknown"}
          color={severityColor(incident.severity || incident.risk_level)}
          bg={severityBg(incident.severity || incident.risk_level)}
        />

        {/* Behaviour type */}
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", minWidth: 140, textTransform: "capitalize" }}>
          {(incident.type || incident.primary_behaviour || "unknown").replace(/_/g, " ")}
        </span>

        {/* People count */}
        <span style={{ fontSize: 13, color: "#666", minWidth: 80 }}>
          👤 {incident.people_count || incident.people || 0} people
        </span>

        {/* Source */}
        <span style={{ fontSize: 12, color: "#999", minWidth: 70, textTransform: "uppercase" }}>
          {incident.source || "webcam"}
        </span>

        {/* Time */}
        <span style={{ fontSize: 12, color: "#999", marginLeft: "auto" }}>
          {formatTime(incident.timestamp)}
        </span>

        {/* Expand arrow */}
        <span style={{ fontSize: 12, color: "#999", transform: expanded ? "rotate(90deg)" : "none", transition: "0.2s" }}>
          ▶
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "0 18px 16px", borderTop: "1px solid #f0f0e8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
            {[
              ["Risk Level",      incident.risk_level || "N/A"],
              ["Crowd Density",   incident.crowd_density || "N/A"],
              ["Density Score",   incident.density_score ? `${incident.density_score}%` : "N/A"],
              ["Trend",           incident.trend || "N/A"],
              ["Flow Direction",  incident.motion_direction || "N/A"],
              ["Motion",          incident.motion_magnitude ? incident.motion_magnitude.toFixed(2) : "N/A"],
            ].map(([label, val]) => (
              <div key={label} style={{
                background: "#fdfdf5", borderRadius: 6,
                padding: "10px 12px", border: "1px solid #e5e5e0"
              }}>
                <div style={{ fontSize: 10, color: "#999", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", textTransform: "capitalize" }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {incident.recommended_action && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: "#fffbeb", borderRadius: 6,
              border: "1px solid #fcd34d", fontSize: 13, color: "#78350f"
            }}>
              <strong>Recommended Action:</strong> {incident.recommended_action}
            </div>
          )}

          {incident.behaviours && incident.behaviours.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 8 }}>
                Detected Behaviours
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {incident.behaviours.map((b, i) => (
                  <Badge
                    key={i}
                    label={b.type ? b.type.replace(/_/g, " ") : b}
                    color={severityColor(b.severity || "normal")}
                    bg={severityBg(b.severity || "normal")}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────

export default function IncidentsPage() {
  const { liveData } = useLiveData();

  const [incidents, setIncidents]       = useState([]);
  const [filter, setFilter]             = useState("all");
  const [searchText, setSearchText]     = useState("");
  const [totalAlerts, setTotalAlerts]   = useState(0);
  const [dangerCount, setDangerCount]   = useState(0);
  const [warningCount, setWarningCount] = useState(0);

  // ── Capture incidents from live data ──
  useEffect(() => {
    if (!liveData) return;

    const risk = liveData.risk_level;
    if (!risk || risk === "safe") return;

    const behaviour = liveData.behaviour || {};
    const flow      = liveData.optical_flow || {};
    const tracking  = liveData.tracking || {};

    const incident = {
      id:                 Date.now(),
      timestamp:          new Date().toISOString(),
      type:               behaviour.primary_behaviour || "crowd_alert",
      severity:           behaviour.severity || risk,
      risk_level:         risk,
      crowd_density:      liveData.crowd_density,
      people_count:       liveData.people_count,
      density_score:      liveData.density_score,
      trend:              liveData.trend,
      recommended_action: liveData.recommended_action,
      source:             "webcam",
      behaviours:         behaviour.behaviours || [],
      motion_direction:   flow.motion_direction,
      motion_magnitude:   flow.motion_magnitude,
      entry_count:        tracking.entry_count,
      exit_count:         tracking.exit_count,
    };

    setIncidents(prev => {
      // Avoid duplicate entries within 3 seconds
      const last = prev[0];
      if (last && (incident.id - last.id) < 3000 && last.type === incident.type) {
        return prev;
      }
      return [incident, ...prev].slice(0, 200);
    });

    setTotalAlerts(prev => prev + 1);
    if (risk === "danger")  setDangerCount(prev => prev + 1);
    if (risk === "warning") setWarningCount(prev => prev + 1);

  }, [liveData]);

  // ── Filter + search ──
  const filtered = incidents.filter(inc => {
    const matchFilter =
      filter === "all"     ? true :
      filter === "danger"  ? inc.risk_level === "danger" :
      filter === "warning" ? inc.risk_level === "warning" :
      filter === "critical"? inc.severity   === "critical" : true;

    const matchSearch = searchText === "" ||
      (inc.type || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (inc.risk_level || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (inc.recommended_action || "").toLowerCase().includes(searchText.toLowerCase());

    return matchFilter && matchSearch;
  });

  const clearIncidents = () => {
    setIncidents([]);
    setTotalAlerts(0);
    setDangerCount(0);
    setWarningCount(0);
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(incidents, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `incidents_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const headers = ["timestamp", "type", "severity", "risk_level", "people_count",
                     "crowd_density", "density_score", "trend", "source", "recommended_action"];
    const rows = incidents.map(inc =>
      headers.map(h => `"${(inc[h] || "").toString().replace(/"/g, '""')}"`).join(",")
    );
    const csv  = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `incidents_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "88px 24px 40px", background: "#fdfdf5", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, color: "#1a1a1a", margin: 0, lineHeight: 1 }}>
            Incidents <span style={{ color: "#c1440e" }}>Log</span>
          </h1>
          <p style={{ color: "#999", fontSize: 14, marginTop: 6 }}>
            All detected crowd incidents and behaviour events
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={downloadCSV} style={btnStyle("#1a1a1a", "#fff")}>
            ↓ CSV
          </button>
          <button onClick={downloadJSON} style={btnStyle("#1a1a1a", "#fff")}>
            ↓ JSON
          </button>
          <button onClick={clearIncidents} style={btnStyle("#c1440e", "#fff")}>
            Clear All
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          ["Total Alerts",   totalAlerts,  "#c1440e"],
          ["Danger",         dangerCount,  "#ef4444"],
          ["Warning",        warningCount, "#f59e0b"],
          ["Showing",        filtered.length, "#1a1a1a"],
        ].map(([label, val, color]) => (
          <div key={label} style={{
            background: "#fff", border: "1px solid #e5e5e0",
            borderRadius: 12, padding: "18px 22px",
            borderTop: `3px solid ${color}`
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              {label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: "Bebas Neue, sans-serif" }}>
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4, background: "#fff", padding: 5, borderRadius: 10, border: "1px solid #e5e5e0" }}>
          {["all", "danger", "warning", "critical"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 16px", borderRadius: 7, border: "none",
                background: filter === f ? "#1a1a1a" : "transparent",
                color: filter === f ? "#fff" : "#666",
                fontFamily: "Inter, sans-serif", fontSize: 12,
                fontWeight: 600, cursor: "pointer",
                textTransform: "capitalize", transition: "all 0.2s"
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search incidents..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{
            padding: "9px 16px", borderRadius: 8,
            border: "1px solid #e5e5e0", fontSize: 13,
            fontFamily: "Inter, sans-serif", background: "#fff",
            color: "#1a1a1a", outline: "none", minWidth: 220
          }}
        />
      </div>

      {/* Incident List */}
      {filtered.length === 0 ? (
        <div style={{
          background: "#fff", border: "1px solid #e5e5e0",
          borderRadius: 12, padding: "60px 24px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
            {incidents.length === 0 ? "No incidents recorded" : "No incidents match your filter"}
          </div>
          <div style={{ fontSize: 13, color: "#999" }}>
            {incidents.length === 0
              ? "Incidents are recorded automatically when risk level is warning or danger during detection"
              : "Try changing the filter or search term"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((incident, i) => (
            <IncidentRow key={incident.id} incident={incident} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Button style helper ───────────────────────────────────

function btnStyle(bg, color) {
  return {
    padding: "9px 18px", borderRadius: 8, border: "none",
    background: bg, color, fontFamily: "Inter, sans-serif",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    transition: "all 0.2s"
  };
}