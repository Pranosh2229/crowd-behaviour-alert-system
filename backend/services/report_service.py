import os
import csv
import io
import tempfile
from datetime import datetime
from typing import Optional

# ─── PDF Report ────────────────────────────────────────────

def generate_pdf_report(report_data: dict, output_path: Optional[str] = None) -> str:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        raise ImportError("reportlab not installed. Run: pip install reportlab")

    if output_path is None:
        temp_dir = tempfile.mkdtemp()
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(temp_dir, f"crowd_report_{ts}.pdf")

    # ── Colors matching design system ──
    COLOR_RED     = colors.HexColor("#c1440e")
    COLOR_DARK    = colors.HexColor("#1a1a1a")
    COLOR_BG      = colors.HexColor("#fdfdf5")
    COLOR_SAFE    = colors.HexColor("#22c55e")
    COLOR_WARNING = colors.HexColor("#f59e0b")
    COLOR_DANGER  = colors.HexColor("#ef4444")
    COLOR_LIGHT   = colors.HexColor("#f5f5ec")
    COLOR_GREY    = colors.HexColor("#666666")

    def risk_color(risk: str):
        return {"safe": COLOR_SAFE, "warning": COLOR_WARNING, "danger": COLOR_DANGER}.get(risk, COLOR_WARNING)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm
    )

    styles = getSampleStyleSheet()

    style_title = ParagraphStyle(
        "ReportTitle",
        fontSize=28,
        textColor=COLOR_RED,
        fontName="Helvetica-Bold",
        spaceAfter=4,
        alignment=TA_LEFT
    )
    style_subtitle = ParagraphStyle(
        "Subtitle",
        fontSize=11,
        textColor=COLOR_GREY,
        fontName="Helvetica",
        spaceAfter=2,
        alignment=TA_LEFT
    )
    style_section = ParagraphStyle(
        "Section",
        fontSize=13,
        textColor=COLOR_DARK,
        fontName="Helvetica-Bold",
        spaceBefore=16,
        spaceAfter=8
    )
    style_body = ParagraphStyle(
        "Body",
        fontSize=10,
        textColor=COLOR_DARK,
        fontName="Helvetica",
        spaceAfter=4
    )
    style_center = ParagraphStyle(
        "Center",
        fontSize=10,
        textColor=COLOR_GREY,
        fontName="Helvetica",
        alignment=TA_CENTER
    )

    elements = []
    ts_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── Header ──
    elements.append(Paragraph("CROWD BEHAVIOUR ALERT SYSTEM", style_title))
    elements.append(Paragraph("Automated Detection Report", style_subtitle))
    elements.append(Paragraph(f"Generated: {ts_now}", style_subtitle))
    elements.append(Spacer(1, 0.3 * cm))
    elements.append(HRFlowable(width="100%", thickness=2, color=COLOR_RED))
    elements.append(Spacer(1, 0.4 * cm))

    # ── Summary Section ──
    risk = report_data.get("risk_level", "safe")
    elements.append(Paragraph("DETECTION SUMMARY", style_section))

    summary_data = [
        ["Field", "Value"],
        ["Source", report_data.get("source", "N/A").upper()],
        ["People Detected", str(report_data.get("people_count", 0))],
        ["Crowd Density", report_data.get("crowd_density", "N/A").upper()],
        ["Risk Level", report_data.get("risk_level", "N/A").upper()],
        ["Density Score", f"{report_data.get('density_score', 0)}%"],
        ["Trend", report_data.get("trend", "N/A").upper()],
        ["Area Coverage", report_data.get("area_coverage", "N/A")],
        ["Alert Triggered", "YES" if report_data.get("alert_triggered") else "NO"],
        ["Timestamp", report_data.get("timestamp", ts_now)],
    ]

    summary_table = Table(summary_data, colWidths=[5 * cm, 11 * cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), COLOR_DARK),
        ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
        ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0), 11),
        ("ALIGN",        (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 1), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_LIGHT]),
        ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
        ("TOPPADDING",   (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 7),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("TEXTCOLOR",    (1, 4), (1, 4), risk_color(risk)),
        ("FONTNAME",     (1, 4), (1, 4), "Helvetica-Bold"),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.5 * cm))

    # ── Recommended Action ──
    recommended = report_data.get("recommended_action", "")
    if recommended:
        elements.append(Paragraph("RECOMMENDED ACTION", style_section))
        elements.append(Paragraph(recommended, style_body))
        elements.append(Spacer(1, 0.3 * cm))

    # ── Behaviour Analysis ──
    behaviour_data = report_data.get("behaviour", {})
    if behaviour_data and behaviour_data.get("behaviours"):
        elements.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_GREY))
        elements.append(Paragraph("BEHAVIOUR ANALYSIS", style_section))

        beh_rows = [["Behaviour Type", "Severity", "Confidence", "Description"]]
        for b in behaviour_data["behaviours"]:
            beh_rows.append([
                b.get("type", "").replace("_", " ").title(),
                b.get("severity", "").upper(),
                f"{int(b.get('confidence', 0) * 100)}%",
                b.get("description", "")
            ])

        beh_table = Table(beh_rows, colWidths=[3.5 * cm, 2.5 * cm, 2.5 * cm, 7.5 * cm])
        beh_table.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, 0), COLOR_RED),
            ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",     (0, 0), (-1, 0), 10),
            ("ALIGN",        (0, 0), (-1, -1), "LEFT"),
            ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",     (0, 1), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_LIGHT]),
            ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
            ("TOPPADDING",   (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
            ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ]))
        elements.append(beh_table)
        elements.append(Spacer(1, 0.5 * cm))

    # ── Optical Flow ──
    flow_data = report_data.get("optical_flow", {})
    if flow_data and flow_data.get("motion_magnitude", 0) > 0:
        elements.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_GREY))
        elements.append(Paragraph("CROWD MOVEMENT ANALYSIS", style_section))

        flow_rows = [
            ["Field", "Value"],
            ["Motion Magnitude", str(flow_data.get("motion_magnitude", 0))],
            ["Motion Direction", flow_data.get("motion_direction", "N/A")],
            ["Direction Variance", str(flow_data.get("direction_variance", 0))],
            ["Panic Detected",    "YES" if flow_data.get("panic_detected") else "NO"],
            ["Stampede Detected", "YES" if flow_data.get("stampede_detected") else "NO"],
            ["Description",       flow_data.get("flow_description", "N/A")],
        ]

        flow_table = Table(flow_rows, colWidths=[5 * cm, 11 * cm])
        flow_table.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, 0), COLOR_DARK),
            ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",     (0, 0), (-1, 0), 11),
            ("ALIGN",        (0, 0), (-1, -1), "LEFT"),
            ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",     (0, 1), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_LIGHT]),
            ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
            ("TOPPADDING",   (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 7),
            ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ]))
        elements.append(flow_table)
        elements.append(Spacer(1, 0.5 * cm))

    # ── Tracking / Entry-Exit ──
    tracking_data = report_data.get("tracking", {})
    if tracking_data and tracking_data.get("tracking_available"):
        elements.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_GREY))
        elements.append(Paragraph("ENTRY / EXIT TRACKING", style_section))

        track_rows = [
            ["Field", "Value"],
            ["Total Entries",  str(tracking_data.get("entry_count", 0))],
            ["Total Exits",    str(tracking_data.get("exit_count", 0))],
            ["Active Tracks",  str(tracking_data.get("active_tracks", 0))],
        ]

        track_table = Table(track_rows, colWidths=[5 * cm, 11 * cm])
        track_table.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, 0), COLOR_DARK),
            ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",     (0, 0), (-1, 0), 11),
            ("ALIGN",        (0, 0), (-1, -1), "LEFT"),
            ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",     (0, 1), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_LIGHT]),
            ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
            ("TOPPADDING",   (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 7),
            ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ]))
        elements.append(track_table)
        elements.append(Spacer(1, 0.5 * cm))

    # ── Video Frame-by-Frame (if video report) ──
    frame_by_frame = report_data.get("frame_by_frame", [])
    if frame_by_frame:
        elements.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_GREY))
        elements.append(Paragraph("FRAME-BY-FRAME ANALYSIS", style_section))

        video_meta = report_data.get("video_metadata", {})
        if video_meta:
            meta_text = (
                f"Duration: {video_meta.get('duration_seconds', 0)}s  |  "
                f"FPS: {video_meta.get('fps', 0)}  |  "
                f"Frames Analyzed: {video_meta.get('frames_analyzed', 0)}  |  "
                f"Resolution: {video_meta.get('width', 0)}x{video_meta.get('height', 0)}"
            )
            elements.append(Paragraph(meta_text, style_body))
            elements.append(Spacer(1, 0.2 * cm))

        # Summary stats
        danger_f  = report_data.get("danger_frames", 0)
        warning_f = report_data.get("warning_frames", 0)
        safe_f    = report_data.get("safe_frames", 0)
        panic_f   = report_data.get("panic_frames", 0)
        stamp_f   = report_data.get("stampede_frames", 0)

        stats_data = [
            ["Danger Frames", "Warning Frames", "Safe Frames", "Panic Frames", "Stampede Frames"],
            [str(danger_f), str(warning_f), str(safe_f), str(panic_f), str(stamp_f)]
        ]
        stats_table = Table(stats_data, colWidths=[3.2 * cm, 3.2 * cm, 3.2 * cm, 3.2 * cm, 3.2 * cm])
        stats_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), COLOR_DARK),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, 0), 9),
            ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME",      (0, 1), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 1), (-1, -1), 12),
            ("TEXTCOLOR",     (0, 1), (0, 1), COLOR_DANGER),
            ("TEXTCOLOR",     (1, 1), (1, 1), COLOR_WARNING),
            ("TEXTCOLOR",     (2, 1), (2, 1), COLOR_SAFE),
            ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 0.4 * cm))

        # Frame detail table (max 50 rows to keep PDF manageable)
        frame_rows = [["Frame", "Time (s)", "People", "Density", "Risk", "Motion"]]
        for fr in frame_by_frame[:50]:
            frame_rows.append([
                str(fr.get("frame_index", 0)),
                str(fr.get("timestamp_sec", 0)),
                str(fr.get("people_count", 0)),
                fr.get("crowd_density", "").upper(),
                fr.get("risk_level", "").upper(),
                str(round(fr.get("motion_magnitude", 0), 2))
            ])

        frame_table = Table(frame_rows, colWidths=[2.5 * cm, 2.5 * cm, 2.5 * cm, 3 * cm, 3 * cm, 2.5 * cm])
        frame_table.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, 0), COLOR_RED),
            ("TEXTCOLOR",    (0, 0), (-1, 0), colors.white),
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",     (0, 0), (-1, 0), 9),
            ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",     (0, 1), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_LIGHT]),
            ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
            ("TOPPADDING",   (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ]))
        elements.append(frame_table)

    # ── Footer ──
    elements.append(Spacer(1, 0.8 * cm))
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_RED))
    elements.append(Spacer(1, 0.2 * cm))
    elements.append(Paragraph(
        "Crowd Behaviour Alert System — Automated Report | Confidential",
        style_center
    ))

    doc.build(elements)
    print(f"[Report] PDF generated: {output_path}")
    return output_path


# ─── CSV Report ────────────────────────────────────────────

def generate_csv_report(report_data: dict, output_path: Optional[str] = None) -> str:
    if output_path is None:
        temp_dir = tempfile.mkdtemp()
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(temp_dir, f"crowd_report_{ts}.csv")

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        # ── Main summary ──
        writer.writerow(["CROWD BEHAVIOUR ALERT SYSTEM — REPORT"])
        writer.writerow(["Generated", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        writer.writerow([])

        writer.writerow(["=== DETECTION SUMMARY ==="])
        writer.writerow(["Field", "Value"])
        writer.writerow(["Source",          report_data.get("source", "N/A")])
        writer.writerow(["People Detected", report_data.get("people_count", 0)])
        writer.writerow(["Crowd Density",   report_data.get("crowd_density", "N/A")])
        writer.writerow(["Risk Level",      report_data.get("risk_level", "N/A")])
        writer.writerow(["Density Score",   f"{report_data.get('density_score', 0)}%"])
        writer.writerow(["Trend",           report_data.get("trend", "N/A")])
        writer.writerow(["Area Coverage",   report_data.get("area_coverage", "N/A")])
        writer.writerow(["Alert Triggered", "YES" if report_data.get("alert_triggered") else "NO"])
        writer.writerow(["Timestamp",       report_data.get("timestamp", "")])
        writer.writerow(["Recommended Action", report_data.get("recommended_action", "")])
        writer.writerow([])

        # ── Behaviour ──
        behaviour_data = report_data.get("behaviour", {})
        if behaviour_data and behaviour_data.get("behaviours"):
            writer.writerow(["=== BEHAVIOUR ANALYSIS ==="])
            writer.writerow(["Type", "Severity", "Confidence", "Description"])
            for b in behaviour_data["behaviours"]:
                writer.writerow([
                    b.get("type", ""),
                    b.get("severity", ""),
                    f"{int(b.get('confidence', 0) * 100)}%",
                    b.get("description", "")
                ])
            writer.writerow([])

        # ── Optical Flow ──
        flow_data = report_data.get("optical_flow", {})
        if flow_data:
            writer.writerow(["=== CROWD MOVEMENT ==="])
            writer.writerow(["Motion Magnitude",  flow_data.get("motion_magnitude", 0)])
            writer.writerow(["Motion Direction",  flow_data.get("motion_direction", "N/A")])
            writer.writerow(["Direction Variance",flow_data.get("direction_variance", 0)])
            writer.writerow(["Panic Detected",    "YES" if flow_data.get("panic_detected") else "NO"])
            writer.writerow(["Stampede Detected", "YES" if flow_data.get("stampede_detected") else "NO"])
            writer.writerow(["Description",       flow_data.get("flow_description", "")])
            writer.writerow([])

        # ── Tracking ──
        tracking_data = report_data.get("tracking", {})
        if tracking_data and tracking_data.get("tracking_available"):
            writer.writerow(["=== ENTRY / EXIT TRACKING ==="])
            writer.writerow(["Total Entries",  tracking_data.get("entry_count", 0)])
            writer.writerow(["Total Exits",    tracking_data.get("exit_count", 0)])
            writer.writerow(["Active Tracks",  tracking_data.get("active_tracks", 0)])
            writer.writerow([])

        # ── Frame by frame ──
        frame_by_frame = report_data.get("frame_by_frame", [])
        if frame_by_frame:
            writer.writerow(["=== FRAME-BY-FRAME ANALYSIS ==="])
            writer.writerow(["Frame", "Time (s)", "People", "Density", "Risk",
                             "Alert", "Density Score", "Motion", "Panic", "Stampede"])
            for fr in frame_by_frame:
                writer.writerow([
                    fr.get("frame_index", 0),
                    fr.get("timestamp_sec", 0),
                    fr.get("people_count", 0),
                    fr.get("crowd_density", ""),
                    fr.get("risk_level", ""),
                    "YES" if fr.get("alert_triggered") else "NO",
                    fr.get("density_score", 0),
                    fr.get("motion_magnitude", 0),
                    "YES" if fr.get("panic_detected") else "NO",
                    "YES" if fr.get("stampede_detected") else "NO",
                ])

    print(f"[Report] CSV generated: {output_path}")
    return output_path


# ─── CSV String (for API download) ─────────────────────────

def generate_csv_string(report_data: dict) -> str:
    """Returns CSV as a string instead of writing to file — for API streaming."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["CROWD BEHAVIOUR ALERT SYSTEM — REPORT"])
    writer.writerow(["Generated", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow([])
    writer.writerow(["Field", "Value"])
    writer.writerow(["Source",          report_data.get("source", "N/A")])
    writer.writerow(["People Detected", report_data.get("people_count", 0)])
    writer.writerow(["Crowd Density",   report_data.get("crowd_density", "N/A")])
    writer.writerow(["Risk Level",      report_data.get("risk_level", "N/A")])
    writer.writerow(["Density Score",   f"{report_data.get('density_score', 0)}%"])
    writer.writerow(["Trend",           report_data.get("trend", "N/A")])
    writer.writerow(["Alert Triggered", "YES" if report_data.get("alert_triggered") else "NO"])
    writer.writerow(["Timestamp",       report_data.get("timestamp", "")])
    writer.writerow(["Recommended Action", report_data.get("recommended_action", "")])
    writer.writerow([])

    frame_by_frame = report_data.get("frame_by_frame", [])
    if frame_by_frame:
        writer.writerow(["Frame", "Time (s)", "People", "Density", "Risk", "Motion"])
        for fr in frame_by_frame:
            writer.writerow([
                fr.get("frame_index", 0),
                fr.get("timestamp_sec", 0),
                fr.get("people_count", 0),
                fr.get("crowd_density", ""),
                fr.get("risk_level", ""),
                fr.get("motion_magnitude", 0),
            ])

    return output.getvalue()


# ─── Master Report Generator ───────────────────────────────

def generate_report(
    report_data: dict,
    report_format: str = "pdf",
    output_path: Optional[str] = None
) -> dict:
    """
    Master function — generates PDF or CSV report.
    Returns file path + metadata.
    """
    report_data["source"] = report_data.get("source", "unknown")
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    if report_format.lower() == "csv":
        path = generate_csv_report(report_data, output_path)
        filename = f"crowd_report_{ts}.csv"
        mime_type = "text/csv"
    else:
        path = generate_pdf_report(report_data, output_path)
        filename = f"crowd_report_{ts}.pdf"
        mime_type = "application/pdf"

    file_size = os.path.getsize(path) if os.path.exists(path) else 0

    return {
        "success": True,
        "file_path": path,
        "filename": filename,
        "format": report_format.lower(),
        "mime_type": mime_type,
        "file_size_kb": round(file_size / 1024, 2),
        "generated_at": datetime.now().isoformat()
    }