"""Interactive / scriptable test runner for KalaSetu MLV2 Pricing Engine.

Usage:
  1) Interactive prompt:
     python test_pricing.py

  2) Quick one-liner via CLI flags:
     python test_pricing.py --material 150 --hours 2.5 --category Bamboo --complexity 3 --name "Handcrafted Bamboo Flute"
"""

import argparse
import json
import sys
from pprint import pprint

from pricing_engine import get_engine, FormulaEngine


def run_test(
    product_name: str,
    raw_material_cost: float,
    manufacturing_hours: float,
    craft_category: str,
    complexity_score: int,
    db_avg_price: float = 0.0,
    artisan_district: str = "Unknown",
    artisan_state: str = "India",
    festival_season: str = "none",
    silver_grams: float = 0.0,
    gi_tagged: bool = False,
):
    print("\n" + "=" * 60)
    print(f"[TESTING PRODUCT]: {product_name}")
    print("=" * 60)
    print(f"  * Material Cost      : Rs.{raw_material_cost:.2f}")
    print(f"  * Labour Hours       : {manufacturing_hours} hrs")
    print(f"  * Category           : {craft_category}")
    print(f"  * Complexity Score   : {complexity_score} / 5")
    print(f"  * Market Avg (DB)    : Rs.{db_avg_price:.2f}")
    print(f"  * GI Tagged          : {gi_tagged}")
    print(f"  * Silver Grams       : {silver_grams}g")
    print("-" * 60)

    # 1. Direct Formula breakdown
    formula_result = FormulaEngine.calculate(
        raw_material_cost=raw_material_cost,
        manufacturing_hours=manufacturing_hours,
        craft_category=craft_category,
        complexity_score=complexity_score,
        db_avg_price=db_avg_price,
        silver_grams=silver_grams,
    )

    print("\n--- [LAYER 1: FORMULA BREAKDOWN] ---")
    print(f"  Labour Cost         : Rs.{formula_result.labour_cost:,.2f}")
    print(f"  Base Production Cost: Rs.{formula_result.production_cost:,.2f}")
    print(f"  Cost-Plus Price     : Rs.{formula_result.cost_plus_price:,.2f}")
    print(f"  Market Floor        : Rs.{formula_result.market_floor:,.2f}")
    print(f"  Suggested Retail    : Rs.{formula_result.suggested_retail:,.2f}")
    print(f"  Min Breakeven (15%) : Rs.{formula_result.min_breakeven:,.2f}")
    print(f"  B2B Wholesale       : Rs.{formula_result.b2b_wholesale:,.2f}")

    # 2. Full Hybrid Engine (Formula + AI + Phase 2 Calibration)
    engine = get_engine()
    hybrid_card = engine.price(
        raw_material_cost=raw_material_cost,
        manufacturing_hours=manufacturing_hours,
        craft_category=craft_category,
        complexity_score=complexity_score,
        db_avg_price=db_avg_price,
        product_name=product_name,
        artisan_district=artisan_district,
        artisan_state=artisan_state,
        festival_season=festival_season,
        silver_grams=silver_grams,
        gi_tagged=gi_tagged,
    )

    print("\n--- [FULL HYBRID ENGINE RESULT] ---")
    print(f"  Suggested Retail    : Rs.{hybrid_card.suggested_retail:,.2f}")
    print(f"  B2B Wholesale Price : Rs.{hybrid_card.b2b_wholesale:,.2f}")
    print(f"  Minimum Breakeven   : Rs.{hybrid_card.min_breakeven:,.2f}")
    print(f"  AI Multiplier       : {hybrid_card.ai_market_multiplier}x (Confidence: {hybrid_card.ai_confidence})")
    print(f"  Phase 2 Calibrated  : {hybrid_card.phase2_applied}")
    if hybrid_card.ai_reason:
        print(f"  AI Justification    : {hybrid_card.ai_reason}")

    print("=" * 60 + "\n")
    return hybrid_card


def interactive_mode():
    print("\n=== KalaSetu Pricing Engine - Interactive Test Mode ===")
    print("-------------------------------------------------------")
    try:
        product_name = input("Product Name [e.g. Handcrafted Bamboo Flute]: ").strip() or "Handcrafted Bamboo Flute"
        
        raw_mat = input("Raw Material Cost (Rs.) [e.g. 150]: ").strip() or "150"
        raw_material_cost = float(raw_mat)

        hours = input("Manufacturing Hours [e.g. 2.5]: ").strip() or "2.5"
        manufacturing_hours = float(hours)

        craft_category = input("Craft Category [e.g. Bamboo / Woodwork / Folk Painting]: ").strip() or "Bamboo"
        
        comp = input("Complexity Score (1 to 5) [e.g. 3]: ").strip() or "3"
        complexity_score = int(comp)

        db_avg = input("Market Avg Price from DB (Rs.) [press enter for 0]: ").strip() or "0"
        db_avg_price = float(db_avg)

        run_test(
            product_name=product_name,
            raw_material_cost=raw_material_cost,
            manufacturing_hours=manufacturing_hours,
            craft_category=craft_category,
            complexity_score=complexity_score,
            db_avg_price=db_avg_price,
        )
    except KeyboardInterrupt:
        print("\nExiting.")
    except Exception as e:
        print(f"\nError: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test KalaSetu Pricing Engine")
    parser.add_argument("--name", type=str, default=None, help="Product name")
    parser.add_argument("--material", type=float, default=None, help="Raw material cost in INR")
    parser.add_argument("--hours", type=float, default=None, help="Manufacturing hours")
    parser.add_argument("--category", type=str, default=None, help="Craft category")
    parser.add_argument("--complexity", type=int, default=3, help="Complexity score (1-5)")
    parser.add_argument("--db-avg", type=float, default=0.0, help="DB average price in INR")
    parser.add_argument("--gi", action="store_true", help="Is GI tagged craft")
    parser.add_argument("--silver", type=float, default=0.0, help="Silver weight in grams")

    args = parser.parse_args()

    # If CLI arguments are passed, run in CLI mode
    if args.material is not None and args.hours is not None:
        run_test(
            product_name=args.name or "Test Product",
            raw_material_cost=args.material,
            manufacturing_hours=args.hours,
            craft_category=args.category or "Bamboo",
            complexity_score=args.complexity,
            db_avg_price=args.db_avg,
            gi_tagged=args.gi,
            silver_grams=args.silver,
        )
    else:
        interactive_mode()
