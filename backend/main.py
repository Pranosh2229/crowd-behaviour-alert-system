from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import system, detect
from database import init_db
import uvicorn

app = FastAPI(
    title="Crowd Behaviour Alert System",
    description="AI-powered crowd monitoring and alert system using YOLO + OpenCV",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router, prefix="/api")
app.include_router(detect.router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "Crowd Behaviour Alert System is running",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/system/health"
    }

@app.on_event("startup")
async def startup_event():
    init_db()
    print("=" * 50)
    print("Crowd Behaviour Alert System Starting...")
    print("YOLO Model will load on first detection request")
    print("API Docs available at: http://localhost:8000/docs")
    print("=" * 50)

@app.on_event("shutdown")
async def shutdown_event():
    print("Crowd Behaviour Alert System shutting down...")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )