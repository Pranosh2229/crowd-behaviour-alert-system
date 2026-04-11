import axios from "axios";

const BASE_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// ─── Health Check ──────────────────────────────────────────
export const checkHealth = async () => {
  const response = await api.get("/system/health");
  return response.data;
};

export const getSystemInfo = async () => {
  const response = await api.get("/system/info");
  return response.data;
};

export const getAlertHistory = async () => {
  const response = await api.get("/system/alerts");
  return response.data;
};

export const getStatistics = async () => {
  const response = await api.get("/system/statistics");
  return response.data;
};

// ─── Webcam Detection ──────────────────────────────────────
export const detectWebcam = async (frameData, timestamp) => {
  const response = await api.post("/detect/webcam", {
    frame_data: frameData,
    timestamp: timestamp || new Date().toISOString(),
  });
  return response.data?.data ?? response.data;
};

// ─── Video Upload Detection ────────────────────────────────
export const detectVideo = async (videoFile, onProgress) => {
  const formData = new FormData();
  formData.append("video_file", videoFile);
  formData.append("analysis_mode", "density");

  const response = await api.post("/detect/video", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percent);
      }
    },
    timeout: 120000, // 2 minutes for video
  });
  return response.data?.data ?? response.data;
};

// ─── CCTV Detection ────────────────────────────────────────
export const detectCCTV = async (cameraId, streamUrl) => {
  const response = await api.post("/detect/cctv", {
    camera_id: cameraId,
    stream_url: streamUrl,
  });
  return response.data?.data ?? response.data;
};

// ─── Model Status ──────────────────────────────────────────
export const getModelStatus = async () => {
  const response = await api.get("/detect/model/status");
  return response.data;
};

export const testDetection = async () => {
  const response = await api.get("/detect/test");
  return response.data;
};

// ─── Error Handler ─────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.data);
      throw new Error(error.response.data.detail || "API request failed");
    } else if (error.request) {
      throw new Error("Cannot connect to server. Is the backend running?");
    } else {
      throw new Error(error.message);
    }
  }
);