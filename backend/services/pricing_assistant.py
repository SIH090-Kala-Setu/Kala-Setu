import os
import json
import base64
import logging
import requests
from dotenv import load_dotenv
from typing import Optional

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# V2 Engine Delegate Config  /  V2 इंजन डेलिगेट कॉन्फ़िगरेशन
#
# Set PRICING_V2_URL in .env to route /suggest-price through the new
# MLV2 Hybrid Pricing Engine (Formula + Qwen AI + XGBoost Phase 2).
# Example: PRICING_V2_URL=http://localhost:8002
#
# If unset or unreachable, falls back transparently to the Gemini-based engine.
# ─────────────────────────────────────────────────────────────────────────────
PRICING_V2_URL: str = os.getenv("PRICING_V2_URL", "").rstrip("/")
PRICING_V2_TIMEOUT_SEC: int = int(os.getenv("PRICING_V2_TIMEOUT", "15"))


class PriceBreakdown(BaseModel):
    base_material_cost: float = Field(description="Raw material cost provided by artisan.")
    labor_cost: float = Field(description="Estimated labor cost based on hours.")
    suggested_retail_price: float = Field(description="Optimal retail price.")
    suggested_b2b_price: float = Field(description="Wholesale B2B price.")
    min_price: float = Field(description="Minimum breakeven price.")
    market_avg: float = Field(description="Average price of comparable products on platform.")
    market_min: float = Field(description="Lowest comparable product price on platform.")
    market_max: float = Field(description="Highest comparable product price on platform.")
    complexity: str = Field(description="Detected complexity: simple / moderate / intricate.")
    competitor_range: str = Field(description="Market price range string.")
    pricing_strategy_notes: str = Field(description="Rationale and strategy tips.")
    # V2 enrichment fields (populated when V2 engine is active)
    market_multiplier: Optional[float] = Field(None, description="AI market multiplier applied (V2).")
    confidence: Optional[str] = Field(None, description="AI confidence: LOW | MEDIUM | HIGH (V2).")
    season_flag: Optional[str] = Field(None, description="Season context: PEAK | NORMAL | SLOW (V2).")
    ai_reason: Optional[str] = Field(None, description="AI market reasoning (V2).")
    phase2_applied: Optional[bool] = Field(None, description="Whether XGBoost Phase 2 calibration was applied (V2).")
    engine_version: Optional[str] = Field(None, description="Pricing engine version used.")


class PricingAssistant:
    BASE_HOURLY_LABOR_RATE = 150.0

    CATEGORY_MARKUPS = {
        "Textiles": 1.5, "Textiles & Handloom": 1.5,
        "Handicrafts": 1.4, "Other Handicrafts": 1.4,
        "Clay & Pottery": 1.3, "Pottery": 1.3,
        "Jewelry & Silver": 1.8, "Jewelry": 1.8,
        "Folk Paintings": 2.0, "Paintings & Art": 2.0,
        "Woodwork & Inlay": 1.5, "Woodwork": 1.5,
        "Metal Craft": 1.4, "Metalwork": 1.4,
        "Bamboo & Cane": 1.3, "Bamboo": 1.3,
        "Leather Craft": 1.4, "Leather": 1.4,
        "Default": 1.4,
    }

    COMPLEXITY_MULTIPLIERS = {
        "simple": 1.0,
        "moderate": 1.3,
        "intricate": 1.6,
    }

    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.gemini_client = None
        if self.gemini_api_key and not self.gemini_api_key.startswith("your_"):
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
                self.gemini_model = "gemini-2.5-flash-lite"
            except Exception as e:
                logger.warning(f"[PricingAssistant] Gemini init failed: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # V2 Delegate  /  V2 डेलिगेट
    # ─────────────────────────────────────────────────────────────────────────

    def _try_v2_engine(
        self,
        category: str,
        material_cost: float,
        manufacturing_hours: float,
        product_description: str,
        market_avg: float,
        market_min: float,
        market_max: float,
        comparable_count: int,
    ) -> Optional[PriceBreakdown]:
        """
        Attempt to get pricing from the MLV2 Hybrid Engine (Formula + Qwen + XGBoost).
        Returns None if PRICING_V2_URL is not set or the service is unreachable.

        Maps the V2 response back to the existing PriceBreakdown schema so that
        main.py requires zero changes.
        """
        if not PRICING_V2_URL:
            return None

        payload = {
            "category": category,
            "material_cost": material_cost,
            "manufacturing_hours": manufacturing_hours,
            "complexity_score": 3,          # default Skilled; V2 derives from score not text
            "db_avg_price": market_avg,
            "listing_views_30d": 0,
            "inquiry_count_30d": 0,
            "similar_listings_count": comparable_count,
        }

        try:
            resp = requests.post(
                f"{PRICING_V2_URL}/api/v2/pricing/suggest",
                json=payload,
                timeout=PRICING_V2_TIMEOUT_SEC,
            )
            resp.raise_for_status()
            data = resp.json()

            # Build a human-readable rationale from V2 breakdown
            bd = data.get("breakdown", {})
            notes = (
                f"[V2 Hybrid Engine] {data.get('reason', '')} "
                f"Season: {data.get('season_flag', 'NORMAL')} | "
                f"AI multiplier: {data.get('market_multiplier', 1.0):.2f}× "
                f"({data.get('confidence', 'LOW')} confidence) | "
                f"Phase 2 XGBoost: {'Applied' if data.get('phase2_applied') else 'Inactive (awaiting data)'}. "
                f"Formula: material ₹{material_cost:,.0f} + {manufacturing_hours}h labour @ ₹{self.BASE_HOURLY_LABOR_RATE}/hr "
                f"= production ₹{bd.get('production_cost', 0):,.0f} × "
                f"craft {bd.get('craft_multiplier', 1):.1f}× × complexity {bd.get('complexity_multiplier', 1):.2f}×."
            )

            # Complexity label → simple text mapping
            complexity_label = bd.get("complexity_label", "Moderate").lower()
            if "master" in complexity_label or "intricate" in complexity_label:
                complexity_text = "intricate"
            elif "basic" in complexity_label:
                complexity_text = "simple"
            else:
                complexity_text = "moderate"

            labor_cost = manufacturing_hours * self.BASE_HOURLY_LABOR_RATE

            if market_min > 0 and market_max > 0:
                comp_range = f"₹ {int(market_min):,} – ₹ {int(market_max):,}"
            else:
                retail = data.get("suggested_retail", material_cost * 2)
                comp_range = f"₹ {int(retail * 0.8):,} – ₹ {int(retail * 1.4):,}"

            logger.info(
                f"[PricingAssistant] V2 engine: retail=₹{data['suggested_retail']:.0f}, "
                f"b2b=₹{data['b2b_wholesale']:.0f}, floor=₹{data['min_breakeven']:.0f}"
            )

            return PriceBreakdown(
                base_material_cost=material_cost,
                labor_cost=labor_cost,
                suggested_retail_price=float(data["suggested_retail"]),
                suggested_b2b_price=float(data["b2b_wholesale"]),
                min_price=float(data["min_breakeven"]),
                market_avg=float(market_avg),
                market_min=float(market_min),
                market_max=float(market_max),
                complexity=complexity_text,
                competitor_range=comp_range,
                pricing_strategy_notes=notes,
                market_multiplier=data.get("market_multiplier"),
                confidence=data.get("confidence"),
                season_flag=data.get("season_flag"),
                ai_reason=data.get("reason"),
                phase2_applied=data.get("phase2_applied"),
                engine_version=data.get("engine_version", "v2.0"),
            )

        except requests.exceptions.ConnectionError:
            logger.warning(
                f"[PricingAssistant] V2 service unreachable at {PRICING_V2_URL}. "
                "Falling back to Gemini-based engine."
            )
            return None
        except requests.exceptions.Timeout:
            logger.warning(
                f"[PricingAssistant] V2 service timed out after {PRICING_V2_TIMEOUT_SEC}s. "
                "Falling back to Gemini-based engine."
            )
            return None
        except Exception as exc:
            logger.warning(f"[PricingAssistant] V2 delegate failed: {exc}. Falling back.")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # Original Gemini-based helpers (unchanged)  /  मूल Gemini-आधारित सहायक
    # ─────────────────────────────────────────────────────────────────────────

    def _analyze_image_with_gemini(self, image_bytes: bytes, description: str, category: str) -> dict:
        """
        Use Gemini Vision to extract complexity, quality signals, and craft keywords
        from the product image. Returns a dict with complexity and rationale.
        """
        if not self.gemini_client or not image_bytes:
            return {"complexity": "moderate", "rationale": ""}

        try:
            b64 = base64.b64encode(image_bytes).decode()
            prompt = f"""You are an expert appraiser of Indian handicrafts and artisan products.
Analyze this product image and description to assess pricing factors.

Category: {category}
Description: {description}

Respond ONLY in this exact JSON format:
{{
  "complexity": "simple" or "moderate" or "intricate",
  "quality_signals": "brief observation about material quality and finish",
  "craft_keywords": "2-3 keywords describing the craft style for market comparison",
  "rationale": "one sentence explaining the complexity rating"
}}

Complexity guide:
- simple: basic shape, single color, minimal detail
- moderate: some decorative elements, mixed materials, moderate skill
- intricate: fine detail, multi-step process, high skill (e.g. Patola weaving, Zardozi embroidery)
"""
            response = self.gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=[
                    types.Part.from_bytes(data=base64.b64decode(b64), mime_type="image/jpeg"),
                    types.Part.from_text(text=prompt),
                ],
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )
            return json.loads(response.text)
        except Exception as e:
            logger.warning(f"[PricingAssistant] Gemini Vision analysis failed: {e}")
            return {"complexity": "moderate", "rationale": ""}

    def _gemini_calculate(
        self,
        category: str,
        material_cost: float,
        manufacturing_hours: float,
        product_description: str,
        image_bytes: Optional[bytes],
        market_avg: float,
        market_min: float,
        market_max: float,
        comparable_count: int,
    ) -> PriceBreakdown:
        """
        Original Gemini-based pricing logic (fallback when V2 service is unavailable).
        """
        labor_cost = manufacturing_hours * self.BASE_HOURLY_LABOR_RATE
        markup = self.CATEGORY_MARKUPS.get(category, self.CATEGORY_MARKUPS["Default"])

        # Gemini Vision complexity analysis
        vision_result = self._analyze_image_with_gemini(
            image_bytes or b"", product_description, category
        )
        complexity = vision_result.get("complexity", "moderate")
        vision_rationale = vision_result.get("rationale", "")
        quality_signals = vision_result.get("quality_signals", "")
        complexity_mult = self.COMPLEXITY_MULTIPLIERS.get(complexity, 1.3)

        production_cost = material_cost + labor_cost
        cost_plus_price = production_cost * markup * complexity_mult

        if market_avg > 0:
            market_floor = market_avg * 0.85
            suggested_retail = max(cost_plus_price, market_floor)
        else:
            suggested_retail = cost_plus_price

        suggested_retail = round(suggested_retail, -1)
        suggested_b2b = round(suggested_retail * 0.75, -1)
        min_price = round(production_cost * 1.15, -1)

        if market_min > 0 and market_max > 0:
            comp_range = f"₹ {int(market_min):,} – ₹ {int(market_max):,}"
        else:
            comp_range = f"₹ {int(suggested_retail * 0.8):,} – ₹ {int(suggested_retail * 1.4):,}"

        market_note = (
            f"Benchmarked against {comparable_count} similar {category} products on KalaSetu "
            f"(avg ₹{int(market_avg):,})."
            if market_avg > 0 and comparable_count > 0
            else "No comparable products found on platform yet — using cost-plus model."
        )
        rationale = (
            f"Complexity detected: {complexity.capitalize()}. {vision_rationale} "
            f"{quality_signals} "
            f"Material cost ₹{int(material_cost):,} + {manufacturing_hours}h labor @ ₹{self.BASE_HOURLY_LABOR_RATE}/hr. "
            f"Category markup: {markup}×, complexity multiplier: {complexity_mult}×. "
            f"{market_note}"
        ).strip()

        if self.gemini_client:
            try:
                full_prompt = f"""You are a retail pricing consultant for Indian handicrafts.
Given:
- Category: {category}
- Complexity: {complexity}
- Material cost: ₹{material_cost}
- Labor: {manufacturing_hours} hours
- Platform market avg: ₹{int(market_avg) if market_avg else 'N/A'}
- Calculated suggested price: ₹{int(suggested_retail)}
- Description: {product_description[:200]}

Write a 2-sentence pricing strategy note for the artisan explaining why this price is fair and how to position it.
Respond in plain text only, no JSON."""
                resp = self.gemini_client.models.generate_content(
                    model=self.gemini_model,
                    contents=full_prompt,
                )
                rationale = resp.text.strip() + f" {market_note}"
            except Exception as e:
                logger.warning(f"[PricingAssistant] Gemini rationale generation failed: {e}")

        return PriceBreakdown(
            base_material_cost=material_cost,
            labor_cost=labor_cost,
            suggested_retail_price=float(suggested_retail),
            suggested_b2b_price=float(suggested_b2b),
            min_price=float(min_price),
            market_avg=float(market_avg),
            market_min=float(market_min),
            market_max=float(market_max),
            complexity=complexity,
            competitor_range=comp_range,
            pricing_strategy_notes=rationale,
            engine_version="v1.0-gemini",
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Public API  /  सार्वजनिक API
    # ─────────────────────────────────────────────────────────────────────────

    def calculate_suggested_price(
        self,
        category: str,
        material_cost: float,
        manufacturing_hours: float,
        product_description: str,
        image_bytes: Optional[bytes] = None,
        market_avg: float = 0.0,
        market_min: float = 0.0,
        market_max: float = 0.0,
        comparable_count: int = 0,
    ) -> PriceBreakdown:
        """
        Main pricing entry point.

        Priority:
          1. MLV2 Hybrid Engine (Formula + Qwen AI + XGBoost) — if PRICING_V2_URL is set
          2. Gemini Vision + cost-plus formula — original fallback

        Returns PriceBreakdown (unchanged schema — zero impact on main.py callers).
        """
        # ── Tier 1: MLV2 Hybrid Engine ─────────────────────────────────────
        v2_result = self._try_v2_engine(
            category=category,
            material_cost=material_cost,
            manufacturing_hours=manufacturing_hours,
            product_description=product_description,
            market_avg=market_avg,
            market_min=market_min,
            market_max=market_max,
            comparable_count=comparable_count,
        )
        if v2_result is not None:
            return v2_result

        # ── Tier 2: Original Gemini-based engine (fallback) ─────────────────
        return self._gemini_calculate(
            category=category,
            material_cost=material_cost,
            manufacturing_hours=manufacturing_hours,
            product_description=product_description,
            image_bytes=image_bytes,
            market_avg=market_avg,
            market_min=market_min,
            market_max=market_max,
            comparable_count=comparable_count,
        )
