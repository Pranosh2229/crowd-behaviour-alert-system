import os
import time
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ─── Config ────────────────────────────────────────────────

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM        = os.getenv("TWILIO_FROM_NUMBER", "")
TWILIO_TO          = os.getenv("TWILIO_TO_NUMBER", "")
TWILIO_TWIML_URL   = os.getenv("TWILIO_TWIML_BIN_URL", "")

SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM     = os.getenv("SMTP_FROM", "")
SMTP_TO       = os.getenv("SMTP_TO", "")

# ─── Cooldown Tracker ──────────────────────────────────────
# Prevents alert spam — one alert per type every N seconds

_last_alert_time: dict = {}
SMS_COOLDOWN_SEC   = 120   # 2 minutes between SMS alerts
VOICE_COOLDOWN_SEC = 300   # 5 minutes between voice calls
EMAIL_COOLDOWN_SEC = 60    # 1 minute between emails


def _is_on_cooldown(alert_type: str, cooldown_sec: int) -> bool:
    now = time.time()
    last = _last_alert_time.get(alert_type, 0)
    if (now - last) < cooldown_sec:
        remaining = int(cooldown_sec - (now - last))
        print(f"[Alert] {alert_type} on cooldown — {remaining}s remaining")
        return True
    return False


def _mark_sent(alert_type: str) -> None:
    _last_alert_time[alert_type] = time.time()


# ─── SMS Alert ─────────────────────────────────────────────

def send_sms_alert(
    people_count: int,
    risk_level: str,
    behaviour: str = "normal",
    location: str = "Main Entrance",
    source: str = "webcam"
) -> dict:
    """
    Sends a real Twilio SMS alert to the configured number.
    """
    if _is_on_cooldown("sms", SMS_COOLDOWN_SEC):
        return {
            "success": False,
            "reason": "cooldown",
            "message": "SMS alert skipped — cooldown active"
        }

    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, TWILIO_TO]):
        print("[SMS] Twilio credentials not configured.")
        return {
            "success": False,
            "reason": "not_configured",
            "message": "Twilio credentials missing in .env"
        }

    try:
        from twilio.rest import Client

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        ts = datetime.now().strftime("%H:%M:%S")
        risk_emoji = {"safe": "✅", "warning": "⚠️", "danger": "🚨"}.get(risk_level, "⚠️")

        body = (
            f"{risk_emoji} CROWD ALERT — {risk_level.upper()}\n"
            f"Location: {location}\n"
            f"People: {people_count}\n"
            f"Behaviour: {behaviour.replace('_', ' ').title()}\n"
            f"Source: {source.upper()}\n"
            f"Time: {ts}\n"
            f"Action required immediately."
        )

        message = client.messages.create(
            body=body,
            from_=TWILIO_FROM,
            to=TWILIO_TO
        )

        _mark_sent("sms")
        print(f"[SMS] Sent successfully. SID: {message.sid}")

        return {
            "success": True,
            "sid": message.sid,
            "message": f"SMS alert sent to {TWILIO_TO}",
            "body": body
        }

    except Exception as e:
        print(f"[SMS] Failed to send: {e}")
        return {
            "success": False,
            "reason": "error",
            "message": str(e)
        }


# ─── Voice Call Alert ──────────────────────────────────────

def send_voice_alert(
    people_count: int,
    risk_level: str,
    behaviour: str = "normal",
    location: str = "Main Entrance"
) -> dict:
    """
    Triggers a real Twilio voice call with a spoken alert message.
    Uses a TwiML Bin URL or inline TwiML.
    """
    if _is_on_cooldown("voice", VOICE_COOLDOWN_SEC):
        return {
            "success": False,
            "reason": "cooldown",
            "message": "Voice alert skipped — cooldown active"
        }

    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, TWILIO_TO]):
        print("[Voice] Twilio credentials not configured.")
        return {
            "success": False,
            "reason": "not_configured",
            "message": "Twilio credentials missing in .env"
        }

    try:
        from twilio.rest import Client
        from twilio.twiml.voice_response import VoiceResponse

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        behaviour_text = behaviour.replace("_", " ")
        spoken_message = (
            f"Attention. This is an automated crowd alert. "
            f"Risk level is {risk_level}. "
            f"Location: {location}. "
            f"{people_count} people detected. "
            f"Behaviour: {behaviour_text}. "
            f"Please respond immediately."
        )

        # Build TwiML inline
        response = VoiceResponse()
        response.say(spoken_message, voice="alice", language="en-US")
        response.pause(length=1)
        response.say("This message will repeat.", voice="alice")
        response.say(spoken_message, voice="alice", language="en-US")

        twiml_str = str(response)

        # If TwiML Bin URL is configured, use that — otherwise use inline
        if TWILIO_TWIML_URL:
            call = client.calls.create(
                to=TWILIO_TO,
                from_=TWILIO_FROM,
                url=TWILIO_TWIML_URL
            )
        else:
            # Use inline TwiML via data URI approach
            import urllib.parse
            twiml_encoded = urllib.parse.quote(twiml_str)
            call = client.calls.create(
                to=TWILIO_TO,
                from_=TWILIO_FROM,
                twiml=twiml_str
            )

        _mark_sent("voice")
        print(f"[Voice] Call initiated. SID: {call.sid}")

        return {
            "success": True,
            "sid": call.sid,
            "message": f"Voice call initiated to {TWILIO_TO}",
            "spoken_text": spoken_message
        }

    except Exception as e:
        print(f"[Voice] Failed to initiate call: {e}")
        return {
            "success": False,
            "reason": "error",
            "message": str(e)
        }


# ─── Email Alert ───────────────────────────────────────────

def send_email_alert(
    people_count: int,
    risk_level: str,
    behaviour: str = "normal",
    location: str = "Main Entrance",
    source: str = "webcam",
    recommended_action: str = ""
) -> dict:
    """
    Sends a real SMTP email alert.
    Works with Gmail (use App Password), Outlook, or any SMTP server.
    """
    if _is_on_cooldown("email", EMAIL_COOLDOWN_SEC):
        return {
            "success": False,
            "reason": "cooldown",
            "message": "Email alert skipped — cooldown active"
        }

    if not all([SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_TO]):
        print("[Email] SMTP credentials not configured.")
        return {
            "success": False,
            "reason": "not_configured",
            "message": "SMTP credentials missing in .env"
        }

    try:
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        risk_color = {"safe": "#22c55e", "warning": "#f59e0b", "danger": "#ef4444"}.get(risk_level, "#f59e0b")
        risk_emoji = {"safe": "✅", "warning": "⚠️", "danger": "🚨"}.get(risk_level, "⚠️")

        subject = f"{risk_emoji} Crowd Alert — {risk_level.upper()} | {location} | {ts}"

        html_body = f"""
        <html>
        <body style="font-family: Inter, Arial, sans-serif; background: #fdfdf5; padding: 24px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px;
                        border: 2px solid {risk_color}; overflow: hidden;">

                <!-- Header -->
                <div style="background: {risk_color}; padding: 20px 24px;">
                    <h1 style="margin: 0; color: white; font-size: 22px; letter-spacing: 1px;">
                        {risk_emoji} CROWD BEHAVIOUR ALERT
                    </h1>
                    <p style="margin: 4px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">
                        {ts}
                    </p>
                </div>

                <!-- Stats -->
                <div style="padding: 24px; display: grid; gap: 12px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-size: 13px;">Risk Level</td>
                            <td style="padding: 10px 0; font-weight: 700; color: {risk_color};
                                       font-size: 15px; text-transform: uppercase;">{risk_level}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-size: 13px;">People Detected</td>
                            <td style="padding: 10px 0; font-weight: 700; color: #1a1a1a;
                                       font-size: 15px;">{people_count}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-size: 13px;">Location</td>
                            <td style="padding: 10px 0; font-weight: 700; color: #1a1a1a;
                                       font-size: 15px;">{location}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-size: 13px;">Behaviour</td>
                            <td style="padding: 10px 0; font-weight: 700; color: #1a1a1a;
                                       font-size: 15px;">{behaviour.replace("_", " ").title()}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666; font-size: 13px;">Source</td>
                            <td style="padding: 10px 0; font-weight: 700; color: #1a1a1a;
                                       font-size: 15px;">{source.upper()}</td>
                        </tr>
                    </table>

                    <!-- Recommended Action -->
                    {f'''
                    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px;
                                padding: 14px 16px; margin-top: 8px;">
                        <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
                            Recommended Action
                        </p>
                        <p style="margin: 6px 0 0; font-size: 14px; color: #78350f;">
                            {recommended_action}
                        </p>
                    </div>
                    ''' if recommended_action else ''}
                </div>

                <!-- Footer -->
                <div style="background: #f8f8f0; padding: 14px 24px; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-size: 12px; color: #999;">
                        Crowd Behaviour Alert System — Automated Notification
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = SMTP_TO
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, SMTP_TO, msg.as_string())

        _mark_sent("email")
        print(f"[Email] Sent successfully to {SMTP_TO}")

        return {
            "success": True,
            "message": f"Email alert sent to {SMTP_TO}",
            "subject": subject
        }

    except Exception as e:
        print(f"[Email] Failed to send: {e}")
        return {
            "success": False,
            "reason": "error",
            "message": str(e)
        }


# ─── Master Alert Dispatcher ───────────────────────────────

def dispatch_alerts(
    people_count: int,
    risk_level: str,
    behaviour: str = "normal",
    location: str = "Main Entrance",
    source: str = "webcam",
    recommended_action: str = "",
    send_sms: bool = True,
    send_voice: bool = False,
    send_email: bool = True
) -> dict:
    """
    Master function — dispatches all configured alert channels.
    Only fires on warning or danger risk levels.
    Voice call only fires on danger.
    """
    if risk_level == "safe":
        return {
            "dispatched": False,
            "reason": "Risk level is safe — no alerts sent"
        }

    results = {}

    if send_sms:
        results["sms"] = send_sms_alert(
            people_count, risk_level, behaviour, location, source
        )

    if send_email:
        results["email"] = send_email_alert(
            people_count, risk_level, behaviour, location, source, recommended_action
        )

    # Voice only on danger
    if send_voice and risk_level == "danger":
        results["voice"] = send_voice_alert(
            people_count, risk_level, behaviour, location
        )

    return {
        "dispatched": True,
        "risk_level": risk_level,
        "people_count": people_count,
        "timestamp": datetime.now().isoformat(),
        "results": results
    }