# crowd-behaviour-alert-system
# Crowd Behaviour Alert System

A real-time intelligent monitoring system that detects crowd density and abnormal behavior using computer vision and AI models. It is designed for public safety, surveillance, and smart city applications.

---

## Features

* Real-time crowd monitoring via webcam or video upload
* Crowd density detection and risk analysis
* Automated alert generation for abnormal situations
* Analytics dashboard with visual insights
* Heatmap visualization of crowd activity
* Fast backend powered by Python
* Modern frontend built with React

---

## Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Vite

### Backend

* Python
* FastAPI

### AI / ML

* YOLOv8 (Object Detection)

### Database

* SQLite

---

## Project Structure

```
crowd-behaviour-alert-system/
│
├── backend/
│   ├── main.py
│   ├── routes/
│   ├── services/
│   ├── models/
│   └── utils/
│
├── frontend/
│   ├── src/
│   ├── components/
│   └── pages/
│
└── README.md
```

---

## Installation and Setup

### 1. Clone the repository

```
git clone https://github.com/Pranosh2229/crowd-behaviour-alert-system.git
cd crowd-behaviour-alert-system
```

---

### 2. Backend setup

```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

### 3. Frontend setup

```
cd frontend
npm install
npm run dev
```

---

## Usage

* Open the frontend in your browser
* Connect to the backend server
* Upload video or use webcam for live detection
* Monitor alerts and analytics in real time

---

## Future Improvements

* Deployment on cloud platforms
* Multi-camera integration
* Improved AI accuracy with custom training
* Mobile application support

---

## Author

Pranosh
