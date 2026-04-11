from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from services.report_service import generate_report, generate_csv_string
from datetime import datetime
import io
import os

router = APIRouter()

# ─── Generate + Download PDF Report ───────────────────────

@router.post("/reports/generate")
async def generate_detection_report(request: dict):
    """
    Accepts detection result data and returns a downloadable PDF or CSV report.
    Pass the full detection result from /detect/webcam, /detect/video, or /detect/cctv.
    """
    try:
        report_format = request.get("format", "pdf")
        report_data   = request.get("data", {})

        if not report_data:
            raise HTTPException(status_code=400, detail="No report data provided")

        result = generate_report(report_data, report_format=report_format)

        if not result["success"]:
            raise HTTPException(status_code=500, detail="Report generation failed")

        file_path = result["file_path"]
        filename  = result["filename"]
        mime_type = result["mime_type"]

        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail="Report file not found after generation")

        return FileResponse(
            path=file_path,
            media_type=mime_type,
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Report-Format": report_format,
                "X-File-Size-KB": str(result["file_size_kb"]),
                "X-Generated-At": result["generated_at"]
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


# ─── Quick CSV Download (streaming) ───────────────────────

@router.post("/reports/csv")
async def download_csv_report(request: dict):
    """
    Fast CSV download — streams CSV directly without writing to disk.
    """
    try:
        report_data = request.get("data", {})

        if not report_data:
            raise HTTPException(status_code=400, detail="No report data provided")

        csv_string = generate_csv_string(report_data)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"crowd_report_{ts}.csv"

        return StreamingResponse(
            io.StringIO(csv_string),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV generation failed: {str(e)}")


# ─── Report Info ───────────────────────────────────────────

@router.get("/reports/formats")
async def get_report_formats():
    """Returns available report formats and what data they include."""
    return {
        "status": "success",
        "data": {
            "formats": [
                {
                    "format": "pdf",
                    "label": "PDF Report",
                    "description": "Styled PDF with summary, behaviour analysis, flow data, tracking, and frame-by-frame tables",
                    "mime_type": "application/pdf",
                    "endpoint": "/api/reports/generate"
                },
                {
                    "format": "csv",
                    "label": "CSV Export",
                    "description": "Full CSV export of all detection data including frame-by-frame analysis",
                    "mime_type": "text/csv",
                    "endpoint": "/api/reports/csv"
                }
            ]
        }
    }