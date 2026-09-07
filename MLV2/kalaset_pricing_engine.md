# KalaSetu Pricing Engine
### Hybrid Pricing Strategy — Formula · AI · ML
*Dynamic Fair Price Engine for Indian Artisan Products*

---

> **Design Philosophy**
> Every price produced by this engine must be explainable to the artisan who made the product,
> fair by the standards of the Ministry of Social Justice and Empowerment (MoSJE),
> and competitive on the open market. No black box. No guessing.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     KALASET PRICING ENGINE                      │
│                                                                 │
│   INPUTS                                                        │
│   Material Cost · Labour Hours · Complexity · Category         │
│         │                                                       │
│         ▼                                                       │
│   ┌─────────────┐     ┌─────────────────┐    ┌─────────────┐  │
│   │  PHASE 1    │     │    PHASE 1       │    │  PHASE 2    │  │
│   │  FORMULA    │────▶│  AI MARKET LENS  │───▶│  ML REFINE  │  │
│   │  ENGINE     │     │  (Qwen 3 · 8B)  │    │  (XGBoost)  │  │
│   └─────────────┘     └─────────────────┘    └─────────────┘  │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│   Base Fair Price    Market Multiplier       Calibrated Price   │
│                               │                                 │
│                               ▼                                 │
│                    ┌──────────────────────┐                     │
│                    │   FINAL PRICE OUTPUT │                     │
│                    │  Retail · B2B · Floor│                     │
│                    └──────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Formula Engine

> **Pure calculation. No training. No dataset. Runs instantly.**
> The formula layer guarantees every price is grounded in the actual cost of making the product.

### Step-by-Step Calculation

#### Step 1 · Labour Cost

```
Labour Cost = Manufacturing Hours × ₹150 / hr
```

| Variable | Description |
|---|---|
| `Manufacturing Hours` | Actual hours spent crafting the product |
| `₹150/hr` | Fair wage rate (configurable per state minimum wage) |

> **Note:** ₹150/hr (~₹1,200/day) is the target fair wage, above the current industry average of ₹270/day. This is intentional — KalaSetu is built to uplift, not replicate exploitation.

---

#### Step 2 · Production Cost

```
Production Cost = Raw Material Cost + Labour Cost
```

This is the true cost floor. No price should ever go below this.

---

#### Step 3 · Cost-Plus Price

```
Cost-Plus Price = Production Cost × Craft Multiplier × Complexity Multiplier
```

---

#### Step 4 · Market Floor

```
if Platform DB has avg price for this category:
    Market Floor = Platform DB Avg Price × 0.85

else (new category, no data yet):
    Market Floor = Production Cost × 1.30        ← fallback
```

The 0.85 factor ensures KalaSetu prices stay competitive without undercutting the market destructively.

---

#### Step 5 · Suggested Retail Price

```
Suggested Retail = max(Cost-Plus Price, Market Floor)
```

Always the higher of the two — the artisan is never undersold below what the market accepts.

---

#### Step 6 · B2B Wholesale Price

```
B2B Wholesale = max(Suggested Retail × 0.75, Min Breakeven)
```

The `max()` guard ensures bulk orders never generate a loss, even at 25% discount.

---

#### Step 7 · Minimum Breakeven

```
Min Breakeven = Production Cost × 1.15
```

The absolute floor. A 15% margin covers platform fees, packaging, and logistics. No sale should go below this under any circumstance.

---

### Complete Formula at a Glance

```
labour_cost       = hours × 150
production_cost   = raw_material + labour_cost
cost_plus         = production_cost × craft_mult × complexity_mult
market_floor      = max(db_avg × 0.85, production_cost × 1.30)
suggested_retail  = max(cost_plus, market_floor)
min_breakeven     = production_cost × 1.15
b2b_wholesale     = max(suggested_retail × 0.75, min_breakeven)
```

---

### Craft Multiplier Table

| Craft Category | Multiplier | Rationale |
|---|:---:|---|
| Folk Paintings & Art | **2.0×** | Highest artistic originality — one-of-a-kind; non-reproducible |
| Tribal & Silver Jewelry | **2.0×** | Precious material + daily silver rate volatility + filigree intricacy |
| Embroidery & Chikankari | **1.7×** | Highest female artisan workforce; most labour-dense per sq. inch |
| Textiles & Handloom | **1.6×** | GI-tagged fabrics (Banarasi silk, Pochampally) fetch 20% international premium |
| Handicrafts & Woodwork | **1.4×** | Carving time, wood seasoning cycles, decorative demand |
| Clay & Blue Pottery | **1.3×** | Clay volume, kiln firing cost, daily-utility pricing ceiling |
| Bamboo & Tribal Craft | **1.2×** | Lower raw material cost; inclusion-first pricing for tribal artisans |

> **Silver Jewelry dynamic override:**
> When silver content is known, apply:
> `effective_multiplier = 2.0 + (silver_grams × live_silver_rate / production_cost × 0.1)`
> This ties jewelry pricing to live commodity rates automatically.

---

### Complexity Multiplier Table

| Score | Label | Craft Examples | Multiplier |
|:---:|---|---|:---:|
| 1 | Basic | Plain clay pot, simple weave, unprinted cotton | **1.00×** |
| 2 | Moderate | Block-printed textile, basic wood carving | **1.10×** |
| 3 | Skilled | Ikat saree, wood inlay, thrown pottery with glaze | **1.25×** |
| 4 | Intricate | Filigree jewelry, Madhubani painting, Kantha stitch | **1.40×** |
| 5 | Master Craft | Pashmina, Bidriware, Zardozi embroidery, Pattachitra | **1.60×** |

---

### Worked Example

> **Product:** Madhubani Folk Painting · 12"×18" · Natural colours on handmade paper

| Input | Value |
|---|---|
| Raw Material Cost | ₹280 |
| Manufacturing Hours | 14 hrs |
| Craft Category | Folk Paintings & Art |
| Complexity Score | 4 (Intricate) |
| Platform DB Avg Price | ₹1,800 |

```
Labour Cost       = 14 × 150              = ₹2,100
Production Cost   = 280 + 2,100           = ₹2,380
Cost-Plus Price   = 2,380 × 2.0 × 1.40   = ₹6,664
Market Floor      = 1,800 × 0.85          = ₹1,530
Suggested Retail  = max(6,664, 1,530)     = ₹6,664
Min Breakeven     = 2,380 × 1.15          = ₹2,737
B2B Wholesale     = max(6,664 × 0.75,
                        2,737)             = ₹4,998
```

**Final Price Card**

| Price Type | Amount |
|---|---|
| Suggested Retail | **₹6,664** |
| B2B Wholesale | **₹4,998** |
| Minimum Breakeven | **₹2,737** |

---

## Phase 1 — AI Market Intelligence Layer

> **Model: Qwen 3 · 8B (locally hosted)**
> Runs after the formula. Reads seasonal demand, social trends, regional festivals, and category saturation to produce a market multiplier that adjusts the formula price to real-world conditions.

### What the AI Does

The formula gives a **fair cost-based price**.
The AI answers: *"Is this a good time to sell this product at this price?"*

It outputs a single **Market Multiplier** between `0.85×` and `1.30×`.

```
Final Price = Suggested Retail × Market Multiplier
```

---

### Market Signals Qwen Evaluates

| Signal Category | Examples | Price Effect |
|---|---|---|
| Festival & Season | Diwali, Durga Puja, Christmas exports | +15% to +25% |
| Social Media Trend | Craft going viral, celebrity endorsement | +10% to +20% |
| Government Scheme | New NHDP cluster launch, GI tag granted | +8% to +12% |
| Export Demand | High USD/INR, western market inquiry spike | +10% to +15% |
| Category Saturation | Too many similar listings on platform | −5% to −15% |
| Off-Season | Post-festival slump, slow domestic demand | −5% to −10% |

---

### Qwen Prompt Template

```
SYSTEM:
You are a pricing analyst for KalaSetu, an Indian artisan marketplace
under MoSJE. Your job is to assess real-time market conditions and
return a price multiplier for a handicraft product.

Rules:
- Return ONLY valid JSON. No explanation. No markdown.
- market_multiplier must be between 0.85 and 1.30
- confidence must be LOW, MEDIUM, or HIGH
- reason must be under 20 words

USER:
Product Category : {craft_category}
Craft Region     : {state}
Base Price (₹)   : {suggested_retail}
Current Date     : {date}
Platform Signals : {recent_avg_views}, {inquiry_spike}, {similar_listings_count}

Assess market conditions and return:
{
  "market_multiplier": float,
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "reason": "string",
  "season_flag": "PEAK" | "NORMAL" | "SLOW"
}
```

---

### AI Output → Final Price

```python
# Qwen returns:
{
  "market_multiplier": 1.20,
  "confidence": "HIGH",
  "reason": "Diwali season — folk art demand peaks in October",
  "season_flag": "PEAK"
}

# Applied:
final_retail   = suggested_retail × 1.20
final_b2b      = b2b_wholesale    × 1.20   # capped at 1.15× max for B2B
```

> **B2B multiplier is capped at 1.15×** — bulk buyers negotiate fixed contracts; large swings erode trust.

---

### Confidence Handling

| Confidence | Action |
|---|---|
| HIGH | Apply multiplier directly |
| MEDIUM | Apply 50% of the adjustment: `1 + (multiplier - 1) × 0.5` |
| LOW | Do not adjust. Use formula price as-is. Log for review. |

---

### Local Deployment (Qwen 3 · 8B)

```bash
# Install Ollama and pull Qwen
ollama pull qwen3:8b

# Run inference server (uses your RTX 3050)
ollama serve

# KalaSetu calls it via HTTP
POST http://localhost:11434/api/generate
{
  "model": "qwen3:8b",
  "prompt": "<your prompt>",
  "stream": false,
  "format": "json"
}
```

> Qwen 3 · 8B runs comfortably within 4GB VRAM on your RTX 3050 at 4-bit quantisation. Response time: ~2–4 seconds per price request.

---

## Phase 2 — ML Calibration Model

> **Model: XGBoost Regressor (GPU · RTX 3050)**
> Activated after KalaSetu accumulates real transaction data (≥500 completed sales).
> It does not replace the formula — it learns a **correction factor** on top of it.

### The Problem Phase 2 Solves

After launch, you will have real data:
- What price was suggested by the formula?
- What price did the artisan actually sell at?
- Was the product sold quickly, slowly, or not at all?

The gap between *suggested price* and *actual successful sale price* is what the ML model learns to close.

---

### What the ML Model Learns

```
Target = actual_sale_price / formula_suggested_price

# This is a ratio — called the "price realisation factor"
# If target = 1.0  → formula was perfect
# If target = 0.9  → formula overpriced by 10%
# If target = 1.15 → formula underpriced by 15%
```

XGBoost learns this ratio from historical transactions. The output is applied as a final correction:

```
calibrated_price = formula_price × ml_realisation_factor
```

---

### Training Features (collected post-launch)

| Feature | Type | Source |
|---|---|---|
| `craft_category_enc` | Categorical | KalaSetu DB |
| `complexity_score` | Ordinal 1–5 | Artisan input |
| `state_region` | Categorical | Artisan profile |
| `gi_tag_certified` | Boolean | GI registry |
| `artisan_experience_yrs` | Integer | Artisan profile |
| `listing_views_30d` | Integer | Platform analytics |
| `inquiry_count_30d` | Integer | Platform analytics |
| `season_quarter` | Integer 1–4 | Derived from date |
| `formula_suggested_price` | Float | Formula engine output |
| `market_multiplier_used` | Float | AI layer output |
| `days_to_sale` | Integer | Transaction log |

**Target:** `price_realisation_factor` (actual ÷ suggested)

---

### XGBoost Config (RTX 3050 · 4GB VRAM)

```python
params = {
    "device":           "cuda",
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
```

---

### Phase 2 Trigger Conditions

| Condition | Threshold |
|---|---|
| Minimum transactions to train | 500 completed sales |
| Minimum per category | 30 sales per craft category |
| Retrain frequency | Every 90 days or 200 new sales |
| Model replaces formula? | **Never** — correction factor only |

---

### Full Phase 2 Pipeline

```
Artisan inputs material cost, hours, complexity, category
                        │
                        ▼
              ┌─────────────────┐
              │  FORMULA ENGINE │  → Base Price ₹
              └─────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  QWEN 3 · 8B   │  → Market Multiplier
              └─────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  XGBOOST MODEL  │  → Realisation Factor
              │  (Phase 2 only) │
              └─────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  FINAL PRICE   │
              │  Retail · B2B  │
              └─────────────────┘
```

---

## Complete Hybrid Decision Flow

```
START
  │
  ├─ Collect: material_cost, hours, complexity, category
  │
  ├─ FORMULA ENGINE
  │     labour_cost      = hours × 150
  │     production_cost  = material + labour
  │     cost_plus        = production × craft_mult × complexity_mult
  │     market_floor     = db_avg × 0.85  (or fallback)
  │     suggested_retail = max(cost_plus, market_floor)
  │     min_breakeven    = production × 1.15
  │     b2b_wholesale    = max(retail × 0.75, min_breakeven)
  │
  ├─ QWEN 3 · 8B (AI Market Layer)
  │     prompt → market_multiplier, confidence, season_flag
  │     if confidence == HIGH   → apply fully
  │     if confidence == MEDIUM → apply 50%
  │     if confidence == LOW    → skip, use formula
  │
  ├─ XGBOOST (Phase 2 — if model exists and ≥500 sales)
  │     predict realisation_factor
  │     calibrated = ai_adjusted_price × realisation_factor
  │
  └─ OUTPUT
        suggested_retail   ← show artisan
        b2b_wholesale      ← show bulk buyer
        min_breakeven      ← internal guard, never shown to buyer
        confidence         ← shown as signal strength indicator
        season_flag        ← shown as context badge (PEAK / NORMAL / SLOW)
```

---

## Summary

| Layer | Technology | When Active | Role |
|---|---|---|---|
| Formula Engine | Pure Python math | Always — Phase 1 & 2 | Fair cost-based price foundation |
| AI Market Lens | Qwen 3 · 8B (local) | Always — Phase 1 & 2 | Seasonal & trend adjustment |
| ML Calibration | XGBoost GPU | Phase 2 (post-500 sales) | Learns from real transaction history |

> The formula is the **spine**.
> Qwen is the **eyes**.
> XGBoost is the **memory**.
> Together they produce a price that is fair, competitive, and always explainable.

---

*KalaSetu Pricing Engine · Ministry of Social Justice and Empowerment · MoSJE · v1.0*
