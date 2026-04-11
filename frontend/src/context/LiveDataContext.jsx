import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { checkHealth, getStatistics, getAlertHistory, getModelStatus, detectWebcam } from "../api/crowdApi";

const LiveDataContext = createContext(null);

export const LiveDataProvider = ({ children }) => {

  const [liveData, setLiveData] = useState({
    people_count      : 0,
    crowd_density     : "low",
    risk_level        : "safe",
    alert_triggered   : false,
    density_score     : 0,
    trend             : "stable",
    recommended_action: "No action needed.",
    severity_color    : "#22c55e",
    area_coverage     : "< 25%",
    annotated_frame   : null,
    heatmap_frame     : null,
    detections        : [],
    behaviour         : "normal",
    flow_direction    : "stable",
    entry_count       : 0,
    exit_count        : 0,
    processing_time_ms: 0,
    timestamp         : null,
    source            : null,
  });

  const [systemStats, setSystemStats] = useState({
    health     : null,
    statistics : null,
    modelStatus: null,
    isOnline   : false,
  });

  const [alertHistory, setAlertHistory] = useState([]);
  const [activeSource, setActiveSource] = useState(null);
  const [isDetecting, setIsDetecting]   = useState(false);
  const [webcamError, setWebcamError]   = useState(null);
  const [fps, setFps]                   = useState(0);

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const intervalRef   = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsTime   = useRef(Date.now());
  const isRunning     = useRef(false);
  const pollRef       = useRef(null);

  const updateLiveData = useCallback((data, source) => {
    setLiveData(prev => ({
      ...prev,
      ...data,
      source,
      timestamp: new Date().toISOString(),
    }));
    if (data.risk_level === "danger" || data.risk_level === "warning") {
      setAlertHistory(prev => [{
        timestamp   : new Date().toISOString(),
        risk_level  : data.risk_level,
        people_count: data.people_count,
        source,
        behaviour   : data.behaviour || "normal",
      }, ...prev].slice(0, 100));
    }
  }, []);

  const resetLiveData = useCallback(() => {
    setLiveData({
      people_count      : 0,
      crowd_density     : "low",
      risk_level        : "safe",
      alert_triggered   : false,
      density_score     : 0,
      trend             : "stable",
      recommended_action: "No action needed.",
      severity_color    : "#22c55e",
      area_coverage     : "< 25%",
      annotated_frame   : null,
      heatmap_frame     : null,
      detections        : [],
      behaviour         : "normal",
      flow_direction    : "stable",
      entry_count       : 0,
      exit_count        : 0,
      processing_time_ms: 0,
      timestamp         : null,
      source            : null,
    });
    setActiveSource(null);
  }, []);

  const captureAndDetect = useCallback(async () => {
    if (!isRunning.current) return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;
    if (video.videoWidth === 0 || video.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const frameData = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];

    try {
      const response = await detectWebcam(frameData, new Date().toISOString());
      const data     = response?.data || response;
      setWebcamError(null);
      updateLiveData(data, "webcam");

      frameCountRef.current += 1;
      const now     = Date.now();
      const elapsed = (now - lastFpsTime.current) / 1000;
      if (elapsed >= 1) {
        setFps(Math.round(frameCountRef.current / elapsed));
        frameCountRef.current = 0;
        lastFpsTime.current   = now;
      }
    } catch (err) {
      setWebcamError(err.message);
    }
  }, [updateLiveData]);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      isRunning.current = true;
      setIsDetecting(true);
      setWebcamError(null);
      setActiveSource("webcam");
      intervalRef.current = setInterval(captureAndDetect, 1000);
    } catch (err) {
      setWebcamError("Could not access webcam: " + err.message);
    }
  }, [captureAndDetect]);

  const stopWebcam = useCallback(() => {
    isRunning.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsDetecting(false);
    setFps(0);
    resetLiveData();
  }, [resetLiveData]);

  const fetchSystemStats = useCallback(async () => {
    try {
      const [health, stats, alerts, model] = await Promise.all([
        checkHealth(),
        getStatistics(),
        getAlertHistory(),
        getModelStatus(),
      ]);
      setSystemStats({
        health,
        statistics : stats,
        modelStatus: model,
        isOnline   : true,
      });
      if (alerts?.alerts) {
        setAlertHistory(prev => [...alerts.alerts, ...prev].slice(0, 100));
      }
    } catch {
      setSystemStats(prev => ({ ...prev, isOnline: false }));
    }
  }, []);

  useEffect(() => {
    fetchSystemStats();
    pollRef.current = setInterval(fetchSystemStats, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchSystemStats]);

  return (
    <LiveDataContext.Provider value={{
      liveData,
      updateLiveData,
      resetLiveData,
      activeSource,
      setActiveSource,
      systemStats,
      fetchSystemStats,
      alertHistory,
      setAlertHistory,
      videoRef,
      canvasRef,
      isDetecting,
      webcamError,
      fps,
      startWebcam,
      stopWebcam,
    }}>
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => {
  const ctx = useContext(LiveDataContext);
  if (!ctx) throw new Error("useLiveData must be used inside LiveDataProvider");
  return ctx;
};