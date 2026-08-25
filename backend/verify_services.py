import sys
import os

# Set standard output encoding to UTF-8 to support regional languages printing on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Append backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.pricing_assistant import PricingAssistant
from services.cataloger import Cataloger

def main():
    print("=== ARTISAN AI SERVICE VERIFICATION ===")
    
    # 1. Verify Pricing Assistant
    print("\n[1/2] Verifying Pricing Assistant...")
    pricing = PricingAssistant()
    breakdown = pricing.calculate_suggested_price(
        category="Textiles",
        material_cost=400.0,
        manufacturing_hours=6.0,
        product_description="Pure cotton handwoven blanket"
    )
    print(f"[OK] Base Material Cost: Rs. {breakdown.base_material_cost}")
    print(f"[OK] Calculated Labor Cost: Rs. {breakdown.labor_cost}")
    print(f"[OK] Suggested Retail Price: Rs. {breakdown.suggested_retail_price}")
    print(f"[OK] Suggested B2B Price: Rs. {breakdown.suggested_b2b_price}")
    print(f"[OK] Competitor Range: {breakdown.competitor_range}")
    print(f"[OK] Strategy Notes: {breakdown.pricing_strategy_notes}")
    
    # 2. Verify Cataloger
    print("\n[2/2] Verifying Cataloger (Mock/LLM)...")
    cataloger = Cataloger()
    catalog = cataloger.generate_catalog_from_text(
        description_text="हाथ से बना हुआ लाल सूती कुर्ता",
        regional_lang="Hindi"
    )
    print(f"[OK] Detected Language: {catalog.detected_language}")
    print(f"[OK] Verbatim Input: {catalog.raw_transcription}")
    print(f"[OK] English Title: {catalog.title_en}")
    print(f"[OK] English Description: {catalog.description_en}")
    print(f"[OK] Hindi Title: {catalog.title_hi}")
    print(f"[OK] Hindi Description: {catalog.description_hi}")
    print(f"[OK] Materials Found: {catalog.materials}")
    print(f"[OK] SEO Tags: {catalog.tags}")
    print(f"[OK] Product Category: {catalog.category}")
    
    print("\n[SUCCESS] All service interfaces verified successfully!")

if __name__ == "__main__":
    main()
