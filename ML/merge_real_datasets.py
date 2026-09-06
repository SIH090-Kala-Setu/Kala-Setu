"""
merge_real_datasets.py — KalaSetu Real-World Dataset Ingestion & Merging Engine

Directly processes the 3 downloaded datasets in raw_datasets/:
1. amz_in_total_products_data_processed.csv (Amazon India 2023 - 1.58M products, English & Hindi)
2. flipkart_fashion_products_dataset.json (Flipkart Fashion & Jewellery catalog)
3. Etsy.csv (Etsy Handmade Marketplace items)
4. output.xlsx (Optional supplementary catalog)

Standardizes all products into the official KalaSetu schema for GPU training.
"""

import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("kala_setu.merge_datasets")

RAW_DATA_DIR = Path("raw_datasets")
MERGED_OUTPUT_FILE = Path("merged_artisan_catalog.parquet")

# ─────────────────────────────────────────────────────────────
# State Minimum Wage Table (Ministry of Labour Index - INR/day)
# ─────────────────────────────────────────────────────────────
STATE_MIN_WAGES: Dict[str, float] = {
    "Uttar Pradesh": 492.0,
    "Rajasthan": 318.0,
    "West Bengal": 385.0,
    "Gujarat": 430.0,
    "Tamil Nadu": 445.0,
    "Karnataka": 480.0,
    "Maharashtra": 460.0,
    "Bihar": 370.0,
    "Odisha": 352.0,
    "Madhya Pradesh": 395.0,
    "Assam": 340.0,
    "Kerala": 520.0,
    "Andhra Pradesh": 410.0,
    "Telangana": 425.0,
    "Punjab": 415.0,
    "Haryana": 435.0,
    "Delhi": 590.0,
    "Jammu and Kashmir": 380.0,
    "Himachal Pradesh": 375.0,
    "Uttarakhand": 390.0,
    "Chhattisgarh": 360.0,
    "Jharkhand": 365.0,
    "Manipur": 340.0,
    "Meghalaya": 340.0,
    "Tripura": 330.0,
    "Nagaland": 335.0,
    "Mizoram": 345.0,
    "Arunachal Pradesh": 340.0,
    "Sikkim": 350.0,
    "Goa": 480.0,
}

GI_TAG_KEYWORDS = [
    "banarasi", "kanchipuram", "chanderi", "madhubani", "kullu",
    "pochampally", "mysore silk", "bhagalpur", "blue pottery",
    "bidriware", "dhokra", "dokra", "tanjore", "warli", "pashmina",
    "phulkari", "sambalpuri", "kota doria", "kalamkari", "kondapalli",
    "channapatna", "terracotta", "moradabad brass", "jamdani", "santiniketan",
    "बनारसी", "कांजीवरम", "चंदेरी", "मधुबनी", "पोचमपल्ली", "पश्मीना", "टेराकोटा"
]

CRAFT_MATERIAL_DEFAULTS = {
    "Textiles": "Silk",
    "Pottery": "Clay",
    "Jewelry": "Silver",
    "Folk Painting": "Canvas",
    "Wood Inlay": "Wood",
    "Metalcraft": "Brass",
    "Tribal Craft": "Bamboo"
}


def clean_price_value(val) -> Optional[float]:
    """Clean and parse price strings or numbers into INR float."""
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val) if val > 0 else None
    
    val_str = str(val).strip()
    is_usd = "$" in val_str or "USD" in val_str
    
    cleaned = re.sub(r"[^\d.]", "", val_str)
    try:
        price = float(cleaned)
        if is_usd:
            price = price * 83.5  # Convert USD to INR
        return price if price > 0 else None
    except ValueError:
        return None


def infer_craft_category(text: str) -> Optional[str]:
    """Map text (English + Hindi) to one of 7 official KalaSetu craft categories."""
    t = str(text).lower()
    
    # 1. Textiles (वस्त्र / हथकरघा)
    if re.search(r"saree|sari|kurta|dupatta|shawl|stole|fabric|handloom|silk|cotton|chanderi|banarasi|kanchipuram|pashmina|khadi|embroidery|weave|woven|apparel|ethnic wear|साड़ी|सूट|दुपट्टा|शॉल|रेशम|सूती|हथकरघा|खादी", t):
        return "Textiles"
    
    # 2. Pottery (मिट्टी के बर्तन / टेराकोटा)
    if re.search(r"pottery|clay|terracotta|ceramic|earthen|vase|planter|pot|diya|mud pot|मिट्टी|टेराकोटा|कुम्हार|सुराही|मटका|दीया", t):
        return "Pottery"
    
    # 3. Jewelry (आभूषण / गहने)
    if re.search(r"jewel|necklace|earring|bangle|pendant|silver|kundan|meenakari|jhumka|anklet|choker|ring|brass jewelry|oxidized|gemstone|आभूषण|गहने|झुमका|पायल|अंगूठी|कुंदन|मीनाकारी|चांदी", t):
        return "Jewelry"
    
    # 4. Folk Painting (लोक चित्रकला)
    if re.search(r"painting|madhubani|warli|pattachitra|tanjore|gond|kalamkari|folk art|canvas art|scroll|wall art|acrylic painting|चित्रकला|पेंटिंग|मधुबनी|वारली", t):
        return "Folk Painting"
    
    # 5. Wood Inlay (काष्ठ कला / नक्काशी)
    if re.search(r"wood|wooden|inlay|carving|sheesham|rosewood|teak|sandalwood|lacquerware|channapatna|furniture|लकड़ी|नक्काशी|चन्दन|काष्ठ", t):
        return "Wood Inlay"
    
    # 6. Metalcraft (धातु शिल्प / पीतल / कांस्य)
    if re.search(r"brass|copper|bronze|metal|dhokra|dokra|bidriware|bell metal|iron craft|statue|idol|पीतल|तांबा|कांस्य|धातु|ढोकरा", t):
        return "Metalcraft"
    
    # 7. Tribal Craft (जनजातीय हस्तशिल्प)
    if re.search(r"tribal|bamboo|cane|jute|grass|handicraft|handmade craft|dokra|traditional art|बांस|बेंत|जूट|जनजातीय|हस्तशिल्प", t):
        return "Tribal Craft"
        
    return None


def infer_material(text: str, category: str) -> str:
    """Extract material from product text or return category default."""
    t = str(text).lower()
    materials = [
        "Silk", "Cotton", "Clay", "Terracotta", "Silver", "Brass", "Bronze",
        "Wood", "Bamboo", "Cane", "Leather", "Jute", "Stone", "Copper", "Wool", "Gold"
    ]
    for mat in materials:
        if mat.lower() in t:
            return mat
    return CRAFT_MATERIAL_DEFAULTS.get(category, "Cotton")


def infer_region_state(text: str, rng: np.random.Generator) -> str:
    """Extract state from geographic indicators or sample from craft clusters."""
    t = str(text).lower()
    for state in STATE_MIN_WAGES.keys():
        if state.lower() in t:
            return state
            
    if "banaras" in t or "varanasi" in t or "lucknow" in t or "chikankari" in t or "उत्तर प्रदेश" in t:
        return "Uttar Pradesh"
    if "jaipur" in t or "rajasthan" in t or "jodhpur" in t or "राजस्थान" in t:
        return "Rajasthan"
    if "madhubani" in t or "mithila" in t or "बिहार" in t:
        return "Bihar"
    if "kanchi" in t or "chennai" in t or "tanjore" in t or "तमिलनाडु" in t:
        return "Tamil Nadu"
    if "mysore" in t or "channapatna" in t or "bangalore" in t or "कर्नाटक" in t:
        return "Karnataka"
    if "gujarat" in t or "kutch" in t or "patola" in t or "गुजरात" in t:
        return "Gujarat"
    if "dhokra" in t or "bengal" in t or "santiniketan" in t or "बंगाल" in t:
        return "West Bengal"
    if "kashmir" in t or "pashmina" in t or "कश्मीर" in t:
        return "Jammu and Kashmir"
    if "assam" in t or "muga" in t or "असम" in t:
        return "Assam"
    if "odisha" in t or "sambalpuri" in t or "ओडिशा" in t:
        return "Odisha"

    state_choices = [
        "Uttar Pradesh", "Rajasthan", "West Bengal", "Gujarat",
        "Tamil Nadu", "Karnataka", "Bihar", "Odisha", "Madhya Pradesh", "Maharashtra"
    ]
    return str(rng.choice(state_choices))


def is_gi_certified(text: str) -> bool:
    """Check if title or text implies GI Tag status."""
    t = str(text).lower()
    if "gi tag" in t or "geographical indication" in t:
        return True
    for kw in GI_TAG_KEYWORDS:
        if kw in t:
            return True
    return False


# ─────────────────────────────────────────────────────────────
# 1. Process Amazon India Dataset (amz_in_total_products_data_processed.csv)
# ─────────────────────────────────────────────────────────────
def process_amazon_india_file(file_path: Path, rng: np.random.Generator, max_rows: int = 500_000) -> pd.DataFrame:
    logger.info(f"Processing Amazon India dataset ({file_path.name})...")
    chunks = []
    chunksize = 100_000
    rows_processed = 0

    try:
        for chunk in pd.read_csv(file_path, chunksize=chunksize, on_bad_lines='skip', low_memory=False):
            title_col = "title" if "title" in chunk.columns else chunk.columns[1]
            price_col = "price" if "price" in chunk.columns else "listPrice"
            cat_col = "categoryName" if "categoryName" in chunk.columns else None

            text_series = chunk[title_col].astype(str) + " " + (chunk[cat_col].astype(str) if cat_col else "")
            craft_cats = text_series.apply(infer_craft_category)
            
            matched = chunk[craft_cats.notnull()].copy()
            if not matched.empty:
                matched["craft_category"] = craft_cats[craft_cats.notnull()]
                matched["fair_price_inr"] = matched[price_col].apply(clean_price_value)
                matched = matched[matched["fair_price_inr"].notnull() & (matched["fair_price_inr"] >= 100) & (matched["fair_price_inr"] <= 120_000)].copy()
                
                matched["combined_text"] = matched[title_col].astype(str)
                matched["material_type"] = matched.apply(lambda r: infer_material(r["combined_text"], r["craft_category"]), axis=1)
                matched["region_state"] = matched["combined_text"].apply(lambda t: infer_region_state(t, rng))
                matched["gi_tag_certified"] = matched["combined_text"].apply(is_gi_certified)
                matched["data_source"] = "Amazon_India"
                chunks.append(matched)

            rows_processed += len(chunk)
            if rows_processed >= max_rows:
                break

        if chunks:
            res = pd.concat(chunks, ignore_index=True)
            logger.info(f"Extracted {len(res):,} craft items from Amazon India.")
            return res
    except Exception as e:
        logger.error(f"Error processing Amazon India file: {e}")
    
    return pd.DataFrame()


# ─────────────────────────────────────────────────────────────
# 2. Process Flipkart Fashion Dataset (flipkart_fashion_products_dataset.json)
# ─────────────────────────────────────────────────────────────
def process_flipkart_json(file_path: Path, rng: np.random.Generator) -> pd.DataFrame:
    logger.info(f"Processing Flipkart JSON dataset ({file_path.name})...")
    records = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)
            
        logger.info(f"Loaded {len(data):,} raw Flipkart JSON records.")
        for item in data:
            title = item.get("title") or item.get("description") or ""
            category = item.get("category") or ""
            sub_cat = item.get("sub_category") or ""
            combined = f"{title} {category} {sub_cat}"
            
            craft_cat = infer_craft_category(combined)
            if not craft_cat:
                continue
                
            price_val = item.get("selling_price") or item.get("actual_price")
            price = clean_price_value(price_val)
            if not price or price < 100 or price > 120_000:
                continue

            material = infer_material(combined, craft_cat)
            state = infer_region_state(combined, rng)
            gi = is_gi_certified(combined)

            records.append({
                "craft_category": craft_cat,
                "material_type": material,
                "region_state": state,
                "gi_tag_certified": gi,
                "fair_price_inr": price,
                "data_source": "Flipkart"
            })

        df = pd.DataFrame(records)
        logger.info(f"Extracted {len(df):,} craft items from Flipkart.")
        return df
    except Exception as e:
        logger.error(f"Error reading Flipkart JSON: {e}")
        return pd.DataFrame()


# ─────────────────────────────────────────────────────────────
# 3. Process Etsy Dataset (Etsy.csv)
# ─────────────────────────────────────────────────────────────
def process_etsy_file(file_path: Path, rng: np.random.Generator) -> pd.DataFrame:
    logger.info(f"Processing Etsy dataset ({file_path.name})...")
    try:
        df = pd.read_csv(file_path, on_bad_lines='skip')
        logger.info(f"Loaded {len(df):,} raw Etsy records.")

        title_col = "title" if "title" in df.columns else df.columns[0]
        price_col = "price" if "price" in df.columns else df.columns[2]

        df["craft_category"] = df[title_col].astype(str).apply(infer_craft_category)
        df = df[df["craft_category"].notnull()].copy()

        df["fair_price_inr"] = df[price_col].apply(clean_price_value)
        df = df[df["fair_price_inr"].notnull() & (df["fair_price_inr"] >= 100) & (df["fair_price_inr"] <= 150_000)].copy()

        df["material_type"] = df.apply(lambda r: infer_material(str(r[title_col]), r["craft_category"]), axis=1)
        df["region_state"] = df[title_col].astype(str).apply(lambda t: infer_region_state(t, rng))
        df["gi_tag_certified"] = df[title_col].astype(str).apply(is_gi_certified)
        df["data_source"] = "Etsy"

        logger.info(f"Extracted {len(df):,} craft items from Etsy.")
        return df
    except Exception as e:
        logger.error(f"Error processing Etsy CSV: {e}")
        return pd.DataFrame()


# ─────────────────────────────────────────────────────────────
# Standardize Domain & Artisan Metadata
# ─────────────────────────────────────────────────────────────
def synthesize_artisan_metadata(df: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    n = len(df)
    logger.info(f"Synthesizing domain economics & labor parameters for {n:,} records...")

    # Assign state minimum wage
    df["state_min_wage_inr"] = df["region_state"].map(STATE_MIN_WAGES).fillna(400.0)

    # Complexity scale (1-5) based on price tiers and category
    price_quantiles = pd.qcut(df["fair_price_inr"], q=5, labels=[1, 2, 3, 4, 5], duplicates='drop')
    df["product_complexity"] = price_quantiles.astype(int)

    # Artisan experience (3-35 yrs)
    df["artisan_experience_yrs"] = rng.integers(3, 35, size=n)

    # Season quarter & bulk order qty
    df["season_quarter"] = rng.choice([1, 2, 3, 4], size=n, p=[0.2, 0.2, 0.25, 0.35])
    df["bulk_order_qty"] = rng.choice([1, 2, 5, 10, 50, 100], size=n, p=[0.55, 0.2, 0.1, 0.08, 0.05, 0.02])

    # Traffic engagement (views & inquiries)
    df["listing_views_30d"] = rng.integers(10, 2500, size=n)
    df["inquiry_count_30d"] = (df["listing_views_30d"] * rng.uniform(0.02, 0.12, size=n)).astype(int)

    # Decompose realistic economics
    hourly_wage = df["state_min_wage_inr"] / 8.0
    estimated_labor_hours = ((df["fair_price_inr"] * 0.45) / (hourly_wage * 1.3)).clip(1.5, 180.0).round(1)
    df["labor_hours_estimated"] = estimated_labor_hours

    estimated_material_cost = ((df["fair_price_inr"] * 0.35) - (df["product_complexity"] * 25)).clip(40.0, df["fair_price_inr"] * 0.6).round(2)
    df["raw_material_cost_inr"] = estimated_material_cost

    cols = [
        "craft_category",
        "material_type",
        "region_state",
        "gi_tag_certified",
        "artisan_experience_yrs",
        "raw_material_cost_inr",
        "labor_hours_estimated",
        "product_complexity",
        "bulk_order_qty",
        "season_quarter",
        "state_min_wage_inr",
        "listing_views_30d",
        "inquiry_count_30d",
        "fair_price_inr",
    ]

    return df[cols].reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# Main Merge Execution Pipeline
# ─────────────────────────────────────────────────────────────
def run_dataset_merge(raw_dir: Path = RAW_DATA_DIR, output_path: Path = MERGED_OUTPUT_FILE) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    dfs: List[pd.DataFrame] = []

    logger.info("=" * 65)
    logger.info("KalaSetu Real-World Dataset Merging Engine")
    logger.info("=" * 65)

    # 1. Amazon India
    amz_file = raw_dir / "amz_in_total_products_data_processed.csv"
    if amz_file.exists():
        df_amz = process_amazon_india_file(amz_file, rng, max_rows=600_000)
        if not df_amz.empty: dfs.append(df_amz)

    # 2. Flipkart JSON
    flp_file = raw_dir / "flipkart_fashion_products_dataset.json"
    if flp_file.exists():
        df_flp = process_flipkart_json(flp_file, rng)
        if not df_flp.empty: dfs.append(df_flp)

    # 3. Etsy CSV
    etsy_file = raw_dir / "Etsy.csv"
    if etsy_file.exists():
        df_etsy = process_etsy_file(etsy_file, rng)
        if not df_etsy.empty: dfs.append(df_etsy)

    # Fallback to any other CSVs in the folder
    for other_csv in raw_dir.glob("*.csv"):
        if other_csv.name not in ["amz_in_total_products_data_processed.csv", "Etsy.csv"]:
            logger.info(f"Processing additional CSV: {other_csv.name}")
            df_other = process_etsy_file(other_csv, rng)
            if not df_other.empty: dfs.append(df_other)

    if dfs:
        merged = pd.concat(dfs, ignore_index=True)
        logger.info(f"✓ Combined total raw records from real datasets: {len(merged):,}")
    else:
        logger.warning("No real datasets found. Using synthetic generator.")
        from data_pipeline import generate_synthetic_data
        merged = generate_synthetic_data(n_samples=25_000)

    # Standardize & compute domain features
    clean_df = synthesize_artisan_metadata(merged)
    clean_df = clean_df.drop_duplicates().reset_index(drop=True)

    # Save to parquet
    clean_df.to_parquet(output_path, index=False)
    logger.info(f"✓ Successfully saved {len(clean_df):,} records → {output_path}")

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("DATASET MERGE SUMMARY")
    logger.info("=" * 60)
    logger.info(f"  Total records: {len(clean_df):,}")
    logger.info(f"  Craft Categories: {clean_df['craft_category'].value_counts().to_dict()}")
    logger.info(f"  Price range: ₹{clean_df['fair_price_inr'].min():,.0f} – ₹{clean_df['fair_price_inr'].max():,.0f}")
    logger.info(f"  Median price: ₹{clean_df['fair_price_inr'].median():,.0f}")
    logger.info(f"  GI Tagged items: {clean_df['gi_tag_certified'].sum():,} ({clean_df['gi_tag_certified'].mean()*100:.1f}%)")
    logger.info("=" * 60)

    return clean_df


if __name__ == "__main__":
    run_dataset_merge()
