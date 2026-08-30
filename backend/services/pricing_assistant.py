import os
import json
from dotenv import load_dotenv

# Ensure .env is loaded
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

try:
    from groq import Groq
except ImportError:
    Groq = None

class PriceBreakdown(BaseModel):
    base_material_cost: float = Field(description="Estimated cost of raw materials.")
    labor_cost: float = Field(description="Estimated labor cost based on manufacturing hours.")
    suggested_retail_price: float = Field(description="Suggested competitive selling price for retail.")
    suggested_b2b_price: float = Field(description="Suggested discounted price for bulk/B2B buyers.")
    competitor_range: str = Field(description="Typical market price range for similar items on platforms like Amazon Karigar/Etsy (e.g., 'Rs. 800 - Rs. 1500').")
    pricing_strategy_notes: str = Field(description="Detailed strategy recommendations for the artisan (e.g., highlighting handmade value, target audience).")

class PricingAssistant:
    def __init__(self):
        # 1. Primary Engine: Google Gemini
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if self.gemini_api_key and not self.gemini_api_key.startswith("your_"):
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
                self.gemini_model = "gemini-2.5-flash-lite"
            except Exception as e:
                print(f"[PricingAssistant] Failed to initialize Gemini client: {e}")
                self.gemini_client = None
        else:
            self.gemini_client = None

        # 2. Secondary Engine: Groq AI Agent
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if Groq and self.groq_api_key and not self.groq_api_key.startswith("your_") and not self.groq_api_key.startswith("gsk_your_"):
            try:
                self.groq_client = Groq(api_key=self.groq_api_key)
                self.groq_model = "qwen/qwen3.8-27b"
            except Exception as e:
                print(f"[PricingAssistant] Failed to initialize Groq client: {e}")
                self.groq_client = None
        else:
            self.groq_client = None

    # Base hourly rates for local skilled work (in INR)
    BASE_HOURLY_LABOR_RATE = 150.0  # Appx Rs. 1200 / day of skilled weaving/crafting

    # Category multipliers (representing rarity & craftsmanship value markup)
    CATEGORY_MARKUPS = {
        "Textiles": 1.5,
        "Handicrafts": 1.4,
        "Pottery": 1.3,
        "Jewelry": 1.8,
        "Paintings & Art": 2.0,
        "Woodwork": 1.5,
        "Default": 1.4
    }

    def calculate_suggested_price(
        self,
        category: str,
        material_cost: float,
        manufacturing_hours: float,
        product_description: str
    ) -> PriceBreakdown:
        """
        Calculates optimal competitive selling price using Gemini -> Groq -> Mathematical heuristics.
        Tier 1: Google Gemini Flash
        Tier 2: Groq LPU Cloud
        Tier 3: Local Fair Wage Cost-Plus Heuristic
        """
        # 1. Base Cost Calculation
        labor_cost = manufacturing_hours * self.BASE_HOURLY_LABOR_RATE
        total_production_cost = material_cost + labor_cost
        
        # Determine markup based on category
        markup = self.CATEGORY_MARKUPS.get(category, self.CATEGORY_MARKUPS["Default"])
        calculated_retail = total_production_cost * markup
        calculated_b2b = total_production_cost * (markup * 0.85)  # 15% discount for bulk orders

        prompt = f"""
        You are a retail pricing consultant specializing in Indian handicrafts, textiles, and rural products.
        Calculate a competitive price structure for this artisan product:
        - Category: {category}
        - Raw Material Cost: Rs. {material_cost}
        - Labor Hours: {manufacturing_hours} hours
        - Product Description: {product_description}
        
        The baseline calculated retail price is Rs. {calculated_retail:.2f} and bulk B2B price is Rs. {calculated_b2b:.2f}.
        
        Use e-commerce trends (e.g. Etsy, Amazon Karigar, ONDC, Craftsvilla) to suggest:
        1. A realistic competitor price range.
        2. An optimized retail and B2B price structure (adjusting baseline if appropriate).
        3. Short strategic tips on how to market it.
        
        Respond strictly in this JSON format:
        {{
          "base_material_cost": {material_cost},
          "labor_cost": {labor_cost},
          "suggested_retail_price": {int(calculated_retail)},
          "suggested_b2b_price": {int(calculated_b2b)},
          "competitor_range": "Rs. {int(calculated_retail * 0.9)} - Rs. {int(calculated_retail * 1.4)}",
          "pricing_strategy_notes": "strategy notes here..."
        }}
        """

        # --- TIER 1: Try Gemini ---
        if self.gemini_client:
            try:
                response = self.gemini_client.models.generate_content(
                    model=self.gemini_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                data = json.loads(response.text)
                return PriceBreakdown(**data)
            except Exception as e:
                print(f"[PricingAssistant] Gemini pricing error ({e}). Trying Groq backup...")

        # --- TIER 2: Try Groq Cloud ---
        if self.groq_client:
            try:
                completion = self.groq_client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a specialized pricing consultant for Indian handicrafts. Always respond strictly in valid JSON format."
                        },
                        {"role": "user", "content": prompt}
                    ],
                    model=self.groq_model,
                    response_format={"type": "json_object"},
                    temperature=0.2
                )
                data = json.loads(completion.choices[0].message.content)
                data["base_material_cost"] = float(data.get("base_material_cost", material_cost))
                data["labor_cost"] = float(data.get("labor_cost", labor_cost))
                data["suggested_retail_price"] = float(data.get("suggested_retail_price", calculated_retail))
                data["suggested_b2b_price"] = float(data.get("suggested_b2b_price", calculated_b2b))
                return PriceBreakdown(**data)
            except Exception as groq_err:
                print(f"[PricingAssistant] Groq pricing error: {groq_err}")

        # --- TIER 3: Local Heuristic Fallback ---
        comp_min = int(calculated_retail * 0.9)
        comp_max = int(calculated_retail * 1.4)
        
        strategy_notes = (
            f"Suggested price covers your raw material (Rs. {material_cost:.0f}) and rewards your effort at Rs. {self.BASE_HOURLY_LABOR_RATE}/hour. "
            f"Since this is a {category} product, emphasize the handmade quality and time taken ({manufacturing_hours} hours) "
            "in your catalog listing to justify the premium."
        )

        return PriceBreakdown(
            base_material_cost=material_cost,
            labor_cost=labor_cost,
            suggested_retail_price=round(calculated_retail, -1),
            suggested_b2b_price=round(calculated_b2b, -1),
            competitor_range=f"Rs. {comp_min} - Rs. {comp_max}",
            pricing_strategy_notes=strategy_notes
        )
