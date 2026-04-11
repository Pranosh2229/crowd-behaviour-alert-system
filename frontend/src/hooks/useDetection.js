import { useState, useRef, useCallback, useEffect } from "react";
import { useLiveData } from "../context/LiveDataContext.jsx";
import { detectVideo, detectCCTV } from "../api/crowdApi";

// ─── Video Upload Hook ─────────────────────────────────────
export const useWebcamDetection = () => {
  // ✅ Webcam now lives in context — just proxy it here
  const {
    videoRef,
    canvasRef,
    isDetecting,
    webcamError,
    fps,
    startWebcam,
    stopWebcam,
    liveData,
  } = useLiveData();

  return {
    videoRef,
    canvasRef,
    isDetecting,
    error     : webcamError,
    fps,
    result    : liveData,
    startDetection: startWebcam,
    stopDetection : stopWebcam,
  };
};

// ─── Video Upload Hook ─────────────────────────────────────
export const useVideoDetection = () => {
  const { updateLiveData, resetLiveData, setActiveSource } = useLiveData();

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);
  const [progress, setProgress]         = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  const startProcessing = useCallback(async () => {
    if (!selectedFile) {
      setError("Please select a video file first");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setActiveSource("video");

    try {
      const data   = await detectVideo(selectedFile, (percent) => setProgress(percent));
      const result = data?.data || data;
      setResult(result);
      updateLiveData(result, "video");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, updateLiveData, setActiveSource]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
    setSelectedFile(null);
    resetLiveData();
  }, [resetLiveData]);

  return {
    isProcessing,
    result,
    error,
    progress,
    selectedFile,
    handleFileSelect,
    startProcessing,
    reset,
  };
};

// ─── CCTV Hook ─────────────────────────────────────────────
export const useCCTVDetection = () => {
  const { updateLiveData, resetLiveData, setActiveSource } = useLiveData();

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);
  const [cameraId, setCameraId]         = useState("CAM_001");
  const [streamUrl, setStreamUrl]       = useState("");

  const intervalRef = useRef(null);
  const isRunning   = useRef(false);

  const startMonitoring = useCallback(async () => {
    if (!cameraId || !streamUrl) {
      setError("Please enter camera ID and stream URL");
      return;
    }

    isRunning.current = true;
    setIsMonitoring(true);
    setError(null);
    setActiveSource("cctv");

    const fetchFrame = async () => {
      if (!isRunning.current) return;
      try {
        const response = await detectCCTV(cameraId, streamUrl);
        const data     = response?.data || response;
        setResult(data);
        setError(null);
        updateLiveData(data, `cctv_${cameraId}`);
      } catch (err) {
        setError(err.message);
      }
    };

    await fetchFrame();
    intervalRef.current = setInterval(fetchFrame, 5000);
  }, [cameraId, streamUrl, updateLiveData, setActiveSource]);

  const stopMonitoring = useCallback(() => {
    isRunning.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsMonitoring(false);
    resetLiveData();
  }, [resetLiveData]);

  useEffect(() => {
    return () => {
      isRunning.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    isMonitoring,
    result,
    error,
    cameraId,
    streamUrl,
    setCameraId,
    setStreamUrl,
    startMonitoring,
    stopMonitoring,
  };
};

// ─── System Status Hook ────────────────────────────────────
export const useSystemStatus = () => {
  const { systemStats, fetchSystemStats, alertHistory } = useLiveData();
  return {
    health      : systemStats.health,
    statistics  : systemStats.statistics,
    alertHistory: alertHistory,
    modelStatus : systemStats.modelStatus,
    isOnline    : systemStats.isOnline,
    fetchStatus : fetchSystemStats,
  };
};