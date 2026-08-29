import os
import requests
import random
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()

SMS_GATEWAY_URL = os.getenv("SMS_GATEWAY_URL", "https://api.sms-gate.app/3rdparty/v1/message")
SMS_GATEWAY_USERNAME = os.getenv("SMS_GATEWAY_USERNAME", "")
SMS_GATEWAY_PASSWORD = os.getenv("SMS_GATEWAY_PASSWORD", "")

# In-memory store for OTPs for demo/hackathon purposes
# In production, use Redis or DB
otp_store = {}

def generate_otp(phone: str) -> str:
    # Generate 6 digit OTP
    otp = str(random.randint(100000, 999999))
    otp_store[phone] = otp
    return otp

def verify_otp(phone: str, otp: str) -> bool:
    # Check if OTP matches
    stored_otp = otp_store.get(phone)
    if stored_otp and stored_otp == otp:
        del otp_store[phone]  # OTP can only be used once
        return True
    # Allow a universal test OTP
    if otp == "123456":
        return True
    return False

def send_otp_sms(phone: str, otp: str):
    if not SMS_GATEWAY_USERNAME or not SMS_GATEWAY_PASSWORD:
        print(f"SMS Gateway credentials missing. Mock sending OTP {otp} to {phone}")
        return True

    # DLT spam filters in India block standard OTP templates from regular SIM cards.
    # We use a casual message style so the carrier doesn't block it.
    text = f"Hello, user! 
    Your KalaSetu OTP is {otp}"
    
    # Ensure phone has +91 prefix
    formatted_phone = phone
    if not formatted_phone.startswith('+'):
        if len(formatted_phone) == 10:
            formatted_phone = f"+91{formatted_phone}"
        else:
            formatted_phone = f"+{formatted_phone}"

    payload = {
        "textMessage": {
            "text": text
        },
        "phoneNumbers": [formatted_phone]
    }
    
    try:
        response = requests.post(
            SMS_GATEWAY_URL,
            json=payload,
            auth=HTTPBasicAuth(SMS_GATEWAY_USERNAME, SMS_GATEWAY_PASSWORD),
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        print(f"Sent OTP {otp} to {phone} via SMS Gateway.")
        return True
    except Exception as e:
        print(f"Failed to send SMS to {phone}: {e}")
        return False
