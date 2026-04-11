import { useState, useEffect } from "react";

// ─── Helpers ───────────────────────────────────────────────

const Section = ({ title, subtitle, children }) => (
  <div style={{
    background: "#fff",
    border: "1px solid #e5e5e0",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20
  }}>
    <div style={{
      padding: "18px 24px",
      borderBottom: "1px solid #f0f0e8",
      background: "#fdfdf5"
    }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{title}</h3>
      {subtitle && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#999" }}>{subtitle}</p>}
    </div>
    <div style={{ padding: 24 }}>{children}</div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 6 }}>
      {label}
    </label>
    {children}
    {hint && <p style={{ margin: "5px 0 0", fontSize: 11, color: "#999" }}>{hint}</p>}
  </div>
);

const Input = ({ value, onChange, type = "text", placeholder }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #e5e5e0",
      borderRadius: 8,
      fontSize: 13,
      fontFamily: "Inter, sans-serif",
      color: "#1a1a1a",
      background: "#fdfdf5",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.2s"
    }}
    onFocus={e => e.target.style.borderColor = "#c1440e"}
    onBlur={e => e.target.style.borderColor = "#e5e5e0"}
  />
);

const Toggle = ({ value, onChange, label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f0f0e8" }}>
    <span style={{ fontSize: 13, color: "#1a1a1a" }}>{label}</span>
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: "pointer",
        background: value ? "#c1440e" : "#e5e5e0",
        position: "relative", transition: "background 0.2s"
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }} />
    </div>
  </div>
);

const SaveBtn = ({ onClick, saved }) => (
  <button
    onClick={onClick}
    style={{
      padding: "10px 24px",
      background: saved ? "#22c55e" : "#c1440e",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "Inter, sans-serif",
      cursor: "pointer",
      transition: "all 0.3s",
      letterSpacing: 0.5
    }}
  >
    {saved ? "✓ Saved" : "Save Changes"}
  </button>
);

// ─── Main Component ────────────────────────────────────────

export default function SettingsPage() {

  const [saved, setSaved] = useState({});

  const save = (key) => {
    setSaved(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000);
    // Persist to localStorage
    localStorage.setItem(`settings_${key}`, JSON.stringify(settings[key]));
  };

  // ── Twilio Settings ──
  const [twilio, setTwilio] = useState({
    account_sid:  "",
    auth_token:   "",
    from_number:  "",
    to_number:    "",
    twiml_url:    "",
    sms_enabled:  true,
    voice_enabled: false,
    cooldown_sms:  120,
    cooldown_voice: 300,
  });

  // ── SMTP Settings ──
  const [smtp, setSmtp] = useState({
    host:         "smtp.gmail.com",
    port:         "587",
    user:         "",
    password:     "",
    from:         "",
    to:           "",
    enabled:      true,
    cooldown:     60,
  });

  // ── Detection Settings ──
  const [detection, setDetection] = useState({
    confidence_threshold: "0.35",
    max_capacity:         "100",
    danger_threshold:     "60",
    warning_threshold:    "20",
    loitering_seconds:    "30",
    smart_frame_skip:     true,
    low_light_enhance:    true,
    deepsort_enabled:     true,
    optical_flow_enabled: true,
  });

  // ── Alert Settings ──
  const [alerts, setAlerts] = useState({
    alert_on_warning:   true,
    alert_on_danger:    true,
    voice_on_danger:    false,
    in_app_alerts:      true,
    alert_sound:        false,
  });

  // ── Camera Settings ──
  const [cameras, setCameras] = useState([
    { id: "CAM_001", label: "Main Entrance", url: "", enabled: true }
  ]);

  const settings = { twilio, smtp, detection, alerts, cameras };

  // Load from localStorage on mount
  useEffect(() => {
    const keys = ["twilio", "smtp", "detection", "alerts", "cameras"];
    const setters = { twilio: setTwilio, smtp: setSmtp, detection: setDetection, alerts: setAlerts, cameras: setCameras };
    keys.forEach(key => {
      const stored = localStorage.getItem(`settings_${key}`);
      if (stored) {
        try { setters[key](JSON.parse(stored)); } catch (_) {}
      }
    });
  }, []);

  const addCamera = () => {
    setCameras(prev => [...prev, {
      id: `CAM_00${prev.length + 1}`,
      label: `Camera ${prev.length + 1}`,
      url: "",
      enabled: true
    }]);
  };

  const removeCamera = (idx) => {
    setCameras(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCamera = (idx, field, value) => {
    setCameras(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const [activeSection, setActiveSection] = useState("detection");

  const navItems = [
    { key: "detection", label: "Detection" },
    { key: "alerts",    label: "Alerts" },
    { key: "twilio",    label: "Twilio" },
    { key: "smtp",      label: "Email (SMTP)" },
    { key: "cameras",   label: "Cameras" },
  ];

  return (
    <div style={{ padding: "88px 24px 40px", background: "#fdfdf5", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, color: "#1a1a1a", margin: 0, lineHeight: 1 }}>
          System <span style={{ color: "#c1440e" }}>Settings</span>
        </h1>
        <p style={{ color: "#999", fontSize: 14, marginTop: 6 }}>
          Configure detection thresholds, alerts, Twilio, SMTP, and cameras
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>

        {/* Sidebar Nav */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e0", borderRadius: 12, overflow: "hidden", position: "sticky", top: 88 }}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              style={{
                display: "block", width: "100%", padding: "14px 18px",
                background: activeSection === item.key ? "#1a1a1a" : "transparent",
                color: activeSection === item.key ? "#fff" : "#666",
                border: "none", borderBottom: "1px solid #f0f0e8",
                fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
                cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                letterSpacing: 0.3
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>

          {/* ── Detection Settings ── */}
          {activeSection === "detection" && (
            <>
              <Section title="Detection Thresholds" subtitle="Control how the YOLO model detects and classifies crowd density">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Confidence Threshold" hint="Min confidence for person detection (0.1 - 1.0)">
                    <Input value={detection.confidence_threshold} onChange={v => setDetection(p => ({ ...p, confidence_threshold: v }))} placeholder="0.35" />
                  </Field>
                  <Field label="Max Capacity" hint="Maximum allowed people in monitored area">
                    <Input value={detection.max_capacity} onChange={v => setDetection(p => ({ ...p, max_capacity: v }))} placeholder="100" type="number" />
                  </Field>
                  <Field label="Danger Threshold" hint="People count above this = danger risk level">
                    <Input value={detection.danger_threshold} onChange={v => setDetection(p => ({ ...p, danger_threshold: v }))} placeholder="60" type="number" />
                  </Field>
                  <Field label="Warning Threshold" hint="People count above this = warning risk level">
                    <Input value={detection.warning_threshold} onChange={v => setDetection(p => ({ ...p, warning_threshold: v }))} placeholder="20" type="number" />
                  </Field>
                  <Field label="Loitering Threshold (seconds)" hint="Time before a stationary person is flagged as loitering">
                    <Input value={detection.loitering_seconds} onChange={v => setDetection(p => ({ ...p, loitering_seconds: v }))} placeholder="30" type="number" />
                  </Field>
                </div>
              </Section>

              <Section title="Detection Features" subtitle="Enable or disable specific detection capabilities">
                <Toggle label="Smart Frame Processing (skip static frames)" value={detection.smart_frame_skip} onChange={v => setDetection(p => ({ ...p, smart_frame_skip: v }))} />
                <Toggle label="Low-Light Enhancement (CLAHE)" value={detection.low_light_enhance} onChange={v => setDetection(p => ({ ...p, low_light_enhance: v }))} />
                <Toggle label="DeepSORT Tracking (entry/exit counting)" value={detection.deepsort_enabled} onChange={v => setDetection(p => ({ ...p, deepsort_enabled: v }))} />
                <Toggle label="Optical Flow Analysis (panic/stampede detection)" value={detection.optical_flow_enabled} onChange={v => setDetection(p => ({ ...p, optical_flow_enabled: v }))} />
              </Section>

              <SaveBtn onClick={() => save("detection")} saved={saved.detection} />
            </>
          )}

          {/* ── Alert Settings ── */}
          {activeSection === "alerts" && (
            <>
              <Section title="Alert Triggers" subtitle="Control when alerts are fired">
                <Toggle label="Send alerts on WARNING risk level" value={alerts.alert_on_warning} onChange={v => setAlerts(p => ({ ...p, alert_on_warning: v }))} />
                <Toggle label="Send alerts on DANGER risk level" value={alerts.alert_on_danger} onChange={v => setAlerts(p => ({ ...p, alert_on_danger: v }))} />
                <Toggle label="Voice call on DANGER (Twilio)" value={alerts.voice_on_danger} onChange={v => setAlerts(p => ({ ...p, voice_on_danger: v }))} />
                <Toggle label="In-app alert banners" value={alerts.in_app_alerts} onChange={v => setAlerts(p => ({ ...p, in_app_alerts: v }))} />
                <Toggle label="Alert sound (browser beep)" value={alerts.alert_sound} onChange={v => setAlerts(p => ({ ...p, alert_sound: v }))} />
              </Section>
              <SaveBtn onClick={() => save("alerts")} saved={saved.alerts} />
            </>
          )}

          {/* ── Twilio Settings ── */}
          {activeSection === "twilio" && (
            <>
              <Section title="Twilio Credentials" subtitle="Configure your Twilio account for SMS and voice alerts — credentials are saved locally only">
                <div style={{
                  background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8,
                  padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#92400e"
                }}>
                  ⚠️ These are saved to your browser only. For production, set them in your backend <code>.env</code> file.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Account SID" hint="Found on your Twilio dashboard">
                    <Input value={twilio.account_sid} onChange={v => setTwilio(p => ({ ...p, account_sid: v }))} placeholder="ACxxxxxxxxxxxxxxx" />
                  </Field>
                  <Field label="Auth Token" hint="Found on your Twilio dashboard">
                    <Input value={twilio.auth_token} onChange={v => setTwilio(p => ({ ...p, auth_token: v }))} placeholder="Your auth token" type="password" />
                  </Field>
                  <Field label="From Number" hint="Your Twilio phone number">
                    <Input value={twilio.from_number} onChange={v => setTwilio(p => ({ ...p, from_number: v }))} placeholder="+1234567890" />
                  </Field>
                  <Field label="To Number" hint="Number to receive alerts">
                    <Input value={twilio.to_number} onChange={v => setTwilio(p => ({ ...p, to_number: v }))} placeholder="+1234567890" />
                  </Field>
                  <Field label="SMS Cooldown (seconds)" hint="Minimum time between SMS alerts">
                    <Input value={twilio.cooldown_sms} onChange={v => setTwilio(p => ({ ...p, cooldown_sms: v }))} type="number" />
                  </Field>
                  <Field label="Voice Cooldown (seconds)" hint="Minimum time between voice calls">
                    <Input value={twilio.cooldown_voice} onChange={v => setTwilio(p => ({ ...p, cooldown_voice: v }))} type="number" />
                  </Field>
                </div>
                <Field label="TwiML Bin URL (optional)" hint="Leave blank to use inline TwiML for voice calls">
                  <Input value={twilio.twiml_url} onChange={v => setTwilio(p => ({ ...p, twiml_url: v }))} placeholder="https://handler.twilio.com/twiml/..." />
                </Field>
              </Section>

              <Section title="Twilio Features">
                <Toggle label="SMS Alerts Enabled" value={twilio.sms_enabled} onChange={v => setTwilio(p => ({ ...p, sms_enabled: v }))} />
                <Toggle label="Voice Call Alerts Enabled (danger only)" value={twilio.voice_enabled} onChange={v => setTwilio(p => ({ ...p, voice_enabled: v }))} />
              </Section>

              {/* Test Alert Button */}
              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("http://localhost:8000/api/detect/alert/test", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: "risk_level=danger&people_count=55&behaviour=overcrowding"
                      });
                      const data = await res.json();
                      alert(data.status === "success" ? "✅ Test alert dispatched! Check your phone/email." : "❌ Failed: " + JSON.stringify(data));
                    } catch (e) {
                      alert("❌ Could not reach backend: " + e.message);
                    }
                  }}
                  style={{
                    padding: "10px 24px", background: "#1a1a1a", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                    fontFamily: "Inter, sans-serif", cursor: "pointer", marginRight: 12
                  }}
                >
                  Send Test Alert
                </button>
                <SaveBtn onClick={() => save("twilio")} saved={saved.twilio} />
              </div>
            </>
          )}

          {/* ── SMTP Settings ── */}
          {activeSection === "smtp" && (
            <>
              <Section title="SMTP / Email Settings" subtitle="Configure Gmail or any SMTP server for email alerts">
                <div style={{
                  background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8,
                  padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#92400e"
                }}>
                  ⚠️ For Gmail, use an <strong>App Password</strong> — not your regular password.
                  Go to: Google Account → Security → 2-Step Verification → App Passwords
                </div>
                <Toggle label="Email Alerts Enabled" value={smtp.enabled} onChange={v => setSmtp(p => ({ ...p, enabled: v }))} />
                <div style={{ height: 16 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="SMTP Host" hint="e.g. smtp.gmail.com">
                    <Input value={smtp.host} onChange={v => setSmtp(p => ({ ...p, host: v }))} placeholder="smtp.gmail.com" />
                  </Field>
                  <Field label="SMTP Port" hint="Usually 587 for TLS">
                    <Input value={smtp.port} onChange={v => setSmtp(p => ({ ...p, port: v }))} placeholder="587" type="number" />
                  </Field>
                  <Field label="Email Username" hint="Your Gmail address">
                    <Input value={smtp.user} onChange={v => setSmtp(p => ({ ...p, user: v }))} placeholder="you@gmail.com" />
                  </Field>
                  <Field label="App Password" hint="16-character Gmail App Password">
                    <Input value={smtp.password} onChange={v => setSmtp(p => ({ ...p, password: v }))} placeholder="xxxx xxxx xxxx xxxx" type="password" />
                  </Field>
                  <Field label="From Address" hint="Sender email address">
                    <Input value={smtp.from} onChange={v => setSmtp(p => ({ ...p, from: v }))} placeholder="you@gmail.com" />
                  </Field>
                  <Field label="To Address" hint="Recipient email address">
                    <Input value={smtp.to} onChange={v => setSmtp(p => ({ ...p, to: v }))} placeholder="alerts@example.com" />
                  </Field>
                  <Field label="Email Cooldown (seconds)" hint="Minimum time between email alerts">
                    <Input value={smtp.cooldown} onChange={v => setSmtp(p => ({ ...p, cooldown: v }))} type="number" />
                  </Field>
                </div>
              </Section>
              <SaveBtn onClick={() => save("smtp")} saved={saved.smtp} />
            </>
          )}

          {/* ── Camera Settings ── */}
          {activeSection === "cameras" && (
            <>
              <Section title="Camera Configuration" subtitle="Add and manage CCTV cameras for multi-camera monitoring">
                {cameras.map((cam, idx) => (
                  <div key={idx} style={{
                    background: "#fdfdf5", border: "1px solid #e5e5e0",
                    borderRadius: 10, padding: 20, marginBottom: 16
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>
                        {cam.label || `Camera ${idx + 1}`}
                      </span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div
                          onClick={() => updateCamera(idx, "enabled", !cam.enabled)}
                          style={{
                            width: 36, height: 20, borderRadius: 10, cursor: "pointer",
                            background: cam.enabled ? "#22c55e" : "#e5e5e0",
                            position: "relative", transition: "background 0.2s"
                          }}
                        >
                          <div style={{
                            position: "absolute", top: 2, left: cam.enabled ? 18 : 2,
                            width: 16, height: 16, borderRadius: "50%",
                            background: "#fff", transition: "left 0.2s"
                          }} />
                        </div>
                        {cameras.length > 1 && (
                          <button
                            onClick={() => removeCamera(idx)}
                            style={{
                              padding: "4px 10px", background: "transparent",
                              border: "1px solid #fecaca", borderRadius: 6,
                              color: "#ef4444", fontSize: 12, fontWeight: 600,
                              cursor: "pointer", fontFamily: "Inter, sans-serif"
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
                      <Field label="Camera ID">
                        <Input value={cam.id} onChange={v => updateCamera(idx, "id", v)} placeholder="CAM_001" />
                      </Field>
                      <Field label="Label">
                        <Input value={cam.label} onChange={v => updateCamera(idx, "label", v)} placeholder="Main Entrance" />
                      </Field>
                      <Field label="Stream URL" hint="RTSP or HTTP stream URL">
                        <Input value={cam.url} onChange={v => updateCamera(idx, "url", v)} placeholder="rtsp://192.168.1.1:554/stream" />
                      </Field>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addCamera}
                  style={{
                    width: "100%", padding: "12px 0",
                    background: "transparent", border: "2px dashed #e5e5e0",
                    borderRadius: 10, color: "#999", fontSize: 13, fontWeight: 600,
                    fontFamily: "Inter, sans-serif", cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = "#c1440e"; e.target.style.color = "#c1440e"; }}
                  onMouseLeave={e => { e.target.style.borderColor = "#e5e5e0"; e.target.style.color = "#999"; }}
                >
                  + Add Camera
                </button>
              </Section>
              <SaveBtn onClick={() => save("cameras")} saved={saved.cameras} />
            </>
          )}

        </div>
      </div>
    </div>
  );
}