import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from twilio.rest import Client as TwilioClient
from ..agro_models import AgroAlert, AgroFarmer, AgroAlertSeverity, AgroAlertType

TWILIO_SID = os.getenv("AGRO_TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.getenv("AGRO_TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE = os.getenv("AGRO_TWILIO_PHONE_NUMBER", "")
TWILIO_WHATSAPP = os.getenv("AGRO_TWILIO_WHATSAPP_NUMBER", "")


def agro_is_duplicate_alert(db: Session, farmer_id: UUID, alert_type: str, cooldown_hours: int = 4) -> bool:
    cutoff = datetime.utcnow() - timedelta(hours=cooldown_hours)
    existing = db.query(AgroAlert).filter(
        AgroAlert.farmer_id == farmer_id,
        AgroAlert.alert_type == alert_type,
        AgroAlert.created_at >= cutoff,
        AgroAlert.is_active == True,
    ).first()
    return existing is not None


def agro_send_sms(phone: str, message: str) -> bool:
    if not TWILIO_SID or not TWILIO_TOKEN:
        print(f"[AGRO ALERT SMS - no Twilio config] To: {phone} | {message[:80]}")
        return False
    try:
        client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
        client.messages.create(body=message, from_=TWILIO_PHONE, to=phone)
        return True
    except Exception as e:
        print(f"[AGRO SMS ERROR] {e}")
        return False


def agro_send_whatsapp(phone: str, message: str) -> bool:
    if not TWILIO_SID or not TWILIO_TOKEN:
        print(f"[AGRO ALERT WHATSAPP - no Twilio config] To: {phone} | {message[:80]}")
        return False
    try:
        client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)
        client.messages.create(body=message, from_=TWILIO_WHATSAPP, to=f"whatsapp:{phone}")
        return True
    except Exception as e:
        print(f"[AGRO WHATSAPP ERROR] {e}")
        return False


def agro_create_and_dispatch_alert(
    db: Session,
    farmer_id: UUID,
    zone_id: Optional[UUID],
    alert_type: AgroAlertType,
    severity: AgroAlertSeverity,
    message: str,
) -> AgroAlert:
    farmer = db.query(AgroFarmer).filter(AgroFarmer.id == farmer_id).first()
    if not farmer:
        raise ValueError(f"Farmer {farmer_id} not found")
    cooldown_map = {
        "critical": 1,
        "high": 4,
        "medium": 8,
        "low": 24,
    }
    if agro_is_duplicate_alert(db, farmer_id, alert_type.value, cooldown_map[severity.value]):
        return None
    alert = AgroAlert(
        farmer_id=farmer_id,
        zone_id=zone_id,
        alert_type=alert_type,
        severity=severity,
        message_en=message,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    channels_sent = []
    prefs = farmer.alert_channels or {}
    if severity == AgroAlertSeverity.critical:
        if prefs.get("sms", True):
            if agro_send_sms(farmer.phone, f"🚨 CRITICAL ALERT: {message}"):
                channels_sent.append("sms")
        if prefs.get("whatsapp", True):
            if agro_send_whatsapp(farmer.phone, f"🚨 CRITICAL ALERT: {message}"):
                channels_sent.append("whatsapp")
    elif severity == AgroAlertSeverity.high:
        if prefs.get("sms", True):
            if agro_send_sms(farmer.phone, f"⚠️ ALERT: {message}"):
                channels_sent.append("sms")
    channels_sent.append("in_app")
    alert.channels_sent = channels_sent
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def agro_evaluate_and_trigger_alerts(db: Session, zone_id: UUID, farmer_id: UUID, risk_scores: Dict) -> List[AgroAlert]:
    triggered = []
    if risk_scores.get("flood_risk", 0) > 75:
        alert = agro_create_and_dispatch_alert(
            db, farmer_id, zone_id,
            AgroAlertType.flood, AgroAlertSeverity.critical,
            "FLOOD RISK CRITICAL: Heavy rainfall forecast. Move equipment to high ground. Check drainage immediately."
        )
        if alert:
            triggered.append(alert)
    if risk_scores.get("drought_risk", 0) > 65:
        alert = agro_create_and_dispatch_alert(
            db, farmer_id, zone_id,
            AgroAlertType.drought, AgroAlertSeverity.high,
            "DROUGHT WARNING: Soil moisture critically low. Irrigate within 24 hours to prevent crop stress."
        )
        if alert:
            triggered.append(alert)
    if risk_scores.get("heat_risk", 0) > 70:
        alert = agro_create_and_dispatch_alert(
            db, farmer_id, zone_id,
            AgroAlertType.heatwave, AgroAlertSeverity.high,
            "HEAT STRESS WARNING: Temperatures forecast above safe crop threshold. Schedule irrigation for early morning."
        )
        if alert:
            triggered.append(alert)
    if risk_scores.get("frost_risk", 0) > 60:
        alert = agro_create_and_dispatch_alert(
            db, farmer_id, zone_id,
            AgroAlertType.frost, AgroAlertSeverity.critical,
            "FROST WARNING: Sub-zero temperatures expected tonight. Cover sensitive crops immediately."
        )
        if alert:
            triggered.append(alert)
    return triggered