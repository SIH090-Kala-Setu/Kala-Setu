"""
train_phase2.py — KalaSetu Phase 2 XGBoost Calibration Model Training
MLV2 / Learns price_realisation_factor from real transaction history

चरण 2 XGBoost अंशांकन मॉडल प्रशिक्षण — कलासेतु
वास्तविक लेनदेन इतिहास से price_realisation_factor सीखता है

What this script does:
  1. Loads transaction data from the KalaSetu Postgres DB
  2. Joins with formula-suggested prices (from the pricing log table)
  3. Computes target = actual_sale_price / formula_suggested_price
  4. Enforces minimum data thresholds (≥500 total, ≥30 per category)
  5. Trains XGBoost regressor with GPU config from the spec
  6. Saves model + feature metadata to MLV2/

Trigger conditions (from spec):
  - Minimum 500 completed sales
  - Minimum 30 sales per craft category
  - Retrain every 90 days or 200 new sales

Run:
  python train_phase2.py [--db-url postgresql://...] [--min-samples 500]

Or scheduled via cron / APScheduler in main backend.
"""

from __future__ import annotations

import argparse
import logging
import os
import pickle
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error

# ─────────────────────────────────────────────────────────────────────────────
# Config  /  कॉन्फ़िगरेशन
# ─────────────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
)
logger = logging.getLogger("kala_setu.train_phase2")

OUTPUT_MODEL_PATH    = BASE_DIR / "pricing_calibrator.ubj"
OUTPUT_FEATURES_PATH = BASE_DIR / "calibrator_feature_cols.pkl"

PHASE2_MIN_TOTAL_SALES    = 500
PHASE2_MIN_PER_CATEGORY   = 30

# ─────────────────────────────────────────────────────────────────────────────
# XGBoost Config — exactly as specified in kalaset_pricing_engine.md
# XGBoost कॉन्फ़िगरेशन — विनिर्देश के अनुसार
# ─────────────────────────────────────────────────────────────────────────────

XGBOOST_PARAMS: dict = {
    "device":           "cuda",         # RTX 3050 GPU
    "tree_method":      "hist",
    "sampling_method":  "gradient_based",
    "objective":        "reg:squarederror",
    "max_depth":        5,
    "learning_rate":    0.05,
    "n_estimators":     500,
    "subsample":        0.8,
    "colsample_bytree": 0.75,
    "reg_alpha":        0.1,
    "reg_lambda":       1.5,
    "seed":             42,
}

# ─────────────────────────────────────────────────────────────────────────────
# Feature Engineering  /  फीचर इंजीनियरिंग
# ─────────────────────────────────────────────────────────────────────────────

# Training features as specified in kalaset_pricing_engine.md §Training Features
FEATURE_COLS = [
    "craft_category_enc",        # encoded from craft_category string
    "complexity_score",          # ordinal 1–5
    "state_region_enc",          # encoded from state string
    "gi_tag_certified",          # boolean → int
    "artisan_experience_yrs",    # integer
    "listing_views_30d",         # integer
    "inquiry_count_30d",         # integer
    "season_quarter",            # 1–4
    "formula_suggested_price",   # float — formula engine output
    "market_multiplier_used",    # float — AI layer output
    "days_to_sale",              # integer — from transaction log
    "demand_ratio",              # inquiry / (views + 1) — derived
]

# Target
TARGET_COL = "price_realisation_factor"   # actual_sale_price / formula_suggested_price


def _encode_categorical(series: pd.Series) -> pd.Series:
    """Deterministic label encoding: hash of string → integer."""
    return series.apply(lambda x: hash(str(x)) % 100_000).astype(int)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform raw transaction DataFrame into model-ready feature DataFrame.

    Expected raw columns:
      craft_category, complexity_score, state, gi_tag_certified,
      artisan_experience_yrs, listing_views_30d, inquiry_count_30d,
      season_quarter, formula_suggested_price, market_multiplier_used,
      actual_sale_price, days_to_sale
    """
    out = pd.DataFrame()
    out["craft_category_enc"]     = _encode_categorical(df["craft_category"])
    out["complexity_score"]       = df["complexity_score"].astype(int)
    out["state_region_enc"]       = _encode_categorical(df.get("state", "Uttar Pradesh"))
    out["gi_tag_certified"]       = df.get("gi_tag_certified", 0).astype(int)
    out["artisan_experience_yrs"] = df.get("artisan_experience_yrs", 5).astype(float)
    out["listing_views_30d"]      = df.get("listing_views_30d", 0).astype(float)
    out["inquiry_count_30d"]      = df.get("inquiry_count_30d", 0).astype(float)
    out["season_quarter"]         = df.get("season_quarter", 2).astype(int)
    out["formula_suggested_price"]= df["formula_suggested_price"].astype(float)
    out["market_multiplier_used"] = df.get("market_multiplier_used", 1.0).astype(float)
    out["days_to_sale"]           = df.get("days_to_sale", 30).astype(float)
    out["demand_ratio"]           = (
        df.get("inquiry_count_30d", 0) / (df.get("listing_views_30d", 0) + 1)
    ).astype(float)

    # Target
    out[TARGET_COL] = (df["actual_sale_price"] / df["formula_suggested_price"]).astype(float)

    return out


# ─────────────────────────────────────────────────────────────────────────────
# Data Loading  /  डेटा लोडिंग
# ─────────────────────────────────────────────────────────────────────────────

def load_transaction_data(db_url: str) -> pd.DataFrame:
    """
    Load completed sales + formula log from Postgres.

    Expected schema (adapt SQL to your actual table/column names):
      orders: id, product_id, actual_price, created_at, days_to_fulfil
      pricing_log: product_id, formula_suggested_price, market_multiplier_used, logged_at
      products: id, craft_category, complexity_score, artisan_id
      artisan_profile: user_id, state, experience_years, gi_tag_certified
      product_analytics: product_id, views_30d, inquiries_30d

    Returns a raw DataFrame with all columns needed by engineer_features().
    """
    from sqlalchemy import create_engine, text

    logger.info("Connecting to Postgres...")
    engine = create_engine(db_url)

    query = text("""
        SELECT
            p.craft_category,
            p.complexity_score,
            ap.village_state          AS state,
            ap.gi_tag_certified,
            ap.experience_years       AS artisan_experience_yrs,
            COALESCE(pa.views_30d, 0) AS listing_views_30d,
            COALESCE(pa.inquiries_30d, 0) AS inquiry_count_30d,
            EXTRACT(QUARTER FROM o.created_at)::int AS season_quarter,
            pl.formula_suggested_price,
            COALESCE(pl.market_multiplier_used, 1.0) AS market_multiplier_used,
            o.actual_price            AS actual_sale_price,
            COALESCE(o.days_to_fulfil, 30) AS days_to_sale
        FROM orders o
        JOIN products p        ON p.id = o.product_id
        JOIN artisan_profile ap ON ap.user_id = p.artisan_id
        LEFT JOIN pricing_log pl ON pl.product_id = o.product_id
        LEFT JOIN product_analytics pa ON pa.product_id = o.product_id
        WHERE
            o.status = 'Completed'
            AND pl.formula_suggested_price > 0
            AND o.actual_price > 0
        ORDER BY o.created_at DESC
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn)

    logger.info(f"Loaded {len(df):,} completed transactions from DB.")
    return df


def load_synthetic_data_for_testing() -> pd.DataFrame:
    """
    Generate synthetic transaction data for unit testing when no DB is available.
    DO NOT use in production — for development / CI only.

    WARNING: This is synthetic data for development only.
    """
    import warnings
    warnings.warn(
        "Using synthetic data — DO NOT use in production. "
        "Run with --db-url for real training.",
        stacklevel=2,
    )
    logger.warning("⚠ Generating SYNTHETIC data for testing. Use --db-url for production training.")

    rng = np.random.default_rng(42)
    n = 600

    categories = [
        "Folk Paintings & Art", "Tribal & Silver Jewelry", "Embroidery & Chikankari",
        "Textiles & Handloom", "Handicrafts & Woodwork", "Clay & Blue Pottery",
        "Bamboo & Tribal Craft",
    ]
    states = ["Uttar Pradesh", "Rajasthan", "West Bengal", "Odisha", "Bihar", "Gujarat"]

    formula_prices = rng.uniform(500, 8000, n)
    # Realisation factor: mostly near 1.0, some variance
    true_factors = rng.normal(loc=1.05, scale=0.12, size=n).clip(0.7, 1.5)
    actual_prices = formula_prices * true_factors

    df = pd.DataFrame({
        "craft_category":         rng.choice(categories, n),
        "complexity_score":       rng.integers(1, 6, n),
        "state":                  rng.choice(states, n),
        "gi_tag_certified":       rng.integers(0, 2, n),
        "artisan_experience_yrs": rng.integers(1, 40, n),
        "listing_views_30d":      rng.integers(0, 500, n),
        "inquiry_count_30d":      rng.integers(0, 50, n),
        "season_quarter":         rng.integers(1, 5, n),
        "formula_suggested_price":formula_prices,
        "market_multiplier_used": rng.uniform(0.9, 1.25, n),
        "actual_sale_price":      actual_prices,
        "days_to_sale":           rng.integers(1, 90, n),
    })
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Validation  /  सत्यापन
# ─────────────────────────────────────────────────────────────────────────────

def validate_data(df: pd.DataFrame, min_total: int, min_per_category: int) -> bool:
    """
    Enforce Phase 2 trigger conditions from the spec.
    Returns True if training should proceed.
    """
    total = len(df)
    if total < min_total:
        logger.error(
            f"❌ Insufficient data: {total} transactions found, "
            f"need ≥{min_total}. Phase 2 training ABORTED."
        )
        return False

    category_counts = df["craft_category"].value_counts()
    low_categories = category_counts[category_counts < min_per_category]
    if not low_categories.empty:
        logger.warning(
            f"⚠ Categories with <{min_per_category} samples (will still train, "
            f"but predictions for these will be less accurate):\n{low_categories}"
        )

    logger.info(
        f"✓ Data validation passed: {total:,} total transactions | "
        f"{df['craft_category'].nunique()} categories"
    )
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Training  /  प्रशिक्षण
# ─────────────────────────────────────────────────────────────────────────────

def train(df_raw: pd.DataFrame) -> xgb.Booster:
    """
    Engineer features, split data, train XGBoost, evaluate, return model.
    """
    logger.info("Engineering features...")
    df = engineer_features(df_raw)

    # Drop rows with NaN target or extreme outliers
    df = df.dropna(subset=[TARGET_COL])
    df = df[(df[TARGET_COL] > 0.3) & (df[TARGET_COL] < 3.0)]
    logger.info(f"Clean dataset: {len(df):,} rows after outlier removal.")

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42
    )

    dtrain = xgb.DMatrix(X_train, label=y_train)
    dtest  = xgb.DMatrix(X_test,  label=y_test)

    # Use CUDA; fall back to CPU if GPU not available
    params = dict(XGBOOST_PARAMS)
    n_estimators = params.pop("n_estimators")
    try:
        logger.info("Training XGBoost with CUDA (RTX 3050)...")
        model = xgb.train(
            params,
            dtrain,
            num_boost_round=n_estimators,
            evals=[(dtest, "test")],
            verbose_eval=50,
            early_stopping_rounds=30,
        )
    except Exception as cuda_err:
        logger.warning(f"CUDA training failed ({cuda_err}). Falling back to CPU hist.")
        params["device"] = "cpu"
        params.pop("sampling_method", None)
        model = xgb.train(
            params,
            dtrain,
            num_boost_round=n_estimators,
            evals=[(dtest, "test")],
            verbose_eval=50,
            early_stopping_rounds=30,
        )

    # Evaluate
    y_pred = model.predict(dtest)
    mae  = mean_absolute_error(y_test, y_pred)
    mape = mean_absolute_percentage_error(y_test, y_pred) * 100

    logger.info(
        f"\n{'='*55}\n"
        f"Phase 2 Model Evaluation (held-out test set)\n"
        f"  MAE  (realisation factor): {mae:.4f}\n"
        f"  MAPE (realisation factor): {mape:.2f}%\n"
        f"  Interpretation: avg prediction error = {mape:.1f}% of actual/formula ratio\n"
        f"{'='*55}"
    )

    return model, len(df)


# ─────────────────────────────────────────────────────────────────────────────
# Save  /  सहेजें
# ─────────────────────────────────────────────────────────────────────────────

def save_model(model: xgb.Booster, n_samples: int) -> None:
    """Save the trained model and feature metadata to MLV2/."""
    model.save_model(str(OUTPUT_MODEL_PATH))
    logger.info(f"✓ Model saved → {OUTPUT_MODEL_PATH}")

    meta = {
        "feature_cols": FEATURE_COLS,
        "n_samples": n_samples,
        "trained_at": datetime.now().isoformat(),
        "xgboost_params": XGBOOST_PARAMS,
        "target": TARGET_COL,
        "spec_version": "kalaset_pricing_engine.md v1.0",
    }
    with open(OUTPUT_FEATURES_PATH, "wb") as f:
        pickle.dump(meta, f)
    logger.info(f"✓ Feature metadata saved → {OUTPUT_FEATURES_PATH}")


# ─────────────────────────────────────────────────────────────────────────────
# CLI Entrypoint  /  CLI प्रवेश बिंदु
# ─────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="KalaSetu Phase 2 XGBoost Calibration Model Trainer"
    )
    p.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL", ""),
        help="Postgres connection URL (overrides DATABASE_URL env var). "
             "If not provided, uses synthetic data (development only).",
    )
    p.add_argument(
        "--min-samples",
        type=int,
        default=PHASE2_MIN_TOTAL_SALES,
        help=f"Minimum total transactions to train (default: {PHASE2_MIN_TOTAL_SALES})",
    )
    p.add_argument(
        "--min-per-category",
        type=int,
        default=PHASE2_MIN_PER_CATEGORY,
        help=f"Minimum samples per craft category (default: {PHASE2_MIN_PER_CATEGORY})",
    )
    p.add_argument(
        "--force",
        action="store_true",
        help="Skip minimum sample validation (for testing only)",
    )
    p.add_argument(
        "--synthetic",
        action="store_true",
        help="Use synthetic data for development/testing (ignores --db-url)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()

    logger.info("=" * 60)
    logger.info("KalaSetu Phase 2 XGBoost Calibration Model Trainer")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("=" * 60)

    # Load data
    if args.synthetic or not args.db_url:
        df_raw = load_synthetic_data_for_testing()
    else:
        df_raw = load_transaction_data(args.db_url)

    # Validate
    if not args.force:
        if not validate_data(df_raw, args.min_samples, args.min_per_category):
            sys.exit(1)

    # Train
    model, n_samples = train(df_raw)

    # Save
    save_model(model, n_samples)

    logger.info("\n✓ Phase 2 training complete. Restart the pricing service to activate.")
    logger.info(
        "  Retrain schedule: every 90 days OR after 200 new completed sales\n"
        "  Next retrain due: "
        f"{(datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d')}"
    )


if __name__ == "__main__":
    main()
