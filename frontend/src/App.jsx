import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useLiveData } from "./context/LiveDataContext.jsx";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import WebcamDetection from "./pages/WebcamDetection";
import VideoUpload from "./pages/VideoUpload";
import CCTVMonitor from "./pages/CCTVMonitor";
import AnalyticsPage from "./pages/AnalyticsPage";
import IncidentsPage from "./pages/IncidentsPage";
import SettingsPage from "./pages/SettingsPage";

// ── Persistent hidden video element ───────────────────────
// Stays mounted at root so the stream survives page navigation.
// Uses visibility:hidden + size 1px instead of display:none
// because display:none prevents the video from actually rendering
// the stream, causing the black screen on the webcam page.
const PersistentVideo = () => {
  const { videoRef } = useLiveData();

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position:     "fixed",
        top:          0,
        left:         0,
        width:        "1px",
        height:       "1px",
        opacity:      0,
        pointerEvents:"none",
        zIndex:       -1,
        // ✅ visibility:hidden keeps the video rendering in the browser
        // so the stream stays alive — display:none kills it
        visibility:   "hidden",
      }}
    />
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <PersistentVideo />
      <Navbar />
      <Routes>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/webcam"    element={<WebcamDetection />} />
        <Route path="/video"     element={<VideoUpload />} />
        <Route path="/cctv"      element={<CCTVMonitor />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;