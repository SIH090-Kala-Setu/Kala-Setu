from fastapi.testclient import TestClient
import sys
import os

# Append backend directory to path so imports work correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_read_root():
    """
    Test the home page endpoint.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "Welcome to Artisan AI API" in response.json()["message"]

def test_pricing_assistant():
    """
    Test the dynamic pricing endpoint with mock inputs.
    """
    payload = {
        "category": "Textiles",
        "material_cost": 300.0,
        "manufacturing_hours": 10.0,
        "product_description": "Handloom banarasi silk dupatta with red embroidery"
    }
    response = client.post("/suggest-price", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "suggested_retail_price" in data
    assert "suggested_b2b_price" in data
    assert data["base_material_cost"] == 300.0

def test_catalog_text_endpoint():
    """
    Test the text cataloging pipeline without audio.
    """
    payload = {
        "text_desc": "यह एक सुंदर मिट्टी का घड़ा है",
        "lang": "Hindi"
    }
    response = client.post("/catalog", data=payload)
    assert response.status_code == 200
    data = response.json()
    assert "detected_language" in data
    assert "title_en" in data
    assert "description_en" in data
    assert "title_hi" in data
    assert "description_hi" in data
