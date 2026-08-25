import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

class PriceBreakdown(BaseModel):
    base_material_cost: float = Field(description="Estimated cost of raw materials.")
    labor_cost: float = Field(description="Estimated labor cost based on manufacturing hours.")
    suggested_retail_price: float = Field(description="Suggested competitive selling price for retail.")
    suggested_b2b_price: float = Field(description="Suggested discounted price for bulk/B2B buyers.")
    competitor_range: str = Field(description="Typical market price range for similar items on platforms like Amazon Karigar/Etsy (e.g., 'Rs. 800 - Rs. 1500').")
    pricing_strategy_notes: str = Field(description="Detailed strategy recommendations for the artisan (e.g., highlighting handmade value, target audience).")

class PricingAssistant:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            self.model_name = "gemini-1.5-flash"
        else:
            self.model = None

    # Base hourly rates for local skilled work (in INR)
    BASE_HOURLY_LABOR_RATE = 150.0  # Appx Rs. 1200 / day of skilled weaving/crafting

    # Category multipliers (representing rarity & craftsmanship value markup)
    CATEGORY_MARKUPS = {
        "Textiles": 1.5,
        "Handicrafts": 1.4,
        "Pottery": 1.3,
        "Jewelry": 1.8,
        "Paintings & Art": 2.0,
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
        Uses mathematical estimates blended with LLM market-trend insight to calculate
        an optimal competitive selling price.
        """
        # 1. Base Cost Calculation
        labor_cost = manufacturing_hours * self.BASE_HOURLY_LABOR_RATE
        total_production_cost = material_cost + labor_cost
        
        # Determine markup based on category
        markup = self.CATEGORY_MARKUPS.get(category, self.CATEGORY_MARKUPS["Default"])
        calculated_retail = total_production_cost * markup
        calculated_b2b = total_production_cost * (markup * 0.85)  # 15% discount for bulk orders

        # 2. Try LLM Enrichment for real-world competitor context
        if self.api_key:
            try:
                prompt = f"""
                You are a retail pricing consultant specializing in Indian handicrafts, textiles, and rural products.
                Calculate a competitive price structure for this artisan product:
                - Category: {category}
                - Raw Material Cost: Rs. {material_cost}
                - Labor Hours: {manufacturing_hours} hours
                - Product Description: {product_description}
                
                The baseline calculated retail price is Rs. {calculated_retail:.2f} and bulk B2B price is Rs. {calculated_b2b:.2f}.
                
                Use internet search context of e-commerce trends (e.g. Etsy, Amazon Karigar, ONDC, Craftsvilla) to suggest:
                1. A realistic competitor price range.
                2. An optimized retail and B2B price structure (adjusting our baseline if it seems too low or too high for the craftsmanship described).
                3. Short strategic tips on how to market it (e.g., 'Highlight organic dyes to justify a 20% premium').
                
                Respond strictly in this JSON format:
                {{
                  "base_material_cost": {material_cost},
                  "labor_cost": {labor_cost},
                  "suggested_retail_price": <optimized_retail_price_integer>,
                  "suggested_b2b_price": <optimized_b2b_price_integer>,
                  "competitor_range": "e.g., Rs. X - Rs. Y",
                  "pricing_strategy_notes": "strategy notes here..."
                }}
                """
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                data = json.loads(response.text)
                return PriceBreakdown(**data)
            except Exception as e:
                print(f"Error during pricing LLM evaluation: {e}")
                # Fallback to local heuristic if API fails

        # 3. Heuristic Fallback
        # Estimate competitor range locally
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
            suggested_retail_price=round(calculated_retail, -1),  # Round to nearest 10
            suggested_b2b_price=round(calculated_b2b, -1),
            competitor_range=f"Rs. {comp_min} - Rs. {comp_max}",
            pricing_strategy_notes=strategy_notes
        )
