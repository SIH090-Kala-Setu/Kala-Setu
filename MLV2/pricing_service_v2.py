"""
pricing_service_v2.py — KalaSetu Hybrid Pricing Engine V2
FastAPI Microservice — runs standalone on port 8002

मूल्य निर्धारण सेवा V2 — FastAPI माइक्रोसर्विस

Endpoints:
  POST /api/v2/pricing/suggest   — full hybrid price suggestion
  GET  /api/v2/pricing/health    — service health + layer status

Run:
  uvicorn pricing_service_v2:app --host 0.0.0.0 --port 8002 --reload
"""

from __future__ import annotations

import logging
import os
from datetime import date
from pathlib import Path
from typing import Dict, Optional

from fastapi import FastAPI, APIRouter, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator

from pricing_engine import (
    HybridPricingEngine,
    HybridPriceCard,
    PriceBreakdownV2,
    OLLAMA_URL,
    OLLAMA_MODEL,
    CALIBRATOR_PATH,
    PHASE2_MIN_SALES,
    get_engine,
)

# ─────────────────────────────────────────────────────────────────────────────
# Logging  /  लॉगिंग
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("kala_setu.pricing_service_v2")

# ─────────────────────────────────────────────────────────────────────────────
# Request / Response Schemas (Pydantic v2)
# ─────────────────────────────────────────────────────────────────────────────

VALID_CATEGORIES = [
    "Folk Paintings & Art", "Tribal & Silver Jewelry", "Embroidery & Chikankari",
    "Textiles & Handloom", "Handicrafts & Woodwork", "Clay & Blue Pottery",
    "Bamboo & Tribal Craft",
    # Canonical aliases accepted from existing backend
    "Folk Painting", "Folk Paintings", "Paintings & Art",
    "Jewelry", "Jewellery", "Jewelry & Silver",
    "Textiles", "Handloom",
    "Handicrafts", "Woodwork", "Woodwork & Inlay", "Wood Inlay",
    "Metal Craft", "Metalcraft", "Metalwork",
    "Pottery", "Clay & Pottery", "Blue Pottery",
    "Bamboo", "Bamboo & Cane", "Tribal Craft", "Tribal",
    "Leather", "Leather Craft",
]

COMPLEXITY_LABELS = {1: "Basic", 2: "Moderate", 3: "Skilled", 4: "Intricate", 5: "Master Craft"}

INDIAN_STATES = [
    "Uttar Pradesh", "Rajasthan", "West Bengal", "Odisha", "Bihar",
    "Madhya Pradesh", "Gujarat", "Maharashtra", "Tamil Nadu", "Kerala",
    "Karnataka", "Andhra Pradesh", "Telangana", "Punjab", "Haryana",
    "Jharkhand", "Chhattisgarh", "Assam", "Manipur", "Nagaland",
    "Mizoram", "Tripura", "Meghalaya", "Arunachal Pradesh", "Sikkim",
    "Uttarakhand", "Himachal Pradesh", "Jammu and Kashmir", "Delhi", "Goa",
]


class PriceSuggestRequest(BaseModel):
    """
    Input schema for POST /api/v2/pricing/suggest
    Matches artisan onboarding form fields + optional context signals.
    """
    # ── Core artisan inputs (required) ──
    category: str = Field(
        ...,
        description="Craft category (e.g. 'Folk Paintings & Art', 'Textiles & Handloom')",
        examples=["Folk Paintings & Art"],
    )
    material_cost: float = Field(
        ..., gt=0,
        description="Raw material cost in INR",
        examples=[280.0],
    )
    manufacturing_hours: float = Field(
        ..., gt=0,
        description="Actual hours spent crafting the product",
        examples=[14.0],
    )
    complexity_score: int = Field(
        3, ge=1, le=5,
        description="Product complexity: 1=Basic, 2=Moderate, 3=Skilled, 4=Intricate, 5=Master Craft",
        examples=[4],
    )

    # ── Optional context ──
    state: str = Field("Uttar Pradesh", description="Indian state where artisan is based")
    db_avg_price: float = Field(
        0.0, ge=0,
        description="Platform DB average price for this category (₹). 0 = no data yet",
    )
    silver_grams: float = Field(
        0.0, ge=0,
        description="Silver content in grams (for jewelry — activates dynamic silver override)",
    )

    # ── Platform signals for AI Market Layer ──
    listing_views_30d: int   = Field(0, ge=0, description="Product listing views in last 30 days")
    inquiry_count_30d: int   = Field(0, ge=0, description="Inquiries received in last 30 days")
    similar_listings_count: int = Field(0, ge=0, description="Count of similar active listings on platform")

    # ── Phase 2 extras ──
    gi_tag: bool = Field(False, description="Whether product has GI tag certification")
    experience_years: int = Field(5, ge=0, le=60, description="Artisan years of experience")
    season_quarter: Optional[int] = Field(
        None, ge=1, le=4,
        description="Season quarter 1–4. Auto-detected from current date if omitted",
    )

    @field_validator("category", mode="before")
    @classmethod
    def normalise_category(cls, v: str) -> str:
        if not v:
            return "Textiles & Handloom"
        return str(v).strip()

    model_config = {
        "json_schema_extra": {
            "example": {
                "category": "Folk Paintings & Art",
                "material_cost": 280.0,
                "manufacturing_hours": 14.0,
                "complexity_score": 4,
                "state": "Bihar",
                "db_avg_price": 1800.0,
                "listing_views_30d": 120,
                "inquiry_count_30d": 8,
                "similar_listings_count": 35,
            }
        }
    }


class PriceBreakdownOut(BaseModel):
    """Formula engine intermediate values — for artisan explainability."""
    labour_cost: float
    production_cost: float
    cost_plus_price: float
    market_floor: float
    formula_suggested_retail: float
    min_breakeven: float
    formula_b2b_wholesale: float
    craft_multiplier: float
    complexity_multiplier: float
    complexity_label: str


class PriceSuggestResponse(BaseModel):
    """
    Full hybrid price card — output of POST /api/v2/pricing/suggest

    Every field has a plain-language description so artisans understand
    where their price comes from. No black box.
    """
    # ── Final prices ──
    suggested_retail: float = Field(..., description="Recommended retail price (₹)")
    b2b_wholesale: float    = Field(..., description="Bulk/wholesale price (₹)")
    min_breakeven: float    = Field(..., description="Absolute floor — never sell below this (₹)")

    # ── AI Market Layer ──
    market_multiplier: float = Field(..., description="AI market adjustment factor applied")
    confidence: str          = Field(..., description="AI confidence: LOW | MEDIUM | HIGH")
    reason: str              = Field(..., description="AI reasoning (≤20 words)")
    season_flag: str         = Field(..., description="Season context: PEAK | NORMAL | SLOW")
    ai_applied: bool         = Field(..., description="Whether AI multiplier was applied")

    # ── Phase 2 ──
    phase2_applied: bool      = Field(..., description="Whether XGBoost calibration was applied")
    realisation_factor: float = Field(..., description="XGBoost correction factor (1.0 = no change)")

    # ── Explainability breakdown ──
    breakdown: PriceBreakdownOut = Field(..., description="Step-by-step formula values")

    # ── Metadata ──
    craft_category: str  = Field(..., description="Normalised craft category used")
    complexity_score: int = Field(..., description="Complexity score used (1–5)")
    engine_version: str  = Field("v2.0", description="Pricing engine version")


def _build_response(card: HybridPriceCard, ai_applied: bool) -> PriceSuggestResponse:
    """Map HybridPriceCard → PriceSuggestResponse."""
    bd = card.breakdown
    return PriceSuggestResponse(
        suggested_retail=card.suggested_retail,
        b2b_wholesale=card.b2b_wholesale,
        min_breakeven=card.min_breakeven,
        market_multiplier=card.market_multiplier,
        confidence=card.confidence,
        reason=card.reason,
        season_flag=card.season_flag,
        ai_applied=ai_applied,
        phase2_applied=card.phase2_applied,
        realisation_factor=card.realisation_factor,
        breakdown=PriceBreakdownOut(
            labour_cost=bd.labour_cost,
            production_cost=bd.production_cost,
            cost_plus_price=bd.cost_plus_price,
            market_floor=bd.market_floor,
            formula_suggested_retail=bd.suggested_retail,
            min_breakeven=bd.min_breakeven,
            formula_b2b_wholesale=bd.b2b_wholesale,
            craft_multiplier=bd.craft_multiplier,
            complexity_multiplier=bd.complexity_multiplier,
            complexity_label=COMPLEXITY_LABELS.get(card.complexity_score, "Unknown"),
        ),
        craft_category=card.craft_category,
        complexity_score=card.complexity_score,
        engine_version="v2.0",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Router  /  राउटर
# ─────────────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/v2/pricing", tags=["Pricing Engine V2"])


@router.post(
    "/suggest",
    response_model=PriceSuggestResponse,
    summary="Hybrid price suggestion (Formula + AI + XGBoost)",
    description=(
        "Runs the three-layer KalaSetu Hybrid Pricing Engine:\n\n"
        "**Layer 1** — Formula Engine (pure math, always runs)\n\n"
        "**Layer 2** — Qwen 3·8B AI Market Intelligence (seasonal + trend signals)\n\n"
        "**Layer 3** — XGBoost Calibration (Phase 2, activates after ≥500 real sales)\n\n"
        "Returns a full price card with retail price, B2B wholesale, minimum breakeven, "
        "AI market context, and a step-by-step formula breakdown for artisan explainability."
    ),
    status_code=status.HTTP_200_OK,
)
async def suggest_price(request: PriceSuggestRequest) -> PriceSuggestResponse:
    """
    POST /api/v2/pricing/suggest

    Full three-layer hybrid pricing pipeline.
    Always returns a price — never raises 4xx/5xx for missing AI or XGBoost.
    """
    engine = get_engine()

    try:
        card = engine.price(
            raw_material_cost=request.material_cost,
            manufacturing_hours=request.manufacturing_hours,
            craft_category=request.category,
            complexity_score=request.complexity_score,
            state=request.state,
            db_avg_price=request.db_avg_price,
            silver_grams=request.silver_grams,
            listing_views_30d=request.listing_views_30d,
            inquiry_count_30d=request.inquiry_count_30d,
            similar_listings_count=request.similar_listings_count,
            gi_tag=request.gi_tag,
            experience_years=request.experience_years,
            season_quarter=request.season_quarter,
        )
    except Exception as exc:
        logger.exception(f"Unexpected engine error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pricing engine error: {exc}",
        )

    ai_applied = card.confidence != "LOW" or card.market_multiplier != 1.0
    return _build_response(card, ai_applied=ai_applied)


@router.get("/health", summary="Service health check")
async def health() -> Dict:
    """
    GET /api/v2/pricing/health

    Returns the live status of each engine layer.
    """
    import requests as _req

    engine = get_engine()

    # Check Ollama
    ollama_ok = False
    try:
        r = _req.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        ollama_ok = r.status_code == 200
    except Exception:
        pass

    # Check Phase 2
    phase2_model_exists = CALIBRATOR_PATH.exists()
    phase2_active = engine.calibrator.is_active

    return {
        "status": "healthy",
        "engine_version": "v2.0",
        "layers": {
            "formula_engine": {
                "status": "active",
                "note": "Always running — formula-based fair price"
            },
            "ai_market_layer": {
                "status": "active" if ollama_ok else "degraded",
                "ollama_url": OLLAMA_URL,
                "model": OLLAMA_MODEL,
                "note": "Degraded = formula-only pricing (no Ollama)" if not ollama_ok else "Qwen ready",
            },
            "xgboost_calibrator": {
                "status": "active" if phase2_active else "inactive",
                "model_exists": phase2_model_exists,
                "training_samples": engine.calibrator._training_samples,
                "min_required": PHASE2_MIN_SALES,
                "note": (
                    "Phase 2 active" if phase2_active
                    else f"Waiting for ≥{PHASE2_MIN_SALES} real transactions to train"
                ),
            },
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App  /  FastAPI ऐप
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="KalaSetu Pricing Engine V2",
    description=(
        "Hybrid three-layer pricing engine for Indian artisan products.\n\n"
        "Ministry of Social Justice and Empowerment (MoSJE) · KalaSetu Platform\n\n"
        "**Architecture:** Formula Engine → Qwen 3·8B AI Market Layer → XGBoost Phase 2 Calibrator"
    ),
    version="2.0.0",
    contact={"name": "KalaSetu ML Team", "url": "https://kalasetu.gov.in"},
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup() -> None:
    """Pre-warm the engine singleton on startup."""
    logger.info("KalaSetu Pricing Service V2 starting up...")
    try:
        engine = get_engine()
        logger.info(
            f"✓ Engine ready | Phase2={'ACTIVE' if engine.calibrator.is_active else 'INACTIVE'}"
        )
    except Exception as exc:
        logger.error(f"Engine startup warning: {exc}")


@app.get("/", include_in_schema=False)
async def root() -> Dict:
    return {
        "service": "KalaSetu Pricing Engine V2",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/v2/pricing/health",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Entrypoint  /  प्रवेश बिंदु
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "pricing_service_v2:app",
        host="0.0.0.0",
        port=int(os.getenv("PRICING_V2_PORT", "8002")),
        reload=True,
        log_level="info",
    )
