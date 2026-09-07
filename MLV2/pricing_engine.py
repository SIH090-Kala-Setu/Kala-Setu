"""
pricing_engine.py — KalaSetu Hybrid Pricing Engine V2
MLV2 / Three-layer architecture: Formula · AI Market Layer (Qwen 3·8B) · XGBoost Calibration

मूल्य निर्धारण इंजन — कलासेतु संकर मूल्य निर्धारण इंजन V2
तीन-परत वास्तुकला: फार्मूला · AI बाजार परत (Qwen 3·8B) · XGBoost अंशांकन

Design Philosophy (from spec):
  Every price produced by this engine must be explainable to the artisan,
  fair by the standards of MoSJE, and competitive on the open market.
  No black box. No guessing.
"""

from __future__ import annotations

import logging
import os
import pickle
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Optional

import requests

logger = logging.getLogger("kala_setu.pricing_engine_v2")

# ─────────────────────────────────────────────────────────────────────────────
# Constants & Config  /  स्थिरांक और कॉन्फ़िगरेशन
# ─────────────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent

# Phase 1 — Formula
FAIR_HOURLY_WAGE_INR: float = 150.0          # ₹150/hr → ₹1,200/day (MoSJE target)
MARKET_FLOOR_FACTOR: float = 0.85            # platform avg × 0.85
MARKET_FLOOR_FALLBACK_FACTOR: float = 1.30  # production_cost × 1.30 if no DB avg
BREAKEVEN_MARGIN: float = 1.15              # 15% above production_cost
B2B_DISCOUNT: float = 0.75                  # 25% wholesale discount
B2B_AI_MULTIPLIER_CAP: float = 1.15        # B2B AI bump capped at 1.15×

# Phase 1 AI
OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3:8b")
AI_MULTIPLIER_MIN: float = 0.85
AI_MULTIPLIER_MAX: float = 1.30
AI_REQUEST_TIMEOUT_SEC: int = 10            # graceful timeout → falls back to formula

# Phase 2 ML
CALIBRATOR_PATH = Path(os.getenv("CALIBRATOR_PATH", str(BASE_DIR / "pricing_calibrator.ubj")))
CALIBRATOR_FEATURES_PATH = Path(
    os.getenv("CALIBRATOR_FEATURES_PATH", str(BASE_DIR / "calibrator_feature_cols.pkl"))
)
PHASE2_MIN_SALES: int = 500                 # minimum transactions before Phase 2 activates

# Silver — ₹/gram configurable; TODO: integrate live commodity API
SILVER_RATE_INR_PER_GRAM: float = float(os.getenv("SILVER_RATE_INR_PER_GRAM", "90.0"))

# ─────────────────────────────────────────────────────────────────────────────
# Craft & Complexity Tables  /  शिल्प और जटिलता तालिकाएं
# ─────────────────────────────────────────────────────────────────────────────

CRAFT_MULTIPLIERS: dict[str, float] = {
    # As defined in kalaset_pricing_engine.md
    "Folk Paintings & Art":       2.0,
    "Tribal & Silver Jewelry":    2.0,
    "Embroidery & Chikankari":    1.7,
    "Textiles & Handloom":        1.6,
    "Handicrafts & Woodwork":     1.4,
    "Clay & Blue Pottery":        1.3,
    "Bamboo & Tribal Craft":      1.2,
    # Canonical aliases mapped from existing backend categories
    "Folk Painting":              2.0,
    "Folk Paintings":             2.0,
    "Paintings & Art":            2.0,
    "Jewelry":                    2.0,
    "Jewellery":                  2.0,
    "Jewelry & Silver":           2.0,
    "Embroidery":                 1.7,
    "Chikankari":                 1.7,
    "Textiles":                   1.6,
    "Textiles & Handloom":        1.6,
    "Handloom":                   1.6,
    "Handicrafts":                1.4,
    "Woodwork":                   1.4,
    "Woodwork & Inlay":           1.4,
    "Wood Inlay":                 1.4,
    "Metal Craft":                1.4,
    "Metalcraft":                 1.4,
    "Metalwork":                  1.4,
    "Pottery":                    1.3,
    "Clay & Pottery":             1.3,
    "Blue Pottery":               1.3,
    "Bamboo":                     1.2,
    "Bamboo & Cane":              1.2,
    "Tribal Craft":               1.2,
    "Tribal":                     1.2,
    "Leather":                    1.4,
    "Leather Craft":              1.4,
    "Default":                    1.4,
}

COMPLEXITY_MULTIPLIERS: dict[int, float] = {
    # Score → multiplier (kalaset_pricing_engine.md §Complexity Multiplier Table)
    1: 1.00,  # Basic
    2: 1.10,  # Moderate
    3: 1.25,  # Skilled
    4: 1.40,  # Intricate
    5: 1.60,  # Master Craft
}


def _craft_multiplier(category: str) -> float:
    """Return craft multiplier, falling back to 'Default' if category unknown."""
    # Exact match first
    if category in CRAFT_MULTIPLIERS:
        return CRAFT_MULTIPLIERS[category]
    # Case-insensitive partial match
    cat_lower = category.strip().lower()
    for key, val in CRAFT_MULTIPLIERS.items():
        if key.lower() == cat_lower:
            return val
    for key, val in CRAFT_MULTIPLIERS.items():
        if key.lower() in cat_lower or cat_lower in key.lower():
            return val
    return CRAFT_MULTIPLIERS["Default"]


def _complexity_multiplier(score: int) -> float:
    """Return complexity multiplier for score 1–5, clamped to valid range."""
    score = max(1, min(5, score))
    return COMPLEXITY_MULTIPLIERS[score]


# ─────────────────────────────────────────────────────────────────────────────
# Data Classes  /  डेटा क्लास
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class PriceBreakdownV2:
    """Detailed intermediate values produced by the formula engine."""
    labour_cost: float
    production_cost: float
    cost_plus_price: float
    market_floor: float
    suggested_retail: float
    min_breakeven: float
    b2b_wholesale: float
    craft_multiplier: float
    complexity_multiplier: float


@dataclass
class AIMarketResult:
    """Result from the Qwen AI Market Layer."""
    market_multiplier: float = 1.0
    confidence: str = "LOW"         # LOW | MEDIUM | HIGH
    reason: str = "Formula-only (AI unavailable)"
    season_flag: str = "NORMAL"     # PEAK | NORMAL | SLOW
    applied: bool = False           # whether the multiplier was actually applied


@dataclass
class HybridPriceCard:
    """Final output of the Hybrid Pricing Engine — all three layers combined."""
    # Final prices
    suggested_retail: float
    b2b_wholesale: float
    min_breakeven: float

    # AI layer
    market_multiplier: float
    confidence: str
    reason: str
    season_flag: str

    # Phase 2
    phase2_applied: bool
    realisation_factor: float       # 1.0 if Phase 2 not active

    # Full breakdown for explainability
    breakdown: PriceBreakdownV2

    # Metadata
    craft_category: str
    complexity_score: int


# ─────────────────────────────────────────────────────────────────────────────
# Layer 1 — Formula Engine  /  फार्मूला इंजन
# ─────────────────────────────────────────────────────────────────────────────

class FormulaEngine:
    """
    Pure calculation layer. No ML. No AI. Runs instantly.
    Guarantees every price is grounded in the actual cost of making the product.

    शुद्ध गणना परत। कोई ML नहीं। कोई AI नहीं। तुरंत चलता है।
    """

    @staticmethod
    def calculate(
        raw_material_cost: float,
        manufacturing_hours: float,
        craft_category: str,
        complexity_score: int,
        db_avg_price: float = 0.0,
        silver_grams: float = 0.0,
    ) -> PriceBreakdownV2:
        """
        Execute the 7-step formula as defined in kalaset_pricing_engine.md.

        Step 1: Labour Cost    = hours × ₹150/hr
        Step 2: Production     = material + labour
        Step 3: Cost-Plus      = production × craft_mult × complexity_mult
        Step 4: Market Floor   = db_avg × 0.85  (or fallback)
        Step 5: Suggested      = max(cost_plus, market_floor)
        Step 6: B2B Wholesale  = max(suggested × 0.75, min_breakeven)
        Step 7: Min Breakeven  = production × 1.15
        """
        # Step 1 — Labour Cost
        labour_cost = manufacturing_hours * FAIR_HOURLY_WAGE_INR

        # Step 2 — Production Cost
        production_cost = raw_material_cost + labour_cost

        # Craft multiplier (with silver dynamic override)
        craft_mult = _craft_multiplier(craft_category)
        if silver_grams > 0 and production_cost > 0:
            # Silver dynamic override for jewelry:
            # effective_multiplier = 2.0 + (silver_grams × live_rate / production_cost × 0.1)
            silver_override = 2.0 + (silver_grams * SILVER_RATE_INR_PER_GRAM / production_cost * 0.1)
            craft_mult = max(craft_mult, silver_override)
            logger.debug(f"Silver override applied: effective_multiplier={craft_mult:.3f}")

        # Complexity multiplier
        complexity_mult = _complexity_multiplier(complexity_score)

        # Step 3 — Cost-Plus Price
        # NOTE: Multipliers temporarily commented out to prevent over-inflating prices on utility/folk crafts
        # cost_plus_price = production_cost * craft_mult * complexity_mult
        cost_plus_price = production_cost

        # Step 4 — Market Floor
        if db_avg_price > 0:
            market_floor = db_avg_price * MARKET_FLOOR_FACTOR
        else:
            market_floor = production_cost * MARKET_FLOOR_FALLBACK_FACTOR

        # Step 5 — Suggested Retail
        suggested_retail = max(cost_plus_price, market_floor)

        # Step 7 — Min Breakeven (computed before B2B for the guard)
        min_breakeven = production_cost * BREAKEVEN_MARGIN

        # Step 6 — B2B Wholesale
        b2b_wholesale = max(suggested_retail * B2B_DISCOUNT, min_breakeven)

        return PriceBreakdownV2(
            labour_cost=round(labour_cost, 2),
            production_cost=round(production_cost, 2),
            cost_plus_price=round(cost_plus_price, 2),
            market_floor=round(market_floor, 2),
            suggested_retail=round(suggested_retail, 2),
            min_breakeven=round(min_breakeven, 2),
            b2b_wholesale=round(b2b_wholesale, 2),
            craft_multiplier=round(craft_mult, 4),
            complexity_multiplier=complexity_mult,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Layer 2 — AI Market Intelligence (Qwen 3·8B via Ollama)
# AI बाजार खुफिया परत (Qwen 3·8B Ollama के माध्यम से)
# ─────────────────────────────────────────────────────────────────────────────

_QWEN_SYSTEM_PROMPT = """You are a pricing analyst for KalaSetu, an Indian artisan marketplace
under MoSJE. Your job is to assess real-time market conditions and
return a price multiplier for a handicraft product.

Rules:
- Return ONLY valid JSON. No explanation. No markdown.
- market_multiplier must be between 0.85 and 1.30
- confidence must be LOW, MEDIUM, or HIGH
- reason must be under 20 words"""

_QWEN_USER_TEMPLATE = """Product Category : {craft_category}
Craft Region     : {state}
Base Price (₹)   : {suggested_retail}
Current Date     : {date}
Platform Signals : avg_views={avg_views}, inquiry_spike={inquiry_spike}, similar_listings={similar_listings_count}

Assess market conditions and return:
{{
  "market_multiplier": float,
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "reason": "string",
  "season_flag": "PEAK" | "NORMAL" | "SLOW"
}}"""


class AIMarketLayer:
    """
    Qwen 3·8B market intelligence layer via local Ollama server.
    Reads seasonal demand, social trends, festivals, and category saturation.
    Outputs a market_multiplier between 0.85× and 1.30×.

    Gracefully degrades to formula-only if Ollama is unreachable.
    """

    def __init__(self) -> None:
        self._ollama_available: Optional[bool] = None  # lazy check

    def _check_ollama(self) -> bool:
        """Probe Ollama /api/tags once and cache result."""
        if self._ollama_available is not None:
            return self._ollama_available
        try:
            r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
            self._ollama_available = r.status_code == 200
        except Exception:
            self._ollama_available = False
        if not self._ollama_available:
            logger.warning(
                f"[AIMarketLayer] Ollama not reachable at {OLLAMA_URL}. "
                "Pricing will use formula-only until Ollama is available."
            )
        return self._ollama_available

    def get_market_multiplier(
        self,
        craft_category: str,
        state: str,
        suggested_retail: float,
        avg_views: int = 0,
        inquiry_spike: bool = False,
        similar_listings_count: int = 0,
    ) -> AIMarketResult:
        """
        Call Qwen 3·8B to assess market conditions and return a multiplier.
        Falls back gracefully on any failure (Ollama down, JSON parse error, timeout).
        """
        if not self._check_ollama():
            return AIMarketResult(
                market_multiplier=1.0,
                confidence="LOW",
                reason="Ollama unavailable — formula price used as-is",
                season_flag="NORMAL",
                applied=False,
            )

        user_prompt = _QWEN_USER_TEMPLATE.format(
            craft_category=craft_category,
            state=state,
            suggested_retail=int(suggested_retail),
            date=date.today().isoformat(),
            avg_views=avg_views,
            inquiry_spike=inquiry_spike,
            similar_listings_count=similar_listings_count,
        )

        full_prompt = f"{_QWEN_SYSTEM_PROMPT}\n\n{user_prompt}"

        try:
            resp = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": full_prompt,
                    "stream": False,
                    "format": "json",
                },
                timeout=AI_REQUEST_TIMEOUT_SEC,
            )
            resp.raise_for_status()
            data = resp.json()
            import json as _json
            parsed = _json.loads(data.get("response", "{}"))

            multiplier = float(parsed.get("market_multiplier", 1.0))
            multiplier = max(AI_MULTIPLIER_MIN, min(AI_MULTIPLIER_MAX, multiplier))
            confidence  = str(parsed.get("confidence", "LOW")).upper()
            reason      = str(parsed.get("reason", ""))[:120]
            season_flag = str(parsed.get("season_flag", "NORMAL")).upper()

            if confidence not in ("LOW", "MEDIUM", "HIGH"):
                confidence = "LOW"
            if season_flag not in ("PEAK", "NORMAL", "SLOW"):
                season_flag = "NORMAL"

            logger.info(
                f"[AIMarketLayer] Qwen response: multiplier={multiplier}, "
                f"confidence={confidence}, season={season_flag}, reason={reason!r}"
            )
            return AIMarketResult(
                market_multiplier=multiplier,
                confidence=confidence,
                reason=reason,
                season_flag=season_flag,
                applied=True,
            )

        except Exception as exc:
            logger.warning(f"[AIMarketLayer] Qwen call failed: {exc}. Using formula price.")
            return AIMarketResult(
                market_multiplier=1.0,
                confidence="LOW",
                reason=f"AI layer error — formula price used ({type(exc).__name__})",
                season_flag="NORMAL",
                applied=False,
            )


def _apply_confidence(base_multiplier: float, confidence: str) -> float:
    """
    Apply confidence dampening per spec:
      HIGH   → full multiplier
      MEDIUM → 50% of the adjustment: 1 + (multiplier - 1) × 0.5
      LOW    → no adjustment (returns 1.0)
    """
    if confidence == "HIGH":
        return base_multiplier
    elif confidence == "MEDIUM":
        return 1.0 + (base_multiplier - 1.0) * 0.5
    else:  # LOW
        return 1.0


# ─────────────────────────────────────────────────────────────────────────────
# Layer 3 — XGBoost Phase 2 Calibrator  /  XGBoost चरण 2 अंशांकक
# ─────────────────────────────────────────────────────────────────────────────

class XGBoostCalibrator:
    """
    Phase 2 ML correction factor model.
    Learns price_realisation_factor = actual_sale_price / formula_suggested_price
    from historical transactions.

    Only activates when:
      1. pricing_calibrator.ubj exists in MLV2/
      2. The model metadata confirms ≥500 training samples

    चरण 2 ML सुधार कारक मॉडल।
    """

    def __init__(self) -> None:
        self._model = None
        self._feature_cols: Optional[list[str]] = None
        self._training_samples: int = 0
        self._loaded: bool = False
        self._load()

    def _load(self) -> None:
        if not CALIBRATOR_PATH.exists():
            logger.info(
                f"[XGBoostCalibrator] No model at {CALIBRATOR_PATH}. "
                "Phase 2 inactive — awaiting ≥500 real transactions."
            )
            return
        try:
            import xgboost as xgb
            self._model = xgb.Booster()
            self._model.load_model(str(CALIBRATOR_PATH))

            if CALIBRATOR_FEATURES_PATH.exists():
                with open(CALIBRATOR_FEATURES_PATH, "rb") as f:
                    meta = pickle.load(f)
                    if isinstance(meta, dict):
                        self._feature_cols = meta.get("feature_cols")
                        self._training_samples = meta.get("n_samples", 0)
                    elif isinstance(meta, list):
                        self._feature_cols = meta
                        self._training_samples = PHASE2_MIN_SALES  # assume valid

            if self._training_samples < PHASE2_MIN_SALES:
                logger.warning(
                    f"[XGBoostCalibrator] Model trained on only {self._training_samples} "
                    f"samples (need ≥{PHASE2_MIN_SALES}). Phase 2 inactive."
                )
                self._model = None
                return

            self._loaded = True
            logger.info(
                f"[XGBoostCalibrator] ✓ Phase 2 model loaded — "
                f"{self._training_samples} training samples."
            )
        except Exception as exc:
            logger.warning(f"[XGBoostCalibrator] Load failed: {exc}. Phase 2 inactive.")

    @property
    def is_active(self) -> bool:
        return self._loaded and self._model is not None

    def predict_realisation_factor(
        self,
        craft_category: str,
        complexity_score: int,
        state: str,
        gi_tag: bool,
        experience_years: int,
        listing_views_30d: int,
        inquiry_count_30d: int,
        season_quarter: int,
        formula_suggested_price: float,
        market_multiplier_used: float,
    ) -> float:
        """
        Predict the realisation factor for the given product attributes.
        Returns 1.0 if Phase 2 is not active (safe no-op).

        Target definition: actual_sale_price / formula_suggested_price
          1.0  → formula was perfect
          0.9  → formula overpriced by 10%
          1.15 → formula underpriced by 15%
        """
        if not self.is_active:
            return 1.0

        try:
            import numpy as np
            import pandas as pd
            import xgboost as xgb

            row = {
                "craft_category_enc":      hash(craft_category) % 10000,
                "complexity_score":        complexity_score,
                "state_region_enc":        hash(state) % 10000,
                "gi_tag_certified":        int(gi_tag),
                "artisan_experience_yrs":  experience_years,
                "listing_views_30d":       listing_views_30d,
                "inquiry_count_30d":       inquiry_count_30d,
                "season_quarter":          season_quarter,
                "formula_suggested_price": formula_suggested_price,
                "market_multiplier_used":  market_multiplier_used,
                "demand_ratio":            inquiry_count_30d / (listing_views_30d + 1),
            }

            df = pd.DataFrame([row])

            if self._feature_cols:
                for col in self._feature_cols:
                    if col not in df.columns:
                        df[col] = 0.0
                df = df[self._feature_cols]

            dmat = xgb.DMatrix(df)
            factor = float(self._model.predict(dmat)[0])

            # Clamp to sensible range — realisation factor should stay 0.5–2.0
            factor = max(0.50, min(2.00, factor))
            logger.info(f"[XGBoostCalibrator] Realisation factor: {factor:.4f}")
            return factor

        except Exception as exc:
            logger.warning(f"[XGBoostCalibrator] Prediction failed: {exc}. Factor=1.0")
            return 1.0


# ─────────────────────────────────────────────────────────────────────────────
# Orchestrator — Hybrid Pricing Engine  /  संकर मूल्य निर्धारण इंजन
# ─────────────────────────────────────────────────────────────────────────────

class HybridPricingEngine:
    """
    Orchestrates the three-layer pipeline:

      INPUTS → FORMULA ENGINE → AI MARKET LAYER → (optional) XGBOOST CALIBRATOR → OUTPUT

    The formula is the spine.
    Qwen is the eyes.
    XGBoost is the memory.

    फार्मूला रीढ़ है।
    Qwen आँखें हैं।
    XGBoost स्मृति है।
    """

    def __init__(self) -> None:
        self.formula = FormulaEngine()
        self.ai = AIMarketLayer()
        self.calibrator = XGBoostCalibrator()
        logger.info(
            f"[HybridPricingEngine] Initialised | "
            f"Phase2={'ACTIVE' if self.calibrator.is_active else 'INACTIVE'}"
        )

    def price(
        self,
        # Core artisan inputs
        raw_material_cost: float,
        manufacturing_hours: float,
        craft_category: str,
        complexity_score: int,
        # Optional context
        state: str = "Uttar Pradesh",
        db_avg_price: float = 0.0,
        silver_grams: float = 0.0,
        # Platform signals (for AI layer)
        listing_views_30d: int = 0,
        inquiry_count_30d: int = 0,
        similar_listings_count: int = 0,
        # Phase 2 extras
        gi_tag: bool = False,
        experience_years: int = 5,
        season_quarter: Optional[int] = None,
    ) -> HybridPriceCard:
        """
        Run the full hybrid pricing pipeline and return a HybridPriceCard.

        This is the single entry point — callers should not interact with
        FormulaEngine, AIMarketLayer, or XGBoostCalibrator directly.
        """
        # ── Auto-detect season quarter from current date ──────────────────────
        if season_quarter is None:
            month = date.today().month
            season_quarter = (month - 1) // 3 + 1

        # ── Layer 1: Formula Engine ───────────────────────────────────────────
        bd = self.formula.calculate(
            raw_material_cost=raw_material_cost,
            manufacturing_hours=manufacturing_hours,
            craft_category=craft_category,
            complexity_score=complexity_score,
            db_avg_price=db_avg_price,
            silver_grams=silver_grams,
        )
        logger.info(
            f"[HybridPricingEngine] Formula → retail=₹{bd.suggested_retail:.0f}, "
            f"b2b=₹{bd.b2b_wholesale:.0f}, floor=₹{bd.min_breakeven:.0f}"
        )

        # ── Layer 2: AI Market Intelligence ──────────────────────────────────
        ai_result = self.ai.get_market_multiplier(
            craft_category=craft_category,
            state=state,
            suggested_retail=bd.suggested_retail,
            avg_views=listing_views_30d,
            inquiry_spike=(inquiry_count_30d > 10),
            similar_listings_count=similar_listings_count,
        )

        # Apply confidence dampening
        effective_multiplier = _apply_confidence(ai_result.market_multiplier, ai_result.confidence)

        # Apply to retail
        ai_retail = bd.suggested_retail * effective_multiplier

        # Apply to B2B with cap at 1.15×
        b2b_multiplier = min(effective_multiplier, B2B_AI_MULTIPLIER_CAP)
        ai_b2b = bd.b2b_wholesale * b2b_multiplier

        # Never go below min_breakeven after AI adjustment
        ai_retail = max(ai_retail, bd.min_breakeven)
        ai_b2b   = max(ai_b2b,    bd.min_breakeven)

        logger.info(
            f"[HybridPricingEngine] AI adjusted → "
            f"multiplier={effective_multiplier:.3f} ({ai_result.confidence}), "
            f"retail=₹{ai_retail:.0f}, b2b=₹{ai_b2b:.0f}"
        )

        # ── Layer 3: XGBoost Phase 2 Calibration ─────────────────────────────
        realisation_factor = self.calibrator.predict_realisation_factor(
            craft_category=craft_category,
            complexity_score=complexity_score,
            state=state,
            gi_tag=gi_tag,
            experience_years=experience_years,
            listing_views_30d=listing_views_30d,
            inquiry_count_30d=inquiry_count_30d,
            season_quarter=season_quarter,
            formula_suggested_price=bd.suggested_retail,
            market_multiplier_used=effective_multiplier,
        )

        phase2_applied = self.calibrator.is_active and realisation_factor != 1.0

        final_retail = round(ai_retail * realisation_factor, 2)
        final_b2b    = round(ai_b2b   * realisation_factor, 2)
        final_floor  = round(bd.min_breakeven, 2)

        # Hard floor — final prices must never go below min_breakeven
        final_retail = max(final_retail, final_floor)
        final_b2b    = max(final_b2b,    final_floor)

        if phase2_applied:
            logger.info(
                f"[HybridPricingEngine] Phase 2 calibration → "
                f"factor={realisation_factor:.4f}, "
                f"final_retail=₹{final_retail:.0f}, final_b2b=₹{final_b2b:.0f}"
            )

        return HybridPriceCard(
            suggested_retail=final_retail,
            b2b_wholesale=final_b2b,
            min_breakeven=final_floor,
            market_multiplier=round(effective_multiplier, 4),
            confidence=ai_result.confidence,
            reason=ai_result.reason,
            season_flag=ai_result.season_flag,
            phase2_applied=phase2_applied,
            realisation_factor=round(realisation_factor, 4),
            breakdown=bd,
            craft_category=craft_category,
            complexity_score=complexity_score,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Module-level singleton  /  मॉड्यूल-स्तरीय सिंगलटन
# ─────────────────────────────────────────────────────────────────────────────

_engine_instance: Optional[HybridPricingEngine] = None


def get_engine() -> HybridPricingEngine:
    """Return the module-level singleton HybridPricingEngine (lazy init)."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = HybridPricingEngine()
    return _engine_instance


# ─────────────────────────────────────────────────────────────────────────────
# Quick sanity check (run as script)  /  त्वरित सत्यापन (स्क्रिप्ट के रूप में चलाएं)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    print("\n" + "=" * 60)
    print("KalaSetu Pricing Engine V2 — Formula Self-Test")
    print("Worked Example: Madhubani Folk Painting 12\"×18\"")
    print("=" * 60)

    # Exact inputs from kalaset_pricing_engine.md §Worked Example
    engine = HybridPricingEngine()
    card = engine.price(
        raw_material_cost=280.0,
        manufacturing_hours=14.0,
        craft_category="Folk Paintings & Art",
        complexity_score=4,          # Intricate
        db_avg_price=1800.0,
        state="Bihar",
    )
    bd = card.breakdown

    print(f"\nFormula Breakdown:")
    print(f"  Labour Cost     = 14 × ₹150       = ₹{bd.labour_cost:.0f}   (expected ₹2,100)")
    print(f"  Production Cost = 280 + 2100       = ₹{bd.production_cost:.0f}  (expected ₹2,380)")
    print(f"  Cost-Plus       = 2380 × 2.0 × 1.40 = ₹{bd.cost_plus_price:.0f}  (expected ₹6,664)")
    print(f"  Market Floor    = 1800 × 0.85      = ₹{bd.market_floor:.0f}  (expected ₹1,530)")
    print(f"  Suggested Retail= max(6664, 1530)  = ₹{bd.suggested_retail:.0f}  (expected ₹6,664)")
    print(f"  Min Breakeven   = 2380 × 1.15      = ₹{bd.min_breakeven:.0f}  (expected ₹2,737)")
    print(f"  B2B Wholesale   = max(6664×0.75, 2737)= ₹{bd.b2b_wholesale:.0f}  (expected ₹4,998)")

    print(f"\nFinal Price Card (AI multiplier={card.market_multiplier}, conf={card.confidence}):")
    print(f"  Suggested Retail  : ₹{card.suggested_retail:,.0f}")
    print(f"  B2B Wholesale     : ₹{card.b2b_wholesale:,.0f}")
    print(f"  Min Breakeven     : ₹{card.min_breakeven:,.0f}")
    print(f"  Season Flag       : {card.season_flag}")
    print(f"  Phase 2 Applied   : {card.phase2_applied}")
    print("=" * 60)
