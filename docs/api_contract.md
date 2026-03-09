Crowd Behaviour Alert System

API Contract (Must Never Change)

This API contract defines the communication between the frontend and backend.
All generated code must follow these endpoints, request formats, and response structures exactly.
Do not rename endpoints or variables.

---

API Endpoints

POST /api/detect/webcam
POST /api/detect/video
POST /api/detect/cctv
GET /api/system/health

---

Request Structures

Webcam Detection

POST /api/detect/webcam

Request Body
{
"frame_data": "base64_encoded_image",
"timestamp": "ISO_time"
}

---

Video Upload Detection

POST /api/detect/video

Request Body
{
"video_file": "video_binary",
"analysis_mode": "density"
}

---

CCTV Detection

POST /api/detect/cctv

Request Body
{
"camera_id": "string",
"stream_url": "rtsp_or_http_url"
}

---

Standard Response Structure

All detection APIs must return the following JSON format.

{
"status": "success",
"data": {
"people_count": 0,
"crowd_density": "low",
"risk_level": "safe",
"alert_triggered": false
}
}

---

Variable Names That Must Never Change

status
data
people_count
crowd_density
risk_level
alert_triggered
frame_data
timestamp
video_file
analysis_mode
camera_id
stream_url

---

Allowed Values

crowd_density

- low
- medium
- high

risk_level

- safe
- warning
- danger

---

Health Check API

GET /api/system/health

Response

{
"status": "running",
"service": "crowd-behaviour-alert-system"
}

---

Rules

1. Endpoints must never be renamed.
2. Request variable names must never change.
3. Response variable names must never change.
4. Backend may use any internal variables but must return the exact response structure.
5. Frontend must only read the defined response fields.
6. All APIs must return JSON.
