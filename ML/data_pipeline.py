"""
data_pipeline.py — KalaSetu Dynamic Pricing Engine
Ingestion, Cleaning & Feature Engineering for Indian Handicraft Products
Ministry of Social Justice and Empowerment (MoSJE) Initiative

डेटा पाइपलाइन — कलासेतु मूल्य निर्धारण इंजन
"""

import os
import logging
import warnings
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sqlalchemy import create_engine, text

warnings.filterwarnings("ignore", category=FutureWarning)

# ──────────────────────────────────────────────
# Logging Configuration / लॉगिंग कॉन्फ़िगरेशन
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("kala_setu.data_pipeline")

# ──────────────────────────────────────────────
# Constants / स्थिरांक
# ──────────────────────────────────────────────
OUTPUT_PARQUET = Path("processed_artisan_data.parquet")
RANDOM_SEED = 42

# Craft categories as defined in KalaSetu DB schema
# शिल्प श्रेणियाँ जैसा कि KalaSetu DB schema में परिभाषित है
CRAFT_CATEGORIES = [
    "Textiles",
    "Pottery",
    "Jewelry",
    "Folk Painting",
    "Wood Inlay",
    "Metalcraft",
    "Tribal Craft",
]

# Indian states for region encoding / भारतीय राज्यों के लिए क्षेत्र एन्कोडिंग
REGION_ZONE_MAP = {
    # North / उत्तर
    "Uttar Pradesh": "North", "Uttarakhand": "North", "Himachal Pradesh": "North",
    "Punjab": "North", "Haryana": "North", "Jammu and Kashmir": "North",
    "Delhi": "North", "Rajasthan": "North",
    # South / दक्षिण
    "Tamil Nadu": "South", "Kerala": "South", "Karnataka": "South",
    "Andhra Pradesh": "South", "Telangana": "South",
    # East / पूर्व
    "West Bengal": "East", "Odisha": "East", "Jharkhand": "East",
    "Bihar": "East", "Assam": "East", "Manipur": "East",
    "Nagaland": "East", "Mizoram": "East", "Tripura": "East",
    "Meghalaya": "East", "Arunachal Pradesh": "East", "Sikkim": "East",
    # West / पश्चिम
    "Gujarat": "West", "Maharashtra": "West", "Goa": "West",
    "Madhya Pradesh": "Central", "Chhattisgarh": "Central",
}


# ──────────────────────────────────────────────
# Synthetic Data Generator (for local dev/testing)
# सिंथेटिक डेटा जेनरेटर (स्थानीय विकास/परीक्षण के लिए)
# ──────────────────────────────────────────────
def generate_synthetic_data(n_samples: int = 10_000, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """
    Generate realistic synthetic artisan product data for training/testing.
    वास्तविक सिंथेटिक कारीगर उत्पाद डेटा उत्पन्न करें।

    This mirrors the KalaSetu DB schema columns so the pipeline works
    identically against real PostgreSQL data.
    """
    rng = np.random.default_rng(seed)
    logger.info(f"Generating {n_samples} synthetic artisan product records...")

    states = list(REGION_ZONE_MAP.keys())
    # State minimum wages (INR/day) — from Ministry of Labour index
    # राज्य न्यूनतम मजदूरी (INR/दिन) — श्रम मंत्रालय सूचकांक से
    state_wages = {s: rng.integers(300, 800) for s in states}

    craft_category = rng.choice(CRAFT_CATEGORIES, size=n_samples)
    material_type = rng.choice(
        ["Silk", "Cotton", "Clay", "Silver", "Gold", "Wood", "Brass",
         "Terracotta", "Bamboo", "Leather", "Stone", "Jute"],
        size=n_samples,
    )
    region_state = rng.choice(states, size=n_samples)
    gi_tag_certified = rng.choice([True, False], size=n_samples, p=[0.3, 0.7])
    artisan_experience_yrs = rng.integers(1, 40, size=n_samples)
    raw_material_cost_inr = rng.uniform(50, 5000, size=n_samples).round(2)
    labor_hours_estimated = rng.uniform(2, 200, size=n_samples).round(1)
    product_complexity = rng.integers(1, 6, size=n_samples)          # 1–5
    bulk_order_qty = rng.choice(
        [1, 5, 10, 25, 50, 100, 200, 500],
        size=n_samples,
        p=[0.4, 0.15, 0.15, 0.1, 0.08, 0.06, 0.04, 0.02],
    )
    season_quarter = rng.integers(1, 5, size=n_samples)
    state_min_wage_inr = np.array([state_wages[s] for s in region_state], dtype=float)
    listing_views_30d = rng.integers(0, 5000, size=n_samples)
    inquiry_count_30d = rng.integers(0, 200, size=n_samples)

    # ── Simulate fair_price_inr with realistic pricing logic ──
    # उचित मूल्य INR की गणना वास्तविक मूल्य निर्धारण तर्क के साथ करें
    base_price = (
        raw_material_cost_inr * 2.5
        + (state_min_wage_inr / 8) * labor_hours_estimated * 1.5  # hourly wage
        + product_complexity * 200
        + artisan_experience_yrs * 50
    )
    gi_multiplier = np.where(gi_tag_certified, 1.25, 1.0)
    bulk_discount = np.where(bulk_order_qty >= 50, 0.85, 1.0)
    season_multiplier = np.where(season_quarter == 4, 1.15, 1.0)   # festive season
    demand_multiplier = 1.0 + (inquiry_count_30d / (listing_views_30d + 1)).clip(0, 0.5)
    noise = rng.normal(1.0, 0.08, size=n_samples)

    fair_price_inr = (
        base_price * gi_multiplier * bulk_discount * season_multiplier * demand_multiplier * noise
    ).round(2)

    df = pd.DataFrame(
        {
            "craft_category": craft_category,
            "material_type": material_type,
            "region_state": region_state,
            "gi_tag_certified": gi_tag_certified,
            "artisan_experience_yrs": artisan_experience_yrs,
            "raw_material_cost_inr": raw_material_cost_inr,
            "labor_hours_estimated": labor_hours_estimated,
            "product_complexity": product_complexity,
            "bulk_order_qty": bulk_order_qty,
            "season_quarter": season_quarter,
            "state_min_wage_inr": state_min_wage_inr,
            "listing_views_30d": listing_views_30d,
            "inquiry_count_30d": inquiry_count_30d,
            "fair_price_inr": fair_price_inr,
        }
    )
    logger.info(f"Synthetic data generated. Shape: {df.shape}")
    return df


# ──────────────────────────────────────────────
# Database Loader / डेटाबेस लोडर
# ──────────────────────────────────────────────
def load_from_db(database_url: str) -> pd.DataFrame:
    """
    Load artisan product records from KalaSetu PostgreSQL database.
    KalaSetu PostgreSQL डेटाबेस से कारीगर उत्पाद रिकॉर्ड लोड करें।
    """
    logger.info("Connecting to KalaSetu PostgreSQL database...")
    engine = create_engine(database_url, pool_pre_ping=True)
    query = text(
        """
        SELECT
            p.craft_category,
            p.material_type,
            a.region_state,
            p.gi_tag_certified,
            a.artisan_experience_yrs,
            p.raw_material_cost_inr,
            p.labor_hours_estimated,
            p.product_complexity,
            p.bulk_order_qty,
            EXTRACT(QUARTER FROM p.created_at)::INT AS season_quarter,
            r.state_min_wage_inr,
            COALESCE(an.listing_views_30d, 0)   AS listing_views_30d,
            COALESCE(an.inquiry_count_30d, 0)   AS inquiry_count_30d,
            p.fair_price_inr
        FROM products p
        JOIN artisans a ON p.artisan_id = a.id
        JOIN region_wage_index r ON a.region_state = r.state_name
        LEFT JOIN product_analytics an ON p.id = an.product_id
        WHERE p.fair_price_inr IS NOT NULL
          AND p.fair_price_inr > 0
        """
    )
    df = pd.read_sql(query, engine)
    logger.info(f"Loaded {len(df)} records from database.")
    return df


# ──────────────────────────────────────────────
# Cleaning / सफाई
# ──────────────────────────────────────────────
def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean raw artisan data — handle nulls, type coercions, outlier clipping.
    कच्चे कारीगर डेटा को साफ करें।
    """
    logger.info(f"Starting cleaning. Input shape: {df.shape}")

    # Drop duplicates / डुप्लीकेट हटाएं
    before = len(df)
    df = df.drop_duplicates()
    logger.info(f"Removed {before - len(df)} duplicate rows.")

    # ── Numeric coercions ──
    numeric_cols = [
        "artisan_experience_yrs", "raw_material_cost_inr", "labor_hours_estimated",
        "product_complexity", "bulk_order_qty", "season_quarter", "state_min_wage_inr",
        "listing_views_30d", "inquiry_count_30d", "fair_price_inr",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # ── Fill nulls with column medians (robust to outliers) ──
    # नल मानों को कॉलम मेडियन से भरें (आउटलायर के प्रति मजबूत)
    for col in numeric_cols:
        if df[col].isnull().any():
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            logger.warning(f"Imputed {col} nulls with median={median_val:.2f}")

    # ── Boolean ──
    df["gi_tag_certified"] = df["gi_tag_certified"].fillna(False).astype(bool)

    # ── Category corrections ──
    df["craft_category"] = df["craft_category"].where(
        df["craft_category"].isin(CRAFT_CATEGORIES), other="Tribal Craft"
    )
    df["season_quarter"] = df["season_quarter"].clip(1, 4).astype(int)
    df["product_complexity"] = df["product_complexity"].clip(1, 5).astype(int)
    df["artisan_experience_yrs"] = df["artisan_experience_yrs"].clip(0, 60).astype(int)
    df["bulk_order_qty"] = df["bulk_order_qty"].clip(1, 1000).astype(int)

    # ── Outlier clipping for price target (IQR method) ──
    # मूल्य लक्ष्य के लिए आउटलायर क्लिपिंग
    q_low = df["fair_price_inr"].quantile(0.01)
    q_high = df["fair_price_inr"].quantile(0.99)
    before = len(df)
    df = df[(df["fair_price_inr"] >= q_low) & (df["fair_price_inr"] <= q_high)]
    logger.info(f"Clipped {before - len(df)} extreme price outliers ({q_low:.0f}–{q_high:.0f} INR range kept).")

    # ── Positive-value guards ──
    df = df[
        (df["raw_material_cost_inr"] > 0)
        & (df["labor_hours_estimated"] > 0)
        & (df["state_min_wage_inr"] > 0)
        & (df["fair_price_inr"] > 0)
    ]

    logger.info(f"Cleaning complete. Output shape: {df.shape}")
    return df.reset_index(drop=True)


# ──────────────────────────────────────────────
# Feature Engineering / फीचर इंजीनियरिंग
# ──────────────────────────────────────────────
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Domain-specific feature engineering for Indian handicraft pricing.
    भारतीय हस्तशिल्प मूल्य निर्धारण के लिए डोमेन-विशिष्ट फीचर इंजीनियरिंग।
    """
    logger.info("Engineering domain-specific features...")

    # ── Fair Wage Floor (MoSJE regulation)
    # उचित मजदूरी सीमा (MoSJE विनियमन)
    # Interpretation: daily wage ÷ 8h × estimated hours × 1.3 safety margin
    hourly_wage = df["state_min_wage_inr"] / 8.0
    df["fair_wage_floor_inr"] = (hourly_wage * df["labor_hours_estimated"] * 1.3).round(2)

    # ── Labor Cost (for cost accounting) / श्रम लागत
    df["labor_cost_inr"] = (hourly_wage * df["labor_hours_estimated"]).round(2)

    # ── Material-to-Labor ratio / सामग्री-से-श्रम अनुपात
    df["material_labor_ratio"] = (
        df["raw_material_cost_inr"] / (df["labor_cost_inr"] + 1.0)
    ).round(4)

    # ── Total production cost / कुल उत्पादन लागत
    df["total_cost_inr"] = (df["raw_material_cost_inr"] + df["labor_cost_inr"]).round(2)

    # ── GI Tag premium flag (Geographical Indication)
    # GI टैग प्रीमियम ध्वज (भौगोलिक संकेत)
    df["gi_premium"] = df["gi_tag_certified"].astype(int)

    # ── Market demand signal / बाजार मांग संकेत
    # demand_ratio = inquiries per view — proxy for product attractiveness
    df["demand_ratio"] = (
        df["inquiry_count_30d"] / (df["listing_views_30d"] + 1)
    ).round(4)

    # ── Experience × Complexity interaction / अनुभव × जटिलता इंटरेक्शन
    df["experience_complexity"] = df["artisan_experience_yrs"] * df["product_complexity"]

    # ── Bulk order flag / थोक आदेश ध्वज
    # B2B wholesale threshold: qty ≥ 50
    df["is_bulk_order"] = (df["bulk_order_qty"] >= 50).astype(int)

    # ── Festive/peak season flag / उत्सव/पीक सीज़न ध्वज
    # Q4 (Oct–Dec) is festive season in India — Diwali, Christmas, year-end
    df["is_festive_season"] = (df["season_quarter"] == 4).astype(int)

    # ── Regional zone / क्षेत्रीय क्षेत्र
    df["region_zone"] = df["region_state"].map(REGION_ZONE_MAP).fillna("Other")

    # ── Log-transformed cost features (helps tree models with skewed distributions)
    # लॉग-ट्रांसफ़ॉर्म लागत फीचर्स
    df["log_raw_material_cost"] = np.log1p(df["raw_material_cost_inr"])
    df["log_labor_cost"] = np.log1p(df["labor_cost_inr"])
    df["log_total_cost"] = np.log1p(df["total_cost_inr"])
    df["log_bulk_qty"] = np.log1p(df["bulk_order_qty"])

    # ── Price per labor-hour (target insight, not used as input)
    # श्रम-घंटे प्रति मूल्य (लक्ष्य अंतर्दृष्टि, इनपुट के रूप में उपयोग नहीं)
    if "fair_price_inr" in df.columns:
        df["implied_hourly_return"] = (
            df["fair_price_inr"] / (df["labor_hours_estimated"] + 1e-6)
        ).round(2)

    logger.info(f"Feature engineering complete. Total columns: {df.shape[1]}")
    return df


# ──────────────────────────────────────────────
# Encode Categoricals for XGBoost Native Handling
# XGBoost नेटिव हैंडलिंग के लिए कैटेगोरिकल एनकोड करें
# ──────────────────────────────────────────────
def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cast string categorical columns to pandas CategoricalDtype so XGBoost
    can natively handle them on GPU without manual LabelEncoding.
    XGBoost GPU पर नेटिव कैटेगोरिकल हैंडलिंग के लिए CategoricalDtype में कास्ट करें।
    """
    cat_cols = ["craft_category", "material_type", "region_state", "region_zone"]
    for col in cat_cols:
        if col in df.columns:
            df[col] = df[col].astype("category")
            logger.info(f"  {col}: {df[col].nunique()} categories")
    return df


# ──────────────────────────────────────────────
# Train/Val/Test Split / ट्रेन/वैल/टेस्ट विभाजन
# ──────────────────────────────────────────────
def split_data(
    df: pd.DataFrame,
    target_col: str = "fair_price_inr",
    test_size: float = 0.15,
    val_size: float = 0.15,
    seed: int = RANDOM_SEED,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Stratified 70/15/15 split preserving craft_category distribution.
    शिल्प श्रेणी वितरण बनाए रखते हुए 70/15/15 विभाजन।
    """
    features = [c for c in df.columns if c not in [target_col, "implied_hourly_return", "fair_wage_floor_inr"]]
    X = df[features]
    y = df[target_col]

    # First split off test set
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=test_size, random_state=seed
    )
    # Then split validation from the remaining
    val_fraction_of_temp = val_size / (1.0 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=val_fraction_of_temp, random_state=seed
    )

    train_df = X_train.copy(); train_df[target_col] = y_train.values
    val_df   = X_val.copy();   val_df[target_col]   = y_val.values
    test_df  = X_test.copy();  test_df[target_col]  = y_test.values

    logger.info(
        f"Split complete — Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}"
    )
    return train_df, val_df, test_df


# ──────────────────────────────────────────────
# Main Pipeline Entry Point / मुख्य पाइपलाइन
# ──────────────────────────────────────────────
def run_pipeline(
    database_url: Optional[str] = None,
    use_real_datasets: bool = True,
    n_synthetic: int = 15_000,
    output_path: Path = OUTPUT_PARQUET,
) -> pd.DataFrame:
    """
    Full pipeline: load → clean → engineer features → encode → save.
    पूर्ण पाइपलाइन: लोड → सफाई → फीचर इंजीनियरिंग → एनकोड → सेव।

    Args:
        database_url: SQLAlchemy connection string. If None, checks real datasets or synthetic.
        use_real_datasets: Whether to search for and merge Amazon India, Flipkart, and Etsy datasets.
        n_synthetic: Number of synthetic records to generate if no DB and no real datasets.
        output_path: Where to write the processed parquet file.

    Returns:
        Processed DataFrame ready for XGBoost training.
    """
    # ── Data Source ──
    df = None
    if database_url:
        df = load_from_db(database_url)
    elif use_real_datasets:
        merged_file = Path("merged_artisan_catalog.parquet")
        raw_dir = Path("raw_datasets")
        if merged_file.exists():
            logger.info(f"Loading merged real datasets from {merged_file}...")
            df = pd.read_parquet(merged_file)
        elif raw_dir.exists() and (list(raw_dir.glob("**/*.csv")) or list(raw_dir.glob("**/*.zip")) or list(raw_dir.glob("**/*.json"))):
            logger.info("Raw datasets found in raw_datasets/. Running merge_real_datasets...")
            from merge_real_datasets import run_dataset_merge
            df = run_dataset_merge(raw_dir=raw_dir, output_path=merged_file)
        else:
            # Check if Kaggle download is possible
            try:
                from merge_real_datasets import run_dataset_merge
                logger.info("Attempting real dataset ingestion from Amazon India, Flipkart, and Etsy...")
                df = run_dataset_merge(raw_dir=raw_dir, output_path=merged_file)
            except Exception as e:
                logger.warning(f"Could not auto-download real datasets ({e}). Falling back to synthetic generator.")

    if df is None or df.empty:
        logger.warning("No DATABASE_URL or real dataset files found — using synthetic generator.")
        df = generate_synthetic_data(n_samples=n_synthetic)

    # ── Pipeline stages ──
    df = clean_data(df)
    df = engineer_features(df)
    df = encode_categoricals(df)

    # ── Persist processed data / प्रसंस्कृत डेटा सहेजें ──
    df.to_parquet(output_path, index=False)
    logger.info(f"Processed dataset saved → {output_path} ({output_path.stat().st_size / 1024:.1f} KB)")

    # ── Summary statistics / सारांश आँकड़े ──
    logger.info("\n" + "=" * 60)
    logger.info("DATASET SUMMARY / डेटासेट सारांश")
    logger.info("=" * 60)
    logger.info(f"  Total records: {len(df):,}")
    logger.info(f"  Features: {df.shape[1]}")
    logger.info(f"  Price range: ₹{df['fair_price_inr'].min():,.0f} – ₹{df['fair_price_inr'].max():,.0f}")
    logger.info(f"  Median price: ₹{df['fair_price_inr'].median():,.0f}")
    logger.info(f"  GI-certified products: {df['gi_tag_certified'].sum():,} ({df['gi_tag_certified'].mean()*100:.1f}%)")
    logger.info("=" * 60)

    return df


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="KalaSetu Data Pipeline")
    parser.add_argument("--database-url", type=str, default=None,
                        help="PostgreSQL connection string (e.g. postgresql://user:pass@host/db)")
    parser.add_argument("--no-real-data", action="store_true",
                        help="Disable real dataset ingestion and use synthetic data")
    parser.add_argument("--n-synthetic", type=int, default=15_000,
                        help="Number of synthetic records to generate if no DB / real data")
    parser.add_argument("--output", type=str, default=str(OUTPUT_PARQUET),
                        help="Output parquet file path")
    args = parser.parse_args()

    run_pipeline(
        database_url=args.database_url,
        use_real_datasets=not args.no_real_data,
        n_synthetic=args.n_synthetic,
        output_path=Path(args.output),
    )

