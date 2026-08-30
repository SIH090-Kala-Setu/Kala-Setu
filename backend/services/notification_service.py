import os
import json
import logging
from typing import List, Optional, Union
import requests
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

# Try to initialize Firebase Admin SDK (Modern FCM v1)
_firebase_initialized = False

try:
    import firebase_admin
    from firebase_admin import credentials, messaging

    # Search for service account JSON file or env var
    cred = None
    cred_json_str = os.getenv("FIREBASE_CREDENTIALS_JSON")
    cred_file_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    # Common local file paths for the service account key
    candidate_paths = [
        cred_file_path,
        "firebase-credentials.json",
        "serviceAccountKey.json",
        os.path.join(os.path.dirname(__file__), "..", "firebase-credentials.json"),
        os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json"),
    ]

    if cred_json_str:
        try:
            cred_dict = json.loads(cred_json_str)
            cred = credentials.Certificate(cred_dict)
            logger.info("🔑 Initialized Firebase Admin from FIREBASE_CREDENTIALS_JSON env var.")
        except Exception as e:
            logger.warning(f"Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")

    if not cred:
        for p in candidate_paths:
            if p and os.path.exists(p):
                cred = credentials.Certificate(p)
                logger.info(f"🔑 Initialized Firebase Admin from file: {p}")
                break

    if cred and not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
    elif firebase_admin._apps:
        _firebase_initialized = True

except ImportError:
    logger.info("firebase_admin not installed; falling back to HTTP legacy / simulated push.")
except Exception as e:
    logger.warning(f"Firebase Admin SDK initialization error: {e}")

FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")
FCM_URL = "https://fcm.googleapis.com/fcm/send"


def _clear_fcm_token(db: Session, token: str):
    """Null out a stale FCM token so we stop pushing to it."""
    try:
        db.query(models.User).filter(models.User.fcm_token == token).update(
            {"fcm_token": None}, synchronize_session=False
        )
        db.flush()
        logger.info(f"🗑️ Cleared stale FCM token: {token[:12]}...")
    except Exception as e:
        logger.warning(f"Failed to clear stale FCM token: {e}")

def _send_fcm(token: str, title: str, body: str, data: dict = None, db: Session = None):
    """Fire-and-forget FCM push to a single device token using Firebase Admin v1 or HTTP legacy."""
    if not token:
        return

    # Method 1: Modern Firebase Admin SDK (FCM HTTP v1)
    if _firebase_initialized:
        try:
            str_data = {k: str(v) for k, v in (data or {}).items()}
            msg = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=str_data,
                token=token,
            )
            response = messaging.send(msg)
            logger.info(f"✅ FCM v1 push sent successfully: {response}")
            return
        except Exception as e:
            err_str = str(e)
            logger.warning(f"FCM v1 push send failed: {e}")
            # Clear stale token so we don't keep retrying it
            if any(x in err_str for x in ("NotRegistered", "InvalidRegistration", "UNREGISTERED")) and db:
                _clear_fcm_token(db, token)
            return

    # Method 2: Legacy FCM HTTP API (if FCM_SERVER_KEY is set)
    if FCM_SERVER_KEY:
        try:
            payload = {
                "to": token,
                "notification": {"title": title, "body": body, "sound": "default"},
                "data": data or {},
                "priority": "high",
            }
            headers = {
                "Authorization": f"key={FCM_SERVER_KEY}",
                "Content-Type": "application/json",
            }
            resp = requests.post(FCM_URL, json=payload, headers=headers, timeout=5)
            if resp.status_code == 200:
                result = resp.json()
                # Check for NotRegistered in legacy response
                if result.get("failure") and db:
                    results = result.get("results", [])
                    if results and results[0].get("error") in ("NotRegistered", "InvalidRegistration"):
                        _clear_fcm_token(db, token)
                else:
                    logger.info(f"✅ FCM legacy push sent to {token[:12]}...: {title}")
            else:
                logger.warning(f"FCM legacy send failed [{resp.status_code}]: {resp.text}")
        except Exception as e:
            logger.warning(f"FCM legacy exception: {e}")
        return

    # Method 3: Simulation Log (when credentials not yet configured)
    logger.info(f"🔔 [FCM Push Simulated] To: {token[:12]}... | Title: {title} | Body: {body}")


def _send_fcm_multicast(tokens: List[str], title: str, body: str, data: dict = None, db: Session = None):
    """Send FCM push to multiple tokens in batches."""
    valid_tokens = [t for t in tokens if t]
    if not valid_tokens:
        return

    # Method 1: Modern Firebase Admin SDK Multicast
    if _firebase_initialized:
        str_data = {k: str(v) for k, v in (data or {}).items()}
        for i in range(0, len(valid_tokens), 500):
            batch = valid_tokens[i:i + 500]
            try:
                multicast_msg = messaging.MulticastMessage(
                    notification=messaging.Notification(title=title, body=body),
                    data=str_data,
                    tokens=batch,
                )
                br = messaging.send_each_for_multicast(multicast_msg)
                logger.info(f"✅ FCM v1 multicast sent: {br.success_count} success, {br.failure_count} failed")
                # Clear stale tokens from failed responses
                if db and br.failure_count:
                    for idx, resp in enumerate(br.responses):
                        if not resp.success and resp.exception:
                            err = str(resp.exception)
                            if any(x in err for x in ("NotRegistered", "InvalidRegistration", "UNREGISTERED")):
                                _clear_fcm_token(db, batch[idx])
            except Exception as e:
                logger.warning(f"FCM v1 multicast failed: {e}")
        return

    # Method 2: Legacy Multicast
    if FCM_SERVER_KEY:
        for i in range(0, len(valid_tokens), 1000):
            batch = valid_tokens[i:i + 1000]
            try:
                payload = {
                    "registration_ids": batch,
                    "notification": {"title": title, "body": body, "sound": "default"},
                    "data": data or {},
                    "priority": "high",
                }
                headers = {
                    "Authorization": f"key={FCM_SERVER_KEY}",
                    "Content-Type": "application/json",
                }
                resp = requests.post(FCM_URL, json=payload, headers=headers, timeout=5)
                if resp.status_code == 200:
                    logger.info(f"✅ FCM legacy multicast sent to {len(batch)} devices.")
                else:
                    logger.warning(f"FCM multicast failed [{resp.status_code}]: {resp.text}")
            except Exception as e:
                logger.warning(f"FCM multicast exception: {e}")
        return

    # Method 3: Simulation Log
    logger.info(f"🔔 [FCM Push Broadcast Simulated] To {len(valid_tokens)} devices | Title: {title}")



def notify(
    db: Session,
    user_id: Union[str, models.User],
    title: str,
    body: str,
    notif_type: str = "System",
    data: dict = None,
):
    """
    Save notification to DB and send FCM push if user has a device token.
    """
    uid = user_id.id if isinstance(user_id, models.User) else user_id
    notif = models.Notification(
        user_id=uid,
        title=title,
        body=body,
        type=notif_type,
    )
    db.add(notif)
    db.flush()

    user = db.query(models.User).filter(models.User.id == uid).first()
    if user and user.fcm_token:
        _send_fcm(user.fcm_token, title, body, data or {"type": notif_type}, db=db)


def notify_users(
    db: Session,
    user_ids: List[Union[str, models.User]],
    title: str,
    body: str,
    notif_type: str = "System",
    data: dict = None,
):
    """
    Save notification to DB for multiple users and send push notifications.
    """
    if not user_ids:
        return
    uids = [u.id if isinstance(u, models.User) else u for u in user_ids]
    users = db.query(models.User).filter(models.User.id.in_(uids)).all()
    tokens = []
    for user in users:
        notif = models.Notification(
            user_id=user.id,
            title=title,
            body=body,
            type=notif_type,
        )
        db.add(notif)
        if user.fcm_token:
            tokens.append(user.fcm_token)
    db.flush()
    if tokens:
        _send_fcm_multicast(tokens, title, body, data or {"type": notif_type}, db=db)


def notify_role(
    db: Session,
    role: str,
    title: str,
    body: str,
    notif_type: str = "System",
    data: dict = None,
):
    """
    Save notification to DB and push to all users of a specific role (e.g. 'Artisan', 'Aggregator', 'Buyer').
    """
    users = db.query(models.User).filter(models.User.role == role).all()
    tokens = []
    for user in users:
        notif = models.Notification(
            user_id=user.id,
            title=title,
            body=body,
            type=notif_type,
        )
        db.add(notif)
        if user.fcm_token:
            tokens.append(user.fcm_token)
    db.flush()
    if tokens:
        _send_fcm_multicast(tokens, title, body, data or {"type": notif_type}, db=db)


def notify_all(
    db: Session,
    title: str,
    body: str,
    notif_type: str = "System",
    data: dict = None,
):
    """
    Save notification to DB and push to all users in the system.
    """
    users = db.query(models.User).all()
    tokens = []
    for user in users:
        notif = models.Notification(
            user_id=user.id,
            title=title,
            body=body,
            type=notif_type,
        )
        db.add(notif)
        if user.fcm_token:
            tokens.append(user.fcm_token)
    db.flush()
    if tokens:
        _send_fcm_multicast(tokens, title, body, data or {"type": notif_type}, db=db)

